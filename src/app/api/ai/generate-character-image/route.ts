import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { createAIStream, wantsStream } from '@/lib/ai-stream';
import { injectStyleToPrompt } from '@/lib/visual-styles';

export async function POST(request: NextRequest) {
  try {
    const { prompt, image, style, size = '1K' } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: '缺少 prompt 参数' }, { status: 400 });
    }

    const fullPrompt = injectStyleToPrompt(prompt, style);

    if (wantsStream(request)) {
      return createAIStream(async ({ progress, complete, error }) => {
        try {
          progress('init', 5, '正在准备图片生成参数...');
          const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
          const config = new Config();
          const client = new ImageGenerationClient(config, customHeaders);

          progress('generating', 40, '正在生成角色图片...');
          const response = await client.generate({
            prompt: fullPrompt,
            size,
            image: image || undefined,
            responseFormat: 'url',
          });
          const helper = client.getResponseHelper(response);

          if (helper.success && helper.imageUrls.length > 0) {
            progress('complete', 100, '图片生成完成');
            complete(true, { imageUrls: helper.imageUrls });
          } else {
            error(helper.errorMessages.join(', ') || '图片生成失败');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : '角色图片生成失败';
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
      return NextResponse.json({ success: true, imageUrls: helper.imageUrls });
    }
    return NextResponse.json({ error: helper.errorMessages.join(', ') }, { status: 500 });
  } catch (error) {
    console.error('角色图片生成失败:', error);
    return NextResponse.json({ error: '角色图片生成失败' }, { status: 500 });
  }
}
