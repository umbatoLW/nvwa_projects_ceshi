import { NextRequest, NextResponse } from "next/server";

/**
 * 通用下载代理API
 * 支持图片和视频下载，解决跨域问题
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");
    const type = request.nextUrl.searchParams.get("type") || "image"; // image | video
    
    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // 验证URL格式
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    // 允许的域名白名单
    const allowedDomains = [
      "aliyuncs.com",
      "dashscope-result-bj.oss-cn-beijing.aliyuncs.com",
      "dashscope-result.oss-cn-beijing.aliyuncs.com",
      "cloudfront.net",
      "amazonaws.com",
    ];

    const isAllowed = allowedDomains.some(domain => 
      parsedUrl.hostname.includes(domain)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Domain not allowed" },
        { status: 403 }
      );
    }

    // 获取文件
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    const contentType = response.headers.get("content-type") || 
      (type === "video" ? "video/mp4" : "image/png");
    
    const extension = type === "video" ? "mp4" : "png";
    const filename = `nvwa-${type}-${Date.now()}.${extension}`;

    // 返回文件数据
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 }
    );
  }
}
