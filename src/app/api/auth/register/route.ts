import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
    });
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    // Auto-confirm email so user can login immediately
    if (data.user) {
      try {
        await supabaseAuth.auth.admin.updateUserById(data.user.id, {
          email_confirm: true,
        });
      } catch {
        // admin may not be available with anon key, ignore
      }
      // Try to get a session after confirming
      const { data: loginData } = await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });
      if (loginData.session) {
        return NextResponse.json({
          success: true,
          data: {
            user: loginData.user,
            session: loginData.session,
          },
        });
      }
    }
    return NextResponse.json({
      success: true,
      data: {
        user: data.user,
        session: data.session,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "注册失败" },
      { status: 500 }
    );
  }
}
