/**
 * Moyin Creator Layer 2: 参考图绑定
 * 为角色上传/生成参考图，提取视觉嵌入向量
 */

import { getAIClient } from '@/lib/ai-client';

export interface CharacterReference {
  id: string;
  characterId: string;
  imageUrl: string;
  imageType: 'front' | 'side' | 'back' | 'expression' | 'action' | 'outfit' | 'grid_panel';
  description: string;
  embedding?: number[];      // 视觉嵌入向量（CLIP或自定义模型）
  extractedFeatures?: {     // 从图片提取的特征描述（VLM生成）
    faceFeatures: string;
    outfitDescription: string;
    pose: string;
    lighting: string;
    background: string;
  };
  isDefault: boolean;        // 是否作为默认参考图
  usageCount: number;
  createdAt: Date;
}

// 使用 VLM（视觉语言模型）从参考图提取特征描述
export async function extractVisualFeatures(imageUrl: string): Promise<CharacterReference['extractedFeatures']> {
  const prompt = `请详细描述这张图片中人物的视觉特征，按以下JSON格式输出：

{
  "faceFeatures": "精确描述面部特征：脸型、眼睛（形状/大小/颜色/眼皮/睫毛/眉形）、鼻子（形状/鼻梁/鼻头）、嘴唇（形状/颜色/大小）、发型（颜色/长度/卷度/刘海）、肤色、显著特征（痣/疤痕/纹身）",
  "outfitDescription": "详细描述服装：上衣、下装、外套、鞋子、配饰、颜色、风格",
  "pose": "描述姿势：站姿/坐姿/动作，身体朝向，头部角度",
  "lighting": "描述光线：自然光/人工光，方向（顺光/逆光/侧光），色温（暖/冷/中性）",
  "background": "描述背景：室内/室外，场景类型，色调"
}

要求：
1. 面部特征描述必须与图片完全一致，不能模糊
2. 服装描述必须具体到款式和颜色
3. 姿势描述必须精确到身体部位的角度
4. 光线描述必须帮助复现相似光影效果`;

  try {
    const client = getAIClient();
    // 注意：这里需要支持视觉的模型
    // 如果 qwen-plus 不支持图像输入，需要使用其他模型或简化处理
    const response = await client.chat.completions.create({
      model: 'qwen-plus',
      messages: [{
        role: 'user',
        content: `${prompt}\n\n图片URL: ${imageUrl}`,
      }],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = JSON.parse(content);
    return parsed as CharacterReference['extractedFeatures'];
  } catch (error) {
    console.error('[extractVisualFeatures] Error:', error);
    // 返回默认值
    return {
      faceFeatures: '无法提取',
      outfitDescription: '无法提取',
      pose: '无法提取',
      lighting: '无法提取',
      background: '无法提取',
    };
  }
}

// 生成嵌入向量（简化版：使用 VLM 输出文本的 embedding 作为替代）
export async function generateVisualEmbedding(
  imageUrl: string,
  features: CharacterReference['extractedFeatures']
): Promise<number[]> {
  try {
    // 将特征描述文本转为向量
    const featureText = `${features?.faceFeatures} ${features?.outfitDescription} ${features?.pose}`;

    const client = getAIClient();
    const response = await client.embeddings.create({
      model: 'text-embedding-v3',
      input: featureText,
    });

    return response.data[0]?.embedding || [];
  } catch (error) {
    console.error('[generateVisualEmbedding] Error:', error);
    return [];
  }
}

// 计算两个参考图的相似度（余弦相似度）
export function calculateSimilarity(embeddingA: number[], embeddingB: number[]): number {
  if (!embeddingA.length || !embeddingB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embeddingA.length && i < embeddingB.length; i++) {
    dotProduct += embeddingA[i] * embeddingB[i];
    normA += embeddingA[i] * embeddingA[i];
    normB += embeddingB[i] * embeddingB[i];
  }

  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  return norm > 0 ? dotProduct / norm : 0;
}

// 选择最佳参考图组合（用于生图时）
export function selectReferenceImages(
  references: CharacterReference[],
  targetScene: string,
  targetExpression?: string,
  targetOutfit?: string
): CharacterReference[] {
  // 默认选择：正面照 + 表情参考 + 服装参考
  const selected: CharacterReference[] = [];

  // 1. 必须有正面照（优先级最高）
  const frontView = references.find(r => r.imageType === 'front' && r.isDefault);
  if (frontView) selected.push(frontView);

  // 2. 如果有目标表情，选择最接近的表情参考
  if (targetExpression) {
    const expressionRef = references.find(r => r.imageType === 'expression');
    if (expressionRef) selected.push(expressionRef);
  }

  // 3. 如果有目标服装，选择最接近的服装参考
  if (targetOutfit) {
    const outfitRef = references.find(r => r.imageType === 'outfit');
    if (outfitRef) selected.push(outfitRef);
  }

  // 4. 补充侧面/背面参考（如果有）
  const sideView = references.find(r => r.imageType === 'side');
  if (sideView && selected.length < 3) selected.push(sideView);

  // 最多返回3张参考图（符合大多数生图API限制）
  return selected.slice(0, 3);
}
