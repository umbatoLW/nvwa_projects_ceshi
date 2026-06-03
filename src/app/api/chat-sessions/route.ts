import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getUserId } from "@/lib/server-auth";

// GET /api/chat-sessions?scriptId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get("scriptId");

    if (!scriptId) {
      return NextResponse.json({ error: "scriptId is required" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("script_id", scriptId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("获取对话历史失败:", error);
      return NextResponse.json({ error: "获取对话历史失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || null });
  } catch (error) {
    console.error("获取对话历史失败:", error);
    return NextResponse.json({ error: "获取对话历史失败" }, { status: 500 });
  }
}

// POST /api/chat-sessions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptId, messages, model } = body;

    if (!scriptId) {
      return NextResponse.json({ error: "scriptId is required" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查是否已存在会话
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("script_id", scriptId)
      .single();

    if (existing) {
      // 更新现有会话
      const { data, error } = await supabase
        .from("chat_sessions")
        .update({
          messages: messages || [],
          model: model || "qwen-plus",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("更新对话历史失败:", error);
        return NextResponse.json({ error: "更新对话历史失败" }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    } else {
      // 创建新会话
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          script_id: scriptId,
          messages: messages || [],
          model: model || "qwen-plus",
        })
        .select()
        .single();

      if (error) {
        console.error("创建对话历史失败:", error);
        return NextResponse.json({ error: "创建对话历史失败" }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    console.error("保存对话历史失败:", error);
    return NextResponse.json({ error: "保存对话历史失败" }, { status: 500 });
  }
}

// DELETE /api/chat-sessions?scriptId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get("scriptId");

    if (!scriptId) {
      return NextResponse.json({ error: "scriptId is required" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("script_id", scriptId);

    if (error) {
      console.error("删除对话历史失败:", error);
      return NextResponse.json({ error: "删除对话历史失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除对话历史失败:", error);
    return NextResponse.json({ error: "删除对话历史失败" }, { status: 500 });
  }
}
