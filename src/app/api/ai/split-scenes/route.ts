import { NextRequest, NextResponse } from "next/server";
import { getAIClient, LLMMessage } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const { scriptContent, model } = await request.json();

    if (!scriptContent) {
      return NextResponse.json(
        { error: "Script content is required" },
        { status: 400 }
      );
    }

    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `你是一位资深影视分镜师，请将以下剧本内容拆分为详细的分镜脚本。
要求：
1. 每个分镜包含：镜头号、场景描述、镜头类型、画面内容、对白/旁白、时长（秒）
2. 输出JSON数组格式：
[{
  "id": "001",
  "scene": "场景描述",
  "shot": "镜头类型",
  "description": "画面内容",
  "dialogue": "对白",
  "duration": "时长",
  "prompt": "生图提示词（英文，详细描述画面）"
}]
3. 确保每个分镜都有完整的生图提示词（英文，包含人物、场景、光线、风格等细节）
4. 分镜要连贯，符合短剧拍摄逻辑`,
      },
      {
        role: "user",
        content: `请将以下剧本拆分为分镜脚本：\n\n${scriptContent}`,
      },
    ];

    const client = getAIClient();
    const stream = await client.chat.completions.create({
      model: model || "qwen-plus",
      messages,
      temperature: 0.3,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              // 发送每个 chunk
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }
          }

          // 尝试解析完整的 JSON
          let scenes: unknown[] = [];
          try {
            // 清理可能的 markdown 代码块
            const cleanContent = fullContent
              .replace(/```json\n?/g, "")
              .replace(/```\n?/g, "")
              .trim();

            console.log("[split-scenes] 清理后的内容:", cleanContent.substring(0, 200));

            // 尝试多种解析方式
            try {
              scenes = JSON.parse(cleanContent);
              console.log("[split-scenes] 直接解析成功，scenes数量:", Array.isArray(scenes) ? scenes.length : 0);
            } catch (e1) {
              console.log("[split-scenes] 直接解析失败，尝试提取数组:", e1);
              // 尝试提取第一个数组
              const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
              if (arrayMatch) {
                try {
                  scenes = JSON.parse(arrayMatch[0]);
                  console.log("[split-scenes] 数组提取成功，scenes数量:", Array.isArray(scenes) ? scenes.length : 0);
                } catch (e2) {
                  console.error("[split-scenes] 数组提取解析失败:", e2);
                }
              }
            }

            // 确保 scenes 是数组
            if (!Array.isArray(scenes)) {
              console.warn("[split-scenes] scenes 不是数组，重置为空数组");
              scenes = [];
            }
          } catch (parseError) {
            console.error("[split-scenes] JSON parse error:", parseError);
            scenes = [];
          }

          // 发送完成消息，包含最终数据结构
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                data: { scenes: scenes },
                message: `成功拆分出 ${Array.isArray(scenes) ? scenes.length : 0} 个分镜`,
              })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: error instanceof Error ? error.message : "分镜生成失败",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Split scenes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Split scenes failed" },
      { status: 500 }
    );
  }
}
