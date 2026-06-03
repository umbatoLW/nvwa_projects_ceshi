import { ChatCompletion } from "openai/resources/index.mjs";

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, LLMMessage } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const { characterInfo, model } = await request.json();

    if (!characterInfo) {
      return NextResponse.json(
        { error: "Character info is required" },
        { status: 400 }
      );
    }

    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `你是一位AI角色提示词专家。根据角色信息，生成三个角度的生图提示词（正面、侧面、背面），以及表情包提示词列表。
输出JSON格式：
{
  "frontView": "正面视角提示词（英文，详细描述）",
  "sideView": "侧面视角提示词（英文，详细描述）",
  "backView": "背面视角提示词（英文，详细描述）",
  "expressions": [
    { "name": "开心", "prompt": "开心表情提示词" },
    { "name": "生气", "prompt": "生气表情提示词" },
    { "name": "惊讶", "prompt": "惊讶表情提示词" }
  ],
  "consistencyAnchor": "一致性锚点提示词（确保多图一致的关键描述）"
}`,
      },
      {
        role: "user",
        content: `请为以下角色生成生图提示词：\n${JSON.stringify(characterInfo, null, 2)}`,
      },
    ];

    const completion = await chatCompletion(messages, {
      model: model || "qwen-plus",
      temperature: 0.5,
      max_tokens: 4096,
    });

    return NextResponse.json({
      content: (completion as ChatCompletion).choices[0]?.message?.content || "",
      model: (completion as ChatCompletion).model,
      usage: (completion as ChatCompletion).usage,
    });
  } catch (error) {
    console.error("Generate character error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generate character failed" },
      { status: 500 }
    );
  }
}
