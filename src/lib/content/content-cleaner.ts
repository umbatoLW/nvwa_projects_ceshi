/**
 * 内容清洗工具
 * 用于清洗AI输出中的JSON代码块、Markdown格式等，提取纯文本内容
 */

/**
 * 清洗选项
 */
export interface CleanOptions {
  /** 移除JSON代码块 */
  removeJsonBlocks?: boolean;
  /** 移除Markdown代码块 */
  removeMarkdownBlocks?: boolean;
  /** 移除HTML标签 */
  removeHtmlTags?: boolean;
  /** 移除多余空白 */
  normalizeWhitespace?: boolean;
  /** 移除AI思考过程 */
  removeThinkingProcess?: boolean;
  /** 保留段落结构 */
  preserveParagraphs?: boolean;
}

const defaultOptions: CleanOptions = {
  removeJsonBlocks: true,
  removeMarkdownBlocks: true,
  removeHtmlTags: true,
  normalizeWhitespace: true,
  removeThinkingProcess: true,
  preserveParagraphs: true,
};

/**
 * 清洗内容，移除JSON代码块和格式化标记
 */
export function cleanContent(content: string, options: Partial<CleanOptions> = {}): string {
  const opts = { ...defaultOptions, ...options };
  let result = content;

  // 移除AI思考过程（<think>...</think>）
  if (opts.removeThinkingProcess) {
    result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
    result = result.replace(/```thinking[\s\S]*?```/gi, '');
  }

  // 移除JSON代码块
  if (opts.removeJsonBlocks) {
    // 移除 ```json ... ``` 代码块
    result = result.replace(/```json[\s\S]*?```/gi, '');
    // 移除纯 ``` ... ``` 代码块中的JSON内容
    result = result.replace(/```[\s\S]*?```/g, (match) => {
      // 检查是否是JSON格式
      const inner = match.slice(3, -3).trim();
      if (inner.startsWith('{') || inner.startsWith('[')) {
        return '';
      }
      return match;
    });
  }

  // 移除Markdown代码块标记（但保留内容）
  if (opts.removeMarkdownBlocks) {
    // 移除代码块标记但保留内容
    result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, '$2');
  }

  // 移除HTML标签
  if (opts.removeHtmlTags) {
    result = result.replace(/<[^>]+>/g, '');
  }

  // 标准化空白字符
  if (opts.normalizeWhitespace) {
    // 移除行首行尾空白
    result = result.split('\n').map(line => line.trim()).join('\n');
    // 移除连续空行（保留段落结构）
    if (opts.preserveParagraphs) {
      result = result.replace(/\n{3,}/g, '\n\n');
    } else {
      result = result.replace(/\n{2,}/g, '\n');
    }
    // 移除首尾空白
    result = result.trim();
  }

  return result;
}

/**
 * 从混合内容中提取剧本正文
 * 处理AI输出中可能包含的JSON + 文本混合情况
 */
export function extractScriptContent(content: string): string {
  // 尝试解析为JSON
  try {
    const parsed = JSON.parse(content);
    // 如果是剧本对象，提取正文
    if (parsed.episodes && Array.isArray(parsed.episodes)) {
      return parsed.episodes
        .map((ep: { episode?: number; title?: string; script?: string }) => {
          const header = ep.title ? `## 第${ep.episode || 1}集：${ep.title}` : `## 第${ep.episode || 1}集`;
          return `${header}\n\n${ep.script || ''}`;
        })
        .join('\n\n---\n\n');
    }
    // 如果有script字段
    if (parsed.script) {
      return parsed.script;
    }
    // 如果有content字段
    if (parsed.content) {
      return parsed.content;
    }
  } catch {
    // 不是JSON，继续处理
  }

  // 清洗内容
  return cleanContent(content);
}

/**
 * 检测内容是否为JSON格式
 */
export function isJsonContent(content: string): boolean {
  const trimmed = content.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
         (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/**
 * 清洗AI输出，移除代码块标记等
 * 用于处理AI直接返回的文本
 * 
 * 【重要】此函数应该保守处理，避免把正常剧本文本清洗掉
 */
export function cleanAiOutput(text: string | null | undefined): string {
  if (!text) return "";
  let cleaned = text;

  // 1. 先检测是否是完整的 JSON 对象（剧本结构）
  // 如果是完整的 JSON，应该解析后提取内容，而不是简单清洗
  try {
    const trimmed = cleaned.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const parsed = JSON.parse(trimmed);
      
      // 如果是剧本 JSON 结构，提取纯文本
      if (parsed && typeof parsed === 'object') {
        // 剧本格式：{ script: "...", episodes: [...] }
        if (parsed.script && typeof parsed.script === 'string') {
          return parsed.script;
        }
        if (parsed.content && typeof parsed.content === 'string') {
          return parsed.content;
        }
        if (parsed.episodes && Array.isArray(parsed.episodes)) {
          return parsed.episodes
            .map((ep: { episode?: number; title?: string; script?: string }) => {
              const header = ep.title ? `【第${ep.episode || 1}集】${ep.title}` : `【第${ep.episode || 1}集】`;
              return `${header}\n\n${ep.script || ''}`;
            })
            .join('\n\n');
        }
        // 其他 JSON 对象，尝试提取有意义的文本字段
        if (parsed.title || parsed.logline || parsed.synopsis) {
          const parts: string[] = [];
          if (parsed.title) parts.push(`《${parsed.title}》`);
          if (parsed.logline) parts.push(`一句话：${parsed.logline}`);
          if (parsed.synopsis) parts.push(`简介：${parsed.synopsis}`);
          return parts.join('\n\n');
        }
      }
    }
  } catch {
    // 不是有效 JSON，继续清洗
  }

  // 2. 去除代码块标记（但保留内容）
  cleaned = cleaned.replace(/```json\s*([\s\S]*?)\s*```/g, "$1");
  cleaned = cleaned.replace(/```markdown\s*([\s\S]*?)\s*```/g, "$1");
  cleaned = cleaned.replace(/```text\s*([\s\S]*?)\s*```/g, "$1");
  cleaned = cleaned.replace(/```script\s*([\s\S]*?)\s*```/g, "$1");
  // 通用代码块：检查内容是否是 JSON，如果是则提取，否则保留
  cleaned = cleaned.replace(/```(\w*)\s*([\s\S]*?)\s*```/g, (match, lang, content) => {
    const trimmed = content.trim();
    // 如果内容是 JSON 对象，尝试解析
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          if (parsed.script) return parsed.script;
          if (parsed.content) return parsed.content;
          if (parsed.episodes) {
            return (parsed.episodes as Array<{ episode?: number; title?: string; script?: string }>)
              .map(ep => `【第${ep.episode || 1}集】${ep.title || ''}\n\n${ep.script || ''}`)
              .join('\n\n');
          }
        }
      } catch {
        // JSON 解析失败，返回原内容
        return content;
      }
    }
    return content;
  });

  // 3. 去除开头的 "json" 标记
  cleaned = cleaned.replace(/^json\s*/i, "");

  // 4. 去除 HTML script 标签
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 5. 【保守处理】只清洗明确的 JSON 代码块标记，不清洗正常文本中的引号
  // 检测是否是 JSON 格式（以 { 或 [ 开头）
  const isJsonLike = cleaned.trim().startsWith('{') || cleaned.trim().startsWith('[');
  
  if (isJsonLike) {
    // 尝试再次解析（可能外层代码块被移除后露出 JSON）
    try {
      const parsed = JSON.parse(cleaned.trim());
      if (parsed && typeof parsed === 'object') {
        if (parsed.script) return parsed.script;
        if (parsed.content) return parsed.content;
        if (parsed.episodes) {
          return (parsed.episodes as Array<{ episode?: number; title?: string; script?: string }>)
            .map(ep => `【第${ep.episode || 1}集】${ep.title || ''}\n\n${ep.script || ''}`)
            .join('\n\n');
        }
      }
    } catch {
      // 不是有效 JSON，保留原文本
    }
  }

  // 6. 去除多余空行
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * 安全解析JSON，失败返回null
 */
export function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

/**
 * 检测数据是否为剧本JSON结构
 */
export function isScriptJson(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const fields = ["title", "logline", "synopsis", "characters", "episodes", "content", "script", "coreDialogues"];
  return fields.some(field => field in (data as Record<string, unknown>));
}

/**
 * 将剧本JSON格式化为可编辑文本
 */
export function formatScriptJsonToText(json: Record<string, unknown>): string {
  const parts: string[] = [];

  if (json.title) {
    parts.push(`《${json.title}》`);
    parts.push("");
  }

  if (json.logline || json.synopsis) {
    parts.push("【故事简介】");
    parts.push(String(json.logline || json.synopsis));
    parts.push("");
  }

  if (json.characters && Array.isArray(json.characters)) {
    parts.push("【人物小传】");
    json.characters.forEach((char: Record<string, unknown>, i: number) => {
      parts.push(`${i + 1}. ${String(char.name || char["角色名"] || "角色")}`);
      if (char.description || char["人物简介"]) {
        parts.push(`   ${String(char.description || char["人物简介"])}`);
      }
    });
    parts.push("");
  }

  if (json.coreDialogues && Array.isArray(json.coreDialogues)) {
    parts.push("【核心对话】");
    json.coreDialogues.forEach((dialogue: unknown) => {
      if (typeof dialogue === "string") {
        parts.push(dialogue);
      } else if (dialogue && typeof dialogue === "object") {
        const d = dialogue as Record<string, unknown>;
        parts.push(String(d.content || d["内容"] || ""));
      }
    });
    parts.push("");
  }

  if (json.episodes && Array.isArray(json.episodes)) {
    parts.push("【剧集大纲】");
    json.episodes.forEach((ep: Record<string, unknown>, i: number) => {
      parts.push(`第 ${i + 1} 集: ${String(ep.title || ep["集标题"] || "")}`);
      if (ep.summary || ep["剧情简介"]) {
        parts.push(`   ${String(ep.summary || ep["剧情简介"])}`);
      }
    });
    parts.push("");
  }

  if (json.content || json.script) {
    parts.push("【剧本正文】");
    parts.push(String(json.content || json.script));
  }

  return parts.join("\n");
}

/**
 * 安全解析JSON，失败时返回null
 */
export function safeParseJson<T = unknown>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * 格式化剧本内容为可读文本
 */
export function formatScriptForDisplay(content: string): string {
  // 如果是JSON格式，尝试解析并格式化
  if (isJsonContent(content)) {
    const parsed = safeParseJson(content);
    if (parsed && typeof parsed === 'object') {
      // 检查是否是剧本结构
      if ('episodes' in parsed && Array.isArray(parsed.episodes)) {
        return formatEpisodes(parsed.episodes);
      }
      if ('title' in parsed || 'logline' in parsed) {
        return formatScriptObject(parsed as {
          title?: string;
          logline?: string;
          genre?: string;
          mainCharacters?: unknown[];
          episodes?: unknown[];
        });
      }
    }
  }

  // 普通文本，直接返回清洗后的内容
  return cleanContent(content);
}

/**
 * 格式化剧集数组
 */
function formatEpisodes(episodes: Array<{
  episode?: number;
  title?: string;
  script?: string;
  summary?: string;
}>): string {
  return episodes.map(ep => {
    const num = ep.episode || 1;
    const title = ep.title || `第${num}集`;
    const content = ep.script || ep.summary || '';
    return `## 第${num}集：${title}\n\n${content}`;
  }).join('\n\n---\n\n');
}

/**
 * 格式化剧本对象
 */
function formatScriptObject(obj: {
  title?: string;
  logline?: string;
  genre?: string;
  mainCharacters?: unknown[];
  episodes?: unknown[];
}): string {
  const parts: string[] = [];

  if (obj.title) {
    parts.push(`# ${obj.title}`);
  }

  if (obj.genre) {
    parts.push(`**类型**：${obj.genre}`);
  }

  if (obj.logline) {
    parts.push(`**简介**：${obj.logline}`);
  }

  if (obj.mainCharacters && Array.isArray(obj.mainCharacters)) {
    const chars = obj.mainCharacters.map(c => {
      if (typeof c === 'object' && c !== null) {
        const char = c as { name?: string; role?: string; description?: string };
        return `${char.name || '未知'}（${char.role || '角色'}）：${char.description || ''}`;
      }
      return String(c);
    }).join('\n');
    parts.push(`**主要角色**：\n${chars}`);
  }

  if (obj.episodes && Array.isArray(obj.episodes)) {
    parts.push('---\n' + formatEpisodes(obj.episodes as Array<{
      episode?: number;
      title?: string;
      script?: string;
    }>));
  }

  return parts.join('\n\n');
}

/**
 * 清洗AI对话输出，移除系统消息和元数据
 */
export function cleanChatOutput(content: string): string {
  let result = content;

  // 移除系统提示
  result = result.replace(/system:\s*[\s\S]*?(?=user:|assistant:|$)/gi, '');
  
  // 移除角色标记
  result = result.replace(/^(user|assistant|system):\s*/gim, '');
  
  // 移除时间戳
  result = result.replace(/\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]/g, '');

  return cleanContent(result);
}

/**
 * 从内容中提取标题
 */
export function extractTitle(content: string): string | null {
  // 尝试匹配Markdown标题
  const mdMatch = content.match(/^#\s+(.+)$/m);
  if (mdMatch) {
    return mdMatch[1].trim();
  }

  // 尝试匹配JSON中的title
  if (isJsonContent(content)) {
    const parsed = safeParseJson<{ title?: string }>(content);
    if (parsed?.title) {
      return parsed.title;
    }
  }

  // 尝试匹配"剧名："格式
  const labelMatch = content.match(/剧名[：:]\s*(.+?)(?:\n|$)/);
  if (labelMatch) {
    return labelMatch[1].trim();
  }

  return null;
}
