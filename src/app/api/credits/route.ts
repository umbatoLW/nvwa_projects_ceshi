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

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const client = getClient()

    const { data, error } = await client
      .from("user_credits")
      .select("user_id, balance, total_recharged, total_consumed, updated_at")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) throw new Error(`查询余额失败: ${error.message}`)

    if (!data) {
      return NextResponse.json({
        success: true,
        data: {
          balance: 0,
          total_recharged: 0,
          total_consumed: 0,
        },
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
