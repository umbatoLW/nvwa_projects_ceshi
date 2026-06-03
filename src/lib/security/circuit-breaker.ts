/**
 * 熔断器
 * 用于防止级联故障，当下游服务故障时快速失败
 */

import { logger } from "@/lib/logger";

// 熔断器状态
type CircuitState = "closed" | "open" | "half-open";

// 熔断器配置
interface CircuitBreakerConfig {
  failureThreshold: number;     // 失败阈值
  successThreshold: number;     // 半开状态成功阈值
  timeout: number;              // 开路后恢复时间(ms)
  monitoringPeriod: number;     // 监控周期(ms)
}

// 默认配置
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,         // 30秒
  monitoringPeriod: 60000, // 1分钟
};

// 熔断器实例
interface CircuitBreakerInstance {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastStateChangeTime: number;
}

// 熔断器存储
const circuitBreakers = new Map<string, CircuitBreakerInstance>();

/**
 * 创建或获取熔断器
 */
function getCircuitBreaker(name: string): CircuitBreakerInstance {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, {
      state: "closed",
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      lastStateChangeTime: Date.now(),
    });
  }
  return circuitBreakers.get(name)!;
}

/**
 * 检查熔断器状态
 */
export function checkCircuit(name: string): {
  isOpen: boolean;
  state: CircuitState;
  remainingMs?: number;
} {
  const breaker = getCircuitBreaker(name);
  const config = DEFAULT_CONFIG;
  const now = Date.now();

  switch (breaker.state) {
    case "closed":
      return { isOpen: false, state: "closed" };

    case "open":
      // 检查是否可以进入半开状态
      if (now - breaker.lastStateChangeTime >= config.timeout) {
        breaker.state = "half-open";
        breaker.successCount = 0;
        breaker.lastStateChangeTime = now;
        logger.info(`[CircuitBreaker] ${name} entering half-open state`);
        return { isOpen: false, state: "half-open" };
      }
      const remainingMs = config.timeout - (now - breaker.lastStateChangeTime);
      return { isOpen: true, state: "open", remainingMs };

    case "half-open":
      return { isOpen: false, state: "half-open" };

    default:
      return { isOpen: false, state: "closed" };
  }
}

/**
 * 记录成功
 */
export function recordSuccess(name: string): void {
  const breaker = getCircuitBreaker(name);
  const config = DEFAULT_CONFIG;

  breaker.failureCount = 0;

  if (breaker.state === "half-open") {
    breaker.successCount++;
    if (breaker.successCount >= config.successThreshold) {
      breaker.state = "closed";
      breaker.lastStateChangeTime = Date.now();
      logger.info(`[CircuitBreaker] ${name} recovered to closed state`);
    }
  }
}

/**
 * 记录失败
 */
export function recordFailure(name: string, error?: Error): void {
  const breaker = getCircuitBreaker(name);
  const config = DEFAULT_CONFIG;

  breaker.failureCount++;
  breaker.lastFailureTime = Date.now();

  if (breaker.state === "half-open") {
    // 半开状态下任何失败都回到开路状态
    breaker.state = "open";
    breaker.lastStateChangeTime = Date.now();
    logger.warn(
      `[CircuitBreaker] ${name} reopened due to failure in half-open state`,
      { error: error?.message }
    );
  } else if (breaker.state === "closed") {
    // 检查是否达到失败阈值
    if (breaker.failureCount >= config.failureThreshold) {
      breaker.state = "open";
      breaker.lastStateChangeTime = Date.now();
      logger.error(
        `[CircuitBreaker] ${name} opened due to ${breaker.failureCount} consecutive failures`,
        { error: error?.message }
      );
    }
  }
}

/**
 * 使用熔断器包装函数
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  const check = checkCircuit(name);

  if (check.isOpen) {
    const message = `服务暂时不可用，请${Math.ceil((check.remainingMs || 30000) / 1000)}秒后重试`;
    if (fallback) {
      logger.warn(`[CircuitBreaker] ${name} is open, using fallback`);
      return fallback();
    }
    throw new Error(message);
  }

  try {
    const result = await fn();
    recordSuccess(name);
    return result;
  } catch (error) {
    recordFailure(name, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * 重置熔断器
 */
export function resetCircuitBreaker(name: string): void {
  circuitBreakers.delete(name);
  logger.info(`[CircuitBreaker] ${name} has been reset`);
}

/**
 * 获取所有熔断器状态
 */
export function getAllCircuitBreakerStatus(): Record<
  string,
  { state: CircuitState; failureCount: number; successCount: number }
> {
  const status: Record<string, { state: CircuitState; failureCount: number; successCount: number }> = {};

  for (const [name, breaker] of circuitBreakers) {
    status[name] = {
      state: breaker.state,
      failureCount: breaker.failureCount,
      successCount: breaker.successCount,
    };
  }

  return status;
}

/**
 * 清理过期的熔断器记录
 */
export function cleanupCircuitBreakers(): void {
  const now = Date.now();
  const config = DEFAULT_CONFIG;

  for (const [name, breaker] of circuitBreakers) {
    // 如果是开路状态且超过超时时间，移除（让下次请求重新创建）
    if (
      breaker.state === "open" &&
      now - breaker.lastStateChangeTime >= config.timeout * 2
    ) {
      circuitBreakers.delete(name);
    }
  }
}

// 定期清理
setInterval(cleanupCircuitBreakers, 60000);
