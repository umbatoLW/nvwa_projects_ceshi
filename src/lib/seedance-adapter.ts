/**
 * Seedance 2.0 视频生成适配器
 * 对接 AIReiter 平台的 Seedance 2.0 API
 */

import { logger } from "@/lib/logger";

// AIReiter API 配置
const AIREITER_SUBMIT_URL = "https://aireiter.com/api/openapi/submit";
const AIREITER_QUERY_URL = "https://aireiter.com/api/openapi/query";

// Seedance 2.0 API Key（从环境变量读取）
const SEEDANCE_API_KEY = process.env.SEEDANCE_API_KEY || process.env.DASHSCOPE_API_KEY || "";

// 支持的模型变体
export const SEEDANCE_MODELS = {
  "seedance2": "Seedance 2.0",
  "seedance2_face": "Seedance 2.0 真人版",
};

// Seedance 任务状态
export type SeedanceTaskStatus = "pending" | "processing" | "completed" | "failed";

// 提交任务请求参数
export interface SeedanceSubmitParams {
  prompt: string;
  model?: "seedance2" | "seedance2_face";
  type?: "all_reference" | "first_last_frame";
  imageUrl?: string | string[];  // 参考图片（all_reference最多9张，first_last_frame仅1张首帧）
  endImageUrl?: string;          // 末帧图片（仅 first_last_frame 模式）
  videoUrl?: string | string[];  // 参考视频（仅 all_reference 模式，最多3个）
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
  resolution?: "480p" | "720p" | "1080p";
  videoLength?: number;  // 4-15秒
  generateAudio?: boolean;
}

// 提交任务响应
export interface SeedanceSubmitResult {
  success: boolean;
  outTaskId?: string;
  status?: string;
  estimatedCredits?: number;
  createdAt?: string;
  error?: string;
}

// 查询任务响应
export interface SeedanceQueryResult {
  success: boolean;
  status?: SeedanceTaskStatus;
  videoUrl?: string;
  coverUrl?: string;
  creditsUsed?: number;
  error?: string;
}

/**
 * 生成唯一的 out_task_id
 */
function generateOutTaskId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `seedance_${timestamp}_${random}`;
}

/**
 * 提交 Seedance 视频生成任务
 */
export async function submitSeedanceTask(params: SeedanceSubmitParams): Promise<SeedanceSubmitResult> {
  try {
    const {
      prompt,
      model = "seedance2",
      type = "all_reference",
      imageUrl,
      endImageUrl,
      videoUrl,
      aspectRatio = "16:9",
      resolution = "720p",
      videoLength = 5,
      generateAudio = true,
    } = params;

    const outTaskId = generateOutTaskId();

    // 构建请求参数
    const requestParams: Record<string, unknown> = {
      prompt,
      type,
      aspect_ratio: aspectRatio,
      resolution,
      video_length: String(videoLength),
      generate_audio: generateAudio,
    };

    // 添加图片 URL
    if (imageUrl) {
      if (type === "first_last_frame") {
        // 首尾帧模式：仅1张首帧图片
        requestParams.image_url = Array.isArray(imageUrl) ? [imageUrl[0]] : [imageUrl];
      } else {
        // all_reference 模式：最多9张
        requestParams.image_url = Array.isArray(imageUrl) ? imageUrl.slice(0, 9) : [imageUrl];
      }
    }

    // 添加末帧图片
    if (endImageUrl && type === "first_last_frame") {
      requestParams.end_image_url = endImageUrl;
    }

    // 添加参考视频（仅 all_reference 模式）
    if (videoUrl && type === "all_reference") {
      requestParams.video_url = Array.isArray(videoUrl) ? videoUrl.slice(0, 3) : [videoUrl];
    }

    const requestBody = {
      model,
      params: requestParams,
      out_task_id: outTaskId,
    };

    logger.debug(`[Seedance] Submitting task:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(AIREITER_SUBMIT_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SEEDANCE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    logger.info(`[Seedance] Submit response:`, JSON.stringify(result, null, 2));

    // 检查响应状态 - 兼容多种格式
    // 成功响应可能是以下任一格式:
    // - { code: "200", success: true, data: {...} }
    // - { statusCode: 200, message: "", data: {...} }
    // - { success: true, data: {...} }
    const isSuccess = 
      result.code === "200" || 
      result.code === 200 || 
      result.success === true ||
      result.statusCode === 200 ||
      result.statusCode === "200";
    
    if (!response.ok || !isSuccess) {
      // 尝试从多种错误格式中提取错误信息
      let errorMsg = "提交失败";
      
      if (result.error?.message) {
        errorMsg = result.error.message;
      } else if (result.message) {
        errorMsg = result.message;
      } else if (result.error?.code && typeof result.error.code === 'number') {
        // 特殊错误码处理
        if (result.error.code === 433) {
          errorMsg = "账户余额不足，请充值后再试";
        } else if (result.error.code === 401) {
          errorMsg = "身份验证失败，请检查API密钥";
        } else {
          errorMsg = `错误码: ${result.error.code}`;
        }
      } else {
        errorMsg = `提交失败: HTTP ${response.status}`;
      }
      
      logger.error(`[Seedance] Submit failed:`, { 
        httpStatus: response.status, 
        result 
      });
      return {
        success: false,
        error: errorMsg,
      };
    }

    return {
      success: true,
      outTaskId: result.data?.out_task_id || outTaskId,
      status: result.data?.status,
      estimatedCredits: result.data?.estimated_credits,
      createdAt: result.data?.created_at,
    };
  } catch (error) {
    logger.error("[Seedance] Submit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "提交任务失败",
    };
  }
}

/**
 * 查询 Seedance 任务状态
 */
export async function querySeedanceTask(outTaskId: string): Promise<SeedanceQueryResult> {
  try {
    logger.debug(`[Seedance] Querying task: ${outTaskId}`);

    const response = await fetch(AIREITER_QUERY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SEEDANCE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ out_task_id: outTaskId }),
    });

    const result = await response.json();
    logger.info(`[Seedance] Query response:`, JSON.stringify(result, null, 2));

    // 检查响应状态 - 兼容多种格式
    const isSuccess = 
      result.code === "200" || 
      result.code === 200 || 
      result.success === true ||
      result.statusCode === 200 ||
      result.statusCode === "200";

    if (!response.ok || !isSuccess) {
      return {
        success: false,
        error: result.message || result.error?.message || "查询任务失败",
      };
    }

    const data = result.data || result;
    
    // 获取视频 URL - 支持多种格式
    let videoUrl: string | undefined;
    // 格式1: data.video 直接返回
    if (data.video) {
      videoUrl = data.video;
    }
    // 格式2: data.output 数组 - 可能是 .url 或 .video
    else if (data.output && Array.isArray(data.output)) {
      videoUrl = data.output[0]?.url || data.output[0]?.video;
    }
    // 格式3: 顶层 video 字段
    else if (result.video) {
      videoUrl = result.video;
    }

    // 判断任务状态
    // 如果有视频URL，说明任务完成
    const status: SeedanceTaskStatus = videoUrl ? "completed" : 
      (data.status || result.status || "processing");

    logger.info(`[Seedance] Parsed status: ${status}, videoUrl: ${videoUrl}`);

    return {
      success: true,
      status,
      videoUrl,
      coverUrl: data.cover || result.cover,
      creditsUsed: data.credits_used,
    };
  } catch (error) {
    logger.error("[Seedance] Query error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "查询任务失败",
    };
  }
}

/**
 * 判断是否是 Seedance 模型
 */
export function isSeedanceModel(modelId: string): boolean {
  return modelId === "seedance2" || modelId === "seedance2_face";
}
