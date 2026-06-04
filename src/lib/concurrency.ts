/**
 * 并发控制和重试机制
 * 
 * 集成 p-limit 提供并发控制
 * 内置重试逻辑，支持指数退避
 */

import pLimit from "p-limit";
import { logger } from "./logger";

// ============================================
// 类型定义
// ============================================

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;  // 毫秒
  maxDelay: number;      // 毫秒
  backoffFactor: number; // 退避因子
  retryOn?: (error: Error) => boolean; // 判断是否重试
  onRetry?: (error: Error, attempt: number) => void; // 重试回调
}

export interface ConcurrencyConfig {
  concurrency: number;
  retryOptions?: Partial<RetryOptions>;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

// ============================================
// 并发控制器
// ============================================

/**
 * 创建并发限制器
 */
export function createLimiter(concurrency: number) {
  return pLimit(concurrency);
}

/**
 * 并发执行任务
 */
export async function concurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const limit = createLimiter(concurrency);
  return Promise.all(tasks.map((task) => limit(task)));
}

/**
 * 并发执行并收集结果（包含错误信息）
 */
export async function concurrentSettled<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const limit = createLimiter(concurrency);
  return Promise.allSettled(tasks.map((task) => limit(task)));
}

// ============================================
// 重试机制
// ============================================

/**
 * 计算退避延迟
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = options.initialDelay * Math.pow(options.backoffFactor, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带重试的异步执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (config.retryOn && !config.retryOn(lastError)) {
        throw lastError;
      }

      // 最后一次尝试，不再重试
      if (attempt === config.maxRetries) {
        throw lastError;
      }

      // 计算延迟
      const delayMs = calculateDelay(attempt, config);

      // 回调
      if (config.onRetry) {
        config.onRetry(lastError, attempt + 1);
      } else {
        logger.warn(`[Retry] 第 ${attempt + 1} 次重试，延迟 ${delayMs}ms`, {
          error: lastError.message,
        });
      }

      // 等待后重试
      await delay(delayMs);
    }
  }

  throw lastError;
}

/**
 * 创建带重试的函数
 */
export function createRetryable<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): () => Promise<T> {
  return () => withRetry(fn, options);
}

// ============================================
// 并发 + 重试组合
// ============================================

/**
 * 并发执行任务，支持重试
 */
export async function concurrentWithRetry<T>(
  tasks: (() => Promise<T>)[],
  config: ConcurrencyConfig
): Promise<T[]> {
  const limit = createLimiter(config.concurrency);
  const retryOptions = config.retryOptions
    ? { ...DEFAULT_RETRY_OPTIONS, ...config.retryOptions }
    : DEFAULT_RETRY_OPTIONS;

  return Promise.all(
    tasks.map((task) => limit(() => withRetry(task, retryOptions)))
  );
}

/**
 * 批量执行并处理结果
 */
export interface BatchResult<T> {
  succeeded: T[];
  failed: Array<{ error: Error; index: number }>;
  total: number;
}

export async function batchExecute<T>(
  tasks: (() => Promise<T>)[],
  config: ConcurrencyConfig
): Promise<BatchResult<T>> {
  const results = await concurrentSettled(tasks, config.concurrency);

  const succeeded: T[] = [];
  const failed: Array<{ error: Error; index: number }> = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      succeeded.push(result.value);
    } else {
      failed.push({ error: result.reason, index });
    }
  });

  return { succeeded, failed, total: tasks.length };
}

// ============================================
// 预设限流器
// ============================================

// AI 生成任务限流器（并发 3）
export const aiLimiter = createLimiter(3);

// 图片处理限流器（并发 5）
export const imageLimiter = createLimiter(5);

// 视频处理限流器（并发 2）
export const videoLimiter = createLimiter(2);

// 文件上传限流器（并发 10）
export const uploadLimiter = createLimiter(10);

// ============================================
// 常用重试策略
// ============================================

/**
 * 网络请求重试策略
 */
export const networkRetryOptions: Partial<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffFactor: 2,
  retryOn: (error) => {
    // 网络错误、超时、5xx 错误重试
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("econnrefused") ||
      msg.includes("503") ||
      msg.includes("502")
    );
  },
};

/**
 * AI API 调用重试策略
 */
export const aiRetryOptions: Partial<RetryOptions> = {
  maxRetries: 2,
  initialDelay: 2000,
  backoffFactor: 2,
  retryOn: (error) => {
    const msg = error.message.toLowerCase();
    // 速率限制、服务暂时不可用重试
    return (
      msg.includes("rate limit") ||
      msg.includes("429") ||
      msg.includes("503") ||
      msg.includes("overloaded")
    );
  },
};

// ============================================
// 导出
// ============================================

export { pLimit };
