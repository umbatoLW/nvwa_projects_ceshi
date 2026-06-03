import { createClient } from "@supabase/supabase-js"
import { recordApiCost, canUserProceed, getUserCostStats } from "./security/cost-alert"

const supabaseUrl = process.env.COZE_SUPABASE_URL
const serviceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY

function getClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase env missing")
  return createClient(supabaseUrl, serviceKey)
}

export interface DeductResult {
  success: boolean
  balance: number
  cost: number
  error?: string
}

export async function deductCredits(
  userId: string,
  modelKey: string,
  description: string,
  relatedId?: string
): Promise<DeductResult> {
  try {
    const client = getClient()

    // 查询模型定价
    const { data: pricingData, error: pricingError } = await client
      .from("model_pricing")
      .select("cost_per_call")
      .eq("model_key", modelKey)
      .eq("is_active", true)
      .maybeSingle()

    if (pricingError) throw new Error(`查询定价失败: ${pricingError.message}`)
    if (!pricingData) {
      return {
        success: false,
        balance: 0,
        cost: 0,
        error: `未找到模型 ${modelKey} 的定价配置`,
      }
    }

    const cost = pricingData.cost_per_call

    // 查询当前余额
    const { data: creditData, error: creditError } = await client
      .from("user_credits")
      .select("balance, total_consumed, total_recharged")
      .eq("user_id", userId)
      .maybeSingle()

    if (creditError) throw new Error(`查询余额失败: ${creditError.message}`)

    const currentBalance = creditData?.balance ?? 0
    const currentConsumed = creditData?.total_consumed ?? 0

    if (currentBalance < cost) {
      return {
        success: false,
        balance: currentBalance,
        cost: cost,
        error: `积分不足，当前余额 ${currentBalance.toFixed(2)}，需要 ${cost.toFixed(2)} 积分`,
      }
    }

    const newBalance = currentBalance - cost
    const newConsumed = currentConsumed + cost

    // 扣除积分
    const { error: updateError } = await client
      .from("user_credits")
      .upsert(
        {
          user_id: userId,
          balance: newBalance,
          total_consumed: newConsumed,
          total_recharged: creditData?.total_recharged ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (updateError) throw new Error(`扣费失败: ${updateError.message}`)

    // 记录消费交易
    const { error: txError } = await client.from("credit_transactions").insert({
      user_id: userId,
      type: "consume",
      amount: -cost,
      balance_after: newBalance,
      description: description,
      model: modelKey,
      related_id: relatedId,
      created_at: new Date().toISOString(),
    })

    if (txError) throw new Error(`记录交易失败: ${txError.message}`)

    // 记录API成本（自动触发预警检查）
    recordApiCost("chat" as any, userId, cost)

    return {
      success: true,
      balance: newBalance,
      cost: cost,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      balance: 0,
      cost: 0,
      error: msg,
    }
  }
}

export async function getUserBalance(userId: string): Promise<number> {
  try {
    const client = getClient()
    const { data, error } = await client
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) throw new Error(`查询余额失败: ${error.message}`)
    return data?.balance ?? 0
  } catch {
    return 0
  }
}
