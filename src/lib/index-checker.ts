/**
 * 索引检查工具
 * 用于检查数据库索引是否存在，并分析查询性能
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取 Supabase 客户端实例
const getDbClient = () => getSupabaseClient();

export interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface IndexCheckResult {
  table: string;
  requiredIndexes: string[];
  existingIndexes: string[];
  missingIndexes: string[];
  status: 'ok' | 'warning' | 'error';
}

/**
 * 必需的索引配置
 */
export const REQUIRED_INDEXES: Record<string, string[]> = {
  scripts: [
    'idx_scripts_user_id',
    'idx_scripts_created_at',
    'idx_scripts_updated_at',
    'idx_scripts_status',
    'idx_scripts_user_created',
  ],
  characters: [
    'idx_characters_user_id',
    'idx_characters_created_at',
    'idx_characters_updated_at',
    'idx_characters_name',
    'idx_characters_user_created',
  ],
  assets: [
    'idx_assets_user_id',
    'idx_assets_created_at',
    'idx_assets_type',
    'idx_assets_user_type',
    'idx_assets_user_created',
  ],
  credits: [
    'idx_credits_user_id',
    'idx_credits_transaction_type',
    'idx_credits_created_at',
    'idx_credits_user_created',
  ],
};

/**
 * 检查表的索引
 */
export async function checkTableIndexes(tableName: string): Promise<IndexCheckResult> {
  const requiredIndexes = REQUIRED_INDEXES[tableName] || [];
  const existingIndexes: string[] = [];
  
  try {
    const { data, error } = await getDbClient().rpc('get_table_indexes', {
      table_name: tableName,
    });
    
    if (error) {
      // 如果 RPC 不存在，尝试直接查询
      const { data: indexData, error: indexError } = await getDbClient()
        .from('_pg_indexes')
        .select('indexname')
        .eq('tablename', tableName);
      
      if (!indexError && indexData) {
        existingIndexes.push(...indexData.map((i: { indexname: string }) => i.indexname));
      }
    } else if (data) {
      existingIndexes.push(...data.map((i: { indexname: string }) => i.indexname));
    }
  } catch {
    // 如果查询失败，假设索引存在
    return {
      table: tableName,
      requiredIndexes,
      existingIndexes: [],
      missingIndexes: [],
      status: 'warning',
    };
  }
  
  const missingIndexes = requiredIndexes.filter(
    idx => !existingIndexes.includes(idx)
  );
  
  let status: 'ok' | 'warning' | 'error' = 'ok';
  if (missingIndexes.length > 0) {
    status = missingIndexes.length > requiredIndexes.length / 2 ? 'error' : 'warning';
  }
  
  return {
    table: tableName,
    requiredIndexes,
    existingIndexes,
    missingIndexes,
    status,
  };
}

/**
 * 检查所有表的索引
 */
export async function checkAllIndexes(): Promise<IndexCheckResult[]> {
  const results: IndexCheckResult[] = [];
  
  for (const tableName of Object.keys(REQUIRED_INDEXES)) {
    const result = await checkTableIndexes(tableName);
    results.push(result);
  }
  
  return results;
}

/**
 * 分析查询性能
 */
export async function analyzeQueryPerformance(
  query: string
): Promise<{
  executionTime: number;
  plan: string;
  suggestions: string[];
}> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await getDbClient().rpc('explain_query', {
      query_text: query,
    });
    
    if (error) {
      return {
        executionTime: Date.now() - startTime,
        plan: 'Unable to analyze query',
        suggestions: ['Consider adding indexes for frequently queried columns'],
      };
    }
    
    const executionTime = Date.now() - startTime;
    const plan = data || '';
    const suggestions: string[] = [];
    
    // 简单的分析建议
    if (plan.includes('Seq Scan')) {
      suggestions.push('Query uses sequential scan, consider adding an index');
    }
    if (executionTime > 1000) {
      suggestions.push('Query took more than 1 second, consider optimization');
    }
    
    return {
      executionTime,
      plan,
      suggestions,
    };
  } catch {
    return {
      executionTime: Date.now() - startTime,
      plan: 'Analysis failed',
      suggestions: ['Unable to analyze query performance'],
    };
  }
}

/**
 * 获取索引使用统计
 */
export async function getIndexUsageStats(): Promise<
  Record<string, { indexScans: number; seqScans: number; ratio: number }>
> {
  const stats: Record<string, { indexScans: number; seqScans: number; ratio: number }> = {};
  
  try {
    const { data, error } = await getDbClient().rpc('get_index_usage_stats');
    
    if (!error && data) {
      for (const row of data) {
        const tableName = row.table_name;
        const indexScans = row.idx_scan || 0;
        const seqScans = row.seq_scan || 0;
        const ratio = seqScans > 0 ? indexScans / seqScans : 0;
        
        stats[tableName] = {
          indexScans,
          seqScans,
          ratio,
        };
      }
    }
  } catch {
    // 无法获取统计信息
  }
  
  return stats;
}

/**
 * 生成索引建议
 */
export function generateIndexSuggestions(
  table: string,
  queries: Array<{ columns: string[]; type: 'eq' | 'range' | 'like' }>
): string[] {
  const suggestions: string[] = [];
  
  for (const query of queries) {
    const columns = query.columns.join(', ');
    
    switch (query.type) {
      case 'eq':
        suggestions.push(
          `CREATE INDEX IF NOT EXISTS idx_${table}_${query.columns.join('_')} ON ${table}(${columns});`
        );
        break;
      case 'range':
        suggestions.push(
          `CREATE INDEX IF NOT EXISTS idx_${table}_${query.columns.join('_')} ON ${table}(${columns});`
        );
        break;
      case 'like':
        // 对于 LIKE 查询，建议使用 gin 索引（如果安装了 pg_trgm）
        suggestions.push(
          `-- Consider using gin index for text search: CREATE INDEX idx_${table}_${query.columns[0]}_gin ON ${table} USING gin(${query.columns[0]} gin_trgm_ops);`
        );
        break;
    }
  }
  
  return suggestions;
}
