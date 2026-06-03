import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.COZE_SUPABASE_URL
const serviceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY

function getClient() {
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase env missing")
  return createClient(supabaseUrl, serviceKey)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    const client = getClient()
    let query = client
      .from("model_pricing")
      .select("id, model_key, model_name, category, cost_per_call, is_active")
      .eq("is_active", true)

    if (category) {
      query = query.eq("category", category)
    }

    const { data, error } = await query.order("category")

    if (error) throw new Error(`查询定价失败: ${error.message}`)

    return NextResponse.json({
      success: true,
      data: data ?? [],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
