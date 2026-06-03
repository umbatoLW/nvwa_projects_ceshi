
import { NextRequest, NextResponse } from "next/server";

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";
const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";

/**
 * 视频编辑API - 风格转换/口型同步/视频编辑
 */
export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({
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
