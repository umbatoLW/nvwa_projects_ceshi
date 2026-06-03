"use client";

import { useCallback, useRef, useState } from "react";

interface StreamRecoveryOptions {
  /** 最大恢复尝试次数 */
  maxRecoveryAttempts?: number;
  /** 恢复间隔（毫秒） */
  recoveryInterval?: number;
  /** 保存进度回调 */
  onProgressSave?: (progress: number, stage: string) => void;
  /** 恢复成功回调 */
  onRecovered?: () => void;
  /** 恢复失败回调 */
  onRecoveryFailed?: (error: Error) => void;
}

interface StreamState {
  isConnected: boolean;
  isRecovering: boolean;
  recoveryAttempt: number;
  lastProgress: number;
  lastStage: string;
  error: Error | null;
}

const STORAGE_KEY = "nvwa_stream_progress";
const PROGRESS_EXPIRY_MS = 5 * 60 * 1000; // 5分钟

/**
 * 流式任务恢复Hook
 * 用于AI流式生成中断后自动恢复
 */
export function useStreamRecovery(options: StreamRecoveryOptions = {}) {
  const {
    maxRecoveryAttempts = 3,
    recoveryInterval = 2000,
    onProgressSave,
    onRecovered,
    onRecoveryFailed,
  } = options;

  const [state, setState] = useState<StreamState>({
    isConnected: false,
    isRecovering: false,
    recoveryAttempt: 0,
    lastProgress: 0,
    lastStage: "",
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const progressRef = useRef<{ progress: number; stage: string; data: unknown }>({
    progress: 0,
    stage: "",
    data: null,
  });

  /**
   * 保存当前进度（用于断点续传）
   */
  const saveProgress = useCallback((progress: number, stage: string, data?: unknown) => {
    progressRef.current = { progress, stage, data: data || progressRef.current.data };
    onProgressSave?.(progress, stage);
    
    // 保存到 localStorage（临时）
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...progressRef.current,
          timestamp: Date.now(),
        })
      );
    } catch {
      // localStorage 可能已满，忽略
    }
  }, [onProgressSave]);

  /**
   * 获取保存的进度
   */
  const getSavedProgress = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      
      const data = JSON.parse(saved);
      // 检查是否过期
      if (Date.now() - data.timestamp > PROGRESS_EXPIRY_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  /**
   * 清除保存的进度
   */
  const clearSavedProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    progressRef.current = { progress: 0, stage: "", data: null };
  }, []);

  /**
   * 尝试恢复流式任务
   */
  const attemptRecovery = useCallback(
    async (
      originalFetchFn: () => Promise<unknown>,
      _resumeFromProgress?: number
    ): Promise<boolean> => {
      abortRef.current = new AbortController();
      
      for (let attempt = 1; attempt <= maxRecoveryAttempts; attempt++) {
        setState((prev) => ({
          ...prev,
          isRecovering: true,
          recoveryAttempt: attempt,
          error: null,
        }));

        try {
          // 清理之前的进度
          clearSavedProgress();
          
          // 重新执行流式请求
          await originalFetchFn();
          
          // 恢复成功
          setState((prev) => ({
            ...prev,
            isConnected: true,
            isRecovering: false,
            recoveryAttempt: 0,
          }));
          
          onRecovered?.();
          return true;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          
          setState((prev) => ({
            ...prev,
            isConnected: false,
            error,
          }));

          // 不是最后一次尝试
          if (attempt < maxRecoveryAttempts) {
            await new Promise((resolve) => setTimeout(resolve, recoveryInterval));
          }
        }
      }

      // 所有恢复尝试都失败
      setState((prev) => ({
        ...prev,
        isRecovering: false,
        recoveryAttempt: 0,
      }));
      
      onRecoveryFailed?.(state.error || new Error("恢复失败"));
      return false;
    },
    [maxRecoveryAttempts, recoveryInterval, clearSavedProgress, onRecovered, onRecoveryFailed, state.error]
  );

  /**
   * 中断当前流式任务
   */
  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isRecovering: false,
    }));
  }, []);

  /**
   * 设置连接状态
   */
  const setConnected = useCallback((connected: boolean) => {
    setState((prev) => ({
      ...prev,
      isConnected: connected,
    }));
  }, []);

  return {
    ...state,
    saveProgress,
    getSavedProgress,
    clearSavedProgress,
    attemptRecovery,
    abort,
    setConnected,
  };
}
