import { NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/auth";

export async function POST() {
  try {
    await supabaseAuth.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "登出失败" },
      { status: 500 }
    );
  }
}
