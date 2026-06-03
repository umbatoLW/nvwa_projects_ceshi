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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100)
    const page = parseInt(searchParams.get("page") ?? "1")
    const offset = (page - 1) * limit

    const { data, error, count } = await client
      .from("credit_transactions")
      .select(
        "id, type, amount, balance_after, description, model, related_id, created_at",
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(`查询交易记录失败: ${error.message}`)

    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
