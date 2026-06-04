import { NextRequest, NextResponse } from "next/server";
import { getAIClient, LLMMessage } from "@/lib/ai-client";
import { loadKnowledgeForTask } from "@/lib/prompt-knowledge";

/**
 * 三阶段剧本生成 API
 * 
 * 阶段一：核心对话（主对话流 + 关键台词）
 * 阶段二：完整大纲（人物关系 + 剧情骨架 + 四层反派）
 * 阶段三：逐集撰写（注入知识库 + 钩子设计 + 付费卡点）
 */

// 阶段一：核心对话生成
async function generateCoreDialogue(
  client: ReturnType<typeof getAIClient>,
  params: {
    idea: string;
    genre?: string;
    style?: string;
    targetEpisodes: number;
  },
  onProgress: (data: unknown) => void
): Promise<{
  title: string;
  coreDialogues: Array<{ episode: number; scene: string; dialogue: string; emotion: string }>;
  keyLines: string[];
}> {
  onProgress({ type: "progress", stage: "dialogue", message: "正在生成核心对话流..." });

  const prompt: LLMMessage[] = [
    {
      role: "system",
      content: `你是一位专业短剧编剧。根据用户的创意想法，生成剧本的核心对话流。

## 任务
为${params.targetEpisodes}集短剧生成：
1. 每集的核心场景对话（不是完整剧本，而是最关键的3-5句对白）
2. 金句台词（观众会记住的台词）
3. 情绪标签（这段对话的情绪类型：甜/虐/爽/燃/悬）

## 输出格式（JSON）
{
  "title": "剧名",
  "coreDialogues": [
    {
      "episode": 1,
      "scene": "场景描述",
      "dialogue": "核心对白（A：xxx B：xxx）",
      "emotion": "甜/虐/爽/燃/悬"
    }
  ],
  "keyLines": ["金句1", "金句2", "金句3"]
}

## 要求
- 每集至少1个核心对话
- 金句要朗朗上口，观众会记住
- 情绪分布要合理：甜宠类甜>虐，逆袭类爽>虐`,
    },
    {
      role: "user",
      content: `创意：${params.idea}
类型：${params.genre || "都市"}
风格：${params.style || "甜宠"}
集数：${params.targetEpisodes}集

请生成核心对话流。`,
    },
  ];

  let result = "";
  const stream = await client.chat.completions.create({
    model: "qwen-plus",
    messages: prompt,
    temperature: 0.8,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      result += content;
      onProgress({ type: "progress", stage: "dialogue", content });
    }
  }

  try {
    const clean = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { title: "未命名剧本", coreDialogues: [], keyLines: [] };
  }
}

// 阶段二：完整大纲生成
async function generateFullOutline(
  client: ReturnType<typeof getAIClient>,
  params: {
    idea: string;
    genre?: string;
    style?: string;
    targetEpisodes: number;
    coreDialogue: { title: string; coreDialogues: unknown[]; keyLines: string[] };
  },
  onProgress: (data: unknown) => void
): Promise<{
  title: string;
  genre: string;
  logline: string;
  mainCharacters: Array<{ name: string; role: string; description: string; arc: string }>;
  villains: Array<{ layer: number; name: string; role: string; motivation: string; defeatEpisode: number }>;
  episodes: Array<{
    episode: number;
    title: string;
    summary: string;
    emotionBeat: string;
    hookType: string;
    isPaywall?: boolean;
  }>;
}> {
  onProgress({ type: "progress", stage: "outline", message: "正在生成完整大纲..." });

  // 加载知识库
  const knowledge = loadKnowledgeForTask("outline-create");

  const prompt: LLMMessage[] = [
    {
      role: "system",
      content: `你是一位专业短剧编剧。根据核心对话流，生成完整的剧本大纲。

${knowledge}

## 任务
生成包含以下元素的大纲：
1. 人物设定（主角 + 配角 + 四层反派）
2. 每集概要（包含情绪节拍、钩子类型）
3. 付费卡点位置（10-15%的集数）

## 输出格式（JSON）
{
  "title": "剧名",
  "genre": "类型",
  "logline": "一句话简介",
  "mainCharacters": [
    {"name": "角色名", "role": "主角/配角", "description": "描述", "arc": "人物弧光"}
  ],
  "villains": [
    {"layer": 1, "name": "反派名", "role": "关系", "motivation": "动机", "defeatEpisode": 20}
  ],
  "episodes": [
    {
      "episode": 1,
      "title": "标题",
      "summary": "概要",
      "emotionBeat": "甜/虐/爽/燃/悬",
      "hookType": "情绪/悬念/危机/信息/反转",
      "isPaywall": false
    }
  ]
}`,
    },
    {
      role: "user",
      content: `创意：${params.idea}
类型：${params.genre || "都市"}
风格：${params.style || "甜宠"}
集数：${params.targetEpisodes}集

核心对话流（已生成）：
${JSON.stringify(params.coreDialogue, null, 2)}

请生成完整大纲。`,
    },
  ];

  let result = "";
  const stream = await client.chat.completions.create({
    model: "qwen-plus",
    messages: prompt,
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      result += content;
      onProgress({ type: "progress", stage: "outline", content });
    }
  }

  try {
    const clean = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return {
      title: params.coreDialogue.title || "未命名剧本",
      genre: params.genre || "都市",
      logline: "",
      mainCharacters: [],
      villains: [],
      episodes: [],
    };
  }
}

// 阶段三：逐集撰写
async function writeEpisode(
  client: ReturnType<typeof getAIClient>,
  params: {
    episode: number;
    outline: {
      title: string;
      mainCharacters: Array<{ name: string; role: string; description: string; arc: string }>;
      episodes: Array<{
        episode: number;
        title: string;
        summary: string;
        emotionBeat: string;
        hookType: string;
        isPaywall?: boolean;
      }>;
    };
    coreDialogue: { coreDialogues: Array<{ episode: number; scene: string; dialogue: string; emotion: string }>; keyLines: string[] };
    previousEpisodes: string[];
    wordsPerEpisode: number;
  },
  onProgress: (data: unknown) => void
): Promise<string> {
  onProgress({
    type: "progress",
    stage: "writing",
    episode: params.episode,
    message: `正在撰写第${params.episode}集...`,
  });

  // 加载知识库
  const knowledge = loadKnowledgeForTask("episode-write");

  // 找到当前集的核心对话
  const coreDialogue = params.coreDialogue.coreDialogues.find((d) => d.episode === params.episode);

  // 找到当前集的大纲
  const episodeOutline = params.outline.episodes.find((e) => e.episode === params.episode);

  const prompt: LLMMessage[] = [
    {
      role: "system",
      content: `你是一位专业短剧编剧。根据大纲和核心对话，撰写完整的剧本内容。

${knowledge}

## 剧本格式
[场景1] 内/外 | 地点 | 日/夜
人物A：（动作）对白内容
（动作描写）
人物B：对白内容

## 要求
- 每集${params.wordsPerEpisode}字左右
- 保持人物性格一致性
- 每集结尾必须有钩子（${episodeOutline?.hookType || "情绪"}钩）
- 本集情绪节拍：${episodeOutline?.emotionBeat || "推进"}
${episodeOutline?.isPaywall ? "- 本集是付费卡点，在情绪最高点截断" : ""}`,
    },
    {
      role: "user",
      content: `剧名：${params.outline.title}
第${params.episode}集标题：${episodeOutline?.title || "未命名"}
本集概要：${episodeOutline?.summary || "推进主线剧情"}
主要人物：${params.outline.mainCharacters.map((c) => `${c.name}(${c.description})`).join("、")}

核心对话（必须包含）：
${coreDialogue ? `场景：${coreDialogue.scene}\n对白：${coreDialogue.dialogue}` : "（无特定核心对话，按概要发挥）"}

金句台词（可选使用）：
${params.coreDialogue.keyLines.slice(0, 3).join(" / ")}

${params.previousEpisodes.length > 0 ? `前文回顾（第${Math.max(1, params.episode - 1)}集结尾）：\n${params.previousEpisodes[params.previousEpisodes.length - 1].slice(-500)}` : ""}

请撰写第${params.episode}集完整剧本。`,
    },
  ];

  let result = "";
  const stream = await client.chat.completions.create({
    model: "qwen-plus",
    messages: prompt,
    temperature: 0.75,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      result += content;
      onProgress({
        type: "progress",
        stage: "writing",
        episode: params.episode,
        content,
      });
    }
  }

  return result;
}

/**
 * 主入口：三阶段剧本生成
 */
export async function POST(request: NextRequest) {
  try {
    const {
      idea, // 一句话创意
      outline, // 剧本大纲（可选，跳过阶段二）
      targetEpisodes = 24, // 目标集数
      targetWords = 2000, // 每集字数
      genre, // 类型
      style, // 风格
      startFromEpisode, // 从第几集开始（续写用）
      existingScript, // 已有剧本（续写用）
    } = await request.json();

    if (!idea && !outline) {
      return NextResponse.json({ error: "请提供创意或大纲" }, { status: 400 });
    }

    const client = getAIClient();
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // ========== 阶段一：核心对话 ==========
          send({ type: "stage", stage: 1, name: "核心对话生成" });

          const coreDialogue = await generateCoreDialogue(
            client,
            { idea: idea || outline, genre, style, targetEpisodes },
            send
          );

          send({
            type: "stage_complete",
            stage: 1,
            data: coreDialogue,
          });

          // ========== 阶段二：完整大纲 ==========
          send({ type: "stage", stage: 2, name: "完整大纲生成" });

          const fullOutline = await generateFullOutline(
            client,
            { idea: idea || outline, genre, style, targetEpisodes, coreDialogue },
            send
          );

          send({
            type: "stage_complete",
            stage: 2,
            data: fullOutline,
          });

          // ========== 阶段三：逐集撰写 ==========
          send({ type: "stage", stage: 3, name: "逐集撰写" });

          const fullScript: string[] = existingScript || [];
          const episodesToGenerate = Math.min(targetEpisodes, 3); // 默认生成前3集
          const startEpisode = startFromEpisode || 1;

          for (let ep = startEpisode; ep <= Math.min(startEpisode + episodesToGenerate - 1, targetEpisodes); ep++) {
            const episodeScript = await writeEpisode(
              client,
              {
                episode: ep,
                outline: fullOutline,
                coreDialogue,
                previousEpisodes: fullScript,
                wordsPerEpisode: targetWords,
              },
              send
            );

            const formatted = `\n\n【第${ep}集】${fullOutline.episodes[ep - 1]?.title || ""}\n\n${episodeScript}`;
            fullScript.push(formatted);

            send({
              type: "episode_complete",
              episode: ep,
              script: formatted,
            });
          }

          // ========== 返回完整结果 ==========
          send({
            type: "complete",
            data: {
              title: fullOutline.title,
              genre: fullOutline.genre,
              logline: fullOutline.logline,
              mainCharacters: fullOutline.mainCharacters,
              villains: fullOutline.villains,
              outline: fullOutline,
              coreDialogue,
              script: fullScript.join("\n\n"),
              generatedEpisodes: fullScript.length,
              totalEpisodes: targetEpisodes,
              paywallEpisodes: fullOutline.episodes.filter((e) => e.isPaywall).map((e) => e.episode),
            },
          });

          controller.close();
        } catch (error) {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "剧本生成失败",
          });
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
