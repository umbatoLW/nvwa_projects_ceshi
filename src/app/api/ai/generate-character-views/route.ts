import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { createAIStream, wantsStream } from '@/lib/ai-stream';
import { injectStyleToPrompt } from '@/lib/visual-styles';

const BASE_PROMPT = `横向宽幅人物角色定妆三视图模板，横向全景展示在一张图内，同一完整背景不分割、无任何分割线，统一柔和正面光影，统一标准九头身人体比例，大长腿，身材比例完美协调，统一发型，统一服装，统一标准站立姿势，体态挺拔修长，从左到右依次为：全身正面、四分之三侧面、全身背面、微侧身胸部以上特写，所有视角面部特征完全一致，五官统一。纯白色极简背景，干净无杂物，柔和均匀布光，高级质感，细腻清晰，高清画质，干净整洁，构图对称平衡，专业角色设定图，绝对完整全身像，身体完全露出，标准站姿，绝不裁切脚部，脚部完整呈现。宽幅横版构图，21:9 比例，全景横向展示，人物站姿挺拔，线条流畅，无透视畸变，无身体变形，无腿部缩短。`;

// 检查用户提示词是否已经包含三视图相关内容
function hasViewKeywords(prompt: string): boolean {
  const keywords = ['三视图', '定妆', '正面', '侧面', '背面', '全身像'];
  return keywords.some(kw => prompt.includes(kw));
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = '2K', image, style } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: '缺少 prompt 参数' }, { status: 400 });
    }

    // 如果用户已输入详细提示词（包含三视图关键词），直接使用；否则拼接模板
    const fullPromptBase = hasViewKeywords(prompt) ? prompt : `${prompt}，${BASE_PROMPT}`;
    const fullPrompt = injectStyleToPrompt(fullPromptBase, style);

    if (wantsStream(request)) {
      return createAIStream(async ({ progress, complete, error }) => {
        try {
          progress('init', 5, '正在准备三视图生成参数...');
          const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
          const config = new Config();
          const client = new ImageGenerationClient(config, customHeaders);

          progress('generating', 40, '正在生成角色三视图...');
          const response = await client.generate({
            prompt: fullPrompt,
            size,
            image: image || undefined,
            responseFormat: 'url',
          });
          const helper = client.getResponseHelper(response);

          if (helper.success && helper.imageUrls.length > 0) {
            progress('complete', 100, '三视图生成完成');
            complete(true, { views: helper.imageUrls });
          } else {
            error(helper.errorMessages.join(', ') || '三视图生成失败');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : '角色三视图生成失败';
          error(msg);
        }
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    const response = await client.generate({
      prompt: fullPrompt,
      size,
      image: image || undefined,
      responseFormat: 'url',
    });
    const helper = client.getResponseHelper(response);

    if (helper.success) {
      return NextResponse.json({ success: true, views: helper.imageUrls });
    }
    return NextResponse.json({ error: helper.errorMessages.join(', ') }, { status: 500 });
  } catch (error) {
    console.error('角色三视图生成失败:', error);
    return NextResponse.json({ error: '角色三视图生成失败' }, { status: 500 });
  }
}
