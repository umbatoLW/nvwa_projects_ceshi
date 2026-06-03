/**
 * 数据库事务保护工具
 * 提供事务管理、重试机制和错误处理
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取 Supabase 客户端实例
const getDbClient = () => getSupabaseClient();

export interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
}

const DEFAULT_OPTIONS: TransactionOptions = {
  maxRetries: 3,
  retryDelay: 100,
  timeout: 30000,
  isolationLevel: 'READ COMMITTED',
};

/**
 * 事务错误类型
 */
export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

/**
 * 死锁检测
 */
function isDeadlockError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('deadlock') ||
      message.includes('lock wait timeout') ||
      message.includes('could not serialize')
    );
  }
  return false;
}

/**
 * 连接错误检测
 */
function isConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('network')
    );
  }
  return false;
}

/**
 * 执行事务
 */
export async function executeTransaction<T>(
  operations: () => Promise<T>,
  options: TransactionOptions = {}
): Promise<TransactionResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < opts.maxRetries!) {
    attempts++;
    
    try {
      // 开始事务
      const { error: beginError } = await getDbClient().rpc('begin_transaction', {
        isolation: opts.isolationLevel,
      });
      
      if (beginError) {
        throw new TransactionError(
          `Failed to begin transaction: ${beginError.message}`,
          'BEGIN_ERROR',
          isConnectionError(beginError)
        );
      }

      // 执行操作
      const result = await operations();

      // 提交事务
      const { error: commitError } = await getDbClient().rpc('commit_transaction');
      
      if (commitError) {
        // 回滚
        await getDbClient().rpc('rollback_transaction');
        throw new TransactionError(
          `Failed to commit transaction: ${commitError.message}`,
          'COMMIT_ERROR',
          isConnectionError(commitError)
        );
      }

      return {
        success: true,
        data: result,
        attempts,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 回滚
      try {
        await getDbClient().rpc('rollback_transaction');
      } catch {
        // 忽略回滚错误
      }

      // 判断是否可重试
      const isRetryable =
        isDeadlockError(error) ||
        isConnectionError(error) ||
        (error instanceof TransactionError && error.retryable);

      if (!isRetryable || attempts >= opts.maxRetries!) {
        break;
      }

      // 延迟重试
      await new Promise(resolve => setTimeout(resolve, opts.retryDelay! * attempts));
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Transaction failed',
    attempts,
  };
}

/**
 * 批量操作事务包装
 */
export async function executeBatchOperations<T, R>(
  items: T[],
  operation: (item: T, index: number) => Promise<R>,
  options: TransactionOptions & { batchSize?: number } = {}
): Promise<{
  successful: R[];
  failed: Array<{ item: T; error: string }>;
}> {
  const { batchSize = 10, ...txOptions } = options;
  const successful: R[] = [];
  const failed: Array<{ item: T; error: string }> = [];

  // 分批处理
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const result = await executeTransaction(async () => {
      const batchResults: R[] = [];
      for (let j = 0; j < batch.length; j++) {
        const itemResult = await operation(batch[j], i + j);
        batchResults.push(itemResult);
      }
      return batchResults;
    }, txOptions);

    if (result.success && result.data) {
      successful.push(...result.data);
    } else {
      // 如果批量失败，逐个尝试
      for (const item of batch) {
        try {
          const singleResult = await operation(item, items.indexOf(item));
          successful.push(singleResult);
        } catch (error) {
          failed.push({
            item,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  return { successful, failed };
}

/**
 * 乐观锁实现
 */
export async function withOptimisticLock<T>(
  table: string,
  id: string,
  updateFn: (currentData: Record<string, unknown>) => Promise<T>,
  maxAttempts: number = 3
): Promise<TransactionResult<T>> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      // 获取当前数据和版本
      const { data: current, error: fetchError } = await getDbClient()
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new TransactionError(
          `Failed to fetch record: ${fetchError.message}`,
          'FETCH_ERROR',
          false
        );
      }

      const currentVersion = (current as { version?: number }).version || 0;

      // 执行更新操作
      const result = await updateFn(current);

      // 验证版本未变化（乐观锁）
      const { error: updateError } = await getDbClient()
        .from(table)
        .update({ version: currentVersion + 1 })
        .eq('id', id)
        .eq('version', currentVersion);

      if (updateError) {
        // 版本冲突，重试
        if (attempts < maxAttempts) {
          continue;
        }
        throw new TransactionError(
          'Optimistic lock conflict: record was modified by another transaction',
          'VERSION_CONFLICT',
          true
        );
      }

      return {
        success: true,
        data: result,
        attempts,
      };
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        error instanceof Error ? error.message : String(error),
        'UNKNOWN_ERROR',
        false
      );
    }
  }

  return {
    success: false,
    error: 'Max retry attempts reached',
    attempts,
  };
}

/**
 * 分布式锁（基于数据库）
 */
export async function acquireLock(
  lockKey: string,
  timeout: number = 30000
): Promise<{ acquired: boolean; release: () => Promise<void> }> {
  const lockId = `${lockKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // 尝试获取锁
    const { error } = await getDbClient().rpc('acquire_lock', {
      lock_key: lockKey,
      lock_id: lockId,
      timeout_ms: timeout,
    });

    if (error) {
      return {
        acquired: false,
        release: async () => {},
      };
    }

    return {
      acquired: true,
      release: async () => {
        await getDbClient().rpc('release_lock', {
          lock_key: lockKey,
          lock_id: lockId,
        });
      },
    };
  } catch {
    return {
      acquired: false,
      release: async () => {},
    };
  }
}

/**
 * 事务统计
 */
export const transactionStats = {
  total: 0,
  successful: 0,
  failed: 0,
  retries: 0,
  
  record(attempt: TransactionResult<unknown>) {
    this.total++;
    if (attempt.success) {
      this.successful++;
    } else {
      this.failed++;
    }
    this.retries += attempt.attempts - 1;
  },
  
  getStats() {
    return {
      total: this.total,
      successful: this.successful,
      failed: this.failed,
      retries: this.retries,
      successRate: this.total > 0 ? (this.successful / this.total) * 100 : 0,
    };
  },
  
  reset() {
    this.total = 0;
    this.successful = 0;
    this.failed = 0;
    this.retries = 0;
  },
};
