import { NextResponse } from "next/server";

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 统一 API 错误处理
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    );
  }

  // 未知错误
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "服务器内部错误",
      },
    },
    { status: 500 }
  );
}
