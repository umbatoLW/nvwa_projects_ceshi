import { NextRequest } from "next/server";
import { chatCompletion, LLMMessage } from "@/lib/ai-client";
import { createManagedStream, encodeSSE } from "@/lib/stream/stream-utils";
import { logger } from "@/lib/logger";

// 流式提取服装/场景/道具数据
export async function POST(request: NextRequest) {
  try {
    const { type, scriptContent, episode } = await request.json();

    if (!type || !scriptContent) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 定义提示词
    const prompts: Record<string, string> = {
      costume: `你是一位影视服装设计师。请从剧本中提取角色服装信息。

严格按照以下JSON数组格式输出，每个服装对象之间用换行分隔：
[
  {
    "name": "服装名称（如：萧珊面试装）",
    "character": "对应人物",
    "style": "风格特点（如：奢华强势的贵妇风）",
    "details": "细节描述（详细描述服装的颜色、材质、款式、配饰等）",
    "imagePrompt": "生图提示词（英文，包含完整的服装描述、光影、风格等）"
  }
]

要求：
1. 每个角色可能有多个服装造型，请全部提取
2. details字段要详细，包含颜色、材质、款式、配饰等
3. imagePrompt必须是英文，包含风格、光影、构图、细节等关键词
4. 提取完所有服装后，输出JSON数组`,

      scene: `你是一位影视美术指导。请从剧本中提取场景信息。

严格按照以下JSON数组格式输出：
[
  {
    "name": "场景名称",
    "character": "相关角色",
    "style": "风格特点",
    "details": "细节描述（场景的具体布置、氛围、道具陈设等）",
    "imagePrompt": "生图提示词（英文）"
  }
]

要求：
1. 提取所有不同的场景
2. details字段要详细，包含场景的具体描述
3. imagePrompt必须是英文`,

      prop: `你是一位影视道具师。请从剧本中提取道具信息。

严格按照以下JSON数组格式输出：
[
  {
    "name": "道具名称",
    "character": "使用角色",
    "style": "风格特点",
    "details": "细节描述（道具的外观、材质、功能等）",
    "imagePrompt": "生图提示词（英文）"
  }
]

要求：
1. 提取所有重要的道具
2. details字段要详细，包含道具的具体特征
3. imagePrompt必须是英文`,
    };

    const systemPrompt = prompts[type];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const episodeText = episode ? `第${episode}集` : "";
    const userContent = `请从以下${episodeText}剧本内容中提取${type === "costume" ? "服装" : type === "scene" ? "场景" : "道具"}信息：\n\n${scriptContent.substring(0, 8000)}`;

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    // 使用带管理的流式响应
    return createManagedStream(async (controller, streamSignal) => {
      try {
        const completion = await chatCompletion(messages, {
          model: "qwen-plus",
          temperature: 0.3,
          max_tokens: 4096,
          stream: true,
        }, streamSignal) as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>;

        let fullContent = "";

        for await (const chunk of completion) {
          // 检查是否已中止
          if (streamSignal.aborted) {
            logger.info("[ExtractStream] Request aborted by client");
            break;
          }

          const content = chunk.choices?.[0]?.delta?.content || "";
          if (content) {
            fullContent += content;
            // 发送增量数据
            controller.enqueue(encodeSSE({ type: "delta", content }));
          }
        }

        // 尝试解析最终结果
        try {
          const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const items = JSON.parse(jsonMatch[0]);
            controller.enqueue(encodeSSE({ type: "complete", items }));
          } else {
            controller.enqueue(encodeSSE({ type: "error", error: "无法解析结果" }));
          }
        } catch {
          controller.enqueue(encodeSSE({ type: "error", error: "解析失败" }));
        }
      } catch (err) {
        logger.error("[ExtractStream] Stream error:", err);
        if (!streamSignal.aborted) {
          controller.enqueue(encodeSSE({ type: "error", error: String(err) }));
        }
      }
    }, {
      timeout: 180000, // 3分钟超时
      debug: process.env.NODE_ENV === "development",
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
