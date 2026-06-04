
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deductCredits, getUserBalance } from "@/lib/credits";

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";
const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";

// 视频编辑消耗积分
const EDIT_VIDEO_COST = 200;
const MODEL_KEY = "video-edit";

/**
 * 视频编辑API - 风格转换/口型同步/视频编辑
 */
export async function POST(request: NextRequest) {
  try {
    // 权限校验
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 积分校验
    const balance = await getUserBalance(user.id);
    if (balance < EDIT_VIDEO_COST) {
      return NextResponse.json(
        { success: false, error: "积分不足", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    const {
      mode,
      videoUrl,
      prompt,
      style,
      audioUrl,
    } = await request.json();

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 }
      );
    }

    let endpoint = "";
    let body: Record<string, unknown> = {};

    switch (mode) {
      case "styleTransfer":
        // 视频风格转换
        endpoint = "/services/aigc/video-generation/video-style-transform";
        body = {
          model: "wanx-video-style-transform",
          input: {
            video: videoUrl,
            style: style || "anime",
          },
        };
        break;

      case "lipSync":
        // 视频口型同步
        endpoint = "/services/aigc/video-generation/video-retalk";
        body = {
          model: "videoretalk",
          input: {
            video: videoUrl,
            audio: audioUrl,
          },
        };
        break;

      case "videoEdit":
        // 万相视频编辑
        endpoint = "/services/aigc/video-generation/video-editing";
        body = {
          model: "wan2.7-video-editing",
          input: {
            video: videoUrl,
            prompt: prompt || "",
          },
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid video edit mode" },
          { status: 400 }
        );
    }

    const response = await fetch(`${DASHSCOPE_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Video edit failed");
    }

    const result = await response.json();

    // 扣除积分
    try {
      await deductCredits(user.id, MODEL_KEY, `视频编辑: ${mode}`);
    } catch (e) {
      console.error("积分扣除失败:", e instanceof Error ? e.message : String(e));
    }

    return NextResponse.json({
      success: true,
      output: result.output,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Edit video error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Edit video failed" },
      { status: 500 }
    );
  }
}
