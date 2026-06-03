import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.COZE_SUPABASE_URL
const serviceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY

function getClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase env missing")
  return createClient(supabaseUrl, serviceKey)
}

function getUserId(request: Request): string {
  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "")
    if (token === "dev-token") return "dev-user"
    return token
  }
  return "anonymous"
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request)
    const body = await request.json() as { amount: number; packageId?: string }
    const amount = body.amount

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "充值金额必须大于0" },
        { status: 400 }
      )
    }

    const client = getClient()

    // 查询当前余额
    const { data: creditData, error: creditError } = await client
      .from("user_credits")
      .select("balance, total_recharged, total_consumed")
      .eq("user_id", userId)
      .maybeSingle()

    if (creditError) throw new Error(`查询余额失败: ${creditError.message}`)

    const oldBalance = creditData?.balance ?? 0
    const oldTotalRecharged = creditData?.total_recharged ?? 0
    const newBalance = oldBalance + amount
    const newTotalRecharged = oldTotalRecharged + amount

    // 更新或插入用户余额
    const { error: upsertError } = await client
      .from("user_credits")
      .upsert(
        {
          user_id: userId,
          balance: newBalance,
          total_recharged: newTotalRecharged,
          total_consumed: creditData?.total_consumed ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (upsertError) throw new Error(`更新余额失败: ${upsertError.message}`)

    // 记录交易
    const { error: txError } = await client.from("credit_transactions").insert({
      user_id: userId,
      type: "recharge",
      amount: amount,
      balance_after: newBalance,
      description: `充值 ${amount} 积分`,
      created_at: new Date().toISOString(),
    })

    if (txError) throw new Error(`记录交易失败: ${txError.message}`)

    return NextResponse.json({
      success: true,
      data: {
        balance: newBalance,
        amount: amount,
        message: `成功充值 ${amount} 积分`,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
