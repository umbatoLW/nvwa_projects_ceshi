/**
 * 火山引擎 API 签名认证模块（V4签名算法）
 * 用于即梦、可灵等火山引擎旗下服务的API调用
 */

import crypto from 'crypto';

// 火山引擎签名配置
export const VOLCENGINE_CONFIG = {
  service: 'cv',
  region: 'cn-north-1',
  host: 'visual.volcengineapi.com',
  baseUrl: 'https://visual.volcengineapi.com',
};

/**
 * 火山引擎 V4 签名器
 */
export class VolcengineSigner {
  private accessKeyId: string;
  private secretAccessKey: string;
  private service: string;
  private region: string;
  private host: string;

  constructor(
    accessKeyId: string,
    secretAccessKey: string,
    service: string = VOLCENGINE_CONFIG.service,
    region: string = VOLCENGINE_CONFIG.region,
    host: string = VOLCENGINE_CONFIG.host
  ) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.service = service;
    this.region = region;
    this.host = host;
  }

  /**
   * SHA256 哈希
   */
  private hashSha256(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * HMAC-SHA256
   */
  private hmacSha256(key: Buffer | string, content: string): Buffer {
    return crypto.createHmac('sha256', key).update(content).digest();
  }

  /**
   * 生成签名密钥
   * 格式: HMAC-SHA256(HMAC-SHA256(HMAC-SHA256(HMAC-SHA256("secret", date), region), service), "request")
   */
  private getSigningKey(date: string): Buffer {
    const kDate = this.hmacSha256(this.secretAccessKey, date);
    const kRegion = this.hmacSha256(kDate, this.region);
    const kService = this.hmacSha256(kRegion, this.service);
    const kSigning = this.hmacSha256(kService, 'request');
    return kSigning;
  }

  /**
   * URI 编码（火山引擎规范）
   */
  private uriEncode(str: string, encodeSlash: boolean = true): string {
    let result = encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
    
    if (!encodeSlash) {
      result = result.replace(/%2F/g, '/');
    }
    return result;
  }

  /**
   * 构建规范查询字符串
   */
  private buildCanonicalQueryString(query: Record<string, string>): string {
    const sortedKeys = Object.keys(query).sort();
    const pairs = sortedKeys.map(key => 
      `${this.uriEncode(key, true)}=${this.uriEncode(query[key], true)}`
    );
    return pairs.join('&');
  }

  /**
   * 构建规范Headers字符串
   * 每行格式: lowercase_header_name:header_value\n
   */
  private buildCanonicalHeaders(headers: Record<string, string>): string {
    const sortedKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
    const lines: string[] = [];
    for (const key of sortedKeys) {
      // trim value and collapse multiple spaces
      const value = headers[key].trim().replace(/\s+/g, ' ');
      lines.push(`${key}:${value}`);
    }
    return lines.join('\n') + '\n';
  }

  /**
   * 生成签名并发送请求
   */
  async request(
    method: string,
    action: string,
    version: string,
    body: Record<string, unknown>
  ): Promise<{
    statusCode: number;
    body: Record<string, unknown>;
    headers: Record<string, string>;
  }> {
    const now = new Date();
    // X-Date 格式: YYYYMMDDTHHMMSSZ
    const xDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const shortDate = xDate.substring(0, 8);

    const bodyStr = JSON.stringify(body);
    const xContentSha256 = this.hashSha256(bodyStr);
    
    // 需要签名的headers（按字母顺序）
    const signedHeadersList = ['content-type', 'host', 'x-content-sha256', 'x-date'];
    const signedHeaders = signedHeadersList.join(';');

    // Query 参数
    const query: Record<string, string> = {
      Action: action,
      Version: version,
    };
    const canonicalQueryString = this.buildCanonicalQueryString(query);

    // Headers（小写键名）
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'host': this.host,
      'x-content-sha256': xContentSha256,
      'x-date': xDate,
    };
    const canonicalHeaders = this.buildCanonicalHeaders(headers);

    // 构建规范请求
    const canonicalRequest = [
      method.toUpperCase(),
      '/',  // CanonicalURI
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      xContentSha256,
    ].join('\n');

    // 构建待签名字符串
    const credentialScope = `${shortDate}/${this.region}/${this.service}/request`;
    const hashedCanonicalRequest = this.hashSha256(canonicalRequest);
    const stringToSign = [
      'HMAC-SHA256',
      xDate,
      credentialScope,
      hashedCanonicalRequest,
    ].join('\n');

    // 计算签名
    const signingKey = this.getSigningKey(shortDate);
    const signature = this.hmacSha256(signingKey, stringToSign).toString('hex');

    // 构建 Authorization header
    const authorization = `HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // 发送请求
    const url = `https://${this.host}/?${canonicalQueryString}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Host': this.host,
        'Content-Type': 'application/json',
        'X-Date': xDate,
        'X-Content-Sha256': xContentSha256,
        'Authorization': authorization,
      },
      body: bodyStr,
    });

    const responseBody = await response.json() as Record<string, unknown>;

    return {
      statusCode: response.status,
      body: responseBody,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }
}

/**
 * 创建签名器实例
 */
export function createVolcengineSigner(
  accessKeyId: string,
  secretAccessKey: string
): VolcengineSigner {
  return new VolcengineSigner(accessKeyId, secretAccessKey);
}
