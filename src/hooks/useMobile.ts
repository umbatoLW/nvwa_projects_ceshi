"use client";

import { useState, useEffect, useMemo } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface MobileInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: DeviceType;
  os: "ios" | "android" | "windows" | "mac" | "linux" | "other";
  browser: "safari" | "chrome" | "firefox" | "edge" | "other";
  supportsTouch: boolean;
  isLowPerformance: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * 移动端检测Hook
 * 检测设备类型、操作系统、浏览器等信息
 */
export function useMobile(): MobileInfo {
  const [info, setInfo] = useState<MobileInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    deviceType: "desktop",
    os: "other",
    browser: "other",
    supportsTouch: false,
    isLowPerformance: false,
    viewportWidth: 0,
    viewportHeight: 0,
  });

  useEffect(() => {
    // 在客户端检测
    const userAgent = navigator.userAgent.toLowerCase();
    
    // 检测操作系统
    let os: MobileInfo["os"] = "other";
    if (/iphone|ipad|ipod/i.test(userAgent)) {
      os = "ios";
    } else if (/android/i.test(userAgent)) {
      os = "android";
    } else if (/windows/i.test(userAgent)) {
      os = "windows";
    } else if (/mac/i.test(userAgent)) {
      os = "mac";
    } else if (/linux/i.test(userAgent)) {
      os = "linux";
    }

    // 检测浏览器
    let browser: MobileInfo["browser"] = "other";
    if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
      browser = "safari";
    } else if (/chrome/i.test(userAgent)) {
      browser = "chrome";
    } else if (/firefox/i.test(userAgent)) {
      browser = "firefox";
    } else if (/edge/i.test(userAgent)) {
      browser = "edge";
    }

    // 检测设备类型
    const width = window.innerWidth;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;

    // 检测触摸支持
    const supportsTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // 检测低性能设备（简单判断）
    const isLowPerformance = 
      /iphone|ipad|ipod/i.test(userAgent) || // iOS设备
      /android.*mobile/i.test(userAgent);     // 低端Android手机

    setInfo({
      isMobile,
      isTablet,
      isDesktop,
      deviceType: isMobile ? "mobile" : isTablet ? "tablet" : "desktop",
      os,
      browser,
      supportsTouch,
      isLowPerformance,
      viewportWidth: width,
      viewportHeight: window.innerHeight,
    });

    // 监听视口变化
    const handleResize = () => {
      setInfo(prev => ({
        ...prev,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }));
    };

    window.addEventListener("resize", handleResize, { passive: true });
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return info;
}

/**
 * 移动端优化的条件渲染
 */
export function useMobileOptimized() {
  const mobileInfo = useMobile();
  
  return useMemo(() => ({
    ...mobileInfo,
    // 是否应该启用简化渲染
    shouldSimplify: mobileInfo.isLowPerformance || mobileInfo.isMobile,
    // 是否应该禁用动画
    shouldDisableAnimation: mobileInfo.isLowPerformance,
    // 是否应该使用较小的缓冲区
    bufferSize: mobileInfo.isLowPerformance ? 64 : 256,
    // 是否应该减少并发
    maxConcurrentRequests: mobileInfo.isMobile ? 2 : 5,
  }), [mobileInfo]);
}
