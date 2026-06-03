import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, LLMMessage } from "@/lib/ai-client";

interface ExtractedItem {
  name: string;
  character?: string;
  [key: string]: unknown;
}

interface ConsistencyResult {
  originalName: string;
  normalizedName: string;
  confidence: number;
  reason: string;
}

/**
 * 全局一致性检查API
 * 合并相似的角色/道具/场景名称，确保命名统一
 */
export async function POST(request: NextRequest) {
  try {
    const { items, type } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "Items array is required" },
        { status: 400 }
      );
    }

    const typeLabel = type === "costume" ? "服装" : type === "scene" ? "场景" : type === "prop" ? "道具" : "角色";

    // 提取所有名称
    const names = items
      .map((item: ExtractedItem) => item.name || item.character)
      .filter(Boolean);

    if (names.length === 0) {
      return NextResponse.json({ success: true, normalized: items });
    }

    // 使用AI进行一致性检查
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `你是一位数据清洗专家。请检查以下${typeLabel}名称列表，识别并合并相似的名称。

输出JSON数组格式：
[{
  "originalName": "原始名称",
  "normalizedName": "标准化名称",
  "confidence": 0.95,
  "reason": "合并原因"
}]

规则：
1. 合并拼写差异（如"张三"和"张 三"、"张三"和"张三Zhang San"）
2. 合并同义词（如"男主"和"男主角"）
3. 合并缩写和全称（如"总裁办"和"总裁办公室"）
4. confidence表示置信度（0-1）
5. 如果名称无需修改，normalizedName与originalName相同`,
      },
      {
        role: "user",
        content: `请检查以下${typeLabel}名称列表的一致性：
${JSON.stringify([...new Set(names)], null, 2)}

注意：只输出需要修改的映射关系，无需修改的不必输出。`,
      },
    ];

    const completion = await chatCompletion(messages, {
      model: "qwen-plus",
      temperature: 0.1,
      max_tokens: 2048,
    });

    const result = completion as {
      choices: Array<{ message: { content: string } }>;
    };

    const responseContent = result.choices[0]?.message?.content || "[]";

    // 解析AI响应
    let mappings: ConsistencyResult[] = [];
    try {
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        mappings = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse consistency check result");
    }

    // 构建名称映射表
    const nameMap = new Map<string, string>();
    for (const mapping of mappings) {
      if (mapping.confidence >= 0.8) {
        nameMap.set(mapping.originalName, mapping.normalizedName);
      }
    }

    // 应用标准化
    const normalizedItems = items.map((item: ExtractedItem) => {
      const normalizedName = nameMap.get(item.name) || item.name;
      const normalizedCharacter = item.character
        ? (nameMap.get(item.character) || item.character)
        : undefined;

      return {
        ...item,
        name: normalizedName,
        character: normalizedCharacter,
      };
    });

    return NextResponse.json({
      success: true,
      normalized: normalizedItems,
      mappings: mappings.filter(m => m.confidence >= 0.8),
      stats: {
        totalItems: items.length,
        normalizedCount: mappings.filter(m => m.confidence >= 0.8).length,
      },
    });
  } catch (error) {
    console.error("Consistency check error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}
