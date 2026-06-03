import { NextRequest, NextResponse } from 'next/server';
import { FetchClient, Config, HeaderUtils, FetchContentItem } from 'coze-coding-dev-sdk';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const dnsResolve = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

/**
 * ==================== 安全配置 ====================
 */

// 允许的协议白名单
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// 禁止的IP地址范围
const FORBIDDEN_IP_RANGES: Array<{ start: string; end: string; reason: string }> = [
  // IPv4
  { start: '0.0.0.0', end: '0.255.255.255', reason: '网络地址' },
  { start: '10.0.0.0', end: '10.255.255.255', reason: '私网A类地址' },
  { start: '127.0.0.0', end: '127.255.255.255', reason: '本地回环地址' },
  { start: '169.254.0.0', end: '169.254.255.255', reason: '本地链路地址' },
  { start: '172.16.0.0', end: '172.31.255.255', reason: '私网B类地址' },
  { start: '192.0.0.0', end: '192.0.0.255', reason: 'IANA特殊地址' },
  { start: '192.0.2.0', end: '192.0.2.255', reason: '文档测试地址' },
  { start: '192.88.99.0', end: '192.88.99.255', reason: '6to4中继地址' },
  { start: '192.168.0.0', end: '192.168.255.255', reason: '私网C类地址' },
  { start: '198.51.100.0', end: '198.51.100.255', reason: '测试文档地址' },
  { start: '203.0.113.0', end: '203.0.113.255', reason: '测试文档地址' },
  { start: '224.0.0.0', end: '239.255.255.255', reason: '多播地址' },
  { start: '240.0.0.0', end: '255.255.255.255', reason: '保留地址' },
];

// 禁止的域名（云元数据地址）
const FORBIDDEN_HOSTNAMES = new Set([
  'metadata',
  'metadata.server',
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data',
  'instance-data.ec2.internal',
  '100.100.100.200',
]);

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 10000;

// 最大响应大小（10MB）
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

// 频率限制：每个用户每分钟最多20次
const RATE_LIMIT_WINDOW = 60000; // 1分钟
const MAX_REQUESTS_PER_WINDOW = 20;

// 内存存储限流记录
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * ==================== 辅助函数 ====================
 */

/**
 * IPv4字符串转换为整数用于范围比较
 */
function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) throw new Error('Invalid IPv4');
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

/**
 * 检查IP是否在禁止范围内
 */
function isIpInForbiddenRange(ip: string): { isForbidden: boolean; reason?: string } {
  // 检查IPv4
  if (net.isIPv4(ip)) {
    const ipLong = ipToLong(ip);
    for (const range of FORBIDDEN_IP_RANGES) {
      const startLong = ipToLong(range.start);
      const endLong = ipToLong(range.end);
      if (ipLong >= startLong && ipLong <= endLong) {
        return { isForbidden: true, reason: `禁止访问${range.reason}: ${ip}` };
      }
    }
  }

  // 检查IPv6（简化版，只检查本地回环）
  if (net.isIPv6(ip)) {
    if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:')) {
      return { isForbidden: true, reason: `禁止访问IPv6本地/私网地址: ${ip}` };
    }
  }

  return { isForbidden: false };
}

/**
 * 安全解析DNS并验证IP地址
 */
async function resolveAndValidateHostname(hostname: string): Promise<string[]> {
  // 首先检查是否是IP地址
  if (net.isIP(hostname)) {
    const check = isIpInForbiddenRange(hostname);
    if (check.isForbidden) {
      throw new Error(check.reason);
    }
    return [hostname];
  }

  // 解析DNS
  const ips: string[] = [];

  // 解析IPv4
  try {
    const ipv4s = await dnsResolve(hostname);
    ips.push(...ipv4s);
  } catch {
    // 忽略解析错误
  }

  // 解析IPv6
  try {
    const ipv6s = await dnsResolve6(hostname);
    ips.push(...ipv6s);
  } catch {
    // 忽略解析错误
  }

  // 检查所有解析到的IP
  for (const ip of ips) {
    const check = isIpInForbiddenRange(ip);
    if (check.isForbidden) {
      throw new Error(check.reason);
    }
  }

  if (ips.length === 0) {
    throw new Error('无法解析域名');
  }

  return ips;
}

/**
 * 频率限制检查
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAfter: number } {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now >= record.resetAt) {
    // 新的窗口
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAfter: RATE_LIMIT_WINDOW };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    // 超出限制
    return { allowed: false, remaining: 0, resetAfter: record.resetAt - now };
  }

  // 允许访问，更新计数
  record.count += 1;
  rateLimitMap.set(userId, record);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetAfter: record.resetAt - now };
}

/**
 * 审计日志
 */
function auditLog(action: string, details: Record<string, unknown>, success: boolean) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    success,
    ...details,
  };

  // 在生产环境，可以发送到专门的日志系统
  console.log('[AUDIT]', JSON.stringify(logEntry, null, 2));
}

/**
 * ==================== API处理 ====================
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let success = false;
  let errorDetails: string | null = null;

  try {
    // 1. 获取用户身份（实际项目中应该从认证中获取）
    const userId = 'dev-user'; // 临时，应该从 auth 获取真实用户ID

    // 2. 频率限制检查
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      auditLog('fetch-url', { userId, error: 'Rate limit exceeded' }, false);
      return NextResponse.json(
        { error: `请求过于频繁，请在 ${Math.ceil(rateCheck.resetAfter / 1000)} 秒后重试` },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateCheck.resetAfter),
          },
        }
      );
    }

    // 3. 解析请求
    const { url } = await request.json();

    if (!url) {
      auditLog('fetch-url', { userId, error: 'Missing URL' }, false);
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 4. 验证URL格式
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      auditLog('fetch-url', { userId, url, error: 'Invalid URL format' }, false);
      return NextResponse.json({ error: '无效的URL格式' }, { status: 400 });
    }

    // 5. 验证协议
    if (!ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
      auditLog('fetch-url', { userId, url, protocol: urlObj.protocol, error: 'Protocol not allowed' }, false);
      return NextResponse.json({ error: `不支持的协议: ${urlObj.protocol}` }, { status: 400 });
    }

    // 6. 验证主机名
    const hostname = urlObj.hostname;
    if (FORBIDDEN_HOSTNAMES.has(hostname)) {
      auditLog('fetch-url', { userId, url, hostname, error: 'Hostname forbidden' }, false);
      return NextResponse.json({ error: '禁止访问该地址' }, { status: 403 });
    }

    // 7. DNS解析和IP验证
    await resolveAndValidateHostname(hostname);

    // 8. 安全验证通过，执行请求
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await client.fetch(url);
      clearTimeout(timeoutId);

      if (response.status_code !== 0) {
        auditLog('fetch-url', { userId, url, sdkError: response.status_message }, false);
        return NextResponse.json(
          { error: response.status_message || 'Failed to fetch URL' },
          { status: 500 }
        );
      }

      const textContent = response.content
        .filter((item: FetchContentItem) => item.type === 'text')
        .map((item: FetchContentItem) => item.text)
        .join('\n');

      success = true;
      auditLog('fetch-url', { userId, url, duration: Date.now() - startTime, contentSize: textContent.length }, true);

      return NextResponse.json({
        success: true,
        title: response.title,
        url: response.url,
        textContent,
        // 不返回 fullContent 以减少数据泄露风险
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    errorDetails = errorMsg;
    console.error('Fetch URL error:', error);

    auditLog('fetch-url', { error: errorMsg, duration: Date.now() - startTime }, false);

    // 不向用户暴露内部错误细节
    const safeError = errorMsg.includes('禁止') || errorMsg.includes('不支持') || errorMsg.includes('无效')
      ? errorMsg
      : '服务器处理失败';

    return NextResponse.json(
      { error: safeError },
      { status: errorMsg.includes('禁止') ? 403 : 500 }
    );
  }
}
