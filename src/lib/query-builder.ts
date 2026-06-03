/**
 * 数据库查询构建器
 * 提供分页、过滤、排序等查询优化功能
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// 默认分页参数
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 排序参数
export interface SortParams {
  field: string;
  direction?: 'asc' | 'desc';
}

// 过滤条件
export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: unknown;
}

// 查询选项
export interface QueryOptions {
  select?: string;
  filters?: FilterCondition[];
  sort?: SortParams[];
  pagination?: PaginationParams;
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  fromCache?: boolean;
}

// 简单缓存实现
const queryCache = new Map<string, { data: unknown; expiry: number }>();

function getQueryCache() {
  return {
    get<T>(key: string): T | null {
      const cached = queryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.data as T;
      }
      queryCache.delete(key);
      return null;
    },
    set(key: string, data: unknown, ttl: number): void {
      queryCache.set(key, { data, expiry: Date.now() + ttl });
    },
    delete(key: string): void {
      queryCache.delete(key);
    },
    clear(): void {
      queryCache.clear();
    },
  };
}

function generateCacheKey(table: string, options: QueryOptions): string {
  return `${table}:${JSON.stringify(options)}`;
}

/**
 * 执行分页查询
 */
export async function executePaginatedQuery<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  options: QueryOptions = {}
): Promise<PaginatedResult<T>> {
  const startTime = Date.now();
  const page = options.pagination?.page ?? DEFAULT_PAGE;
  const pageSize = Math.min(
    options.pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );

  // 生成缓存键
  const cacheKey = options.cache?.enabled
    ? generateCacheKey(table, options)
    : null;

  // 检查缓存
  if (cacheKey) {
    const cached = getQueryCache().get<PaginatedResult<T>>(cacheKey);
    if (cached) {
      logger.debug(`[Query] Cache hit for ${table}`);
      return { ...cached, fromCache: true };
    }
  }

  // 构建查询
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from(table)
    .select(options.select || '*', { count: 'exact' })
    .range(from, to);

  // 应用过滤条件
  if (options.filters) {
    for (const filter of options.filters) {
      switch (filter.operator) {
        case 'eq':
          query = query.eq(filter.field, filter.value);
          break;
        case 'neq':
          query = query.neq(filter.field, filter.value);
          break;
        case 'gt':
          query = query.gt(filter.field, filter.value);
          break;
        case 'gte':
          query = query.gte(filter.field, filter.value);
          break;
        case 'lt':
          query = query.lt(filter.field, filter.value);
          break;
        case 'lte':
          query = query.lte(filter.field, filter.value);
          break;
        case 'like':
          query = query.like(filter.field, filter.value as string);
          break;
        case 'ilike':
          query = query.ilike(filter.field, filter.value as string);
          break;
        case 'in':
          query = query.in(filter.field, filter.value as unknown[]);
          break;
        case 'is':
          query = query.is(filter.field, filter.value as null);
          break;
      }
    }
  }

  // 应用排序
  if (options.sort) {
    for (const s of options.sort) {
      query = query.order(s.field, { ascending: s.direction !== 'desc' });
    }
  }

  // 执行查询
  const { data, error, count } = await query;

  if (error) {
    logger.error(`[Query] Error querying ${table}:`, error);
    throw error;
  }

  const total = count ?? 0;
  const result: PaginatedResult<T> = {
    data: (data as unknown as T[]) ?? [],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  // 缓存结果
  if (cacheKey && options.cache?.ttl) {
    getQueryCache().set(cacheKey, result, options.cache.ttl);
  }

  logger.debug(`[Query] ${table} query completed in ${Date.now() - startTime}ms`);
  return result;
}

/**
 * 查询缓存工具
 */
export const queryCacheUtil = getQueryCache();
