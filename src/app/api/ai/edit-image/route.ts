/**
 * 图像编辑 API
 * 使用 wanx2.1-imageedit 模型
 * 支持功能：全局风格化、指令编辑、扩图、局部重绘等
 */

import { NextRequest, NextResponse } from "next/server";
import { editImage, ImageEditFunction, getUserApiKey } from "@/lib/ai-client";
import { getUserId } from "@/lib/server-auth";
import { deductCredits } from "@/lib/credits";

// 编辑模式到API function参数的映射
const MODE_TO_FUNCTION: Record<string, ImageEditFunction> = {
  'smart-edit': 'description_edit',        // 智能编辑 -> 指令编辑
  'style-transfer': 'stylization_all',     // 风格重绘 -> 全局风格化
  'background': 'description_edit',        // 背景生成 -> 指令编辑（特殊处理）
  'expand': 'expand',                      // 画面扩展 -> 扩图
  'inpaint': 'description_edit_with_mask', // 智能擦除 -> 局部重绘（需要mask）
};

interface EditRequest {
  mode?: string;           // 编辑模式：smart-edit, style-transfer, background, expand, inpaint
  imageUrl: string;        // 源图片URL
  prompt: string;          // 编辑描述
  maskImageUrl?: string;   // 局部重绘的mask图片（智能擦除需要）
  n?: number;              // 生成数量 1-4
  strength?: number;       // 修改幅度 0.0-1.0
  // 扩图参数
  topScale?: number;
  bottomScale?: number;
  leftScale?: number;
  rightScale?: number;
}

export async function POST(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    // 扣费
    const deductResult = await deductCredits(
      userId,
      "image-edit",
      "图像编辑"
    );
    if (!deductResult.success) {
      return NextResponse.json(
        { success: false, error: deductResult.error || "积分不足" },
        { status: 402 }
      );
    }

    // 获取用户保存的API Key
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "请先在设置页面配置您的API Key" },
        { status: 401 }
      );
    }
    
    const body: EditRequest = await request.json();
    const {
      mode = 'smart-edit',
      imageUrl,
      prompt,
      maskImageUrl,
      n = 1,
      strength = 0.5,
      topScale,
      bottomScale,
      leftScale,
      rightScale,
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数: imageUrl" },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数: prompt" },
        { status: 400 }
      );
    }

    // 获取对应的function参数
    const editFunction = MODE_TO_FUNCTION[mode] || 'description_edit';

    console.log(`[Edit Image] Mode: ${mode}, Function: ${editFunction}, Prompt: ${prompt}`);

    // 调用图像编辑API
    const result = await editImage({
      function: editFunction,
      prompt,
      baseImageUrl: imageUrl,
      maskImageUrl,
      n,
      strength,
      topScale,
      bottomScale,
      leftScale,
      rightScale,
      apiKey,
    });

    if (result.status !== 'SUCCEEDED') {
      return NextResponse.json(
        { success: false, error: `任务状态: ${result.status}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        images: result.imageUrls || [],
        taskId: result.taskId,
      },
    });
  } catch (error) {
    console.error("[Edit Image] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}
