import { ChatCompletion } from "openai/resources/index.mjs";

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, LLMMessage } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, type } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let systemPrompt = "";
    switch (type) {
      case "outline":
        systemPrompt = "你是一位专业短剧编剧，请根据用户提供的主题或大纲，生成一份详细的短剧大纲。大纲应包含：剧名、类型、集数、每集概要、主要角色、核心冲突。输出格式清晰，便于后续扩写。";
        break;
      case "dialogue":
        systemPrompt = "你是一位专业短剧编剧，请根据用户提供的场景描述，生成精彩的对话内容。要求对话自然、有冲突、符合人物性格，适合短视频节奏。";
        break;
      default:
        systemPrompt = "你是一位专业短剧编剧，请根据用户提供的需求，生成高质量的短剧剧本。要求情节紧凑、人物鲜明、对白精彩，适合短视频平台传播。";
    }

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    const completion = await chatCompletion(messages, {
      model: model || "qwen-plus",
      temperature: 0.7,
      max_tokens: 4096,
    });

    const cc = completion as ChatCompletion;
    return NextResponse.json({
      success: true,
      data: cc.choices[0]?.message?.content || "",
      model: cc.model,
      usage: cc.usage,
    });
  } catch (error) {
    console.error("Generate script error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Generate script failed" },
      { status: 500 }
    );
  }
}
