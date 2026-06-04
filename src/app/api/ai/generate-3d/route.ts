
import { NextRequest, NextResponse } from "next/server";
import { getUserApiKey } from "@/lib/ai-client";
import { getUserId } from "@/lib/server-auth";
import { deductCredits } from "@/lib/credits";
import { logger } from "@/lib/logger";

// API 端点
const API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/3d-model-generation/3d-model-generation";

/**
 * GET - 查询 3D 任务状态（前端轮询用）
 * 非阻塞模式：立即返回当前状态，不等待完成
 */
export async function GET(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "未登录", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    
    // 获取用户保存的API Key
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "请先在设置页面配置您的API Key", code: "NO_API_KEY" },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    
    if (!taskId) {
      return NextResponse.json({ 
        error: "缺少 taskId 参数", 
        code: "MISSING_TASK_ID" 
      }, { status: 400 });
    }
    
    // 查询任务状态
    const response = await fetch(`${API_URL}/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[3D Task Query Error]", errorText);
      return NextResponse.json({ 
        error: `查询失败: ${response.status}`, 
        code: "QUERY_FAILED" 
      }, { status: response.status });
    }
    
    const result = await response.json();
    const taskStatus = result.output?.task_status;
    
    // 返回格式化的状态信息，适合前端轮询
    if (taskStatus === "SUCCEEDED") {
      return NextResponse.json({
        success: true,
        status: "completed",
        progress: 100,
        data: result.output,
        url: result.output?.model_url || result.output?.url,
        taskId,
      });
    }
    
    if (taskStatus === "FAILED") {
      return NextResponse.json({
        success: false,
        status: "failed",
        error: result.message || result.output?.message || "生成失败",
        code: "GENERATION_FAILED",
        taskId,
      }, { status: 500 });
    }
    
    // 仍在处理中（PENDING 或 RUNNING）
    const progress = result.output?.progress || 0;
    return NextResponse.json({
      success: true,
      status: taskStatus?.toLowerCase() || "processing",
      progress,
      message: "任务处理中",
      taskId,
    });
    
  } catch (error) {
    logger.error("[3D Task Query Error]", error);
    return NextResponse.json({ 
      error: "查询失败", 
      code: "QUERY_ERROR",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * POST - 提交 3D 生成任务（非阻塞模式）
 * 立即返回 taskId，前端通过 GET 轮询查询状态
 */
export async function POST(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "未登录", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 扣费（仅提交时扣费一次）
    const deductResult = await deductCredits(
      userId,
      "text-to-3d",
      "3D模型生成"
    );
    if (!deductResult.success) {
      return NextResponse.json(
        { success: false, error: deductResult.error || "积分不足", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    // 获取用户保存的API Key
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "请先在设置页面配置您的API Key", code: "NO_API_KEY" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { mode, prompt, images, model, textureQuality, geometryQuality, texture, pbr } = body;

    // 验证输入
    if (mode === "text2model" && !prompt?.trim()) {
      return NextResponse.json({ 
        error: "请输入3D模型描述", 
        code: "INVALID_INPUT" 
      }, { status: 400 });
    }
    if ((mode === "image2model" || mode === "multiview") && (!images || images.length === 0)) {
      return NextResponse.json({ 
        error: "请至少添加一张图片", 
        code: "INVALID_INPUT" 
      }, { status: 400 });
    }
    if (mode === "multiview" && images && images.length < 2) {
      return NextResponse.json({ 
        error: "多视角模式需要至少2张图片", 
        code: "INVALID_INPUT" 
      }, { status: 400 });
    }

    // 构建API请求体
    const input: Record<string, unknown> = {};
    
    if (mode === "text2model") {
      input.prompt = prompt;
      input.model = model || "text2model-v2";
    } else if (mode === "image2model") {
      input.images = images;
      input.model = model || "image2model-v2";
    } else if (mode === "multiview") {
      input.images = images;
      input.model = model || "multiview-v2";
    }

    // 添加可选参数
    if (textureQuality) input.texture_quality = textureQuality;
    if (geometryQuality) input.geometry_quality = geometryQuality;
    if (texture) input.texture = texture;
    if (pbr) input.pbr = pbr;

    logger.info("[3D Generate] Mode:", mode);
    logger.info("[3D Generate] Input:", JSON.stringify(input, null, 2));

    // 创建异步任务
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "3d-model-generation",
        input: input,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[3D Generate Error]", errorText);
      return NextResponse.json({ 
        error: `生成失败: ${response.status}`, 
        code: "SUBMIT_FAILED" 
      }, { status: response.status });
    }

    const result = await response.json();
    const taskId = result.output?.task_id;
    
    if (!taskId) {
      return NextResponse.json({ 
        error: "未能获取任务ID", 
        code: "NO_TASK_ID" 
      }, { status: 500 });
    }

    logger.info("[3D Generate] Task submitted:", taskId);

    // ✅ 非阻塞模式：立即返回 taskId，不等待完成
    // 前端通过 GET /api/ai/generate-3d?taskId=xxx 轮询查询状态
    return NextResponse.json({ 
      success: true, 
      taskId,
      status: "processing",
      message: "3D 生成任务已提交",
      queryEndpoint: `/api/ai/generate-3d?taskId=${taskId}`,
      estimatedWaitTime: "60-300秒"
    });
    
  } catch (error) {
    logger.error("[3D Generate Error]", error);
    return NextResponse.json({ 
      error: "生成失败", 
      code: "SUBMIT_ERROR",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
