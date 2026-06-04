/**
 * 统一错误处理中间件
 * 
 * 提供：
 * 1. AppError 标准错误类
 * 2. withErrorHandler API 路由包装器
 * 3. 错误分类和响应格式化
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ZodError } from "zod";

// ============================================
// 错误类型定义
// ============================================

export enum ErrorCode {
  // 客户端错误 (4xx)
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  
  // 服务端错误 (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  UPSTREAM_ERROR = "UPSTREAM_ERROR",
  TIMEOUT = "TIMEOUT",
  
  // 业务错误
  INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS",
  GENERATION_FAILED = "GENERATION_FAILED",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
}

export enum ErrorCategory {
  CLIENT = "client",      // 客户端错误
  AUTH = "auth",          // 认证错误
  BUSINESS = "business",  // 业务错误
  SYSTEM = "system",      // 系统错误
  UPSTREAM = "upstream",  // 上游服务错误
}

// ============================================
// AppError 标准错误类
// ============================================

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      statusCode?: number;
      category?: ErrorCategory;
      details?: unknown;
      isOperational?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.code = code;
    this.category = options.category ?? inferCategory(code);
    this.statusCode = options.statusCode ?? inferStatusCode(code);
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    
    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 转换为 JSON 响应格式
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      error: {
        code: this.code,
        message: this.message,
        category: this.category,
      },
    };
    if (this.details) {
      (result.error as Record<string, unknown>).details = this.details;
    }
    return result;
  }

  /**
   * 创建 Next.js 响应
   */
  toResponse(): NextResponse {
    return NextResponse.json(this.toJSON(), { status: this.statusCode });
  }
}

// ============================================
// 错误推断函数
// ============================================

function inferCategory(code: ErrorCode): ErrorCategory {
  switch (code) {
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.FORBIDDEN:
      return ErrorCategory.AUTH;
    case ErrorCode.INSUFFICIENT_CREDITS:
    case ErrorCode.GENERATION_FAILED:
      return ErrorCategory.BUSINESS;
    case ErrorCode.UPSTREAM_ERROR:
      return ErrorCategory.UPSTREAM;
    case ErrorCode.BAD_REQUEST:
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.NOT_FOUND:
    case ErrorCode.CONFLICT:
    case ErrorCode.RATE_LIMITED:
    case ErrorCode.FILE_TOO_LARGE:
    case ErrorCode.INVALID_FILE_TYPE:
      return ErrorCategory.CLIENT;
    default:
      return ErrorCategory.SYSTEM;
  }
}

function inferStatusCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.BAD_REQUEST:
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.FILE_TOO_LARGE:
    case ErrorCode.INVALID_FILE_TYPE:
      return 400;
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.CONFLICT:
      return 409;
    case ErrorCode.RATE_LIMITED:
      return 429;
    case ErrorCode.INTERNAL_ERROR:
      return 500;
    case ErrorCode.SERVICE_UNAVAILABLE:
    case ErrorCode.UPSTREAM_ERROR:
    case ErrorCode.TIMEOUT:
      return 503;
    case ErrorCode.INSUFFICIENT_CREDITS:
    case ErrorCode.GENERATION_FAILED:
      return 200; // 业务错误，HTTP 200
    default:
      return 500;
  }
}

// ============================================
// 便捷工厂方法
// ============================================

export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError(ErrorCode.BAD_REQUEST, message, { details }),

  unauthorized: (message = "未授权，请先登录") =>
    new AppError(ErrorCode.UNAUTHORIZED, message),

  forbidden: (message = "没有权限执行此操作") =>
    new AppError(ErrorCode.FORBIDDEN, message),

  notFound: (resource = "资源") =>
    new AppError(ErrorCode.NOT_FOUND, `${resource}不存在`),

  validation: (message: string, details?: unknown) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, { details }),

  rateLimited: (retryAfter?: number) =>
    new AppError(ErrorCode.RATE_LIMITED, "请求过于频繁，请稍后重试", {
      details: retryAfter ? { retryAfter } : undefined,
    }),

  insufficientCredits: (required: number, available: number) =>
    new AppError(ErrorCode.INSUFFICIENT_CREDITS, "积分不足", {
      details: { required, available, shortfall: required - available },
    }),

  generationFailed: (type: string, reason?: string) =>
    new AppError(ErrorCode.GENERATION_FAILED, `${type}生成失败`, {
      details: reason ? { reason } : undefined,
    }),

  fileTooLarge: (maxSize: string) =>
    new AppError(ErrorCode.FILE_TOO_LARGE, `文件大小超过限制（${maxSize}）`),

  invalidFileType: (allowed: string[]) =>
    new AppError(ErrorCode.INVALID_FILE_TYPE, `不支持的文件类型`, {
      details: { allowed },
    }),

  upstream: (service: string, reason?: string) =>
    new AppError(ErrorCode.UPSTREAM_ERROR, `${service}服务异常`, {
      details: reason ? { reason } : undefined,
    }),

  timeout: (operation: string) =>
    new AppError(ErrorCode.TIMEOUT, `${operation}超时`),

  internal: (message = "服务器内部错误", cause?: Error) =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, { cause, isOperational: false }),
};

// ============================================
// API 路由包装器
// ============================================

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * API 路由错误处理包装器
 * 
 * @example
 * ```ts
 * export const GET = withErrorHandler(async (request, { params }) => {
 *   const id = (await params).id;
 *   if (!id) throw Errors.badRequest("缺少 ID");
 *   return NextResponse.json({ data: ... });
 * });
 * ```
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

/**
 * 统一错误处理函数
 */
function handleError(error: unknown, request: NextRequest): NextResponse {
  // AppError 直接返回
  if (error instanceof AppError) {
    logError(error, request);
    return error.toResponse();
  }

  // Zod 验证错误
  if (error instanceof ZodError) {
    const appError = Errors.validation("参数验证失败", error.issues);
    logError(appError, request);
    return appError.toResponse();
  }

  // 其他错误
  const appError = Errors.internal("服务器内部错误", error as Error);
  logError(appError, request);
  return appError.toResponse();
}

/**
 * 错误日志记录
 */
function logError(error: AppError, request: NextRequest): void {
  const logData: Record<string, unknown> = {
    code: error.code,
    message: error.message,
    category: error.category,
    statusCode: error.statusCode,
    path: request.nextUrl.pathname,
    method: request.method,
  };
  
  if (error.details) {
    logData.details = error.details;
  }
  
  if (error.cause) {
    logData.cause = (error.cause as Error).message;
  }

  if (error.isOperational) {
    logger.warn("[AppError]", logData);
  } else {
    logger.error("[AppError] 非预期错误:", logData);
  }
}

// ============================================
// 类型导出
// ============================================

export type { RouteHandler };
