"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * 滑动方向类型
 */
export type SwipeDirection = "left" | "right" | "up" | "down" | null;

/**
 * 手势状态
 */
export interface GestureState {
  swipeDirection: SwipeDirection;
  pinchScale: number;
  isPinching: boolean;
  touchCount: number;
  swipeVelocity: number;
}

/**
 * 手势回调
 */
export interface GestureCallbacks {
  onSwipe?: (direction: SwipeDirection, velocity: number) => void;
  onPinch?: (scale: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: (scale: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

/**
 * 手势检测配置
 */
export interface GestureConfig {
  swipeThreshold?: number; // 滑动阈值（像素）
  swipeVelocityThreshold?: number; // 滑动速度阈值
  pinchThreshold?: number; // 缩放阈值
  longPressDelay?: number; // 长按延迟（毫秒）
  doubleTapDelay?: number; // 双击延迟（毫秒）
}

/**
 * 移动端手势检测Hook
 */
export function useMobileGestures(
  elementRef: React.RefObject<HTMLElement>,
  callbacks: GestureCallbacks = {},
  config: GestureConfig = {}
) {
  const {
    swipeThreshold = 50,
    swipeVelocityThreshold = 0.3,
    longPressDelay = 500,
    doubleTapDelay = 300,
  } = config;

  const [state, setState] = useState<GestureState>({
    swipeDirection: null,
    pinchScale: 1,
    isPinching: false,
    touchCount: 0,
    swipeVelocity: 0,
  });

  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    initialDistance: number;
    lastTapTime: number;
    longPressTimer: NodeJS.Timeout | null;
  }>({
    x: 0,
    y: 0,
    time: 0,
    initialDistance: 0,
    lastTapTime: 0,
    longPressTimer: null,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let initialDistance = 0;

    // 获取两指距离
    const getDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
    };

    // 计算滑动速度
    const calculateVelocity = (
      distance: number,
      duration: number
    ): number => {
      if (duration === 0) return 0;
      return Math.abs(distance) / duration;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();

      touchStartRef.current = {
        x: startX,
        y: startY,
        time: startTime,
        initialDistance: 0,
        lastTapTime: touchStartRef.current.lastTapTime,
        longPressTimer: touchStartRef.current.longPressTimer,
      };

      setState((prev) => ({
        ...prev,
        touchCount: e.touches.length,
        swipeDirection: null,
      }));

      // 单指 - 可能是长按或双击
      if (e.touches.length === 1) {
        // 检测长按
        const timer = setTimeout(() => {
          callbacks.onLongPress?.();
        }, longPressDelay);
        touchStartRef.current.longPressTimer = timer;

        // 检测双击
        const now = Date.now();
        if (now - touchStartRef.current.lastTapTime < doubleTapDelay) {
          callbacks.onDoubleTap?.();
          touchStartRef.current.lastTapTime = 0;
        }
      }

      // 双指 - 缩放手势
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches);
        touchStartRef.current.initialDistance = initialDistance;
        setState((prev) => ({ ...prev, isPinching: true }));
        callbacks.onPinchStart?.();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // 取消长按计时器
      if (touchStartRef.current.longPressTimer) {
        clearTimeout(touchStartRef.current.longPressTimer);
        touchStartRef.current.longPressTimer = null;
      }

      // 双指缩放
      if (e.touches.length === 2 && touchStartRef.current.initialDistance > 0) {
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / touchStartRef.current.initialDistance;

        setState((prev) => ({ ...prev, pinchScale: scale }));
        callbacks.onPinch?.(scale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // 取消长按计时器
      if (touchStartRef.current.longPressTimer) {
        clearTimeout(touchStartRef.current.longPressTimer);
        touchStartRef.current.longPressTimer = null;
      }

      // 记录点击时间（用于双击检测）
      if (e.touches.length === 0) {
        touchStartRef.current.lastTapTime = Date.now();
      }

      // 结束缩放
      if (state.isPinching && e.touches.length < 2) {
        setState((prev) => ({ ...prev, isPinching: false }));
        callbacks.onPinchEnd?.(state.pinchScale);
      }

      // 检测滑动
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;
        const diffX = endX - startX;
        const diffY = endY - startY;
        const duration = Date.now() - startTime;

        // 计算滑动方向
        let direction: SwipeDirection = null;
        let distance = 0;

        if (Math.abs(diffX) > Math.abs(diffY)) {
          // 水平滑动
          if (Math.abs(diffX) > swipeThreshold) {
            direction = diffX > 0 ? "right" : "left";
            distance = Math.abs(diffX);
          }
        } else {
          // 垂直滑动
          if (Math.abs(diffY) > swipeThreshold) {
            direction = diffY > 0 ? "down" : "up";
            distance = Math.abs(diffY);
          }
        }

        if (direction) {
          const velocity = calculateVelocity(distance, duration);

          setState((prev) => ({
            ...prev,
            swipeDirection: direction,
            swipeVelocity: velocity,
          }));

          // 只有速度足够快才触发回调
          if (velocity > swipeVelocityThreshold) {
            callbacks.onSwipe?.(direction, velocity);
          }
        }
      }

      // 重置触摸计数
      setState((prev) => ({ ...prev, touchCount: e.touches.length }));
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);

      if (touchStartRef.current.longPressTimer) {
        clearTimeout(touchStartRef.current.longPressTimer);
      }
    };
  }, [
    elementRef,
    callbacks,
    swipeThreshold,
    swipeVelocityThreshold,
    longPressDelay,
    doubleTapDelay,
    state.isPinching,
    state.pinchScale,
  ]);

  // 重置函数
  const reset = useCallback(() => {
    setState({
      swipeDirection: null,
      pinchScale: 1,
      isPinching: false,
      touchCount: 0,
      swipeVelocity: 0,
    });
  }, []);

  return { ...state, reset };
}

/**
 * 简化版滑动检测Hook
 */
export function useSwipe(
  elementRef: React.RefObject<HTMLElement>,
  onSwipe: (direction: SwipeDirection) => void,
  threshold = 50
) {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > threshold) {
          onSwipe(diffX > 0 ? "right" : "left");
        }
      } else {
        if (Math.abs(diffY) > threshold) {
          onSwipe(diffY > 0 ? "down" : "up");
        }
      }
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [elementRef, onSwipe, threshold]);
}
