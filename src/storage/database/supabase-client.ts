import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

// 确保加载 .env.local 文件
// Next.js 会自动加载，但在某些边缘情况下可能需要手动加载
function ensureEnvLoaded(): void {
  if (envLoaded) return;
  envLoaded = true;
  
  // 检查是否已有 Supabase 配置
  if (process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL) {
    return; // 已有配置，无需加载
  }
  
  // 尝试加载 .env.local
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch {
    // dotenv 不可用，忽略
  }
}

// 动态导入 coze-coding-dev-sdk，避免 top-level await 问题
// 这些变量会在首次使用时初始化
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _getReportBuffer: (() => any) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _createWrappedFetch: ((buffer: any, service: string) => any) | null = null;
let _sdkLoaded = false;

async function loadSdk(): Promise<void> {
  if (_sdkLoaded) return;
  _sdkLoaded = true;
  try {
    // 使用动态 import 避免 ESM top-level await 问题
    const sdk = await import('coze-coding-dev-sdk');
    _getReportBuffer = sdk.getReportBuffer;
    _createWrappedFetch = sdk.createWrappedFetch;
  } catch {
    // SDK 加载失败，忽略
  }
}

// 同步获取 SDK 函数（用于需要同步的场景）
function getSdkFunctions(): { getReportBuffer?: typeof _getReportBuffer; createWrappedFetch?: typeof _createWrappedFetch } {
  if (!_sdkLoaded) {
    // 尝试同步加载（仅在 CommonJS 环境有效）
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sdk = require('coze-coding-dev-sdk');
      _getReportBuffer = sdk.getReportBuffer;
      _createWrappedFetch = sdk.createWrappedFetch;
      _sdkLoaded = true;
    } catch {
      _sdkLoaded = true; // 标记为已尝试，避免重复尝试
    }
  }
  return { getReportBuffer: _getReportBuffer, createWrappedFetch: _createWrappedFetch };
}

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

// 检查是否有 Supabase 环境变量（支持双命名）
// 优先级：COZE_SUPABASE_* (扣子内置) > SUPABASE_* (用户自建)
function hasSupabaseEnv(): boolean {
  ensureEnvLoaded();
  const url = process.env.COZE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return !!(url && anonKey);
}

function loadEnv(): void {
  if (envLoaded || hasSupabaseEnv()) {
    return;
  }

  try {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('dotenv').config();
      if (hasSupabaseEnv()) {
        envLoaded = true;
        return;
      }
    } catch {
      // dotenv not available
    }

    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }

    envLoaded = true;
  } catch {
    // Silently fail
  }
}

function getSupabaseCredentials(): SupabaseCredentials {
  ensureEnvLoaded();

  // 支持双环境变量命名：COZE_SUPABASE_* (扣子内置) 优先于 SUPABASE_* (用户自建)
  const url = process.env.COZE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL is not set. Please set COZE_SUPABASE_URL or SUPABASE_URL environment variable.');
  }
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is not set. Please set COZE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable.');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  const globalOptions: Record<string, unknown> = {};
  if (token) {
    globalOptions.headers = { Authorization: `Bearer ${token}` };
  }
  try {
    const { getReportBuffer, createWrappedFetch } = getSdkFunctions();
    if (getReportBuffer && createWrappedFetch) {
      const buffer = getReportBuffer();
      if (buffer) {
        globalOptions.fetch = createWrappedFetch(buffer, 'supabase');
      }
    }
  } catch {
    // Silent — reporting setup failure should not block client creation
  }

  return createClient(url, key, {
    global: globalOptions,
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
