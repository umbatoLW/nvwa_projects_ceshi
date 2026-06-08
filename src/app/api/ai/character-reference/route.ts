import { NextRequest, NextResponse } from 'next/server';
import {
  CharacterReference,
  extractVisualFeatures,
  generateVisualEmbedding,
} from '@/lib/character/reference-binding';

// POST: 上传/绑定参考图
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterId, imageUrl, imageType, description, isDefault = false } = body;

    if (!characterId || !imageUrl || !imageType) {
      return NextResponse.json(
        { error: 'characterId, imageUrl, and imageType are required' },
        { status: 400 }
      );
    }

    // 有效的图片类型
    const validTypes: CharacterReference['imageType'][] = [
      'front', 'side', 'back', 'expression', 'action', 'outfit', 'grid_panel'
    ];
    if (!validTypes.includes(imageType)) {
      return NextResponse.json(
        { error: `Invalid imageType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // 提取视觉特征
    console.log(`[character-reference] Extracting features for ${imageUrl}`);
    const extractedFeatures = await extractVisualFeatures(imageUrl);

    // 生成嵌入向量
    console.log(`[character-reference] Generating embedding`);
    const embedding = await generateVisualEmbedding(imageUrl, extractedFeatures);

    // 构建参考图记录
    const reference: CharacterReference = {
      id: crypto.randomUUID(),
      characterId,
      imageUrl,
      imageType,
      description: description || extractedFeatures?.faceFeatures || 'Reference image',
      extractedFeatures,
      embedding,
      isDefault,
      usageCount: 0,
      createdAt: new Date(),
    };

    // TODO: 保存到数据库
    // await saveCharacterReference(reference);

    return NextResponse.json({
      success: true,
      reference,
      message: 'Reference image bound successfully',
    });
  } catch (error) {
    console.error('[character-reference] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to bind reference image' },
      { status: 500 }
    );
  }
}

// GET: 查询角色的参考图列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');
    const imageType = searchParams.get('imageType');

    if (!characterId) {
      return NextResponse.json(
        { error: 'characterId is required' },
        { status: 400 }
      );
    }

    // TODO: 从数据库查询
    // const references = await getCharacterReferences(characterId, imageType);

    // 简化实现：返回空列表
    return NextResponse.json({
      success: true,
      references: [],
      characterId,
      imageType,
    });
  } catch (error) {
    console.error('[character-reference] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get character references' },
      { status: 500 }
    );
  }
}

// DELETE: 删除参考图
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get('referenceId');

    if (!referenceId) {
      return NextResponse.json(
        { error: 'referenceId is required' },
        { status: 400 }
      );
    }

    // TODO: 从数据库删除
    // await deleteCharacterReference(referenceId);

    return NextResponse.json({
      success: true,
      message: 'Reference deleted',
    });
  } catch (error) {
    console.error('[character-reference] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reference' },
      { status: 500 }
    );
  }
}
