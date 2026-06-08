import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { CharacterBible, buildConsistencyAnchor } from '@/lib/character/bible';
import { CharacterReference } from '@/lib/character/reference-binding';

/**
 * P3-4: 3层提示词融合接入生图流程
 * 
 * Layer 1: 剧本场景描述（scene description）
 * Layer 2: 参考图特征（reference images + extracted features）
 * Layer 3: 角色圣经一致性锚点（character bible consistency anchor）
 * 
 * 最终提示词 = Layer 1 + Layer 2 + Layer 3
 * 
 * 兼容两种调用格式:
 * 1. { prompt, model, n, size } - 简单格式
 * 2. { sceneDescription, characterBible, ... } - 完整格式
 */

export interface ImageGenerationRequest {
  // 简单格式（向后兼容）
  prompt?: string;
  model?: string;
  n?: number;
  size?: string;
  ratio?: string;
  
  // 完整格式
  sceneDescription?: string;
  characterAction?: string;
  expression?: string;
  cameraAngle?: string;
  lighting?: string;
  
  // Layer 3: 角色圣经
  characterBible?: CharacterBible;
  characterId?: string;
  
  // Layer 2: 参考图
  referenceImages?: string[];
  image?: string; // 单张参考图
  
  // 生成参数
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  style?: 'realistic' | 'anime' | 'cinematic' | 'sketch';
  quality?: 'standard' | 'hd' | 'ultra';
  responseFormat?: 'url' | 'b64_json';
}

// 将各种尺寸格式转换为标准 size
function normalizeSize(size?: string, ratio?: string, aspectRatio?: string): string {
  // 直接传入 size
  if (size) {
    const sizeMap: Record<string, string> = {
      '1024x1024': '1024x1024',
      '768x1024': '768x1024',
      '1024x768': '1024x768',
      '576x1024': '576x1024',
      '1024x576': '1024x576',
      '512x512': '512x512',
      '1:1': '1024x1024',
      '3:4': '768x1024',
      '4:3': '1024x768',
      '9:16': '576x1024',
      '16:9': '1024x576',
    };
    return sizeMap[size] || size;
  }
  
  // 从 ratio 转换
  if (ratio) {
    const ratioMap: Record<string, string> = {
      '1:1': '1024x1024',
      '3:4': '768x1024',
      '4:3': '1024x768',
      '9:16': '576x1024',
      '16:9': '1024x576',
    };
    return ratioMap[ratio] || '1024x1024';
  }
  
  // 从 aspectRatio 转换
  if (aspectRatio) {
    const ratioMap: Record<string, string> = {
      '1:1': '1024x1024',
      '3:4': '768x1024',
      '4:3': '1024x768',
      '9:16': '576x1024',
      '16:9': '1024x576',
    };
    return ratioMap[aspectRatio] || '1024x1024';
  }
  
  return '1024x1024'; // 默认
}

// 将 style 转换为提示词增强
function styleToPrompt(style: string): string {
  const styleMap: Record<string, string> = {
    'realistic': 'photorealistic, high detail, natural lighting',
    'anime': 'anime style, cel shading, vibrant colors',
    'cinematic': 'cinematic lighting, film grain, dramatic composition',
    'sketch': 'pencil sketch, hand drawn style, artistic',
  };
  return styleMap[style] || '';
}

// POST: 生成图片（支持多种调用格式）
export async function POST(request: NextRequest) {
  try {
    const body: ImageGenerationRequest = await request.json();
    const {
      // 简单格式
      prompt,
      model,
      n = 1,
      size,
      ratio,
      // 完整格式
      sceneDescription,
      characterAction,
      expression,
      cameraAngle,
      lighting,
      characterBible,
      characterId,
      referenceImages = [],
      image,
      aspectRatio,
      style = 'cinematic',
      quality = 'hd',
      responseFormat = 'url',
    } = body;

    // 兼容：优先使用 sceneDescription，fallback 到 prompt
    const finalPrompt = sceneDescription || prompt;
    
    if (!finalPrompt) {
      return NextResponse.json(
        { error: 'sceneDescription or prompt is required' },
        { status: 400 }
      );
    }

    // 构建融合提示词
    const fusedPrompt = buildFusedPrompt({
      sceneDescription: finalPrompt,
      characterAction,
      expression,
      cameraAngle,
      lighting,
      characterBible,
      style,
    });

    // 参考图：优先使用 image，其次 referenceImages
    const referenceImage = image || referenceImages[0];

    // 调用真正的生图 API
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    const finalSize = normalizeSize(size, ratio, aspectRatio);

    console.log('[generate-image] 生图参数:', {
      prompt: fusedPrompt.substring(0, 100),
      size: finalSize,
      style,
      n,
      hasReference: !!referenceImage,
    });

    // 生成多张图片
    const generatedUrls: string[] = [];
    const count = Math.min(n, 4); // 最多4张

    for (let i = 0; i < count; i++) {
      const response = await client.generate({
        prompt: fusedPrompt,
        size: finalSize,
        image: referenceImage || undefined,
        responseFormat,
      });

      const helper = client.getResponseHelper(response);

      if (helper.success && helper.imageUrls.length > 0) {
        generatedUrls.push(...helper.imageUrls);
      } else {
        console.error('[generate-image] 生成第', i + 1, '张失败:', helper.errorMessages);
      }
    }

    if (generatedUrls.length > 0) {
      return NextResponse.json({
        success: true,
        imageUrls: generatedUrls,
        imageUrl: generatedUrls[0], // 兼容单图返回
        data: generatedUrls.map(url => ({ url })), // 兼容 OpenAI 格式
        fusedPrompt,
      });
    }

    return NextResponse.json(
      { error: '生图失败，请稍后重试' },
      { status: 500 }
    );
  } catch (error) {
    console.error('[generate-image] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

// 构建3层融合提示词
function buildFusedPrompt(params: {
  sceneDescription: string;
  characterAction?: string;
  expression?: string;
  cameraAngle?: string;
  lighting?: string;
  characterBible?: CharacterBible;
  style?: string;
}): string {
  const { sceneDescription, characterAction, expression, cameraAngle, lighting, characterBible, style } = params;

  let prompt = '';

  // Layer 3: 角色圣经一致性锚点（最高优先级）
  if (characterBible) {
    const anchor = buildConsistencyAnchor(characterBible);
    prompt += `[角色一致性要求]\n${anchor}\n\n`;
  }

  // Layer 1: 场景描述
  prompt += sceneDescription;

  // 补充动作、表情、镜头、光线
  if (characterAction) prompt += `, ${characterAction}`;
  if (expression) prompt += `, ${expression}`;
  if (cameraAngle) prompt += `, ${cameraAngle}`;
  if (lighting) prompt += `, ${lighting}`;

  // 添加风格提示词
  if (style) {
    const stylePrompt = styleToPrompt(style);
    if (stylePrompt) {
      prompt += `. ${stylePrompt}`;
    }
  }

  return prompt;
}
