import { NextRequest, NextResponse } from "next/server";
import { ImageGenerationClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// POST /api/ai/generate-script-cover
export async function POST(request: NextRequest) {
  try {
    const { title, genre, description } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "剧本标题不能为空" }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 构建封面图提示词
    const genreStyle: Record<string, string> = {
      "都市": "modern city skyline, urban atmosphere, neon lights, contemporary architecture",
      "古装": "ancient Chinese palace, traditional architecture, flowing silk robes, historical atmosphere",
      "科幻": "futuristic cityscape, sci-fi technology, holographic displays, space exploration",
      "悬疑": "mysterious dark atmosphere, film noir style, dramatic shadows, detective elements",
      "爱情": "romantic sunset, soft warm lighting, couple silhouette, dreamy atmosphere",
      "喜剧": "bright colorful scene, playful elements, cheerful atmosphere, fun composition",
      "动作": "dynamic action scene, explosive energy, dramatic angles, intense atmosphere",
      "奇幻": "magical fantasy world, mythical creatures, enchanted forest, mystical elements",
      "战争": "epic battlefield, military atmosphere, dramatic clouds, historical warfare",
      "家庭": "warm family home, cozy interior, heartwarming atmosphere, domestic scene",
    };

    const styleKeywords = genreStyle[genre || ""] || "cinematic atmosphere, professional lighting";
    const prompt = `A professional movie poster/cover image for a screenplay titled "${title}". ${styleKeywords}. ${description ? `Story theme: ${description}.` : ""} Professional composition, high quality, cinematic style, no text, no watermarks, 16:9 aspect ratio, suitable for digital display.`;

    const response = await client.generate({
      prompt,
      size: "2560x1440", // 16:9 比例
    });

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.imageUrls[0]) {
      return NextResponse.json({
        success: true,
        imageUrl: helper.imageUrls[0],
      });
    } else {
      return NextResponse.json(
        { error: helper.errorMessages.join(", ") || "封面图生成失败" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Generate script cover error:", error);
    return NextResponse.json({ error: "封面图生成失败" }, { status: 500 });
  }
}
