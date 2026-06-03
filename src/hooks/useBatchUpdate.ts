import { useCallback, useRef, useEffect } from "react";

/**
 * 批量更新 Hook
 * 用于合并高频更新，减少渲染次数
 * @param updateFn 更新函数
 * @param delay 延迟时间（毫秒），默认16ms（约60fps）
 * @returns 批量更新函数
 */
export function useBatchUpdate<T>(
  updateFn: (data: T) => void,
  delay: number = 16
) {
  const pendingDataRef = useRef<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const batchUpdate = useCallback(
    (data: T) => {
      pendingDataRef.current = data;
      
      if (timeoutRef.current) {
        return;
      }

      timeoutRef.current = setTimeout(() => {
        if (pendingDataRef.current !== null) {
          updateFn(pendingDataRef.current);
          pendingDataRef.current = null;
        }
        timeoutRef.current = null;
      }, delay);
    },
    [updateFn, delay]
  );

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pendingDataRef.current !== null) {
        updateFn(pendingDataRef.current);
      }
    };
  }, [updateFn]);

  return batchUpdate;
}
