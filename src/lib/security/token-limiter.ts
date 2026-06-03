/**
 * Token输入限制器
 * 用于限制AI接口的输入token数量
 */

// Token限制配置
const TOKEN_LIMITS: Record<string, { maxInput: number; maxOutput: number }> = {
  "generate-image": { maxInput: 8000, maxOutput: 4096 },
  "generate-video": { maxInput: 4000, maxOutput: 2048 },
  "generate-3d": { maxInput: 4000, maxOutput: 2048 },
  "chat": { maxInput: 128000, maxOutput: 8192 },
  "generate-script": { maxInput: 64000, maxOutput: 16000 },
  "extract-stream": { maxInput: 8000, maxOutput: 4096 },
};

/**
 * 估算文本的token数量
 * 中文约1.5字符/token，英文约4字符/token
 * 这是一个近似估算，实际应使用tokenizer
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // 统计中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 非中文字符
  const otherChars = text.length - chineseChars;

  // 中文约1.5字符/token，英文约4字符/token
  const chineseTokens = Math.ceil(chineseChars / 1.5);
  const otherTokens = Math.ceil(otherChars / 4);

  return chineseTokens + otherTokens;
}

interface TokenValidationResult {
  valid: boolean;
  inputTokens: number;
  maxInput: number;
  truncated?: Record<string, string>;
  reason?: string;
}

interface TextContent {
  [key: string]: string | undefined;
}

/**
 * 验证并截断token
 */
export function validateTokenLimit(
  content: TextContent,
  endpoint: keyof typeof TOKEN_LIMITS
): TokenValidationResult {
  const config = TOKEN_LIMITS[endpoint];
  if (!config) {
    return { valid: true, inputTokens: 0, maxInput: 0 };
  }

  let totalTokens = 0;
  const truncated: Record<string, string> = {};

  for (const [key, value] of Object.entries(content)) {
    if (!value) continue;

    const tokens = estimateTokens(value);
    totalTokens += tokens;

    // 如果超过限制，截断内容
    if (tokens > config.maxInput) {
      // 估算需要保留的字符数
      const avgCharsPerToken = value.length / tokens;
      const maxChars = Math.floor(config.maxInput * avgCharsPerToken * 0.9); // 留10%余量

      truncated[key] = value.slice(0, maxChars) + "...[内容已截断]";
      totalTokens = totalTokens - tokens + config.maxInput;
    }
  }

  return {
    valid: totalTokens <= config.maxInput,
    inputTokens: totalTokens,
    maxInput: config.maxInput,
    truncated: Object.keys(truncated).length > 0 ? truncated : undefined,
  };
}

/**
 * 智能截断对话历史
 * 保留最新的对话，截断最早的
 */
export function truncateMessages(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Array<{ role: string; content: string }> {
  let totalTokens = 0;
  const result: Array<{ role: string; content: string }> = [];

  // 从最新到最早处理
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const tokens = estimateTokens(msg.content);

    if (totalTokens + tokens <= maxTokens) {
      result.unshift(msg);
      totalTokens += tokens;
    } else {
      // 如果这条消息太长，尝试截断
      if (tokens > maxTokens / 2) {
        const avgCharsPerToken = msg.content.length / tokens;
        const maxChars = Math.floor((maxTokens - totalTokens) * avgCharsPerToken * 0.8);
        if (maxChars > 100) {
          result.unshift({
            ...msg,
            content: msg.content.slice(-maxChars) + "...[历史消息已截断]",
          });
        }
      }
      break;
    }
  }

  return result;
}

/**
 * 获取Token使用统计
 */
export function getTokenStats(
  endpoint: keyof typeof TOKEN_LIMITS
): { maxInput: number; maxOutput: number } {
  return TOKEN_LIMITS[endpoint] || { maxInput: 0, maxOutput: 0 };
}
