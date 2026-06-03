"use client";

import { useCallback, useRef, useMemo, useEffect } from "react";
import { useAIStreamStore, initialStreamState } from "@/stores/ai-stream-store";
import type { AIStreamState } from "@/stores/ai-stream-store";

export type { AIStreamState };

/**
 * AI流式请求Hook
 * 使用zustand进行全局状态管理，支持批量更新优化性能
 * @param streamId 可选的流ID，用于区分多个并发流
 */
export function useAIStream(streamId?: string) {
  const id = useMemo(() => streamId || `stream-${Date.now()}-${Math.random().toString(36).slice(2)}`, [streamId]);
  const streamState = useAIStreamStore((state) => state.streams[id] || initialStreamState);
  const setStream = useAIStreamStore((state) => state.setStream);
  const removeStream = useAIStreamStore((state) => state.removeStream);
  
  const abortRef = useRef<AbortController | null>(null);
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdateRef = useRef<Partial<AIStreamState>>({});

  // 组件卸载时自动清理
  useEffect(() => {
    return () => {
      // 清理abort
      if (abortRef.current) {
        abortRef.current.abort();
      }
      // 清理定时器
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      // 移除流状态
      removeStream(id);
    };
  }, [id, removeStream]);

  // 批量更新函数，合并高频更新，约60fps
  const batchUpdate = useCallback((updates: Partial<AIStreamState>) => {
    pendingUpdateRef.current = { ...pendingUpdateRef.current, ...updates };
    
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
    
    batchTimerRef.current = setTimeout(() => {
      setStream(id, pendingUpdateRef.current);
      pendingUpdateRef.current = {};
    }, 16);
  }, [id, setStream]);

  const run = useCallback(
    async (url: string, body?: Record<string, unknown>): Promise<unknown> => {
      batchUpdate({ ...initialStreamState, isRunning: true });
      
      // 创建新的AbortController
      const controller = new AbortController();
      abortRef.current = controller;

      // 设置请求超时（5分钟）
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5 * 60 * 1000);

      try {
        let token = "";
        if (typeof window !== "undefined") {
          const session = localStorage.getItem("nvwa_session");
          if (session) {
            try {
              const parsed = JSON.parse(session);
              token = parsed?.access_token || "";
            } catch (err) {
              console.error("解析session失败:", err);
            }
          }
        }
        
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ ...body, _stream: true }),
          signal: controller.signal, // 传递abort信号
        });

        // 清除超时
        clearTimeout(timeoutId);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalResult: unknown = null;
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            // 跳过心跳注释
            if (trimmed.startsWith(":")) continue;
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;
            
            try {
              const data = JSON.parse(jsonStr);
              
              const hasType = data.type !== undefined;
              const hasContent = data.content !== undefined;
              
              if (hasContent && (!hasType || data.type === "text" || data.type === "delta")) {
                accumulatedText += data.content || "";
                batchUpdate({ message: data.content || streamState.message });
                continue;
              }
              
              if (data.type === "progress") {
                batchUpdate({
                  progress: data.progress ?? streamState.progress,
                  stage: data.stage ?? streamState.stage,
                  message: data.message ?? streamState.message,
                });
              } else if (data.type === "complete") {
                finalResult = data.data ?? (accumulatedText ? { content: accumulatedText } : data);
                batchUpdate({
                  isRunning: false,
                  progress: 100,
                  stage: "complete",
                  message: data.message ?? "完成",
                });
              } else if (data.type === "error") {
                throw new Error(data.message ?? "未知错误");
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) {
                // ignore malformed lines
              } else {
                throw parseError;
              }
            }
          }
        }

        if (finalResult === null && accumulatedText) {
          finalResult = { content: accumulatedText };
        }
        
        if (finalResult === null) {
          throw new Error("未收到完整结果");
        }
        
        return finalResult;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "请求失败";
        batchUpdate({ isRunning: false, error: msg });
        throw err;
      } finally {
        // 清理
        clearTimeout(timeoutId);
        
        if (batchTimerRef.current) {
          clearTimeout(batchTimerRef.current);
          batchTimerRef.current = null;
        }
        
        // 确保最后的更新被应用
        if (Object.keys(pendingUpdateRef.current).length > 0) {
          setStream(id, pendingUpdateRef.current);
          pendingUpdateRef.current = {};
        }
        
        // 清理 abort ref
        abortRef.current = null;
      }
    },
    [id, streamState.message, streamState.progress, streamState.stage, batchUpdate, setStream]
  );

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    batchUpdate({ isRunning: false, error: "已取消" });
  }, [batchUpdate]);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStream(id, initialStreamState);
  }, [id, setStream]);

  const cleanup = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    removeStream(id);
  }, [id, removeStream]);

  return {
    ...streamState,
    run,
    abort,
    reset,
    cleanup,
    streamId: id,
  };
}
