import { NextRequest, NextResponse } from 'next/server';

/**
 * 安全响应头设置
 */
export function setSecurityHeaders(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);

  // CSP
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none'; form-action 'self';"
  );

  // XSS防护
  headers.set('X-XSS-Protection', '1; mode=block');

  // 防止MIME类型嗅探
  headers.set('X-Content-Type-Options', 'nosniff');

  // 点击劫持防护
  headers.set('X-Frame-Options', 'DENY');

  // 严格传输安全（生产环境）
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // 引用策略
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}

/**
 * 频率限制配置
 */
const GLOBAL_RATE_LIMIT = {
  windowMs: 60000, // 1分钟
  maxRequests: 100, // 每IP每分钟最多100次
};

// 内存存储
const globalRateStore = new Map<string, { count: number; resetAt: number }>();

/**
 * 全局频率限制检查
 */
export function checkGlobalRateLimit(request: NextRequest): {
  allowed: boolean;
  headers: Record<string, string>;
} {
  // 从headers获取IP地址
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
  const now = Date.now();

  const record = globalRateStore.get(ip);

  if (!record || now >= record.resetAt) {
    globalRateStore.set(ip, { count: 1, resetAt: now + GLOBAL_RATE_LIMIT.windowMs });
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': String(GLOBAL_RATE_LIMIT.maxRequests),
        'X-RateLimit-Remaining': String(GLOBAL_RATE_LIMIT.maxRequests - 1),
      },
    };
  }

  if (record.count >= GLOBAL_RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      headers: {
        'X-RateLimit-Limit': String(GLOBAL_RATE_LIMIT.maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(record.resetAt - now),
        'Retry-After': String(Math.ceil((record.resetAt - now) / 1000)),
      },
    };
  }

  record.count += 1;
  globalRateStore.set(ip, record);

  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': String(GLOBAL_RATE_LIMIT.maxRequests),
      'X-RateLimit-Remaining': String(GLOBAL_RATE_LIMIT.maxRequests - record.count),
    },
  };
}

/**
 * 清理过期的限流记录（防止内存泄漏）
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [ip, record] of globalRateStore) {
    if (now >= record.resetAt) {
      globalRateStore.delete(ip);
    }
  }
}

// 定期清理（每5分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
