/**
 * Redis 滑动窗口限流器
 * 支持分布式环境下的精确限流
 */

import { getRedisClient, isRedisAvailable } from "./redis-client";
import { logger } from "./logger";

interface RateLimitConfig {
  limit: number; // 最大请求数
  windowMs: number; // 时间窗口（毫秒）
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  reason?: string;
}

/**
 * Redis 滑动窗口限流算法
 * 使用 Lua 脚本保证原子性
 */
const SLIDING_WINDOW_SCRIPT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local windowMs = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  
  -- 移除过期记录
  local clearBefore = now - windowMs
  redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)
  
  -- 获取当前计数
  local current = redis.call('ZCARD', key)
  
  if current < limit then
    -- 添加新记录
    redis.call('ZADD', key, now, now .. ':' .. math.random())
    redis.call('PEXPIRE', key, windowMs)
    return {1, limit - current - 1, now + windowMs}
  else
    -- 获取最早的记录，计算重置时间
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local resetTime = tonumber(oldest[2]) + windowMs
    return {0, 0, resetTime}
  end
`;

/**
 * 滑动窗口限流器
 */
export class SlidingWindowRateLimiter {
  private prefix: string;

  constructor(prefix = "ratelimit:") {
    this.prefix = prefix;
  }

  /**
   * 检查是否允许请求
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const redis = getRedisClient();
    const fullKey = `${this.prefix}${key}`;
    const now = Date.now();

    // Redis 不可用时，降级为内存模式（宽松策略）
    if (!redis || !isRedisAvailable()) {
      logger.debug("[RateLimiter] Redis 不可用，使用宽松策略");
      return {
        allowed: true,
        remaining: config.limit,
        resetTime: now + config.windowMs,
      };
    }

    try {
      // 执行 Lua 脚本（原子操作）
      const result = await redis.eval(
        SLIDING_WINDOW_SCRIPT,
        1,
        fullKey,
        String(config.limit),
        String(config.windowMs),
        String(now)
      );

      const [allowed, remaining, resetTime] = result as [number, number, number];

      return {
        allowed: allowed === 1,
        remaining,
        resetTime,
        reason: allowed === 1 ? undefined : "请求过于频繁，请稍后重试",
      };
    } catch (error) {
      logger.error("[RateLimiter] Redis 执行失败:", error);
      // 错误时降级为允许通过
      return {
        allowed: true,
        remaining: config.limit,
        resetTime: now + config.windowMs,
      };
    }
  }

  /**
   * 重置指定 key 的限流计数
   */
  async reset(key: string): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      await redis.del(`${this.prefix}${key}`);
    }
  }

  /**
   * 获取当前计数
   */
  async getCount(key: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis) return 0;

    const fullKey = `${this.prefix}${key}`;
    const count = await redis.zcard(fullKey);
    return count;
  }
}

/**
 * 固定窗口限流器（简单实现，适合高并发场景）
 */
export class FixedWindowRateLimiter {
  private prefix: string;

  constructor(prefix = "ratelimit:") {
    this.prefix = prefix;
  }

  /**
   * 检查是否允许请求
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const redis = getRedisClient();
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const fullKey = `${this.prefix}${key}:${windowStart}`;

    // Redis 不可用时，降级为宽松策略
    if (!redis || !isRedisAvailable()) {
      return {
        allowed: true,
        remaining: config.limit,
        resetTime: windowStart + config.windowMs,
      };
    }

    try {
      const multi = redis.multi();
      multi.incr(fullKey);
      multi.pexpire(fullKey, config.windowMs);

      const results = await multi.exec();
      const count = results?.[0]?.[1] as number;

      if (count <= config.limit) {
        return {
          allowed: true,
          remaining: config.limit - count,
          resetTime: windowStart + config.windowMs,
        };
      } else {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + config.windowMs,
          reason: "请求过于频繁，请稍后重试",
        };
      }
    } catch (error) {
      logger.error("[RateLimiter] Redis 执行失败:", error);
      return {
        allowed: true,
        remaining: config.limit,
        resetTime: windowStart + config.windowMs,
      };
    }
  }
}

// 导出默认限流器（滑动窗口）
export const rateLimiter = new SlidingWindowRateLimiter();
