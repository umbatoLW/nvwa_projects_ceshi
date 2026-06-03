"use client";

import React, { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SuspenseFallbackProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** 加载超时时间（毫秒），超时后显示降级UI */
  timeout?: number;
  /** 是否在超时后显示降级UI而不是持续加载 */
  showDegradedOnTimeout?: boolean;
}

/**
 * 增强型Suspense组件
 * 支持加载超时和降级UI
 */
export function SuspenseFallback({
  children,
  fallback,
  timeout = 10000,
  showDegradedOnTimeout = true,
}: SuspenseFallbackProps) {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  const defaultFallback = (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="text-center">
        {/* 加载动画 */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-[#333333] rounded-full" />
          <div className="absolute inset-0 border-4 border-t-[#0ABAB5] rounded-full animate-spin" />
        </div>
        <p className="text-[#888888] text-sm">加载中...</p>
      </div>
    </div>
  );

  if (timedOut && showDegradedOnTimeout) {
    return (
      <>
        {fallback || (
          <div className="w-full h-full flex items-center justify-center p-8">
            <div className="text-center">
              {/* 超时警告图标 */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#F59E0B]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-[#888888] text-sm mb-4">加载时间过长</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#0ABAB5] text-black text-sm font-medium rounded-lg hover:bg-[#09A9A4] transition-colors"
              >
                刷新页面
              </button>
            </div>
          </div>
        )}
        {/* 继续尝试加载内容 */}
        <Suspense fallback={defaultFallback}>{children}</Suspense>
      </>
    );
  }

  return <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;
}

/**
 * 页面级别的加载骨架屏
 */
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>

      {/* 内容区 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * 列表加载骨架屏
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-[#141414] rounded-xl">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
