import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getApiKeyForModel, PLATFORM_BASE_URLS } from "@/lib/platform-keys";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/security/ai-rate-limiter";
import { validateTokenLimit } from "@/lib/security/token-limiter";
import { withCircuitBreaker, checkCircuit, recordSuccess, recordFailure } from "@/lib/security/circuit-breaker";

// 环境变量兜底
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const KIMI_API_KEY = process.env.KIMI_API_KEY || "";

// 获取指定平台的 API 客户端
async function getLLMClient(model: string): Promise<{ client: OpenAI; actualModel: string }> {
  // 1. 尝试从数据库平台配置获取
  const platformConfig = await getApiKeyForModel(model);
  if (platformConfig?.apiKey) {
    return {
      client: new OpenAI({
        apiKey: platformConfig.apiKey,
        baseURL: platformConfig.baseUrl,
      }),
      actualModel: model,
    };
  }
  
  // 2. 根据模型前缀判断平台，使用环境变量
  if (model.startsWith("deepseek")) {
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DeepSeek API Key 未配置，请在平台设置中添加");
    }
    return {
      client: new OpenAI({
        apiKey: DEEPSEEK_API_KEY,
        baseURL: PLATFORM_BASE_URLS.deepseek,
      }),
      actualModel: model,
    };
  }
  
  if (model.startsWith("kimi") || model.startsWith("moonshot")) {
    if (!KIMI_API_KEY) {
      throw new Error("Kimi API Key 未配置，请在平台设置中添加");
    }
    return {
      client: new OpenAI({
        apiKey: KIMI_API_KEY,
        baseURL: PLATFORM_BASE_URLS.kimi,
      }),
      actualModel: model,
    };
  }
  
  // 3. 默认使用阿里云通义千问
  return {
    client: new OpenAI({
      apiKey: DASHSCOPE_API_KEY,
      baseURL: PLATFORM_BASE_URLS.aliyun,
    }),
    actualModel: model || "qwen-plus",
  };
}

export async function POST(request: NextRequest) {
  try {
    // 检查限流
    const rateLimitResult = checkRateLimit(request, "chat");
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.reason },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 检查熔断器状态
    const circuitCheck = checkCircuit("ai-chat");
    if (circuitCheck.isOpen) {
      return NextResponse.json(
        { error: `服务暂时不可用，请${Math.ceil((circuitCheck.remainingMs || 30000) / 1000)}秒后重试` },
        { status: 503 }
      );
    }

    const { model, messages, stream = true } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // 验证Token限制
    const totalTokens = messages.reduce((sum: number, m: { content: string }) => sum + (m.content?.length || 0), 0);
    const tokenCheck = validateTokenLimit(totalTokens, model || "qwen-plus");
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { error: tokenCheck.reason },
        { status: 400 }
      );
    }

    // 获取对应平台的客户端
    const { client, actualModel } = await getLLMClient(model || "qwen-plus");
    
    // 转换为 OpenAI 消息格式
    const llmMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }));

    if (!stream) {
      // 非流式响应
      const response = await client.chat.completions.create({
        model: actualModel,
        messages: llmMessages,
        temperature: 0.7,
      });

      // 记录成功
      recordSuccess("ai-chat");

      return NextResponse.json({
        content: response.choices[0]?.message?.content || "",
        model: actualModel,
      });
    }

    // 流式响应 - 记录成功
    recordSuccess("ai-chat");
    const streamResponse = await client.chat.completions.create({
      model: actualModel,
      messages: llmMessages,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResponse) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", content })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    // 记录失败
    recordFailure("ai-chat");
    logger.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
