/**
 * AI接口限流器
 * 支持用户级和IP级双重限流
 * 
 * 双模式支持：
 * - 内存模式：单实例开发环境，无需 Redis
 * - Redis模式：生产环境多实例共享状态
 * 
 * 自动切换：检测到 REDIS_URL 环境变量时启用 Redis 模式
 */

import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { rateLimiter } from "@/lib/redis-rate-limiter";
import { isRedisAvailable } from "@/lib/redis-client";

// 限流类型
export type RateLimitType = keyof typeof RATE_LIMITS;

// 限流配置
const RATE_LIMITS: Record<string, { userLimit: number; ipLimit: number; windowMs: number }> = {
  "generate-image": { userLimit: 10, ipLimit: 50, windowMs: 60000 },   // 10次/分钟用户，50次/分钟IP
  "generate-video": { userLimit: 5, ipLimit: 30, windowMs: 60000 },    // 5次/分钟用户，30次/分钟IP
  "generate-3d": { userLimit: 3, ipLimit: 20, windowMs: 60000 },       // 3次/分钟用户，20次/分钟IP
  "chat": { userLimit: 30, ipLimit: 100, windowMs: 60000 },            // 30次/分钟用户，100次/分钟IP
  "generate-script": { userLimit: 10, ipLimit: 50, windowMs: 60000 },  // 10次/分钟用户，50次/分钟IP
  "extract-stream": { userLimit: 15, ipLimit: 60, windowMs: 60000 },   // 15次/分钟用户，60次/分钟IP
  "split-scenes": { userLimit: 10, ipLimit: 40, windowMs: 60000 },     // 10次/分钟用户，40次/分钟IP
};

// 内存存储（生产环境应使用Redis）
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const userRateLimits = new Map<string, RateLimitEntry>();
const ipRateLimits = new Map<string, RateLimitEntry>();

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  headers?: Record<string, string>;
}

/**
 * 获取客户端IP
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

/**
 * 获取用户ID（从请求头或cookie）
 */
function getUserId(request: NextRequest): string | null {
  // 从授权头获取
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // 从cookie获取
  const userId = request.cookies.get("user_id")?.value;
  return userId || null;
}

/**
 * 检查限流（同步版本，内存模式）
 */
export function checkRateLimit(
  request: NextRequest,
  endpoint: keyof typeof RATE_LIMITS
): RateLimitResult {
  // Redis 可用时，提示使用异步版本
  if (isRedisAvailable()) {
    logger.warn("[RateLimit] Redis 可用，建议使用 checkRateLimitAsync");
  }
  
  return checkRateLimitMemory(request, endpoint);
}

/**
 * 检查限流（异步版本，支持 Redis）
 * 生产环境推荐使用此版本
 */
export async function checkRateLimitAsync(
  request: NextRequest,
  endpoint: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    return { allowed: true };
  }

  const clientIp = getClientIp(request);
  const userId = getUserId(request);

  // Redis 可用时，使用 Redis 限流
  if (isRedisAvailable()) {
    return checkRateLimitRedis(clientIp, userId, endpoint, config);
  }

  // 降级为内存限流
  return checkRateLimitMemory(request, endpoint);
}

/**
 * Redis 限流检查
 */
async function checkRateLimitRedis(
  clientIp: string,
  userId: string | null,
  endpoint: string,
  config: { userLimit: number; ipLimit: number; windowMs: number }
): Promise<RateLimitResult> {
  // 1. IP 级限流
  const ipKey = `ip:${clientIp}:${endpoint}`;
  const ipResult = await rateLimiter.checkLimit(ipKey, {
    limit: config.ipLimit,
    windowMs: config.windowMs,
  });

  if (!ipResult.allowed) {
    logger.warn(`[RateLimit:Redis] IP ${clientIp} exceeded limit for ${endpoint}`);
    return {
      allowed: false,
      reason: `IP请求过于频繁，请${Math.ceil((ipResult.resetTime - Date.now()) / 1000)}秒后重试`,
      headers: buildHeaders(config.ipLimit, ipResult),
    };
  }

  // 2. 用户级限流
  if (userId) {
    const userKey = `user:${userId}:${endpoint}`;
    const userResult = await rateLimiter.checkLimit(userKey, {
      limit: config.userLimit,
      windowMs: config.windowMs,
    });

    if (!userResult.allowed) {
      logger.warn(`[RateLimit:Redis] User ${userId} exceeded limit for ${endpoint}`);
      return {
        allowed: false,
        reason: `请求过于频繁，请${Math.ceil((userResult.resetTime - Date.now()) / 1000)}秒后重试`,
        headers: buildHeaders(config.userLimit, userResult),
      };
    }

    return {
      allowed: true,
      headers: buildHeaders(config.userLimit, userResult),
    };
  }

  return {
    allowed: true,
    headers: buildHeaders(config.ipLimit, ipResult),
  };
}

/**
 * 构建响应头
 */
function buildHeaders(
  limit: number,
  result: { remaining: number; resetTime: number }
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetTime),
    "Retry-After": String(Math.max(0, Math.ceil((result.resetTime - Date.now()) / 1000))),
  };
}

/**
 * 内存限流检查（原有逻辑）
 */
function checkRateLimitMemory(
  request: NextRequest,
  endpoint: keyof typeof RATE_LIMITS
): RateLimitResult {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    return { allowed: true };
  }

  const now = Date.now();
  const clientIp = getClientIp(request);
  const userId = getUserId(request);

  // 1. IP级限流检查
  const ipKey = `ip:${clientIp}:${endpoint}`;
  const ipEntry = ipRateLimits.get(ipKey);

  if (ipEntry && now < ipEntry.resetTime) {
    if (ipEntry.count >= config.ipLimit) {
      logger.warn(`[RateLimit] IP ${clientIp} exceeded limit for ${endpoint}`);
      return {
        allowed: false,
        reason: `IP请求过于频繁，请${Math.ceil((ipEntry.resetTime - now) / 1000)}秒后重试`,
        headers: {
          "X-RateLimit-Limit": String(config.ipLimit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(ipEntry.resetTime),
          "Retry-After": String(Math.ceil((ipEntry.resetTime - now) / 1000)),
        },
      };
    }
    ipEntry.count++;
  } else {
    ipRateLimits.set(ipKey, { count: 1, resetTime: now + config.windowMs });
  }

  // 2. 用户级限流检查（如果有用户ID）
  if (userId) {
    const userKey = `user:${userId}:${endpoint}`;
    const userEntry = userRateLimits.get(userKey);

    if (userEntry && now < userEntry.resetTime) {
      if (userEntry.count >= config.userLimit) {
        logger.warn(`[RateLimit] User ${userId} exceeded limit for ${endpoint}`);
        return {
          allowed: false,
          reason: `请求过于频繁，请${Math.ceil((userEntry.resetTime - now) / 1000)}秒后重试`,
          headers: {
            "X-RateLimit-Limit": String(config.userLimit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(userEntry.resetTime),
            "Retry-After": String(Math.ceil((userEntry.resetTime - now) / 1000)),
          },
        };
      }
      userEntry.count++;
    } else {
      userRateLimits.set(userKey, { count: 1, resetTime: now + config.windowMs });
    }
  }

  // 返回成功
  const currentEntry = userId
    ? userRateLimits.get(`user:${userId}:${endpoint}`)
    : ipRateLimits.get(ipKey);

  return {
    allowed: true,
    headers: {
      "X-RateLimit-Limit": String(config.userLimit),
      "X-RateLimit-Remaining": String(
        config.userLimit - (currentEntry?.count || 1)
      ),
      "X-RateLimit-Reset": String(currentEntry?.resetTime || now + config.windowMs),
    },
  };
}

/**
 * 清理过期记录
 */
export function cleanupRateLimits(): void {
  const now = Date.now();

  for (const [key, entry] of userRateLimits) {
    if (now > entry.resetTime) {
      userRateLimits.delete(key);
    }
  }

  for (const [key, entry] of ipRateLimits) {
    if (now > entry.resetTime) {
      ipRateLimits.delete(key);
    }
  }
}

// 定期清理（每5分钟）
setInterval(cleanupRateLimits, 300000);

/**
 * 获取限流状态（用于调试）
 */
export function getRateLimitStatus(
  request: NextRequest,
  endpoint: keyof typeof RATE_LIMITS
): {
  user: { count: number; limit: number; resetTime: number } | null;
  ip: { count: number; limit: number; resetTime: number } | null;
} {
  const config = RATE_LIMITS[endpoint];
  const clientIp = getClientIp(request);
  const userId = getUserId(request);

  let userStatus = null;
  let ipStatus = null;

  if (userId) {
    const userKey = `user:${userId}:${endpoint}`;
    const userEntry = userRateLimits.get(userKey);
    if (userEntry) {
      userStatus = {
        count: userEntry.count,
        limit: config.userLimit,
        resetTime: userEntry.resetTime,
      };
    }
  }

  const ipKey = `ip:${clientIp}:${endpoint}`;
  const ipEntry = ipRateLimits.get(ipKey);
  if (ipEntry) {
    ipStatus = {
      count: ipEntry.count,
      limit: config.ipLimit,
      resetTime: ipEntry.resetTime,
    };
  }

  return { user: userStatus, ip: ipStatus };
}
