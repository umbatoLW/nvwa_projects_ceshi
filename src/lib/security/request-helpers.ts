/**
 * AI请求辅助工具
 * 提供超时控制、重试逻辑等
 */

import { logger } from "@/lib/logger";

// 超时配置
const TIMEOUT_CONFIG: Record<string, number> = {
  "generate-image": 120000,   // 2分钟
  "generate-video": 300000,   // 5分钟
  "generate-3d": 180000,      // 3分钟
  "chat": 60000,              // 1分钟
  "generate-script": 180000,  // 3分钟
  "extract-stream": 90000,    // 1.5分钟
  "split-scenes": 90000,      // 1.5分钟
  "understand-image": 30000,  // 30秒
  default: 60000,             // 默认1分钟
};

// 重试配置
const RETRY_CONFIG: Record<string, { maxRetries: number; baseDelay: number }> = {
  "generate-image": { maxRetries: 2, baseDelay: 1000 },
  "generate-video": { maxRetries: 1, baseDelay: 2000 },
  "chat": { maxRetries: 3, baseDelay: 500 },
  default: { maxRetries: 2, baseDelay: 1000 },
};

/**
 * 创建带超时的fetch请求
 */
export async function fetchWithTimeout<T>(
  fetchFn: () => Promise<T>,
  endpoint: string,
  customTimeout?: number
): Promise<T> {
  const timeout = customTimeout || TIMEOUT_CONFIG[endpoint] || TIMEOUT_CONFIG.default;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await fetchFn();
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`[Timeout] Request to ${endpoint} timed out after ${timeout}ms`);
      throw new Error(`请求超时，请稍后重试（超时时间: ${Math.floor(timeout / 1000)}秒）`);
    }
    throw error;
  }
}

/**
 * 指数退避重试
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  endpoint: string,
  shouldRetry?: (error: Error) => boolean
): Promise<T> {
  const config = RETRY_CONFIG[endpoint] || RETRY_CONFIG.default;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      // 默认重试条件：网络错误或5xx错误
      if (!shouldRetry) {
        const isNetworkError =
          lastError.message.includes("network") ||
          lastError.message.includes("ECONNREFUSED") ||
          lastError.message.includes("ETIMEDOUT");

        const isServerError = /5\d\d/.test(lastError.message);

        if (!isNetworkError && !isServerError && attempt < config.maxRetries) {
          throw lastError;
        }
      }

      if (attempt < config.maxRetries) {
        const delay = config.baseDelay * Math.pow(2, attempt);
        logger.warn(
          `[Retry] Attempt ${attempt + 1} failed for ${endpoint}, retrying in ${delay}ms`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("重试次数已用尽");
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带超时和重试的请求包装器
 */
export async function robustRequest<T>(
  fn: () => Promise<T>,
  endpoint: string,
  options?: {
    timeout?: number;
    maxRetries?: number;
    shouldRetry?: (error: Error) => boolean;
  }
): Promise<T> {
  const { timeout, maxRetries, shouldRetry } = options || {};

  // 如果有自定义重试次数，临时覆盖配置
  const originalConfig = RETRY_CONFIG[endpoint];
  if (maxRetries !== undefined && originalConfig) {
    RETRY_CONFIG[endpoint] = { ...originalConfig, maxRetries };
  }

  try {
    return await retryWithBackoff(
      () => fetchWithTimeout(fn, endpoint, timeout),
      endpoint,
      shouldRetry
    );
  } finally {
    // 恢复原始配置
    if (maxRetries !== undefined && originalConfig) {
      RETRY_CONFIG[endpoint] = originalConfig;
    }
  }
}

/**
 * 获取超时配置
 */
export function getTimeout(endpoint: string): number {
  return TIMEOUT_CONFIG[endpoint] || TIMEOUT_CONFIG.default;
}

/**
 * 流式请求超时控制
 */
export class StreamTimeoutController {
  private timeoutId: NodeJS.Timeout | null = null;
  private onTimeout: () => void;

  constructor(
    timeoutMs: number,
    onTimeout: () => void
  ) {
    this.onTimeout = onTimeout;
    this.reset(timeoutMs);
  }

  reset(timeoutMs: number): void {
    this.clear();
    this.timeoutId = setTimeout(() => {
      this.onTimeout();
    }, timeoutMs);
  }

  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
