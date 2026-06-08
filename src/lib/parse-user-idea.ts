/**
 * 用户创意解析模块
 * 使用 AI 语义理解替代正则，提取用户意图的结构化数据
 * @updated 2026-06-07 - 修复模型名称为 deepseek-v4-flash
 */

import OpenAI from "openai";
import { getApiKeyForModel } from "@/lib/platform-keys";
import { logger } from "@/lib/logger";

export interface ParsedIntent {
  // 题材
  genre: string;
  subGenre?: string;
  
  // 风格
  styles: string[];
  
  // 禁止项（用户明确禁止的内容）
  forbidden: string[];
  
  // 要求项（用户明确要求的内容）
  requirements: string[];
  
  // 集数要求
  targetEpisodes: number | null;
  
  // 核心创意（清理后的创意描述）
  coreIdea: string;
  
  // 清理后的创意（移除禁止项/要求项后的纯创意）
  cleanIdea: string;
  
  // 有效的禁止项（合并 forbidden 和 requirements 中的负面约束）
  effectiveForbidden: string[];
  
  // AI 理解的置信度
  confidence: number;
  
  // 推断的题材（如果用户没有明确指定）
  inferredGenre?: string;
}

/**
 * 使用 AI 理解用户创意，提取结构化数据
 */
export async function parseUserIdea(userInput: string, model: string = "deepseek-v4-flash"): Promise<ParsedIntent> {
  try {
    // 获取 API 配置
    const platformConfig = await getApiKeyForModel(model);
    const apiKey = platformConfig?.apiKey || process.env.DEEPSEEK_API_KEY || "";
    const baseURL = platformConfig?.baseUrl || "https://api.deepseek.com";
    
    if (!apiKey) {
      const error = new Error("[parseUserIdea] 未找到 API Key，请检查模型配置");
      logger.error(error.message);
      throw error;
    }
    
    const client = new OpenAI({ apiKey, baseURL });
    
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: `你是一个剧本创作助手，专门负责理解用户的创意输入并提取结构化信息。

请分析用户的创意输入，提取以下信息（以 JSON 格式返回）：

1. **genre**: 主题材（古装/现代/仙侠/科幻/悬疑/都市/年代等）
2. **subGenre**: 子题材（权谋/甜宠/喜剧/虐恋/复仇等）
3. **styles**: 风格标签数组（轻松/热血/虐心/治愈/暗黑等）
4. **forbidden**: 禁止项数组（用户明确禁止的内容，如穿越、重生、金手指等）
5. **requirements**: 要求项数组（用户明确要求的内容，如抛弃励志正剧思维、创新等）
6. **targetEpisodes**: 目标集数（如果用户指定了集数，否则为 null）
7. **coreIdea**: 核心创意（一句话概括故事核心）
8. **cleanIdea**: 清理后的创意（移除禁止/要求格式标记后的纯故事描述）
9. **confidence**: 置信度（0-1，表示对理解结果的把握程度）

**重要**：
- 仔细识别用户输入中的"禁止"、"不要"、"拒绝"、"避免"等负面约束
- 这些约束必须放入 forbidden 数组
- cleanIdea 中不要包含禁止项和要求项的格式标记

**示例输入**：
"故事：司马光砸缸，要求：抛弃励志正剧思维，重新开创新意，禁止：穿越剧情"

**示例输出**：
{
  "genre": "古装",
  "subGenre": "喜剧",
  "styles": ["轻松", "创新"],
  "forbidden": ["穿越剧情", "穿越"],
  "requirements": ["抛弃励志正剧思维", "重新开创新意"],
  "targetEpisodes": null,
  "coreIdea": "司马光砸缸救人的故事新编",
  "cleanIdea": "司马光砸缸，抛弃励志正剧思维，重新开创新意",
  "confidence": 0.95
}`
        },
        {
          role: "user",
          content: `请分析以下用户创意输入，提取结构化信息：

"${userInput}"

只返回 JSON，不要有其他内容。`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error("[parseUserIdea] AI 返回空内容");
      return getDefaultIntent(userInput);
    }
    
    const parsed = JSON.parse(content);
    
    // 构建有效的禁止项
    const effectiveForbidden = [
      ...parsed.forbidden || [],
      // 从 requirements 中提取负面约束
      ...(parsed.requirements || []).filter((r: string) => 
        r.includes("不") || r.includes("禁止") || r.includes("避免") || r.includes("拒绝")
      )
    ];
    
    const result: ParsedIntent = {
      genre: parsed.genre || "都市",
      subGenre: parsed.subGenre,
      styles: parsed.styles || [],
      forbidden: parsed.forbidden || [],
      requirements: parsed.requirements || [],
      targetEpisodes: parsed.targetEpisodes,
      coreIdea: parsed.coreIdea || userInput,
      cleanIdea: parsed.cleanIdea || userInput,
      effectiveForbidden,
      confidence: parsed.confidence || 0.8,
      inferredGenre: parsed.genre ? undefined : parsed.genre
    };
    
    logger.info("[parseUserIdea] 解析结果:", JSON.stringify(result, null, 2));
    return result;
    
  } catch (error) {
    logger.error("[parseUserIdea] 解析失败:", error);
    return getDefaultIntent(userInput);
  }
}

/**
 * 获取默认的解析结果（当 AI 解析失败时使用）
 */
function getDefaultIntent(userInput: string): ParsedIntent {
  // 简单的正则兜底
  const forbidden: string[] = [];
  
  // 尝试提取禁止项
  const forbiddenMatch = userInput.match(/禁止[：:]\s*([\s\S]*?)(?=\n\n|要求|故事|创意|$)/i);
  if (forbiddenMatch) {
    const items = forbiddenMatch[1].split(/[,，、\n]/).map(s => s.trim()).filter(Boolean);
    forbidden.push(...items);
  }
  
  return {
    genre: "都市",
    styles: [],
    forbidden,
    requirements: [],
    targetEpisodes: null,
    coreIdea: userInput,
    cleanIdea: userInput,
    effectiveForbidden: forbidden,
    confidence: 0.5
  };
}

/**
 * 格式化禁止项为 prompt 约束文本
 */
export function formatForbiddenPrompt(forbidden: string[]): string {
  if (!forbidden.length) return "";
  
  return `
## ⚠️ 严格禁止（必须遵守）

以下内容在剧本中**绝对禁止出现**，违反将导致生成失败：

${forbidden.map((item, i) => `${i + 1}. ${item}`).join("\n")}

**再次强调**：以上 ${forbidden.length} 项内容严禁出现！`;
}

// 导出类型别名，保持兼容
export type ParsedUserIdea = ParsedIntent;
