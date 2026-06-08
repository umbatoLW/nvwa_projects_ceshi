import { NextRequest, NextResponse } from "next/server";
import { handleApiError, ApiError } from "@/lib/api-error";

/**
 * POST /api/ai/redline-compare
 * 对比两个剧本版本，标记修改痕迹
 * TODO: P3 完整实现 - 接入 diff 算法和 AI 分析
 */
export async function POST(request: NextRequest) {
  try {
    const userId = "dev-user";

    const body = await request.json();
    const { scriptId, versionA, versionB } = body;

    if (!scriptId || !versionA || !versionB) {
      throw new ApiError("VALIDATION_ERROR", "缺少必要参数: scriptId, versionA, versionB", 400);
    }

    // TODO: P3 完整实现
    // 1. 查询两个版本的剧本内容
    // 2. 使用 diff 算法（如 diff-match-patch）对比文本
    // 3. 使用 AI 分析修改意图（为什么改、改了什么）
    // 4. 生成带标记的对比结果

    // 占位响应：返回模拟对比结果
    return NextResponse.json({
      success: true,
      data: {
        scriptId,
        versionA,
        versionB,
        additions: 0, // TODO: 真实统计
        deletions: 0,
        modifications: 0,
        changes: [
          {
            type: "modified",
            line: 1,
            oldText: "原始文本",
            newText: "修改后的文本",
            reason: "优化表达",
          }
        ],
        summary: "修改痕迹对比功能开发中",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/ai/redline-compare?scriptId=xxx
 * 获取剧本的所有历史版本列表
 */
export async function GET(request: NextRequest) {
  try {
    const userId = "dev-user";

    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get("scriptId");

    if (!scriptId) {
      throw new ApiError("VALIDATION_ERROR", "缺少 scriptId 参数", 400);
    }

    // TODO: P3 完整实现 - 查询数据库获取版本列表

    return NextResponse.json({
      success: true,
      data: {
        scriptId,
        versions: [
          { version: "v1.0", createdAt: new Date().toISOString(), summary: "初始版本" },
        ],
        message: "版本列表查询功能开发中",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
