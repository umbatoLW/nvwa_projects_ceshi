import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 生产环境必须启用认证验证
// 开发环境可通过设置 BYPASS_AUTH=true 绕过认证（仅限本地开发）
const BYPASS_AUTH = process.env.NODE_ENV === "development" && process.env.BYPASS_AUTH === "true";

// 以下路径不需要鉴权（公开接口）
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
  "/api/auth/logout",
  "/api/health",        // 健康检查
  "/api/analytics",     // 匿名统计
];

// 静态资源路径（不需要认证）
const STATIC_PATHS = [
  "/_next/",
  "/favicon.ico",
  "/robots.txt",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源直接放行
  if (STATIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 公开路径直接放行
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 开发模式绕过认证（需要显式设置环境变量）
  if (BYPASS_AUTH) {
    console.warn(`[AUTH] 认证已绕过 (仅限开发环境): ${pathname}`);
    return NextResponse.next();
  }

  // API 路由要求 Bearer Token 或 Session Token
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");
    const sessionToken = request.headers.get("x-session");
    
    // 检查是否有有效的认证凭证
    const hasAuth = authHeader?.startsWith("Bearer ") || sessionToken;
    
    if (!hasAuth) {
      return NextResponse.json(
        { success: false, error: "未登录，请先登录", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 页面路由：检查是否有登录凭证（可选，根据需求启用）
  // 当前策略：页面路由不做拦截，由前端路由守卫处理
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)"],
};
