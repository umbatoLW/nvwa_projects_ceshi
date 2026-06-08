import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai-client';
import { CharacterBible, buildConsistencyAnchor } from '@/lib/character/bible';

/**
 * P3-3: 多视角联合生成 — 宫格图
 * 
 * 输入：
 * - characterBible: 角色圣经
 * - viewTypes: 视图类型数组
 * - gridLayout: 宫格布局 (2x2/3x3/4x4)
 * 
 * 输出：
 * - 单张宫格图（多个视角拼接）
 * - 或多个视角图（可后续拼接）
 */

export interface ViewGenerationRequest {
  characterBible: CharacterBible;
  viewTypes: ViewType[];
  gridLayout?: '2x2' | '3x3' | '4x4';
  referenceImages?: string[];  // 参考图URL（Layer 2）
  style?: string;
  aspectRatio?: '1:1' | '3:4' | '9:16';
}

export type ViewType = 'front' | 'side_left' | 'side_right' | 'back' | 'three_quarter' | 'close_up' | 'full_body' | 'action_pose';

// 视角对应的提示词模板
const VIEW_PROMPTS: Record<ViewType, string> = {
  front: '正面视角，人物正对镜头，面部清晰可见，表情自然',
  side_left: '左侧视角，人物左侧面轮廓清晰，身体向右转90度',
  side_right: '右侧视角，人物右侧面轮廓清晰，身体向左转90度',
  back: '背面视角，人物背对镜头，可见背部和头发',
  three_quarter: '四分之三侧面，身体转向镜头45度，兼顾正脸和侧脸轮廓',
  close_up: '面部特写，强调眼睛、鼻子、嘴唇细节，背景虚化',
  full_body: '全身照，完整展示从头到脚的造型，站姿挺拔',
  action_pose: '动态姿势，根据角色性格设计标志性动作',
};

// 宫格布局参数
const GRID_CONFIG = {
  '2x2': { cols: 2, rows: 2, total: 4 },
  '3x3': { cols: 3, rows: 3, total: 9 },
  '4x4': { cols: 4, rows: 4, total: 16 },
};

// POST: 生成角色多视角图
export async function POST(request: NextRequest) {
  try {
    const body: ViewGenerationRequest = await request.json();
    const {
      characterBible,
      viewTypes,
      gridLayout = '3x3',
      referenceImages = [],
      style = 'realistic',
      aspectRatio = '1:1',
    } = body;

    if (!characterBible || !viewTypes?.length) {
      return NextResponse.json(
        { error: 'characterBible and viewTypes are required' },
        { status: 400 }
      );
    }

    // 构建一致性锚点（Layer 3 融合）
    const consistencyAnchor = buildConsistencyAnchor(characterBible);

    // 初始化 AI 客户端
    const client = getAIClient();

    // 为每个视角生成提示词
    const viewPrompts = viewTypes.map((viewType) => {
      const basePrompt = VIEW_PROMPTS[viewType] || '';
      const viewSpecific = buildViewSpecificPrompt(characterBible, viewType);
      
      return {
        viewType,
        prompt: `${consistencyAnchor}\n\n${basePrompt}\n\n${viewSpecific}\n\n风格: ${style}`,
      };
    });

    // 判断是否需要宫格图
    const gridConfig = GRID_CONFIG[gridLayout];
    const needGrid = viewTypes.length > 1 && viewTypes.length <= gridConfig.total;

    if (needGrid) {
      // 生成宫格图提示词
      const gridPrompt = buildGridPrompt(viewPrompts, gridLayout, characterBible);
      
      // 调用生图 API（假设使用文生图模型）
      // 这里简化处理，实际需要调用图片生成服务
      const gridImageUrl = await generateGridImage(gridPrompt, referenceImages, aspectRatio, client);

      return NextResponse.json({
        success: true,
        mode: 'grid',
        gridLayout,
        gridImageUrl,
        viewCount: viewTypes.length,
        consistencyAnchor,
      });
    } else {
      // 分别生成每个视角图
      const results = await Promise.all(
        viewPrompts.map(async ({ viewType, prompt }) => {
          const imageUrl = await generateSingleImage(prompt, referenceImages, aspectRatio, client);
          return { viewType, imageUrl, prompt };
        })
      );

      return NextResponse.json({
        success: true,
        mode: 'individual',
        views: results,
        consistencyAnchor,
      });
    }
  } catch (error) {
    console.error('[generate-character-views] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate character views' },
      { status: 500 }
    );
  }
}

// 构建视角特定提示词
function buildViewSpecificPrompt(bible: CharacterBible, viewType: ViewType): string {
  const { appearance, wardrobe, personality } = bible;
  
  let prompt = '';

  // 面部特征（对所有视角都重要）
  if (appearance) {
    const { faceShape, skinTone, eyes, nose, lips, hair } = appearance;
    prompt += `面部: ${faceShape || '标准脸型'}, ${skinTone || '白皙'}肤色`;
    if (eyes) prompt += `, ${eyes.shape || '杏眼'}, ${eyes.color || '黑瞳'}`;
    if (lips) prompt += `, ${lips.shape || 'M唇'}`;
    if (hair) prompt += `. 发型: ${hair.style || '黑长直'}, ${hair.color || '黑色'}`;
  }

  // 服装（根据视角调整可见部分）
  if (wardrobe?.default && ['front', 'three_quarter', 'full_body'].includes(viewType)) {
    const { top, bottom, outerwear, shoes, accessories } = wardrobe.default;
    prompt += `. 服装: ${top || '白色衬衫'}`;
    if (bottom) prompt += `, ${bottom}`;
    if (outerwear) prompt += `, ${outerwear}`;
    if (shoes) prompt += `, ${shoes}`;
  }

  // 表情（特写和正面视角）
  if (['front', 'close_up'].includes(viewType) && personality?.defaultExpression) {
    prompt += `. 表情: ${personality.defaultExpression}`;
  }

  return prompt;
}

// 构建宫格图提示词
function buildGridPrompt(
  viewPrompts: { viewType: string; prompt: string }[],
  gridLayout: '2x2' | '3x3' | '4x4',
  bible: CharacterBible
): string {
  const gridConfig = GRID_CONFIG[gridLayout];
  
  let prompt = `生成一张${gridLayout}宫格图，包含${viewPrompts.length}个不同视角的人物图像，按网格排列。\n\n`;
  prompt += `人物设定（所有视角必须一致）：\n`;
  prompt += `姓名: ${bible.name}\n`;
  prompt += `年龄: ${bible.age || 25}岁\n`;
  prompt += `特征: ${bible.consistencyAnchor || '保持人物一致性'}\n\n`;
  
  prompt += `各视角要求：\n`;
  viewPrompts.forEach((vp, idx) => {
    const row = Math.floor(idx / gridConfig.cols) + 1;
    const col = (idx % gridConfig.cols) + 1;
    prompt += `第${row}行第${col}列 (${vp.viewType}): ${vp.prompt}\n`;
  });

  prompt += `\n要求：所有格子中的人物面部特征、服装、发型必须完全一致，只是视角和姿势不同。`;

  return prompt;
}

// 生成单张图片（简化实现）
async function generateSingleImage(
  prompt: string,
  referenceImages: string[],
  aspectRatio: string,
  client: ReturnType<typeof getAIClient>
): Promise<string> {
  // 实际实现需要调用图片生成 API
  // 这里返回占位 URL
  console.log('[generateSingleImage] Prompt:', prompt.substring(0, 200));
  console.log('[generateSingleImage] References:', referenceImages.length);
  
  // TODO: 调用实际的图片生成 API
  // const response = await client.images.generate({...});
  
  return `https://placeholder.com/image?prompt=${encodeURIComponent(prompt.substring(0, 50))}`;
}

// 生成宫格图（简化实现）
async function generateGridImage(
  gridPrompt: string,
  referenceImages: string[],
  aspectRatio: string,
  client: ReturnType<typeof getAIClient>
): Promise<string> {
  console.log('[generateGridImage] Prompt:', gridPrompt.substring(0, 200));
  console.log('[generateGridImage] References:', referenceImages.length);
  
  // TODO: 调用实际的图片生成 API
  // const response = await client.images.generate({...});
  
  return `https://placeholder.com/grid?prompt=${encodeURIComponent(gridPrompt.substring(0, 50))}`;
}
