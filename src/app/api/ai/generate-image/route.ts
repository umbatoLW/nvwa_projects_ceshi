
import { NextRequest, NextResponse } from "next/server";
import { generateImage, generateImageWithReference, getUserApiKey } from "@/lib/ai-client";
import { getUserId } from "@/lib/server-auth";
import { deductCredits } from "@/lib/credits";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/security/ai-rate-limiter";
import { validateTokenLimit } from "@/lib/security/token-limiter";
import { recordApiCost, canUserProceed } from "@/lib/security/cost-alert";

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

    // 检查成本限制
    const costCheck = canUserProceed(userId);
    if (!costCheck.allowed) {
      return NextResponse.json(
        { success: false, error: costCheck.reason },
        { status: 429 }
      );
    }

    // 检查限流
    const rateLimitResult = checkRateLimit(request, "generate-image");
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimitResult.reason },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 先解析请求体获取模型和数量信息
    const {
      prompt,
      model,
      size,
      n = 1,
      images, // 参考图片数组（URL或Base64）
      referenceImages, // 多图参考图片数组（0-9张）
      referenceImage, // 参考图片URL（单个，兼容旧接口）
      enableSequential, // 组图模式
      thinkingMode, // 思考模式
      watermark, // 水印
      seed, // 随机种子
    } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 根据模型确定扣费模型key
    const actualModel = model || "wan2.7-image-pro";
    let pricingModelKey = "wan2.7-text2image"; // 默认
    
    // 即梦模型使用对应的定价key
    if (actualModel.startsWith("seedream-3")) {
      pricingModelKey = "seedream-3.0-t2i";
    } else if (actualModel.startsWith("seedream-4") || actualModel.startsWith("seedance-4")) {
      pricingModelKey = "seedream-4.6-t2i";
    } else if (actualModel.startsWith("seedance-2")) {
      pricingModelKey = "seedance-2.0-t2i";
    } else if (actualModel.startsWith("wan2.7") || actualModel.startsWith("wan2.6")) {
      pricingModelKey = "wan2.7-text2image";
    } else if (actualModel.startsWith("wanx")) {
      pricingModelKey = "wanx-text2image";
    }
    
    // 即梦模型需要按出图数量扣费（因为每次API调用只出1张）
    const isJimengModel = actualModel.startsWith("seedance") || actualModel.startsWith("seedream");
    const deductCount = isJimengModel ? n : 1;
    
    // 扣费检查
    for (let i = 0; i < deductCount; i++) {
      const deductResult = await deductCredits(
        userId,
        pricingModelKey,
        `文生图生成 (${actualModel})`
      );
      if (!deductResult.success) {
        return NextResponse.json(
          { success: false, error: deductResult.error || "积分不足" },
          { status: 402 }
        );
      }
    }

    // 获取用户保存的API Key
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "请先在设置页面配置您的API Key" },
        { status: 401 }
      );
    }
    

    logger.debug("[Generate Image API] Using API Key:", apiKey?.substring(0, 10) + "...");
    logger.debug("[Generate Image API] Model:", model);
    logger.debug("[Generate Image API] Size:", size);
    logger.debug("[Generate Image API] n:", n);
    logger.debug("[Generate Image API] Reference Images count:", referenceImages?.length || 0);

    // 整理参考图片列表（支持多图）
    let effectiveReferenceImages: string[] = [];
    
    // 优先使用referenceImages（多图）
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      effectiveReferenceImages = referenceImages
        .map((img: { url?: string; preview?: string }) => img.url || img.preview)
        .filter((url): url is string => Boolean(url))
        .slice(0, 9); // 最多9张
    }
    // 兼容旧的单图接口
    else if (referenceImage) {
      effectiveReferenceImages = [referenceImage];
    }
    // 兼容images参数
    else if (images && Array.isArray(images) && images.length > 0) {
      effectiveReferenceImages = images.slice(0, 9);
    }
    
    if (effectiveReferenceImages.length > 0) {
      // 参考图生图模式（支持多图）
      logger.debug("[Generate Image API] Using reference image mode, image count:", effectiveReferenceImages.length);
      
      const result = await generateImageWithReference(prompt, effectiveReferenceImages, {
        model: model || "wan2.7-image-pro",
        size,
        n,
        apiKey,
      });
      
      return NextResponse.json({
        success: true,
        data: {
          imageUrls: result.imageUrls,
          ratio: result.ratio,
        },
      });
    }

    // 文生图模式
    // 构建选项
    const options: {
      model?: string;
      size?: string;
      n?: number;
      images?: string[];
      enableSequential?: boolean;
      thinkingMode?: boolean;
      watermark?: boolean;
      seed?: number;
      apiKey?: string;
    } = {
      model: model || "wan2.7-image-pro",
      size,
      n,
      apiKey, // 传递用户API Key
    };

    // 添加可选参数
    if (images && Array.isArray(images) && images.length > 0) {
      options.images = images;
    }
    if (enableSequential !== undefined) {
      options.enableSequential = enableSequential;
    }
    if (thinkingMode !== undefined) {
      options.thinkingMode = thinkingMode;
    }
    if (watermark !== undefined) {
      options.watermark = watermark;
    }
    if (seed !== undefined) {
      options.seed = seed;
    }

    logger.debug("[Generate Image API] === 即梦批量出图调试 ===");
    logger.debug("[Generate Image API] n 参数:", n);
    logger.debug("[Generate Image API] options.n:", options.n);
    
    const result = await generateImage(prompt, options) as Record<string, unknown>;
    
    logger.debug("[Generate Image API] result 类型:", typeof result);
    logger.debug("[Generate Image API] result.taskId:", result.taskId);
    logger.debug("[Generate Image API] result.taskIds:", result.taskIds);
    logger.debug("[Generate Image API] result keys:", Object.keys(result));

    // ai-client.ts 返回格式：{ imageUrls: string[], ratio: string } 或 { taskId: string }
    // 情况1: ai-client 已经解析出图片URL
    if (result.imageUrls && Array.isArray(result.imageUrls) && result.imageUrls.length > 0) {
      // 记录成本
      recordApiCost("generate-image", userId);

      return NextResponse.json({
        success: true,
        data: { 
          imageUrls: result.imageUrls,
          ratio: result.ratio,
        },
      });
    }

    // 情况2: 原始API响应 - 万相2.7 多模态API格式
    // output.choices[0].message.content[0].image
    const output = result.output as Record<string, unknown> | undefined;
    if (output?.choices && Array.isArray(output.choices)) {
      const imageUrls: string[] = [];
      for (const choice of output.choices) {
        const choiceObj = choice as Record<string, unknown>;
        const message = choiceObj.message as Record<string, unknown> | undefined;
        if (message?.content && Array.isArray(message.content)) {
          for (const item of message.content) {
            const itemObj = item as Record<string, unknown>;
            if (itemObj.image) {
              imageUrls.push(itemObj.image as string);
            }
          }
        }
      }
      
      if (imageUrls.length > 0) {
        return NextResponse.json({
          success: true,
          data: { imageUrls },
        });
      }
    }

    // 情况3: 异步任务模式 - ai-client直接返回 { taskId } 或 { taskIds }
    const taskId = result.taskId || (output?.task_id as string | undefined);
    const taskIds = result.taskIds as string[] | undefined;
    
    if (taskIds && taskIds.length > 0) {
      // 批量任务（即梦多图）
      return NextResponse.json({
        success: true,
        data: { taskIds },
      });
    }
    
    if (taskId) {
      return NextResponse.json({
        success: true,
        data: { taskId },
      });
    }

    // 如果都没有，返回错误
    console.error("Unknown response format:", result);
    return NextResponse.json({
      success: false,
      error: "无法解析API响应，请查看日志",
    });
  } catch (error) {
    console.error("Generate image error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Generate image failed" },
      { status: 500 }
    );
  }
}
