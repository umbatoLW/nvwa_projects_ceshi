import { NextRequest, NextResponse } from "next/server";
import { getAIClient, LLMMessage } from "@/lib/ai-client";

/**
 * 从大纲/创意生成完整剧本
 * 采用迭代扩写策略：先生成大纲 → 扩写第1-3集 → 逐集生成
 */
export async function POST(request: NextRequest) {
  try {
    const {
      idea, // 一句话创意
      outline, // 剧本大纲（可选）
      targetEpisodes, // 目标集数，默认24集
      targetWords, // 每集目标字数，默认2000-2500
      genre, // 类型：都市、玄幻、甜宠等
      style, // 风格：轻松、虐心、搞笑等
    } = await request.json();

    if (!idea && !outline) {
      return NextResponse.json({ error: "请提供创意或大纲" }, { status: 400 });
    }

    const client = getAIClient();
    const encoder = new TextEncoder();

    const targetEpisodeCount = targetEpisodes || 24;
    const wordsPerEpisode = targetWords || 2000;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // 阶段1：生成/完善大纲
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                stage: "outline",
                message: "正在生成剧本大纲...",
              })}\n\n`
            )
          );

          const outlinePrompt: LLMMessage[] = [
            {
              role: "system",
              content: `你是一位专业短剧编剧。用户会提供一个创意想法或初步大纲，你的任务是生成一个完整的短剧大纲。

大纲要求：
- ${targetEpisodeCount}集，每集${wordsPerEpisode}字左右
- 包含清晰的故事主线、人物设定、每集核心事件
- 输出JSON格式：
{
  "title": "剧名",
  "genre": "类型",
  "logline": "一句话简介",
  "mainCharacters": [{"name": "角色名", "role": "主角/配角", "description": "角色描述"}],
  "episodes": [
    {
      "episode": 1,
      "title": "第1集标题",
      "summary": "本集概要（200字）",
      "keyScenes": ["场景1", "场景2"]
    }
  ]
}`,
            },
            {
              role: "user",
              content: outline
                ? `请根据以下大纲完善：\n\n${outline}`
                : `请根据以下创意生成完整大纲：\n\n${idea}\n\n类型：${genre || "都市"}\n风格：${style || "甜宠"}\n集数：${targetEpisodeCount}集`,
            },
          ];

          let outlineResult = "";
          const outlineStream = await client.chat.completions.create({
            model: "qwen-plus",
            messages: outlinePrompt,
            temperature: 0.7,
            stream: true,
          });

          for await (const chunk of outlineStream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              outlineResult += content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "progress",
                    stage: "outline",
                    message: "大纲生成中...",
                    content: content,
                  })}\n\n`
                )
              );
            }
          }

          // 解析大纲
          let outlineData: {
            title?: string;
            genre?: string;
            logline?: string;
            mainCharacters?: Array<{ name: string; role: string; description: string }>;
            episodes?: Array<{ episode: number; title: string; summary: string; keyScenes?: string[] }>;
          };
          try {
            const cleanOutline = outlineResult
              .replace(/```json\n?/g, "")
              .replace(/```\n?/g, "")
              .trim();
            outlineData = JSON.parse(cleanOutline);
          } catch {
            // 解析失败，使用默认结构
            outlineData = {
              title: "未命名剧本",
              genre: genre || "都市",
              episodes: [],
            };
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                stage: "outline_complete",
                message: `大纲生成完成：${outlineData.title}`,
                data: outlineData,
              })}\n\n`
            )
          );

          // 阶段2：逐集生成剧本内容（默认生成前3集作为预览）
          const fullScript: string[] = [];
          const episodesToGenerate = Math.min(targetEpisodeCount, 3);

          for (let ep = 1; ep <= episodesToGenerate; ep++) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  stage: "writing",
                  episode: ep,
                  totalEpisodes: targetEpisodeCount,
                  message: `正在生成第${ep}集剧本...`,
                })}\n\n`
              )
            );

            const episodePrompt: LLMMessage[] = [
              {
                role: "system",
                content: `你是一位专业短剧编剧。根据给定的大纲和集数，写出完整的剧本内容。

要求：
- 每集${wordsPerEpisode}字左右
- 包含完整的场景描写、人物对白、动作指示
- 剧本格式规范：
  [场景1] 内/外 | 地点 | 日/夜
  人物A：（动作）对白内容
  （动作描写）
  人物B：对白内容
- 保持人物性格一致性
- 每集结尾要有钩子，吸引继续观看`,
              },
              {
                role: "user",
                content: `请写出第${ep}集剧本。

剧名：${outlineData.title}
本集概要：${outlineData.episodes?.[ep - 1]?.summary || "继续主线剧情"}
主要人物：${outlineData.mainCharacters?.map((c) => `${c.name}(${c.description})`).join("、") || "待定"}`,
              },
            ];

            let episodeResult = "";
            const episodeStream = await client.chat.completions.create({
              model: "qwen-plus",
              messages: episodePrompt,
              temperature: 0.7,
              stream: true,
            });

            for await (const chunk of episodeStream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                episodeResult += content;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "progress",
                      stage: "writing",
                      episode: ep,
                      totalEpisodes: targetEpisodeCount,
                      message: `第${ep}集生成中...`,
                      content: content,
                    })}\n\n`
                  )
                );
              }
            }

            // 添加集数分隔
            const formattedEpisode = `\n\n【第${ep}集】\n${outlineData.episodes?.[ep - 1]?.title || ""}\n\n${episodeResult}`;
            fullScript.push(formattedEpisode);
          }

          // 返回完整结果
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                data: {
                  title: outlineData.title,
                  outline: outlineData,
                  script: fullScript.join("\n\n"),
                  generatedEpisodes: episodesToGenerate,
                  totalEpisodes: targetEpisodeCount,
                  note: `已生成前${episodesToGenerate}集作为预览，完整${targetEpisodeCount}集需继续生成`,
                },
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: error instanceof Error ? error.message : "剧本生成失败",
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
    console.error("Generate script error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generate script failed" },
      { status: 500 }
    );
  }
}
