import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, LLMMessage } from "@/lib/ai-client";

interface EpisodeInfo {
  episode: number;
  title: string;
  startLine: number;
  endLine: number;
  summary: string;
}

// 每批分析的最大字数（约5000-8000 tokens）
const MAX_CHARS_PER_BATCH = 12000;

// 分割剧本为多个批次
function splitScriptIntoBatches(content: string, maxChars: number): string[] {
  const batches: string[] = [];
  const lines = content.split('\n');
  let currentBatch = '';
  let currentLines: string[] = [];
  
  for (const line of lines) {
    if (currentBatch.length + line.length > maxChars && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = '';
      currentLines = [];
    }
    currentBatch += line + '\n';
    currentLines.push(line);
  }
  
  if (currentBatch.trim()) {
    batches.push(currentBatch);
  }
  
  return batches;
}

// 使用AI分析单个批次的集数
async function analyzeBatchWithAI(
  batchContent: string, 
  batchIndex: number, 
  totalBatches: number,
  totalChars: number
): Promise<EpisodeInfo[]> {
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `你是一位剧本分析专家。请分析这段剧本内容，识别其中的分集信息。

输出JSON数组格式：
[{
  "episode": 1,
  "title": "第一集标题",
  "summary": "剧情概述..."
}]

重要规则：
1. 这是剧本的第${batchIndex + 1}/${totalBatches}批内容
2. 如果这批内容包含多集，请识别所有集数
3. 如果这批内容是某一集的一部分，返回该集信息
4. 集数编号要连续，从正确的编号开始
5. 如果没有明确的集数标记，根据内容估算`,
    },
    {
      role: "user",
      content: `请分析以下剧本片段的分集信息：\n\n${batchContent}`,
    },
  ];

  try {
    const completion = await chatCompletion(messages, {
      model: "qwen-plus",
      temperature: 0.3,
      max_tokens: 2048,
    });

    const result = completion as {
      choices: Array<{ message: { content: string } }>;
    };

    const responseContent = result.choices[0]?.message?.content || "[]";
    const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error(`分析第${batchIndex + 1}批次失败:`, error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { scriptContent } = await request.json();

    if (!scriptContent) {
      return NextResponse.json(
        { success: false, error: "Script content is required" },
        { status: 400 }
      );
    }

    const lines = scriptContent.split('\n');
    const totalChars = scriptContent.length;

    // 第一步：使用正则匹配识别剧本中的集数标记
    const episodeMarkers: { episode: number; lineIndex: number; title: string }[] = [];
    
    // 常见的集数标记模式
    const episodePatterns = [
      /^第\s*(\d+)\s*集[：:：\s]*(.*)$/i,           // 第1集、第 1 集、第1集：标题
      /^EPISODE\s*(\d+)[：:：\s]*(.*)$/i,          // EPISODE 1, EPISODE 1: Title
      /^Episode\s*(\d+)[：:：\s]*(.*)$/i,          // Episode 1, Episode 1: Title
      /^E(\d+)[：:：\s]*(.*)$/i,                    // E1, E1: 标题
      /^【第\s*(\d+)\s*集】[：:：\s]*(.*)$/i,      // 【第1集】标题
      /^(\d+)[\.．]\s*(.*)$/,                       // 1. 标题
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      for (const pattern of episodePatterns) {
        const match = line.match(pattern);
        if (match) {
          const episodeNum = parseInt(match[1], 10);
          if (episodeNum > 0 && episodeNum <= 500) {
            episodeMarkers.push({
              episode: episodeNum,
              lineIndex: i,
              title: match[2]?.trim() || `第${episodeNum}集`,
            });
          }
          break;
        }
      }
    }
    
    // 如果通过正则找到了多个集数标记，直接使用
    if (episodeMarkers.length >= 2) {
      // 按集数排序并去重
      const sortedMarkers = episodeMarkers
        .sort((a, b) => a.episode - b.episode)
        .filter((marker, idx, arr) => 
          idx === 0 || marker.episode !== arr[idx - 1].episode
        );
      
      const episodes: EpisodeInfo[] = sortedMarkers.map((marker, idx) => {
        const nextMarker = sortedMarkers[idx + 1];
        return {
          episode: marker.episode,
          title: marker.title || `第${marker.episode}集`,
          startLine: marker.lineIndex + 1,
          endLine: nextMarker ? nextMarker.lineIndex : lines.length,
          summary: '',
        };
      });
      
      return NextResponse.json({
        success: true,
        episodes,
        method: 'regex',
        totalChars,
      });
    }
    
    // 第二步：剧本很长（超过阈值）且正则没找到明确标记 -> 分批分析
    if (totalChars > MAX_CHARS_PER_BATCH && episodeMarkers.length <= 1) {
      const batches = splitScriptIntoBatches(scriptContent, MAX_CHARS_PER_BATCH);
      
      // 并行分析所有批次
      const batchResults = await Promise.all(
        batches.map((batch, index) => 
          analyzeBatchWithAI(batch, index, batches.length, totalChars)
        )
      );
      
      // 合并所有批次的集数
      const allEpisodes: EpisodeInfo[] = [];
      const seenEpisodes = new Set<number>();
      
      for (const batchEpisodes of batchResults) {
        for (const ep of batchEpisodes) {
          if (!seenEpisodes.has(ep.episode)) {
            seenEpisodes.add(ep.episode);
            allEpisodes.push(ep);
          }
        }
      }
      
      // 按集数排序
      allEpisodes.sort((a, b) => a.episode - b.episode);
      
      // 如果找到了多集
      if (allEpisodes.length >= 2) {
        // 重新计算行号
        const episodesWithLines = allEpisodes.map((ep, idx) => ({
          ...ep,
          startLine: idx === 0 ? 1 : Math.floor(idx * lines.length / allEpisodes.length),
          endLine: idx === allEpisodes.length - 1 ? lines.length : Math.floor((idx + 1) * lines.length / allEpisodes.length),
        }));
        
        return NextResponse.json({
          success: true,
          episodes: episodesWithLines,
          method: 'batch_ai',
          batchCount: batches.length,
          totalChars,
        });
      }
    }
    
    // 第三步：如果剧本较短或分批分析没有结果，使用单次AI分析
    const contentForAI = scriptContent.slice(0, 15000);
    const avgCharsPerEpisode = 8000;
    const estimatedEpisodes = Math.max(1, Math.round(totalChars / avgCharsPerEpisode));
    
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `你是一位剧本分析专家。请分析剧本内容，识别其中的分集信息。

输出JSON数组格式：
[{
  "episode": 1,
  "title": "第一集标题",
  "summary": "剧情概述..."
}]

重要规则：
1. 如果剧本是单集或电影剧本，返回单个元素数组
2. 如果剧本有多集，请识别所有集数
3. 剧本总字数约${totalChars}字，按每集约8000字估算约有${estimatedEpisodes}集`,
      },
      {
        role: "user",
        content: `请分析以下剧本的分集信息（剧本共${totalChars}字，以下为前15000字）：\n\n${contentForAI}`,
      },
    ];

    const completion = await chatCompletion(messages, {
      model: "qwen-plus",
      temperature: 0.3,
      max_tokens: 4096,
    });

    const result = completion as {
      choices: Array<{ message: { content: string } }>;
    };

    const responseContent = result.choices[0]?.message?.content || "[]";

    // 尝试解析JSON
    let episodes: EpisodeInfo[] = [];
    try {
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        episodes = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // 解析失败
    }
    
    // 如果AI也只返回1集，但剧本很长，使用字数估算
    if (episodes.length <= 1 && estimatedEpisodes > 1) {
      episodes = [];
      for (let i = 0; i < estimatedEpisodes; i++) {
        episodes.push({
          episode: i + 1,
          title: `第${i + 1}集`,
          startLine: Math.floor(i * lines.length / estimatedEpisodes),
          endLine: Math.floor((i + 1) * lines.length / estimatedEpisodes),
          summary: '',
        });
      }
      return NextResponse.json({
        success: true,
        episodes,
        method: 'estimated',
        totalChars,
      });
    }

    return NextResponse.json({
      success: true,
      episodes: episodes.length > 0 ? episodes.map((ep, idx) => ({
        ...ep,
        startLine: ep.startLine || idx * Math.floor(lines.length / episodes.length),
        endLine: ep.endLine || (idx + 1) * Math.floor(lines.length / episodes.length),
      })) : [{
        episode: 1,
        title: "完整剧本",
        startLine: 1,
        endLine: lines.length,
        summary: "完整剧本内容",
      }],
      method: 'ai',
      totalChars,
    });
  } catch (error) {
    console.error("Analyze episodes error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
