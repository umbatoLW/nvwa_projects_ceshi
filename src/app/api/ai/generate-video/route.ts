import { NextRequest, NextResponse } from "next/server";
import { getUserApiKey } from "@/lib/ai-client";
import { getUserId } from "@/lib/server-auth";
import { deductCredits } from "@/lib/credits";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/security/ai-rate-limiter";
import { canUserProceed, recordApiCost } from "@/lib/security/cost-alert";
import {
  submitSeedanceTask,
  querySeedanceTask,
  isSeedanceModel,
} from "@/lib/seedance-adapter";

// 视频生成API端点（统一的video-generation端点）
const VIDEO_GENERATION_ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
// 任务查询端点
const TASK_QUERY_ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/tasks";

// 获取API Key的辅助函数
async function getApiKeyForVideo(request: NextRequest): Promise<string | null> {
  const userId = await getUserId(request);
  if (!userId) return null;
  return await getUserApiKey(userId);
}

// 支持的模型列表（Seedance 2.0 排在第一位）
const SUPPORTED_MODELS = [
  // Seedance 2.0 (推荐)
  "seedance2",
  "seedance2_face",
  // 万相2.7
  "wan2.7-t2v-2026-04-25",
  "wan2.7-i2v-2026-04-25",
  // HappyHorse
  "happyhorse-1.0-t2v",
  "happyhorse-1.0-i2v",
  "happyhorse-1.0-r2v",
];

// 判断是否是图生视频模型
function isImageToVideoModel(modelId: string): boolean {
  return modelId.includes("i2v") && !isSeedanceModel(modelId);
}

// 判断是否是参考生视频模型
function isReferenceToVideoModel(modelId: string): boolean {
  return modelId.includes("r2v");
}

// GET: 查询任务状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const model = searchParams.get("model"); // 用于判断使用哪种查询方式

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "缺少taskId参数" },
        { status: 400 }
      );
    }

    // 如果是 Seedance 模型，使用 Seedance 适配器查询
    if (model && isSeedanceModel(model)) {
      logger.debug(`[Video API] Querying Seedance task: ${taskId}`);
      
      const result = await querySeedanceTask(taskId);
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error || "查询任务失败",
        }, { status: 400 });
      }

      // 转换状态格式
      const statusMap: Record<string, string> = {
        "pending": "PENDING",
        "processing": "RUNNING",
        "completed": "SUCCEEDED",
        "failed": "FAILED",
      };

      return NextResponse.json({
        success: true,
        data: {
          status: statusMap[result.status || "pending"] || result.status,
          videoUrl: result.videoUrl,
        },
      });
    }

    // 非 Seedance 模型，使用阿里云 API 查询
    // 获取用户API Key
    const apiKey = await getApiKeyForVideo(request);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "请先在设置页面配置您的API Key" },
        { status: 401 }
      );
    }

    logger.debug(`[Video API] Querying task: ${taskId}`);

    const response = await fetch(`${TASK_QUERY_ENDPOINT}/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const result = await response.json();
    logger.debug(`[Video API] Task status:`, JSON.stringify(result, null, 2));

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: result.message || "查询任务失败",
      }, { status: 400 });
    }

    const taskStatus = result.output?.task_status;
    // 视频URL可能在video_url字段或results数组中
    const videoUrl = result.output?.video_url || result.output?.results?.[0]?.url;
    const coverUrl = result.output?.cover_url || result.output?.results?.[0]?.cover;

    return NextResponse.json({
      success: true,
      data: {
        status: taskStatus,
        videoUrl: videoUrl,
        coverUrl: coverUrl,
      },
    });
  } catch (error) {
    logger.error("[Video API] Query error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "查询失败",
    }, { status: 500 });
  }
}

// POST: 创建视频生成任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      negativePrompt,
      model = "seedance2",  // 默认使用 Seedance 2.0
      duration = 5,
      aspectRatio = "16:9",
      resolution = "720p",
      imageUrl,
      startImageUrl,
      endImageUrl,
      firstFrameImage,  // 前端传递的首帧图片
      lastFrameImage,   // 前端传递的尾帧图片
      referenceImageUrls,
    } = body;

    // 获取用户ID
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    // 检查成本限制
    const costCheck = canUserProceed(userId);
    if (!costCheck.allowed) {
      return NextResponse.json(
        { success: false, error: costCheck.reason },
        { status: 429 }
      );
    }

    // 检查限流
    const rateLimitResult = checkRateLimit(request, "generate-video");
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimitResult.reason },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 扣费 - 根据模型选择定价
    const pricingKey = model.includes("wan2.7") ? "wan2.1-t2v-14b" : "seedance2.0";
    const deductResult = await deductCredits(
      userId,
      pricingKey,
      `视频生成 (${model})`
    );
    if (!deductResult.success) {
      return NextResponse.json(
        { success: false, error: deductResult.error || "积分不足" },
        { status: 402 }
      );
    }

    // 统一参数名称
    const actualFirstFrame = firstFrameImage || startImageUrl || imageUrl;
    const actualLastFrame = lastFrameImage || endImageUrl;

    if (!SUPPORTED_MODELS.includes(model)) {
      return NextResponse.json(
        { success: false, error: `不支持的模型: ${model}。支持的模型: ${SUPPORTED_MODELS.join(", ")}` },
        { status: 400 }
      );
    }

    // ==================== Seedance 2.0 模型处理 ====================
    if (isSeedanceModel(model)) {
      logger.debug(`[Video API] Using Seedance 2.0 model: ${model}`);

      // 判断是首尾帧模式还是纯文生视频
      const isFrameMode = !!(actualFirstFrame || actualLastFrame);

      const seedanceResult = await submitSeedanceTask({
        prompt: prompt || "",
        model: model as "seedance2" | "seedance2_face",
        type: isFrameMode ? "first_last_frame" : "all_reference",
        imageUrl: actualFirstFrame,
        endImageUrl: actualLastFrame,
        aspectRatio: aspectRatio as "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9",
        resolution: resolution as "480p" | "720p" | "1080p",
        videoLength: duration,
        generateAudio: true,
      });

      if (!seedanceResult.success) {
        return NextResponse.json({
          success: false,
          error: seedanceResult.error || "Seedance 任务提交失败",
        }, { status: 400 });
      }

      // 记录成本
      recordApiCost("generate-video", userId);

      return NextResponse.json({
        success: true,
        data: { 
          taskId: seedanceResult.outTaskId,
          model: model, // 返回模型名称，供轮询时使用
        },
      });
    }

    // ==================== 阿里云模型处理 ====================
    // 获取用户的API Key
    const apiKey = await getUserApiKey(userId);

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "请先在设置页面配置您的API Key" },
        { status: 401 }
      );
    }

    // 分辨率映射
    const resolutionMap: Record<string, string> = {
      "540p": "540P",
      "720p": "720P",
      "1080p": "1080P",
    };

    // 比例映射
    const ratioMap: Record<string, string> = {
      "16:9": "16:9",
      "9:16": "9:16",
      "1:1": "1:1",
      "4:3": "4:3",
      "3:4": "3:4",
      "4:5": "4:5",
      "5:4": "5:4",
    };

    let requestBody: Record<string, unknown>;
    const isI2V = isImageToVideoModel(model);
    const isR2V = isReferenceToVideoModel(model);

    if (isR2V) {
      // 参考生视频
      const content: Array<{ image?: string; text?: string }> = [];

      // 添加参考图片
      if (referenceImageUrls && referenceImageUrls.length > 0) {
        referenceImageUrls.forEach((url: string) => {
          content.push({ image: url });
        });
      }

      // 添加文本提示
      if (prompt) {
        content.push({ text: prompt });
      }

      requestBody = {
        model,
        input: {
          messages: [{
            role: "user",
            content,
          }]
        },
        parameters: {
          duration: duration,
          ratio: ratioMap[aspectRatio] || "16:9",
          resolution: resolutionMap[resolution] || "720P",
          watermark: false,
        },
      };
    } else if (isI2V) {
      // 图生视频 - 所有模型都使用 media 数组格式
      const media: Array<{ type: string; url: string }> = [];

      // 首帧图片
      if (actualFirstFrame) {
        media.push({
          type: "first_frame",
          url: actualFirstFrame,
        });
      }

      // 尾帧图片（如果支持）
      if (actualLastFrame) {
        media.push({
          type: "last_frame",
          url: actualLastFrame,
        });
      }

      requestBody = {
        model,
        input: {
          prompt: prompt || "",
          media,
        },
        parameters: {
          duration: duration,
          resolution: resolutionMap[resolution] || "720P",
          watermark: false,
        },
      };
    } else {
      // 文生视频
      const input: Record<string, unknown> = {
        prompt: prompt || "",
      };

      if (negativePrompt) {
        input.negative_prompt = negativePrompt;
      }

      requestBody = {
        model,
        input,
        parameters: {
          duration: duration,
          ratio: ratioMap[aspectRatio] || "16:9",
          resolution: resolutionMap[resolution] || "720P",
          watermark: false,
        },
      };
    }

    logger.debug(`[Video API] Calling ${model}`);
    logger.debug(`[Video API] Request:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(VIDEO_GENERATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    logger.debug(`[Video API] Response status: ${response.status}`);
    logger.debug(`[Video API] Response:`, JSON.stringify(result, null, 2));

    if (!response.ok) {
      const errorMsg = result.message || `API请求失败: ${response.status}`;

      // 特殊错误提示
      if (errorMsg.includes("Model not exist") || errorMsg.includes("model not found")) {
        return NextResponse.json({
          success: false,
          error: `模型 ${model} 未开通，请在阿里云百炼控制台开通该模型服务`,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: errorMsg,
      }, { status: 400 });
    }

    // 异步任务ID
    const taskId = result.output?.task_id;
    if (taskId) {
      // 记录成本
      recordApiCost("generate-video", userId);

      return NextResponse.json({
        success: true,
        data: { taskId },
      });
    }

    return NextResponse.json({
      success: false,
      error: "未获取到任务ID",
    }, { status: 500 });
  } catch (error) {
    logger.error("[Video API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "生成失败",
    }, { status: 500 });
  }
}
