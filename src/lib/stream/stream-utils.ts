/**
 * 流式响应工具
 * 统一管理SSE连接的生命周期
 */

import { logger } from "@/lib/logger";

export interface StreamOptions {
  /** 请求超时（毫秒） */
  timeout?: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * 创建带完整生命周期管理的流式响应
 */
export function createManagedStream(
  handler: (controller: ReadableStreamDefaultController, signal: AbortSignal) => Promise<void>,
  options: StreamOptions = {}
): Response {
  const {
    timeout = 300000, // 5分钟默认超时
    heartbeatInterval = 30000, // 30秒心跳
    debug = false,
  } = options;

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let aborted = false;
  let cleanupCalled = false;

  const cleanup = () => {
    if (cleanupCalled) return;
    cleanupCalled = true;

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      const abortController = new AbortController();
      const { signal } = abortController;

      // 设置请求超时
      timeoutTimer = setTimeout(() => {
        if (!aborted) {
          aborted = true;
          cleanup();
          abortController.abort();
          try {
            controller.close();
          } catch {
            // 可能已经关闭
          }
          if (debug) {
            logger.warn("[Stream] Request timeout");
          }
        }
      }, timeout);

      // 设置心跳
      heartbeatTimer = setInterval(() => {
        try {
          if (!aborted) {
            controller.enqueue(`: heartbeat ${Date.now()}\n\n`);
          }
        } catch {
          // 连接已关闭
          cleanup();
        }
      }, heartbeatInterval);

      // 监听 abort 信号
      signal.addEventListener("abort", () => {
        if (!aborted) {
          aborted = true;
          cleanup();
          try {
            controller.close();
          } catch {
            // 可能已经关闭
          }
        }
      });

      try {
        await handler(controller, signal);

        if (!aborted) {
          aborted = true;
          cleanup();
        }
      } catch (error) {
        if (!aborted) {
          logger.error("[Stream] Handler error:", error);
          try {
            controller.error(error);
          } catch {
            // 可能已经关闭
          }
        }
      } finally {
        cleanup();
      }
    },

    cancel() {
      aborted = true;
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // 禁用 nginx buffering
    },
  });
}

/**
 * 发送SSE数据
 */
export function encodeSSE(
  data: Record<string, unknown>,
  id?: number
): Uint8Array {
  const encoder = new TextEncoder();
  let message = "";

  if (id !== undefined) {
    message += `id: ${id}\n`;
  }

  message += `data: ${JSON.stringify(data)}\n\n`;

  return encoder.encode(message);
}

/**
 * 发送SSE注释（用于心跳）
 */
export function encodeSSEComment(comment: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`: ${comment}\n\n`);
}

/**
 * 创建简单的SSE响应
 */
export function createSSEResponse(
  generator: () => AsyncGenerator<Record<string, unknown>>,
  options: StreamOptions = {}
): Response {
  return createManagedStream(async (controller, signal) => {
    for await (const data of generator()) {
      if (signal.aborted) break;
      controller.enqueue(encodeSSE(data));
    }
  }, options);
}
