
import { NextRequest, NextResponse } from "next/server";
import { getUserApiKey } from "@/lib/ai-client";
import { getUserId } from "@/lib/server-auth";
import { deductCredits } from "@/lib/credits";

// API 端点
const API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/3d-model-generation/3d-model-generation";

// 任务状态查询
export async function GET(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserId(request);
    
    // 获取用户保存的API Key
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "请先在设置页面配置您的API Key" },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    
    if (!taskId) {
      return NextResponse.json({ error: "缺少 taskId 参数" }, { status: 400 });
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
      console.error("[3D Task Query Error]", errorText);
      return NextResponse.json({ error: `查询失败: ${response.status}` }, { status: response.status });
    }
    
    const result = await response.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[3D Task Query Error]", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

// 轮询等待任务完成
async function pollTaskResult(taskId: string, apiKey: string, maxAttempts = 60): Promise<unknown> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
    
    const response = await fetch(`${API_URL}/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`查询失败: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.output?.task_status === "SUCCEEDED") {
      return result;
    } else if (result.output?.task_status === "FAILED") {
      throw new Error(result.message || "任务失败");
    }
  }
  
  throw new Error("任务超时，请稍后重试");
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
      "text-to-3d",
      "3D模型生成"
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
    
    const body = await request.json();
    const { mode, prompt, images, model, textureQuality, geometryQuality, texture, pbr } = body;

    // 验证输入
    if (mode === "text2model" && !prompt?.trim()) {
      return NextResponse.json({ error: "请输入3D模型描述" }, { status: 400 });
    }
    if ((mode === "image2model" || mode === "multiview") && (!images || images.length === 0)) {
      return NextResponse.json({ error: "请至少添加一张图片" }, { status: 400 });
    }
    if (mode === "multiview" && images && images.length < 2) {
      return NextResponse.json({ error: "多视角模式需要至少2张图片" }, { status: 400 });
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

    console.log("[3D Generate] Mode:", mode);
    console.log("[3D Generate] Input:", JSON.stringify(input, null, 2));

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
      console.error("[3D Generate Error]", errorText);
      return NextResponse.json({ error: `生成失败: ${response.status}` }, { status: response.status });
    }

    const result = await response.json();
    const taskId = result.output?.task_id;
    
    if (!taskId) {
      return NextResponse.json({ error: "未能获取任务ID" }, { status: 500 });
    }

    console.log("[3D Generate] Task ID:", taskId);

    // 轮询等待结果
    const finalResult = await pollTaskResult(taskId, apiKey);
    
    return NextResponse.json({ 
      success: true, 
      data: finalResult,
      taskId: taskId
    });
  } catch (error) {
    console.error("[3D Generate Error]", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
