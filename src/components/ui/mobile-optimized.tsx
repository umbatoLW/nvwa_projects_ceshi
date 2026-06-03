"use client";

import { ReactNode, useMemo } from "react";
import { useMobileOptimized } from "@/hooks/useMobile";

interface MobileOptimizedProps {
  children: ReactNode;
  /**
   * 移动端渲染的简化版本
   */
  mobileFallback?: ReactNode;
  /**
   * 低性能设备渲染的简化版本
   */
  lowPerfFallback?: ReactNode;
  /**
   * 是否在移动端懒加载
   */
  lazyOnMobile?: boolean;
}

/**
 * 移动端优化组件
 * 根据设备性能选择渲染不同版本
 */
export function MobileOptimized({
  children,
  mobileFallback,
  lowPerfFallback,
  lazyOnMobile = false,
}: MobileOptimizedProps) {
  const { isMobile, isLowPerformance, shouldSimplify } = useMobileOptimized();

  // 如果是低性能设备，优先显示低性能版本
  if (isLowPerformance && lowPerfFallback) {
    return <>{lowPerfFallback}</>;
  }

  // 如果是移动端且有简化版本，显示简化版本
  if (isMobile && mobileFallback) {
    return <>{mobileFallback}</>;
  }

  // 如果需要简化渲染
  if (shouldSimplify && lowPerfFallback) {
    return <>{lowPerfFallback}</>;
  }

  // 如果需要懒加载（未来可以实现动态导入）
  if (lazyOnMobile && isMobile) {
    // 可以在这里实现动态导入逻辑
    return <>{children}</>;
  }

  return <>{children}</>;
}

/**
 * 移动端禁用动画的包装器
 */
export function AnimationWrapper({
  children,
  animationClassName = "",
}: {
  children: ReactNode;
  animationClassName?: string;
}) {
  const { shouldDisableAnimation } = useMobileOptimized();

  return (
    <div className={shouldDisableAnimation ? "" : animationClassName}>
      {children}
    </div>
  );
}

/**
 * 移动端图片懒加载
 */
export function MobileLazyImage({
  src,
  alt,
  className = "",
  placeholder = "/placeholder.png",
}: {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}) {
  const { isMobile } = useMobileOptimized();
  
  // 移动端使用更轻量的占位符
  const actualPlaceholder = isMobile ? placeholder : placeholder;
  
  // 使用原生loading="lazy"
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding={isMobile ? "async" : "sync"}
      onError={(e) => {
        e.currentTarget.src = actualPlaceholder;
      }}
    />
  );
}

/**
 * 触摸反馈组件
 */
export function TouchFeedback({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { supportsTouch } = useMobileOptimized();

  const handleClick = () => {
    if (onClick) {
      // 触摸设备添加轻微延迟以显示反馈
      if (supportsTouch) {
        setTimeout(onClick, 50);
      } else {
        onClick();
      }
    }
  };

  return (
    <div
      className={`touch-feedback ${className}`}
      onClick={handleClick}
      style={{
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      {children}
    </div>
  );
}
