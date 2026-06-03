import { NextRequest } from "next/server";
import { chatCompletion, LLMMessage } from "@/lib/ai-client";

interface EpisodeExtract {
  episode: number;
  title: string;
  costumes: unknown[];
  props: unknown[];
  scenes: unknown[];
}

/**
 * 批量并行提取API
 * 支持多集同时分析，流式返回进度
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      scriptContent, 
      episodes, 
      extractTypes = ["costume", "prop", "scene"],
      maxParallel = 3
    } = await request.json();

    if (!scriptContent || !episodes || !Array.isArray(episodes)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lines = scriptContent.split('\n');
    const totalEpisodes = episodes.length;
    const totalTasks = totalEpisodes * extractTypes.length;

    // 定义提取提示词
    const extractPrompts: Record<string, string> = {
      costume: `提取该集剧本中的服装信息，输出JSON数组：
[{"name":"服装名","character":"对应人物","style":"风格","details":"详细描述"}]`,
      prop: `提取该集剧本中的道具信息，输出JSON数组：
[{"name":"道具名","character":"使用者","style":"风格","details":"详细描述"}]`,
      scene: `提取该集剧本中的场景信息，输出JSON数组：
[{"name":"场景名","character":"相关角色","style":"风格","details":"详细描述"}]`,
    };

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const results: EpisodeExtract[] = [];
        let completedTasks = 0;

        // 并行队列控制
        const queue: { episode: typeof episodes[0]; type: string }[] = [];
        const running: Promise<void>[] = [];

        // 初始化队列
        for (const episode of episodes) {
          for (const type of extractTypes) {
            queue.push({ episode, type });
          }
        }

        // 处理单个提取任务
        const processTask = async (episode: typeof episodes[0], type: string) => {
          // 获取该集的剧本内容
          const startLine = episode.startLine || 0;
          const endLine = episode.endLine || lines.length;
          const episodeContent = lines.slice(startLine, endLine).join('\n');

          const messages: LLMMessage[] = [
            { role: "system", content: extractPrompts[type] },
            { role: "user", content: `第${episode.episode}集剧本：\n${episodeContent.substring(0, 6000)}` },
          ];

          try {
            const completion = await chatCompletion(messages, {
              model: "qwen-plus",
              temperature: 0.3,
              max_tokens: 2048,
            });

            const result = completion as { choices: Array<{ message: { content: string } }> };
            const content = result.choices[0]?.message?.content || "[]";
            
            // 解析结果
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

            completedTasks++;

            // 发送进度更新
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: "progress",
                episode: episode.episode,
                extractType: type,
                items,
                progress: Math.round((completedTasks / totalTasks) * 100),
                completed: completedTasks,
                total: totalTasks,
              })}\n\n`)
            );

            return { episode: episode.episode, type, items };
          } catch (err) {
            completedTasks++;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: "error",
                episode: episode.episode,
                extractType: type,
                error: String(err),
                progress: Math.round((completedTasks / totalTasks) * 100),
              })}\n\n`)
            );
            return { episode: episode.episode, type, items: [], error: true };
          }
        };

        // 启动并行处理
        while (queue.length > 0 || running.length > 0) {
          // 填充运行队列
          while (running.length < maxParallel && queue.length > 0) {
            const task = queue.shift()!;
            const promise = processTask(task.episode, task.type).then(result => {
              // 存储结果
              let episodeData = results.find(r => r.episode === result.episode);
              if (!episodeData) {
                episodeData = {
                  episode: result.episode,
                  title: episodes.find(e => e.episode === result.episode)?.title || `第${result.episode}集`,
                  costumes: [],
                  props: [],
                  scenes: [],
                };
                results.push(episodeData);
              }
              
              if (result.type === "costume") episodeData.costumes = result.items;
              else if (result.type === "prop") episodeData.props = result.items;
              else if (result.type === "scene") episodeData.scenes = result.items;
            });
            running.push(promise);
          }

          // 等待任意一个完成
          if (running.length > 0) {
            await Promise.race(running);
            // 移除已完成的
            for (let i = running.length - 1; i >= 0; i--) {
              const p = running[i];
              const settled = await Promise.race([p, Promise.resolve("pending")])
                .then(() => "done", () => "done");
              if (settled === "done") {
                running.splice(i, 1);
              }
            }
          }
        }

        // 发送最终结果
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: "complete",
            results: results.sort((a, b) => a.episode - b.episode),
            stats: {
              totalEpisodes,
              completedTasks,
              totalTasks,
            },
          })}\n\n`)
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
