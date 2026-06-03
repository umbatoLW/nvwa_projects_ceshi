/**
 * 数据库连接池和缓存层
 * 
 * 功能：
 * - 连接池管理（单例模式）
 * - 连接健康检查
 * - 查询缓存层
 * - 性能监控
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { logger } from './logger';

// 连接池配置
interface PoolConfig {
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  healthCheckIntervalMs: number;
}

// 默认配置
const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxConnections: 10,
  idleTimeoutMs: 30000,      // 30秒空闲超时
  connectionTimeoutMs: 5000, // 5秒连接超时
  healthCheckIntervalMs: 60000, // 1分钟健康检查
};

// 缓存项
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// 查询缓存
class QueryCache {
  private cache = new Map<string, CacheItem<unknown>>();
  private maxSize = 1000;
  private defaultTtl = 60000; // 默认1分钟缓存

  set<T>(key: string, data: T, ttl = this.defaultTtl): void {
    // LRU淘汰
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(pattern: string): void {
    // 删除匹配的缓存项
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// 连接池管理器
class DatabasePool {
  private static instance: DatabasePool;
  private clients: SupabaseClient[] = [];
  private availableIndices: number[] = [];
  private inUseIndices: Set<number> = new Set();
  private config: PoolConfig;
  private queryCache: QueryCache;
  private lastHealthCheck = Date.now();
  private healthCheckTimer: NodeJS.Timeout | null = null;

  private constructor(config: PoolConfig = DEFAULT_POOL_CONFIG) {
    this.config = config;
    this.queryCache = new QueryCache();
    this.startHealthCheck();
  }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  // 获取连接
  acquire(): SupabaseClient {
    // 如果有空闲连接，复用
    if (this.availableIndices.length > 0) {
      const index = this.availableIndices.pop()!;
      this.inUseIndices.add(index);
      return this.clients[index];
    }

    // 创建新连接
    if (this.clients.length < this.config.maxConnections) {
      const client = getSupabaseClient();
      const index = this.clients.length;
      this.clients.push(client);
      this.inUseIndices.add(index);
      logger.debug(`[DB Pool] Created new connection #${index}`);
      return client;
    }

    // 连接池已满，等待可用连接
    throw new Error('Database connection pool exhausted. Please try again later.');
  }

  // 释放连接
  release(client: SupabaseClient): void {
    const index = this.clients.indexOf(client);
    if (index >= 0 && this.inUseIndices.has(index)) {
      this.inUseIndices.delete(index);
      this.availableIndices.push(index);
      logger.debug(`[DB Pool] Released connection #${index}`);
    }
  }

  // 获取缓存
  getCache(): QueryCache {
    return this.queryCache;
  }

  // 健康检查
  private async healthCheck(): Promise<void> {
    logger.debug('[DB Pool] Running health check...');
    
    for (let i = 0; i < this.clients.length; i++) {
      if (!this.inUseIndices.has(i)) {
        try {
          // 简单的健康检查查询
          const client = this.clients[i];
          const { error } = await client.from('scripts').select('id').limit(1);
          if (error) {
            logger.error(`[DB Pool] Connection #${i} health check failed:`, error);
            // 重置连接
            this.clients[i] = getSupabaseClient();
          }
        } catch (err) {
          logger.error(`[DB Pool] Health check error for connection #${i}:`, err);
        }
      }
    }
  }

  // 启动健康检查定时器
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.healthCheck().catch(err => {
        logger.error('[DB Pool] Health check failed:', err);
      });
    }, this.config.healthCheckIntervalMs);
  }

  // 停止健康检查
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // 获取统计信息
  getStats(): {
    totalConnections: number;
    availableConnections: number;
    inUseConnections: number;
    cacheSize: number;
  } {
    return {
      totalConnections: this.clients.length,
      availableConnections: this.availableIndices.length,
      inUseConnections: this.inUseIndices.size,
      cacheSize: this.queryCache.size(),
    };
  }
}

// 导出单例
export const dbPool = DatabasePool.getInstance();

// 便捷方法
export function getDbConnection(): SupabaseClient {
  return dbPool.acquire();
}

export function releaseDbConnection(client: SupabaseClient): void {
  dbPool.release(client);
}

export function getQueryCache(): QueryCache {
  return dbPool.getCache();
}

export function getDbStats(): ReturnType<DatabasePool['getStats']> {
  return dbPool.getStats();
}

// 清理函数（用于测试或关闭应用时）
export function closeDbPool(): void {
  dbPool.stopHealthCheck();
}
