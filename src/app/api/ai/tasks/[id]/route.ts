"use server";

import { NextRequest, NextResponse } from "next/server";
import { getUserApiKey } from "@/lib/ai-client";
import { getUserId } from "@/lib/server-auth";
import { queryJimengTask } from "@/lib/jimeng-adapter";
import { querySeedanceTask } from "@/lib/seedance-adapter";
import { S3Storage } from "coze-coding-dev-sdk";

const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

/**
 * 将base64图片上传到对象存储
 */
async function uploadBase64Image(base64Data: string, fileName: string): Promise<string> {
  try {
    // 提取base64数据（去掉data:image/xxx;base64,前缀）
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.error("[Upload] Invalid base64 format");
      return base64Data; // 返回原始数据
    }
    
    const extension = matches[1] || 'png';
    const base64String = matches[2];
    const buffer = Buffer.from(base64String, 'base64');
    
    // 上传到对象存储
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName: `jimeng/${fileName}.${extension}`,
      contentType: `image/${extension}`,
    });
    
    // 生成签名URL（有效期30天）
    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 2592000, // 30天
    });
    
    return url;
  } catch (error) {
    console.error("[Upload] Failed to upload base64 image:", error);
    return base64Data; // 返回原始数据
  }
}

/**
 * 判断模型是否为即梦模型（仅图片生成）
 */
function isJimengModel(model: string | null): boolean {
  if (!model) return false;
  return model.startsWith('seedream');
}

/**
 * 判断模型是否为 Seedance 视频模型
 */
function isSeedanceVideoModel(model: string | null): boolean {
  if (!model) return false;
  return model.startsWith('seedance');
}

/**
 * 查询异步任务状态
 * 支持：阿里云百炼、即梦
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // 从URL参数获取model（前端需要传递）
    const url = new URL(request.url);
    const model = url.searchParams.get('model') || '';
    
    console.log('[Tasks API] 查询任务:', id, 'model:', model);
    
    // 判断任务来源：优先通过 model 参数判断
    if (isJimengModel(model)) {
      console.log('[Tasks API] 使用即梦查询方式');
      
      // 即梦任务查询
      const result = await queryJimengTask(id, model);
      
      // 将base64图片上传到对象存储
      let uploadedUrls: string[] = [];
      if (result.imageUrls && result.imageUrls.length > 0) {
        uploadedUrls = await Promise.all(
          result.imageUrls.map((url, index) => {
            // 如果是base64数据，上传到对象存储
            if (url.startsWith('data:image')) {
              return uploadBase64Image(url, `jimeng_${id}_${index}_${Date.now()}`);
            }
            return Promise.resolve(url);
          })
        );
      }
      
      return NextResponse.json({
        success: result.success,
        data: {
          taskId: id,
          status: result.status,
          progress: result.progress,
          output: {
            imageUrls: uploadedUrls,
            url: uploadedUrls[0] || "",
          },
          message: result.error,
        },
      });
    }

    // Seedance 视频任务查询
    if (isSeedanceVideoModel(model)) {
      console.log('[Tasks API] 使用 Seedance 查询方式');
      
      const result = await querySeedanceTask(id);
      
      // 状态映射：Seedance 状态转标准状态
      let mappedStatus = 'PENDING';
      if (result.status === 'pending') mappedStatus = 'PENDING';
      else if (result.status === 'processing') mappedStatus = 'RUNNING';
      else if (result.status === 'completed') mappedStatus = 'SUCCEEDED';
      else if (result.status === 'failed') mappedStatus = 'FAILED';
      
      return NextResponse.json({
        success: result.success,
        data: {
          taskId: id,
          status: mappedStatus,
          progress: result.status === 'completed' ? 100 : (result.status === 'processing' ? 50 : 0),
          output: {
            videoUrl: result.videoUrl,
            url: result.videoUrl || "",
          },
          message: result.error,
        },
      });
    }

    // 阿里云任务查询
    const userId = await getUserId(request);
    const apiKey = await getUserApiKey(userId);
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "请先在设置页面配置您的API Key" },
        { status: 401 }
      );
    }

    const apiUrl = `${DASHSCOPE_BASE_URL}/tasks/${id}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Query task failed");
    }

    const result = await response.json();

    const taskStatus = result.output?.task_status || "UNKNOWN";
    
    // 万相2.1格式: output.results
    let imageUrls: string[] = [];
    const results = result.output?.results || [];
    imageUrls = results.map((r: { url?: string }) => r.url).filter(Boolean);
    
    // 万相2.7格式: output.choices[0].message.content
    if (result.output?.choices && Array.isArray(result.output.choices)) {
      for (const choice of result.output.choices) {
        if (choice.message?.content && Array.isArray(choice.message.content)) {
          for (const item of choice.message.content) {
            if (item.image) {
              imageUrls.push(item.image);
            }
          }
        }
      }
    }
    
    const firstUrl = imageUrls[0] || "";

    return NextResponse.json({
      success: true,
      data: {
        taskId: id,
        status: result.output?.task_status || "UNKNOWN",
        progress: result.output?.task_metrics?.progress || 0,
        output: {
          imageUrls,
          videoUrl: firstUrl,
          url: firstUrl,
          results,
        },
        submitTime: result.output?.submit_time,
        scheduledTime: result.output?.scheduled_time,
        endTime: result.output?.end_time,
        message: result.output?.error?.message || result.output?.error,
        raw: result,
      },
    });
  } catch (error) {
    console.error("Query task error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query task failed" },
      { status: 500 }
    );
  }
}
