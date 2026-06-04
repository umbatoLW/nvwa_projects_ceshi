/**
 * 安全 JSON 解析工具
 * 
 * 集成 jsonrepair 库，提供 LLM 输出的鲁棒解析能力
 * 支持：
 * - 修复常见 JSON 格式错误（缺少引号、尾随逗号等）
 * - 提取 Markdown 代码块中的 JSON
 * - 多层嵌套 JSON 解析
 */

import { jsonrepair } from "jsonrepair";
import { logger } from "./logger";

// ============================================
// 类型定义
// ============================================

export interface SafeParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  raw?: string;
  repaired?: boolean;
}

// ============================================
// 核心解析函数
// ============================================

/**
 * 安全解析 JSON 字符串
 * 自动修复常见格式错误
 */
export function safeJsonParse<T = unknown>(input: string): SafeParseResult<T> {
  if (!input || typeof input !== "string") {
    return { success: false, error: "输入为空或非字符串" };
  }

  let cleaned = input.trim();
  let repaired = false;

  try {
    // 1. 尝试直接解析
    return { success: true, data: JSON.parse(cleaned) as T, raw: input };
  } catch {
    // 继续修复
  }

  // 2. 提取 Markdown 代码块
  cleaned = extractJsonFromMarkdown(cleaned);

  // 3. 移除常见干扰字符
  cleaned = cleanJsonString(cleaned);

  try {
    // 4. 尝试直接解析清理后的字符串
    const data = JSON.parse(cleaned) as T;
    return { success: true, data, raw: input, repaired: cleaned !== input.trim() };
  } catch {
    // 继续使用 jsonrepair
  }

  try {
    // 5. 使用 jsonrepair 修复并解析
    const repairedStr = jsonrepair(cleaned);
    const data = JSON.parse(repairedStr) as T;
    repaired = true;
    
    logger.debug("[SafeJson] 使用 jsonrepair 修复成功", {
      original: input.slice(0, 100),
      repaired: repairedStr.slice(0, 100),
    });
    
    return { success: true, data, raw: input, repaired };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn("[SafeJson] 解析失败", { input: input.slice(0, 200), error: errorMsg });
    return { success: false, error: errorMsg, raw: input };
  }
}

/**
 * 从 Markdown 代码块中提取 JSON
 */
export function extractJsonFromMarkdown(text: string): string {
  // 匹配 ```json ... ``` 或 ``` ... ```
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
  const matches = [...text.matchAll(jsonBlockRegex)];
  
  if (matches.length > 0) {
    // 返回第一个匹配的代码块内容
    return matches[0][1].trim();
  }

  // 匹配 { ... } 或 [ ... ]
  const objectRegex = /\{[\s\S]*\}/;
  const arrayRegex = /\[[\s\S]*\]/;
  
  const objectMatch = text.match(objectRegex);
  if (objectMatch) {
    return objectMatch[0];
  }
  
  const arrayMatch = text.match(arrayRegex);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return text;
}

/**
 * 清理 JSON 字符串中的常见干扰
 */
export function cleanJsonString(text: string): string {
  let cleaned = text;

  // 移除控制字符
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (char) => {
    // 保留 \n, \r, \t
    if (char === "\n" || char === "\r" || char === "\t") {
      return char;
    }
    return "";
  });

  // 修复常见错误
  // 1. 修复单引号为双引号（简单场景）
  // cleaned = cleaned.replace(/(['"])([^'"]*?)\1/g, '"$2"');

  // 2. 移除注释
  cleaned = cleaned.replace(/\/\/.*$/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

  // 3. 修复尾随逗号
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  // 4. 修复缺少引号的键名（简单场景）
  // cleaned = cleaned.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  return cleaned.trim();
}

// ============================================
// 便捷方法
// ============================================

/**
 * 解析 LLM 响应中的 JSON
 * 支持多种格式：
 * - 纯 JSON
 * - Markdown 代码块
 * - 混合文本
 */
export function parseLlmJson<T = unknown>(response: string): T | null {
  const result = safeJsonParse<T>(response);
  return result.success ? result.data! : null;
}

/**
 * 解析嵌套 JSON 字符串
 * 例如: '"{\"key\": \"value\"}"'
 */
export function parseNestedJson(input: string, maxDepth = 5): unknown {
  let current = input;
  let depth = 0;

  while (depth < maxDepth) {
    const result = safeJsonParse(current);
    if (!result.success) {
      return null;
    }

    // 如果解析结果是字符串，继续解析
    if (typeof result.data === "string" && result.data !== current) {
      current = result.data;
      depth++;
    } else {
      return result.data;
    }
  }

  return null;
}

/**
 * 验证并解析 JSON，支持 Zod schema
 */
export async function validateJson<T>(
  input: string,
  schema?: { parse: (data: unknown) => T }
): Promise<SafeParseResult<T>> {
  const result = safeJsonParse<T>(input);

  if (!result.success || !schema) {
    return result;
  }

  try {
    const validated = schema.parse(result.data);
    return { success: true, data: validated, raw: input, repaired: result.repaired };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `验证失败: ${errorMsg}`, raw: input };
  }
}

// ============================================
// 导出
// ============================================

export { jsonrepair as repairJSON };
