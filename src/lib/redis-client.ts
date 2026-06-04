/**
 * Redis 客户端配置
 * 支持单机和集群模式
 */

import Redis from "ioredis";

let redis: Redis | null = null;
let isConnected = false;

/**
 * 获取 Redis 客户端实例
 * 如果未配置 REDIS_URL，返回 null（使用内存模式）
 */
export function getRedisClient(): Redis | null {
  // 如果已经初始化，直接返回
  if (redis) {
    return redis;
  }

  // 检查环境变量
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      // 连接超时
      connectTimeout: 5000,
      // 重试策略
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error("[Redis] 连接失败，已达到最大重试次数");
          return null; // 停止重试
        }
        return Math.min(times * 200, 2000); // 递增延迟
      },
    });

    redis.on("connect", () => {
      isConnected = true;
      console.log("[Redis] 连接成功");
    });

    redis.on("disconnect", () => {
      isConnected = false;
      console.warn("[Redis] 连接断开");
    });

    redis.on("error", (err) => {
      console.error("[Redis] 错误:", err.message);
    });

    return redis;
  } catch (error) {
    console.error("[Redis] 初始化失败:", error);
    return null;
  }
}

/**
 * 检查 Redis 是否可用
 */
export function isRedisAvailable(): boolean {
  const client = getRedisClient();
  return client !== null && isConnected;
}

/**
 * 关闭 Redis 连接
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    isConnected = false;
  }
}

// 类型导出
export type { Redis };
