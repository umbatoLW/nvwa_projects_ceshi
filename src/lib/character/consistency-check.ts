/**
 * AutoStory: 角色一致性后验检查
 * 生成图像后，对比角色圣经和参考图，评分低于阈值则自动重试
 */

import { getAIClient } from '@/lib/ai-client';
import { safeJsonParse } from '@/lib/safe-json';

export interface ConsistencyCheckResult {
  passed: boolean;
  score: number;            // 0-1
  issues: string[];
  suggestions: string[];
  faceFeaturesMatch?: {
    faceShape: boolean;
    eyes: boolean;
    nose: boolean;
    lips: boolean;
    hair: boolean;
  };
}

export interface CharacterBible {
  consistencyAnchor: string;
  facialFeatures?: {
    faceShape?: string;
    eyes?: string;
    nose?: string;
    lips?: string;
    hair?: string;
  };
  outfits?: {
    default?: string;
    casual?: string;
    formal?: string;
  };
}

/**
 * 检查生成图像与角色一致性
 */
export async function checkCharacterConsistency(
  generatedImageUrl: string,
  characterId: string,
  bible?: CharacterBible,
  referenceImages?: string[],
  expectedExpression?: string,
  expectedOutfit?: string
): Promise<ConsistencyCheckResult> {
  // 如果没有角色圣经或参考图，默认通过
  if (!bible && (!referenceImages || referenceImages.length === 0)) {
    return { passed: true, score: 0.5, issues: ['No bible or reference found'], suggestions: [] };
  }

  const aiClient = getAIClient();

  // 构建参考图部分
  const referenceContents = referenceImages && referenceImages.length > 0
    ? [
        { type: 'text' as const, text: 'Reference character images:' },
        ...referenceImages.slice(0, 2).map(url => ({ type: 'image' as const, image: url })),
      ]
    : [];

  const prompt = `请严格对比"参考角色图"和"生成图"，评估生成图是否保持了角色的面部特征一致性。

${bible?.consistencyAnchor ? `角色圣经一致性锚点：\n${bible.consistencyAnchor}` : ''}

${expectedExpression ? `预期表情：${expectedExpression}` : ''}
${expectedOutfit ? `预期服装：${expectedOutfit}` : ''}

请按以下JSON格式输出评估结果：
{
  "score": 0-1之间的数字（1=完全一致，0=完全不同人）,
  "issues": ["不一致的问题1", "问题2"],
  "suggestions": ["修改建议1", "建议2"],
  "faceFeaturesMatch": {
    "faceShape": true/false,
    "eyes": true/false,
    "nose": true/false,
    "lips": true/false,
    "hair": true/false
  }
}

评分标准：
- 0.8-1.0：优秀，可直接使用
- 0.6-0.8：合格，轻微不一致可接受
- 0.4-0.6：不合格，需要重生成
- 0-0.4：严重不一致，必须重生成`;

  try {
    const response = await aiClient.chat.completions.create({
      model: 'qwen-vl-plus',
      messages: [{
        role: 'user',
        content: [
          ...referenceContents,
          { type: 'text' as const, text: 'Generated image to evaluate:' },
          { type: 'image_url' as const, image_url: { url: generatedImageUrl } },
          { type: 'text' as const, text: prompt },
        ] as any,
      }],
    });

    const responseText = response.choices[0]?.message?.content || '';
    const parseResult = safeJsonParse(responseText);
    const result = parseResult.success && parseResult.data ? parseResult.data : { score: 0.5, issues: [], suggestions: [] };

    const score = typeof (result as any).score === 'number' ? (result as any).score : 0.5;

    return {
      passed: score >= 0.6, // 阈值0.6
      score,
      issues: (result as any).issues || [],
      suggestions: (result as any).suggestions || [],
      faceFeaturesMatch: (result as any).faceFeaturesMatch,
    };
  } catch (error) {
    console.error('Consistency check failed:', error);
    return { passed: true, score: 0.5, issues: ['Check failed'], suggestions: [] };
  }
}

/**
 * 带自动重试的生图流程
 */
export async function generateWithConsistencyCheck(
  generateFn: () => Promise<string>,
  characterId: string,
  bible?: CharacterBible,
  referenceImages?: string[],
  maxRetries: number = 2,
  expectedExpression?: string,
  expectedOutfit?: string
): Promise<{ imageUrl: string; consistencyScore: number; retries: number }> {
  let retries = 0;

  while (retries <= maxRetries) {
    const imageUrl = await generateFn();

    const check = await checkCharacterConsistency(
      imageUrl,
      characterId,
      bible,
      referenceImages,
      expectedExpression,
      expectedOutfit
    );

    if (check.passed) {
      return { imageUrl, consistencyScore: check.score, retries };
    }

    console.warn(`Consistency check failed (score: ${check.score}), retrying... (${retries + 1}/${maxRetries})`);
    retries++;
  }

  // 超过重试次数，返回最后一次结果（带警告）
  const lastImageUrl = await generateFn();
  const lastCheck = await checkCharacterConsistency(
    lastImageUrl,
    characterId,
    bible,
    referenceImages,
    expectedExpression,
    expectedOutfit
  );

  return { imageUrl: lastImageUrl, consistencyScore: lastCheck.score, retries };
}
