/**
 * 一致性后验检查 API
 * POST /api/ai/consistency-check
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkCharacterConsistency } from '@/lib/character/consistency-check';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      generatedImageUrl,
      characterId,
      bible,
      referenceImages,
      expectedExpression,
      expectedOutfit,
    } = body;

    if (!generatedImageUrl || !characterId) {
      return NextResponse.json(
        { error: 'Missing required fields: generatedImageUrl, characterId' },
        { status: 400 }
      );
    }

    const result = await checkCharacterConsistency(
      generatedImageUrl,
      characterId,
      bible,
      referenceImages,
      expectedExpression,
      expectedOutfit
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Consistency check API error:', error);
    return NextResponse.json(
      { error: 'Failed to check consistency' },
      { status: 500 }
    );
  }
}
