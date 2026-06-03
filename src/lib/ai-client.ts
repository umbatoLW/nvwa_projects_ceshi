/**
 * Unified AI Client - Multi-Platform Support
 * Supports: 阿里云百炼, 即梦, Vidu, 可灵 等多平台
 */

import OpenAI from "openai";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getApiKeyForModel, getPlatformConfig } from "./platform-keys";
import { generateImageWithJimeng } from "./jimeng-adapter";

// 环境变量兜底
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";
const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DASHSCOPE_API_URL = "https://dashscope.aliyuncs.com/api/v1";

/**
 * 获取API Key（平台Key优先，用户Key兜底）
 * @param modelKey - 模型标识
 * @param userId - 用户ID（可选，用于用户自带Key兜底）
 * @returns API Key和Base URL
 */
export async function getApiKey(modelKey: string, userId?: string | null): Promise<{ apiKey: string; baseUrl: string }> {
  // 1. 优先从平台配置获取
  const platformConfig = await getApiKeyForModel(modelKey);
  if (platformConfig?.apiKey) {
    return {
      apiKey: platformConfig.apiKey,
      baseUrl: platformConfig.baseUrl || DASHSCOPE_BASE_URL,
    };
  }
  
  // 2. 用户自带Key兜底（兼容旧模式）
  if (userId) {
    const userKey = await getUserApiKey(userId);
    if (userKey) {
      return { apiKey: userKey, baseUrl: DASHSCOPE_BASE_URL };
    }
  }
  
  // 3. 环境变量兜底
  return { apiKey: DASHSCOPE_API_KEY, baseUrl: DASHSCOPE_BASE_URL };
}

/**
 * 从数据库获取用户的API Key（兜底用）
 * @deprecated 请使用 getApiKey(modelKey, userId) 替代
 */
export async function getUserApiKey(userId: string | null): Promise<string> {
  if (!userId) {
    return DASHSCOPE_API_KEY;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .single();

    if (error || !data?.settings) {
      return DASHSCOPE_API_KEY;
    }

    const settings = typeof data.settings === "string" 
      ? JSON.parse(data.settings) 
      : data.settings;
    
    const userApiKey = settings?.ai?.apiKey;
    
    if (userApiKey && userApiKey.trim() !== "") {
      return userApiKey.trim();
    }

    return DASHSCOPE_API_KEY;
  } catch (error) {
    console.error("[getUserApiKey] Error fetching user API key:", error);
    return DASHSCOPE_API_KEY;
  }
}

// ===== Model Registry =====

export const LLM_MODELS = {
  // 旗舰模型
  "qwen-plus": { name: "通义千问 Plus", category: "llm", tier: "premium" },
  "qwen-max": { name: "通义千问 Max", category: "llm", tier: "premium" },
  "qwen3.6-plus": { name: "通义千问 3.6 Plus", category: "llm", tier: "premium" },
  // 快速模型
  "qwen-turbo": { name: "通义千问 Turbo", category: "llm", tier: "fast" },
  "qwen-flash": { name: "通义千问 Flash", category: "llm", tier: "fast" },
  // 推理模型
  "deepseek-v3": { name: "DeepSeek V3", category: "llm", tier: "premium" },
  "deepseek-r1": { name: "DeepSeek R1", category: "llm", tier: "premium" },
  "kimi-k2.5": { name: "Kimi K2.5", category: "llm", tier: "premium" },
  "qvq-plus": { name: "QVQ Plus (视觉推理)", category: "llm", tier: "premium" },
  // 视觉模型
  "qwen-vl-max": { name: "通义千问 VL Max", category: "llm", tier: "vision" },
  "qwen3-vl-plus": { name: "通义千问 3 VL Plus", category: "llm", tier: "vision" },
  // 编程模型
  "qwen-coder-plus": { name: "通义千问 Coder Plus", category: "llm", tier: "code" },
  // 其他
  "glm-5": { name: "GLM-5", category: "llm", tier: "premium" },
  "MiniMax-M2.5": { name: "MiniMax M2.5", category: "llm", tier: "premium" },
} as const;

export const IMAGE_MODELS = {
  // 通义万相 2.7 (最新版本，支持参考生图)
  "wan2.7-image-pro": { name: "万相 2.7 Pro", category: "image", type: "multimodal", platform: "aliyun", features: ["text2img", "img2img", "edit", "sequential"] },
  "wan2.7-image": { name: "万相 2.7", category: "image", type: "multimodal", platform: "aliyun", features: ["text2img", "img2img", "edit"] },
  // 通义万相 2.1 (旧版本)
  "wanx2.1-t2i-turbo": { name: "通义万相 2.1 Turbo", category: "image", type: "text2img", platform: "aliyun" },
  "wanx2.1-t2i-plus": { name: "通义万相 2.1 Plus", category: "image", type: "text2img", platform: "aliyun" },
  // 即梦 Seedream 3.0
  "seedream-3.0-t2i": { name: "即梦 Seedream 3.0 文生图", category: "image", type: "text2img", platform: "jimeng" },
  "seedream-3.0-i2i": { name: "即梦 Seedream 3.0 图生图", category: "image", type: "img2img", platform: "jimeng" },
  // 即梦 Seedream 4.6
  "seedream-4.6-t2i": { name: "即梦 Seedream 4.6 文生图", category: "image", type: "text2img", platform: "jimeng" },
} as const;

export const VIDEO_MODELS = {
  // 快乐马视频
  "happyhorse-1.0-t2v": {
    name: "快乐马 1.0 文生视频",
    category: "video",
    type: "text2video",
    duration: [5],
    aspectRatio: ["16:9", "9:16", "1:1"],
    resolution: "720p",
  },
  "happyhorse-1.0-i2v": {
    name: "快乐马 1.0 图生视频",
    category: "video",
    type: "image2video",
    duration: [5],
    aspectRatio: ["16:9", "9:16", "1:1"],
    resolution: "720p",
  },
  "happyhorse-1.0-r2v": {
    name: "快乐马 1.0 参考视频",
    category: "video",
    type: "reference2video",
    duration: [5],
    aspectRatio: ["16:9", "9:16", "1:1"],
    resolution: "720p",
  },
  // 通义万相（阿里云百炼免费额度可用）
  "wanx2.1-t2v-plus": {
    name: "通义万相 2.1 文生视频 Plus",
    category: "video",
    type: "text2video",
    duration: [5, 10],
    aspectRatio: ["16:9", "9:16", "1:1"],
    resolution: "1080p",
  },
  "wanx2.1-i2v-plus": {
    name: "通义万相 2.1 图生视频 Plus",
    category: "video",
    type: "image2video",
    duration: [5, 10],
    aspectRatio: ["16:9", "9:16", "1:1"],
    resolution: "1080p",
  },
  // 即梦视频
  "jimeng-videos": {
    name: "即梦视频",
    category: "video",
    type: "text2video",
    duration: [5, 10, 15],
    aspectRatio: ["16:9", "9:16", "1:1"],
    resolution: "1080p",
  },
  // Vidu视频
  "vidu/viduq3-pro_text2video": {
    name: "Vidu Q3 Pro 文生视频",
    category: "video",
    type: "text2video",
    duration: [5, 6, 7, 8, 10, 12, 16],
    aspectRatio: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    resolution: "1080p",
  },
  "vidu/viduq3-pro_img2video": {
    name: "Vidu Q3 Pro 图生视频",
    category: "video",
    type: "image2video",
    duration: [5, 6, 7, 8, 10, 12, 16],
    aspectRatio: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    resolution: "1080p",
  },
  // 可灵视频
  "kling/kling-v3-video-generation": {
    name: "可灵 V3 视频生成",
    category: "video",
    type: "text2video",
    duration: [5, 10],
    aspectRatio: ["9:16", "16:9", "1:1"],
    resolution: "1080p",
  },
} as const;

export const MODEL_3D = {
  "Tripo/Tripo-H3.1": { name: "Tripo H3.1", category: "3d", quality: ["standard", "high"] },
  "Tripo/Tripo-P1.0": { name: "Tripo P1.0", category: "3d", quality: ["standard", "high"] },
} as const;

export const AUDIO_MODELS = {
  "cosyvoice-v3-plus": { name: "CosyVoice V3 Plus", category: "audio", type: "tts" },
  "sambert-zhinan-v1": { name: "Sambert 知楠", category: "audio", type: "tts" },
  "qwen-tts": { name: "通义千问 TTS", category: "audio", type: "tts" },
} as const;

// ===== Client Initialization =====

export function getAIClient(apiKey?: string): OpenAI {
  const key = apiKey || DASHSCOPE_API_KEY;
  return new OpenAI({
    apiKey: key,
    baseURL: DASHSCOPE_BASE_URL,
  });
}

// ===== LLM Helpers =====

export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  } = {},
  signal?: AbortSignal
) {
  const openai = getAIClient();
  const model = options.model || "qwen-plus";

  return openai.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens,
    stream: options.stream ?? false,
    ...(signal ? { signal } : {}),
  });
}

// ===== Image Generation =====

/**
 * 万相2.7图像生成API
 * 支持文生图、参考图生图、图像编辑、组图生成
 * 
 * @param prompt 文字描述
 * @param options 配置选项
 * @param options.model 模型名称，默认 wan2.7-image-pro
 * @param options.images 参考图片URL数组（0-9张）
 * @param options.size 图片尺寸：1K/2K/4K 或自定义像素
 * @param options.n 生成数量（1-4，组图模式1-12）
 * @param options.enableSequential 是否开启组图模式
 * @param options.thinkingMode 是否开启思考模式（仅文生图）
 * @param options.watermark 是否加水印
 * @param options.seed 随机种子
 */
export async function generateImage(
  prompt: string,
  options: {
    model?: string;
    images?: string[];
    size?: string;
    n?: number;
    enableSequential?: boolean;
    thinkingMode?: boolean;
    watermark?: boolean;
    seed?: number;
    apiKey?: string; // 用户提供的API Key
  } = {}
) {
  const model = options.model || "wan2.7-image-pro";
  
  // 即梦模型路由
  if (model.startsWith("seedance") || model.startsWith("seedream")) {
    console.log("[Image Generation] Using Jimeng adapter for model:", model, "count:", options.n);
    const platformConfig = await getApiKeyForModel(model);
    if (!platformConfig?.apiKey || !platformConfig?.secretKey) {
      throw new Error("即梦平台API Key未配置，请联系管理员");
    }
    return generateImageWithJimeng(prompt, {
      model,
      width: options.size?.split("*")[0] ? parseInt(options.size.split("*")[0]) : 1280,
      height: options.size?.split("*")[1] ? parseInt(options.size.split("*")[1]) : 1280,
      seed: options.seed,
      count: options.n || 1, // 支持批量出图
      accessKeyId: platformConfig.apiKey,
      secretAccessKey: platformConfig.secretKey,
    });
  }
  
  const isWan27 = model.startsWith("wan2.7") || model.startsWith("wan2.6");
  
  // 优先使用用户提供的API Key，否则使用环境变量
  const apiKey = options.apiKey || DASHSCOPE_API_KEY;
  
  // 构建消息内容
  const content: Array<{ text?: string; image?: string }> = [];
  
  // 添加参考图片（在文字描述之前）
  if (options.images && options.images.length > 0) {
    for (const imgUrl of options.images) {
      content.push({ image: imgUrl });
    }
  }
  
  // 添加文字描述
  content.push({ text: prompt });
  
  // 构建请求参数
  const parameters: Record<string, unknown> = {
    size: options.size || "1280*1280",
    n: options.n ?? 1,
  };
  
  // 组图模式
  if (options.enableSequential) {
    parameters.enable_sequential = true;
  }
  
  // 思考模式（仅文生图，无参考图时可用）
  if (options.thinkingMode && (!options.images || options.images.length === 0)) {
    parameters.thinking_mode = true;
  }
  
  // 水印
  if (options.watermark !== undefined) {
    parameters.watermark = options.watermark;
  }
  
  // 随机种子
  if (options.seed !== undefined) {
    parameters.seed = options.seed;
  }
  
  if (isWan27) {
    // 万相2.7/2.6 异步模式
    const requestBody = {
      model,
      input: {
        messages: [
          {
            role: "user",
            content,
          },
        ],
      },
      parameters,
    };
    
    console.log("[Wanxiang 2.7 API] ASYNC mode, model:", model);
    console.log("[Wanxiang 2.7 API] Request body:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(
      `${DASHSCOPE_API_URL}/services/aigc/image-generation/generation`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable", // 异步模式
        },
        body: JSON.stringify(requestBody),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Wanxiang 2.7 API error:", errorText);
      throw new Error(`Image generation failed: ${errorText}`);
    }
    
    // 异步模式返回task_id
    const result = await response.json();
    console.log("[Wanxiang 2.7 API] Response:", JSON.stringify(result, null, 2));
    
    const taskId = result.output?.task_id;
    if (taskId) {
      return { taskId };
    }
    
    // 如果同步返回了结果（某些情况）
    if (result.output?.results) {
      const imageUrls: string[] = [];
      for (const item of result.output.results) {
        if (item.url) {
          imageUrls.push(item.url);
        }
      }
      
      if (imageUrls.length > 0) {
        return {
          imageUrls,
          ratio: options.size,
        };
      }
    }
    
    throw new Error("未获取到任务ID或生成结果");
  } else {
    // 旧版万相2.1 使用原有端点 - 必须使用异步模式
    const response = await fetch(
      `${DASHSCOPE_API_URL}/services/aigc/text2image/image-synthesis`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable", // 异步模式
        },
        body: JSON.stringify({
          model,
          input: { prompt },
          parameters: {
            size: options.size || "1024*1024",
            n: options.n ?? 1,
          },
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Image generation failed: ${error}`);
    }
    
    const result = await response.json();
    console.log("[Wanxiang 2.1 API] Response:", JSON.stringify(result, null, 2));
    
    // 异步模式返回task_id
    const taskId = result.output?.task_id;
    if (taskId) {
      return { taskId };
    }
    
    // 如果同步返回了结果
    if (result.output?.results) {
      const imageUrls = result.output.results
        .map((item: { url?: string }) => item.url)
        .filter((url: string | undefined) => url);
      
      return {
        imageUrls,
        ratio: options.size,
      };
    }
    
    throw new Error("未获取到任务ID或生成结果");
  }
}

// ===== Reference Image Generation (参考图生图) =====

/**
 * 参考图生图 - 基于参考图片和提示词生成新图片
 * 使用万相2.7多模态API
 * 支持多图输入（0-9张）
 */
export async function generateImageWithReference(
  prompt: string,
  referenceImageUrls: string | string[], // 支持单张或多张
  options: {
    model?: string;
    size?: string;
    n?: number;
    apiKey?: string;
  } = {}
): Promise<{ imageUrls: string[]; ratio: string }> {
  const model = options.model || "wan2.7-image-pro";
  const apiKey = options.apiKey || DASHSCOPE_API_KEY;
  
  // 统一为数组处理
  const imageUrls = Array.isArray(referenceImageUrls) 
    ? referenceImageUrls 
    : [referenceImageUrls];
  
  // 构建多模态content，按顺序添加图片（最多9张），最后添加文本提示词
  const content: Array<{ image?: string; text?: string }> = [];
  
  // 按顺序添加图片
  for (const url of imageUrls.slice(0, 9)) {
    content.push({ image: url });
  }
  
  // 添加文本提示词
  content.push({ text: prompt });
  
  // 构建参数
  const parameters: Record<string, unknown> = {
    size: options.size || "1280*1280",
    n: options.n ?? 1,
  };
  
  const requestBody = {
    model,
    input: {
      messages: [
        {
          role: "user",
          content,
        },
      ],
    },
    parameters,
  };
  
  console.log("[Reference Image Generation] ASYNC mode, Model:", model);
  console.log("[Reference Image Generation] Image count:", imageUrls.length);
  console.log("[Reference Image Generation] Request body:", JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(
    `${DASHSCOPE_API_URL}/services/aigc/image-generation/generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable", // 异步模式
      },
      body: JSON.stringify(requestBody),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Reference Image Generation API error:", errorText);
    throw new Error(`Reference image generation failed: ${errorText}`);
  }
  
  const result = await response.json();
  console.log("[Reference Image Generation] Response:", JSON.stringify(result, null, 2));
  
  // 异步模式返回task_id
  const taskId = result.output?.task_id;
  if (taskId) {
    return { taskId } as unknown as { imageUrls: string[]; ratio: string };
  }
  
  // 如果同步返回了结果（某些情况）
  if (result.output?.results) {
    const generatedImageUrls: string[] = [];
    for (const item of result.output.results) {
      if (item.url) {
        generatedImageUrls.push(item.url);
      }
    }
    
    if (generatedImageUrls.length > 0) {
      return {
        imageUrls: generatedImageUrls,
        ratio: options.size || "1280*1280",
      };
    }
  }
  
  throw new Error("未获取到任务ID或生成结果");
}

// ===== Video Generation =====

export async function generateVideo(
  prompt: string,
  options: {
    model?: string;
    image?: string;
    referenceVideo?: string;
    duration?: number;
    aspectRatio?: string;
    resolution?: string;
    apiKey?: string;
  } = {}
) {
  const model = options.model || "wanx2.1-t2v-plus";
  const apiKey = options.apiKey || process.env.DASHSCOPE_API_KEY || "";

  const input: Record<string, unknown> = { prompt };

  if (options.image) {
    input.image = options.image;
  }
  if (options.referenceVideo) {
    input.reference_video = options.referenceVideo;
  }

  const parameters: Record<string, unknown> = {};
  if (options.duration) {
    parameters.duration = options.duration;
  }
  if (options.aspectRatio) {
    parameters.aspect_ratio = options.aspectRatio;
  }
  if (options.resolution) {
    parameters.resolution = options.resolution;
  }

  // Use the non-standard video generation endpoint
  const response = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model,
        input,
        parameters,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Video generation failed: ${error}`);
  }

  return response.json();
}

// ===== 3D Generation =====

export async function generate3D(
  options: {
    model?: string;
    prompt?: string;
    image?: string;
    images?: string[];
    textureQuality?: "standard" | "high";
    apiKey?: string;
  } = {}
) {
  const model = options.model || "Tripo/Tripo-H3.1";
  const apiKey = options.apiKey || process.env.DASHSCOPE_API_KEY || "";

  const input: Record<string, unknown> = {};
  if (options.prompt) {
    input.prompt = options.prompt;
  }
  if (options.image) {
    input.image = options.image;
  }
  if (options.images && options.images.length > 0) {
    input.images = options.images;
  }

  const response = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/3d-generation",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model,
        input,
        parameters: {
          texture_quality: options.textureQuality || "standard",
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`3D generation failed: ${error}`);
  }

  return response.json();
}

// ===== Async Task Query =====

export async function queryAsyncTask(taskId: string, apiKey?: string) {
  const key = apiKey || process.env.DASHSCOPE_API_KEY || "";
  const response = await fetch(
    `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Task query failed: ${error}`);
  }

  return response.json();
}

// ===== Type Exports =====

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMModel = keyof typeof LLM_MODELS;
export type ImageModel = keyof typeof IMAGE_MODELS;
export type VideoModel = keyof typeof VIDEO_MODELS;
export type Model3D = keyof typeof MODEL_3D;
export type AudioModel = keyof typeof AUDIO_MODELS;

export function createStreamResponse(
  stream: ReadableStream<Uint8Array>
) {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ==================== 图像编辑API ====================

// 图像编辑功能类型
export type ImageEditFunction =
  | 'stylization_all'      // 全局风格化
  | 'stylization_local'    // 局部风格化
  | 'description_edit'     // 指令编辑
  | 'description_edit_with_mask' // 局部重绘（需要mask）
  | 'remove_watermark'     // 去文字水印
  | 'expand'               // 扩图
  | 'super_resolution'     // 图像超分
  | 'colorization'         // 图像上色
  | 'doodle'               // 线稿生图
  | 'control_cartoon_feature'; // 参考卡通形象生图

// 图像编辑请求参数
export interface ImageEditParams {
  function: ImageEditFunction;
  prompt: string;
  baseImageUrl: string;
  maskImageUrl?: string;  // 局部重绘时需要
  n?: number;             // 生成数量 1-4
  strength?: number;      // 修改幅度 0.0-1.0
  upscaleFactor?: number; // 超分放大倍数 1-4
  topScale?: number;      // 扩图向上扩展比例
  bottomScale?: number;   // 扩图向下扩展比例
  leftScale?: number;     // 扩图向左扩展比例
  rightScale?: number;    // 扩图向右扩展比例
  apiKey?: string;        // 用户自定义API Key
}

// 图像编辑结果
export interface ImageEditResult {
  taskId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'UNKNOWN';
  imageUrls?: string[];
}

/**
 * 创建图像编辑任务（异步）
 * 使用 wanx2.1-imageedit 模型
 */
export async function createImageEditTask(params: ImageEditParams, apiKey?: string): Promise<{ taskId: string }> {
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';
  const key = apiKey || DASHSCOPE_API_KEY;
  
  const body: Record<string, unknown> = {
    model: 'wanx2.1-imageedit',
    input: {
      function: params.function,
      prompt: params.prompt,
      base_image_url: params.baseImageUrl,
    },
    parameters: {
      n: params.n || 1,
    },
  };

  // 局部重绘需要mask
  if (params.maskImageUrl) {
    body.input = {
      ...body.input as object,
      mask_image_url: params.maskImageUrl,
    };
  }

  // 修改幅度（指令编辑、全局风格化）
  if (params.strength !== undefined) {
    body.parameters = {
      ...body.parameters as object,
      strength: params.strength,
    };
  }

  // 超分放大倍数
  if (params.upscaleFactor !== undefined) {
    body.parameters = {
      ...body.parameters as object,
      upscale_factor: params.upscaleFactor,
    };
  }

  // 扩图参数
  if (params.topScale !== undefined || params.bottomScale !== undefined || 
      params.leftScale !== undefined || params.rightScale !== undefined) {
    body.parameters = {
      ...body.parameters as object,
      top_scale: params.topScale || 1.0,
      bottom_scale: params.bottomScale || 1.0,
      left_scale: params.leftScale || 1.0,
      right_scale: params.rightScale || 1.0,
    };
  }

  console.log('[Image Edit] Creating task with params:', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'X-DashScope-Async': 'enable',  // 必须设置为异步
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Image Edit] Create task failed:', errorText);
    throw new Error(`图像编辑任务创建失败: ${errorText}`);
  }

  const result = await response.json();
  console.log('[Image Edit] Task created:', result);

  if (!result.output?.task_id) {
    throw new Error('未能获取任务ID');
  }

  return { taskId: result.output.task_id };
}

/**
 * 查询图像编辑任务结果
 */
export async function queryImageEditTask(taskId: string, apiKey?: string): Promise<ImageEditResult> {
  const url = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
  const key = apiKey || DASHSCOPE_API_KEY;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`查询任务失败: ${errorText}`);
  }

  const result = await response.json();
  
  const status = result.output?.task_status || 'UNKNOWN';
  const imageUrls = result.output?.results?.map((r: { url: string }) => r.url) || [];

  return {
    taskId,
    status,
    imageUrls,
  };
}

/**
 * 图像编辑（带轮询）
 * 自动轮询直到任务完成或超时
 */
export async function editImage(params: ImageEditParams, apiKey?: string): Promise<ImageEditResult> {
  // 创建任务
  const { taskId } = await createImageEditTask(params, apiKey);
  
  // 轮询等待结果（最多等待2分钟）
  const maxAttempts = 24; // 24 * 5秒 = 120秒
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = await queryImageEditTask(taskId, apiKey);
    
    if (result.status === 'SUCCEEDED') {
      return result;
    }
    
    if (result.status === 'FAILED' || result.status === 'CANCELED') {
      throw new Error(`图像编辑任务失败: ${result.status}`);
    }

    // 等待5秒后重试
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('图像编辑任务超时');
}
