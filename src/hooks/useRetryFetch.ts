"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  onSuccess?: () => void;
  onFailed?: (error: Error, attempts: number) => void;
  showToast?: boolean;
}

interface RetryState {
  isRetrying: boolean;
  attempt: number;
  lastError: Error | null;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: () => true,
  onRetry: () => {},
  onSuccess: () => {},
  onFailed: () => {},
  showToast: true,
};

/**
 * 自动重试Hook
 * 用于API调用失败时自动重试
 */
export function useRetryFetch<T = unknown>(options: RetryOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    lastError: null,
  });
  
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (
      fetchFn: () => Promise<T>,
      retryOptions?: Partial<RetryOptions>
    ): Promise<T | null> => {
      const mergedOpts = { ...opts, ...retryOptions };
      abortRef.current = new AbortController();
      
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= mergedOpts.maxRetries!; attempt++) {
        setState({ isRetrying: attempt > 1, attempt, lastError: null });

        try {
          const result = await fetchFn();
          
          if (attempt > 1) {
            mergedOpts.onSuccess?.();
            if (mergedOpts.showToast) {
              toast.success(`操作成功（重试${attempt - 1}次）`);
            }
          }
          
          setState({ isRetrying: false, attempt: 0, lastError: null });
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          setState({ isRetrying: true, attempt, lastError });
          
          // 检查是否应该重试
          if (!mergedOpts.retryCondition!(lastError, attempt)) {
            break;
          }
          
          // 不是最后一次尝试
          if (attempt < mergedOpts.maxRetries!) {
            mergedOpts.onRetry?.(attempt, lastError);
            
            if (mergedOpts.showToast) {
              toast.error(`${lastError.message}，${mergedOpts.retryDelay! / 1000}秒后重试...`);
            }
            
            // 等待后重试
            await new Promise((resolve) =>
              setTimeout(resolve, mergedOpts.retryDelay!)
            );
          }
        }
      }
      
      // 所有重试都失败了
      setState({ isRetrying: false, attempt: 0, lastError });
      mergedOpts.onFailed?.(lastError!, mergedOpts.maxRetries!);
      
      if (mergedOpts.showToast) {
        toast.error(`操作失败，已重试${mergedOpts.maxRetries}次`);
      }
      
      return null;
    },
    [opts]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState({ isRetrying: false, attempt: 0, lastError: null });
  }, []);

  return {
    ...state,
    execute,
    abort,
  };
}

/**
 * 判断错误是否应该重试
 */
export function shouldRetry(error: Error, _attempt: number): boolean {
  // 网络错误可以重试
  if (error.message.includes("fetch") || error.message.includes("network")) {
    return true;
  }
  
  // 超时可以重试
  if (error.message.includes("timeout") || error.message.includes("TIMEOUT")) {
    return true;
  }
  
  // 429 (Too Many Requests) 可以重试
  if (error.message.includes("429")) {
    return true;
  }
  
  // 500-599 服务端错误可以重试
  if (error.message.includes("500") || error.message.includes("502") || error.message.includes("503")) {
    return true;
  }
  
  return false;
}
