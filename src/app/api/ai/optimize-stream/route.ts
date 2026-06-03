import { NextRequest } from 'next/server';
import { getAIClient } from '@/lib/ai-client';
import { createManagedStream, encodeSSE } from '@/lib/stream/stream-utils';
import { logger } from '@/lib/logger';

// 优化模式的提示词模板
const OPTIMIZE_PROMPTS: Record<string, { name: string; system: string }> = {
  polish: {
    name: '整体润色',
    system: `你是一位专业的剧本优化专家。请优化用户提供的剧本内容，使其：
1. 结构清晰、逻辑连贯
2. 人物塑造丰满、性格鲜明
3. 对话自然、富有感染力
4. 场景描写生动、画面感强
5. 情节紧凑、节奏合理

请直接输出优化后的剧本内容，不要添加任何解释说明。`,
  },
  character: {
    name: '人物增强',
    system: `你是一位专业的剧本人物塑造专家。请优化用户提供的剧本内容，重点强化：
1. 人物性格更加鲜明立体
2. 对话更符合人物身份和性格
3. 增加人物内心戏和微表情描写
4. 丰富人物背景和动机
5. 强化人物之间的互动张力

请直接输出优化后的剧本内容，不要添加任何解释说明。`,
  },
  visual: {
    name: '画面感强化',
    system: `你是一位专业的影视剧本专家。请优化用户提供的剧本内容，重点强化：
1. 场景描写更加具体生动
2. 增加光影、色调、构图的暗示
3. 添加镜头运动和画面切换的提示
4. 强化视觉冲击力和电影感
5. 增加环境氛围和情绪渲染

请直接输出优化后的剧本内容，不要添加任何解释说明。`,
  },
  rhythm: {
    name: '节奏调整',
    system: `你是一位专业的剧本节奏控制专家。请优化用户提供的剧本内容，重点调整：
1. 情节张弛有度，高潮与铺垫交替
2. 删减冗余内容，保持紧凑节奏
3. 增强转折和悬念设置
4. 优化场景切换的流畅度
5. 控制情绪曲线的起伏

请直接输出优化后的剧本内容，不要添加任何解释说明。`,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, mode = 'polish' } = body;

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ type: 'error', message: '缺少剧本内容' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const modeConfig = OPTIMIZE_PROMPTS[mode] || OPTIMIZE_PROMPTS.polish;
    const openai = getAIClient();

    // 使用带AbortController的流式响应
    return createManagedStream(async (controller, streamSignal) => {
      try {
        const stream = await openai.chat.completions.create({
          model: 'qwen-plus',
          messages: [
            { role: 'system', content: modeConfig.system },
            { role: 'user', content: `请优化以下剧本内容：\n\n${content}` }
          ],
          temperature: 0.7,
          max_tokens: 8000,
          stream: true,
        }, {
          signal: streamSignal, // 传递abort信号
        });

        for await (const chunk of stream) {
          if (streamSignal.aborted) {
            logger.info("[OptimizeStream] Request aborted by client");
            break;
          }

          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            controller.enqueue(encodeSSE({ type: 'text', content: text }));
          }
        }

        controller.enqueue(encodeSSE({ type: 'complete' }));
      } catch (error) {
        logger.error("[OptimizeStream] Stream error:", error);
        if (!streamSignal.aborted) {
          controller.enqueue(encodeSSE({ type: 'error', message: error instanceof Error ? error.message : '优化过程发生错误' }));
        }
      }
    }, {
      timeout: 300000, // 5分钟超时
      debug: process.env.NODE_ENV === "development",
    });

  } catch (error) {
    logger.error('Optimize stream error:', error);
    return new Response(
      JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : '优化过程发生错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
