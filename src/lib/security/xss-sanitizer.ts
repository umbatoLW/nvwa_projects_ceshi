/**
 * XSS 过滤工具
 * 用于清理用户输入，防止 XSS 攻击
 */

/**
 * 危险的 HTML 标签
 */
const DANGEROUS_TAGS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<applet\b[^>]*>/gi,
  /<form\b[^>]*>/gi,
];

/**
 * 危险的 HTML 属性
 */
const DANGEROUS_ATTRS = [
  /\s*on\w+\s*=\s*["'][^"']*["']/gi,  // onclick, onload, onerror 等
  /\s*javascript\s*:/gi,
  /\s*data\s*:/gi,
  /\s*vbscript\s*:/gi,
];

/**
 * 清理 HTML 内容，移除危险的标签和属性
 * @param input 用户输入的字符串
 * @param options 配置选项
 * @returns 清理后的安全字符串
 */
export function sanitizeHtml(
  input: string,
  options: {
    /** 允许的 HTML 标签（默认只允许基本格式化标签） */
    allowedTags?: string[];
    /** 最大长度限制 */
    maxLength?: number;
  } = {}
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let cleaned = input;

  // 移除危险的 HTML 标签
  for (const pattern of DANGEROUS_TAGS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 移除危险的属性
  for (const pattern of DANGEROUS_ATTRS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 移除 HTML 注释
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 如果指定了允许的标签，移除其他所有标签
  if (options.allowedTags && options.allowedTags.length > 0) {
    const allowedPattern = new RegExp(
      `<(?!\\/?(?:${options.allowedTags.join('|')})\\b)[^>]+>`,
      'gi'
    );
    cleaned = cleaned.replace(allowedPattern, '');
  }

  // 长度限制
  if (options.maxLength && cleaned.length > options.maxLength) {
    cleaned = cleaned.slice(0, options.maxLength);
  }

  return cleaned.trim();
}

/**
 * 清理纯文本输入（移除所有 HTML）
 * @param input 用户输入的字符串
 * @param maxLength 最大长度限制
 * @returns 纯文本字符串
 */
export function sanitizeText(input: string, maxLength?: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // 移除所有 HTML 标签
  let cleaned = input.replace(/<[^>]+>/g, '');

  // 解码 HTML 实体
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 移除控制字符
  cleaned = cleaned.replace(/[\x00-\x1f\x7f]/g, '');

  // 长度限制
  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned.trim();
}

/**
 * 清理对象中的所有字符串字段
 * @param obj 要清理的对象
 * @param options 清理选项
 * @returns 清理后的对象
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    /** 字段清理配置 */
    fields?: Record<string, { type: 'html' | 'text'; maxLength?: number }>;
    /** 默认最大长度 */
    defaultMaxLength?: number;
  } = {}
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const fieldConfig = options.fields?.[key];
      if (fieldConfig?.type === 'html') {
        result[key] = sanitizeHtml(value, { maxLength: fieldConfig.maxLength });
      } else {
        result[key] = sanitizeText(value, fieldConfig?.maxLength || options.defaultMaxLength);
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * 清理剧本数据输入
 */
export function sanitizeScriptInput(input: {
  title?: string;
  genre?: string;
  synopsis?: string;
  content?: string;
  [key: string]: unknown;
}): {
  title: string;
  genre: string;
  synopsis: string;
  content: string;
  [key: string]: unknown;
} {
  return sanitizeObject(input, {
    fields: {
      title: { type: 'text', maxLength: 200 },
      genre: { type: 'text', maxLength: 50 },
      synopsis: { type: 'html', maxLength: 5000 },
      content: { type: 'html', maxLength: 1000000 },  // 剧本内容可能很长
    },
    defaultMaxLength: 10000,
  }) as {
    title: string;
    genre: string;
    synopsis: string;
    content: string;
    [key: string]: unknown;
  };
}
