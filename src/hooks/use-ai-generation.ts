"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getAuthHeaders } from "@/lib/auth-context";

interface UseAiGenerationOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: string) => void;
}

interface GenerationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  progress: number;
}

export function useAiGeneration<T = unknown>(
  apiEndpoint: string,
  options?: UseAiGenerationOptions<T>
) {
  const [state, setState] = useState<GenerationState<T>>({
    data: null,
    loading: false,
    error: null,
    progress: 0,
  });

  // 使用 useRef 存储 options 回调，避免作为依赖导致函数重建
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const generate = useCallback(
    async (payload: Record<string, unknown>) => {
      setState((prev) => ({ ...prev, loading: true, error: null, progress: 0 }));

      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Generation failed");
        }

        const result = await response.json();

        setState({
          data: result as T,
          loading: false,
          error: null,
          progress: 100,
        });

        optionsRef.current?.onSuccess?.(result as T);
        return result as T;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Generation failed";
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
          progress: 0,
        }));
        optionsRef.current?.onError?.(message);
        throw error;
      }
    },
    [apiEndpoint]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      progress: 0,
    });
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    progress: state.progress,
    generate,
    reset,
  };
}

export function useAsyncTask() {
  const [taskStatus, setTaskStatus] = useState<{
    status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | null;
    result: unknown;
    progress: number;
  }>({
    status: null,
    result: null,
    progress: 0,
  });

  // 用于取消轮询的 ref
  const abortRef = useRef(false);

  const pollTask = useCallback(async (taskId: string, interval = 3000) => {
    abortRef.current = false;
    
    const checkStatus = async () => {
      if (abortRef.current) return;
      
      try {
        const response = await fetch(`/api/ai/tasks/${taskId}`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        setTaskStatus({
          status: data.status,
          result: data.output,
          progress: data.status === "SUCCEEDED" ? 100 : 50,
        });

        if (data.status === "SUCCEEDED" || data.status === "FAILED") {
          return data;
        }

        // Continue polling
        setTimeout(() => checkStatus(), interval);
      } catch (err) {
        console.error("轮询任务状态失败:", err);
        setTaskStatus((prev) => ({
          ...prev,
          status: "FAILED",
          progress: 0,
        }));
      }
    };

    checkStatus();
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    ...taskStatus,
    pollTask,
    abort,
  };
}
