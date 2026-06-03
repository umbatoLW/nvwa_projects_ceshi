/**
 * AI接口限流中间件包装函数
 * 用于统一处理AI接口的限流逻辑
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RateLimitType } from "./ai-rate-limiter";
import { checkCircuit, recordSuccess, recordFailure } from "./circuit-breaker";
import { canUserProceed } from "./cost-alert";

export interface AiMiddlewareConfig {
  /** 限流类型 */
  rateLimitType: RateLimitType;
  /** 是否启用熔断器 */
  enableCircuitBreaker?: boolean;
  /** 熔断器名称 */
  circuitBreakerName?: string;
  /** 是否检查成本限制 */
  checkCost?: boolean;
}

export interface AiMiddlewareResult {
  allowed: boolean;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
}

/**
 * AI接口请求前检查
 * 统一处理限流、熔断、成本检查
 */
export function checkAiRequest(
  request: NextRequest,
  userId: string,
  config: AiMiddlewareConfig
): AiMiddlewareResult {
  // 1. 检查成本限制
  if (config.checkCost !== false) {
    const costCheck = canUserProceed(userId);
    if (!costCheck.allowed) {
      return {
        allowed: false,
        error: costCheck.reason,
        status: 429,
      };
    }
  }

  // 2. 检查限流
  const rateLimitResult = checkRateLimit(request, config.rateLimitType);
  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      error: rateLimitResult.reason,
      status: 429,
      headers: rateLimitResult.headers,
    };
  }

  // 3. 检查熔断器
  if (config.enableCircuitBreaker && config.circuitBreakerName) {
    const circuitCheck = checkCircuit(config.circuitBreakerName);
    if (circuitCheck.isOpen) {
      return {
        allowed: false,
        error: `服务暂时不可用，请${Math.ceil((circuitCheck.remainingMs || 30000) / 1000)}秒后重试`,
        status: 503,
      };
    }
  }

  return { allowed: true };
}

/**
 * 记录AI请求结果
 */
export function recordAiResult(
  circuitBreakerName: string | undefined,
  success: boolean
): void {
  if (!circuitBreakerName) return;

  if (success) {
    recordSuccess(circuitBreakerName);
  } else {
    recordFailure(circuitBreakerName);
  }
}

/**
 * AI接口中间件包装函数
 * 自动处理限流、熔断、成本检查
 * 
 * @example
 * ```typescript
 * export const POST = withAiRateLimit(
 *   async (request, userId) => {
 *     // 业务逻辑
 *     return NextResponse.json({ success: true });
 *   },
 *   { rateLimitType: "generate-image" }
 * );
 * ```
 */
export function withAiRateLimit(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
  config: AiMiddlewareConfig
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    // 获取用户ID（需要从请求中提取）
    // 注意：这里需要配合实际的认证逻辑
    const userId = request.headers.get("x-user-id") || undefined;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    // 执行前置检查
    const checkResult = checkAiRequest(request, userId, config);
    if (!checkResult.allowed) {
      const response = NextResponse.json(
        { success: false, error: checkResult.error },
        { status: checkResult.status }
      );

      // 添加限流响应头
      if (checkResult.headers) {
        Object.entries(checkResult.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }

      return response;
    }

    // 执行业务逻辑
    try {
      const result = await handler(request, userId);
      recordAiResult(config.circuitBreakerName, true);
      return result;
    } catch (error) {
      recordAiResult(config.circuitBreakerName, false);
      throw error;
    }
  };
}
