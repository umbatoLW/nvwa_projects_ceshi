import { NextRequest, NextResponse } from "next/server";

/**
 * 移动端检测中间件
 * 可以用于：
 * 1. 重定向到移动端专用页面
 * 2. 设置移动端响应头
 * 3. 启用移动端优化模式
 */
export function mobileDetectMiddleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";
  
  // 检测移动设备
  const isMobile = /iphone|ipod|ipad|android|blackberry|windows phone/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  
  // 检测iOS Safari
  const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  
  // 检测低端Android
  const isLowEndAndroid = /android.*mobile.* armeabi/i.test(userAgent);
  
  // 创建设备信息响应头
  const response = NextResponse.next();
  
  if (isMobile || isTablet) {
    response.headers.set("X-Device-Type", isTablet ? "tablet" : "mobile");
    response.headers.set("X-Is-Mobile", "true");
  }
  
  if (isSafari) {
    response.headers.set("X-Is-Safari", "true");
  }
  
  if (isIOS) {
    response.headers.set("X-Is-iOS", "true");
  }
  
  if (isLowEndAndroid) {
    response.headers.set("X-Low-End-Device", "true");
  }
  
  return response;
}

/**
 * 设备检测工具函数
 */
export function detectDevice(userAgent: string): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  os: "ios" | "android" | "windows" | "mac" | "linux" | "other";
  browser: "safari" | "chrome" | "firefox" | "edge" | "other";
} {
  const ua = userAgent.toLowerCase();
  
  // 检测操作系统
  let os: "ios" | "android" | "windows" | "mac" | "linux" | "other" = "other";
  if (/iphone|ipad|ipod/i.test(ua)) {
    os = "ios";
  } else if (/android/i.test(ua)) {
    os = "android";
  } else if (/windows/i.test(ua)) {
    os = "windows";
  } else if (/mac/i.test(ua)) {
    os = "mac";
  } else if (/linux/i.test(ua)) {
    os = "linux";
  }

  // 检测浏览器
  let browser: "safari" | "chrome" | "firefox" | "edge" | "other" = "other";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = "safari";
  } else if (/chrome/i.test(ua)) {
    browser = "chrome";
  } else if (/firefox/i.test(ua)) {
    browser = "firefox";
  } else if (/edge/i.test(ua)) {
    browser = "edge";
  }

  // 检测设备类型
  const isMobile = /iphone|ipod|android.*mobile/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
  const isDesktop = !isMobile && !isTablet;

  return {
    isMobile,
    isTablet,
    isDesktop,
    os,
    browser,
  };
}
