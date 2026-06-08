/**
 * 用户创意解析 API
 * 使用 AI 语义理解替代正则，提取用户意图的结构化数据
 */

import { NextRequest, NextResponse } from "next/server";
import { parseUserIdea } from "@/lib/parse-user-idea";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput } = body;

    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json(
        { error: '缺少用户输入' },
        { status: 400 }
      );
    }

    console.log('[parse-user-idea API] 原始输入:', userInput);

    // 调用解析函数
    const result = await parseUserIdea(userInput);

    console.log('[parse-user-idea API] 解析结果:', {
      genre: result.genre,
      styles: result.styles,
      forbidden: result.forbidden,
      effectiveForbidden: result.effectiveForbidden,
      coreIdea: result.coreIdea?.substring(0, 50) + '...',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[parse-user-idea API] 解析失败:', error);
    return NextResponse.json(
      { error: '解析失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
