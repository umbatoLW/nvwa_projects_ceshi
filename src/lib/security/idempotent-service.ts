/**
 * 幂等性控制服务
 */

interface IdempotentRecord {
  key: string;
  result: unknown;
  timestamp: number;
}

class IdempotentService {
  private cache: Map<string, IdempotentRecord> = new Map();
  private ttl: number = 24 * 60 * 60 * 1000; // 24小时

  /**
   * 获取幂等请求的缓存结果
   */
  get(key: string): unknown | null {
    const record = this.cache.get(key);
    if (record) {
      // 检查是否过期
      if (Date.now() - record.timestamp < this.ttl) {
        return record.result;
      } else {
        this.cache.delete(key);
      }
    }
    return null;
  }

  /**
   * 保存幂等请求结果
   */
  set(key: string, result: unknown): void {
    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
    });

    // 清理过期记录
    this.cleanup();
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.cache) {
      if (now - record.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 移除特定记录
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 生成幂等键
   */
  generateKey(...parts: string[]): string {
    return parts.join(':');
  }
}

export const idempotentService = new IdempotentService();
