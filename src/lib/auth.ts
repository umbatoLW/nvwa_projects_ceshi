import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 开发模式：绕过登录检查
const BYPASS_AUTH = true;

// 延迟初始化 Supabase 客户端，避免构建时报错
let _supabaseAuth: SupabaseClient | null = null;

function getSupabaseAuth(): SupabaseClient {
  if (!_supabaseAuth) {
    // 支持双环境变量命名：COZE_SUPABASE_* 或 SUPABASE_*
    const url = process.env.COZE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.COZE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (!url || !key) {
      throw new Error('Supabase 环境变量未配置。请设置 SUPABASE_URL 和 SUPABASE_ANON_KEY');
    }
    
    _supabaseAuth = createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true },
    });
  }
  return _supabaseAuth;
}

// 兼容旧代码的导出（getter 模式）
export const supabaseAuth = {
  get auth() {
    return getSupabaseAuth().auth;
  },
};

export async function getCurrentUser(req?: Request) {
  // 开发模式：返回模拟用户
  if (BYPASS_AUTH) {
    const authHeader = req?.headers.get('authorization');
    if (authHeader?.includes('dev-token')) {
      return { id: 'dev-user', email: 'dev@example.com' };
    }
  }
  
  // 从请求头读取 JWT（服务端）
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data, error } = await supabaseAuth.auth.getUser(token);
      if (!error && data.user) return data.user;
    }
  }
  // 浏览器环境：从 cookie/localStorage 读取（由 Supabase 自动处理）
  const { data, error } = await supabaseAuth.auth.getUser();
  if (!error && data.user) return data.user;
  return null;
}
