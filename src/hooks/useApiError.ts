"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface ApiErrorOptions {
  /** 是否显示错误提示 */
  showToast?: boolean;
  /** 自定义错误消息 */
  customMessages?: Record<string, string>;
  /** 错误分类处理 */
  categorize?: boolean;
}

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  category: "network" | "auth" | "validation" | "server" | "unknown";
}

const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  "fetch failed": "网络连接失败，请检查网络",
  "network error": "网络连接失败，请检查网络",
  "timeout": "请求超时，请稍后重试",
  "401": "登录已过期，请重新登录",
  "403": "没有权限执行此操作",
  "404": "请求的资源不存在",
  "429": "请求过于频繁，请稍后重试",
  "500": "服务器错误，请稍后重试",
  "502": "服务器维护中，请稍后重试",
  "503": "服务暂不可用，请稍后重试",
};

/**
 * API错误处理Hook
 */
export function useApiError(options: ApiErrorOptions = {}) {
  const {
    showToast = true,
    customMessages = {},
    categorize = true,
  } = options;

  const [errors, setErrors] = useState<ApiError[]>([]);

  /**
   * 判断错误分类
   */
  const categorizeError = useCallback(
    (error: Error): ApiError["category"] => {
      const message = error.message.toLowerCase();

      if (
        message.includes("fetch") ||
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("econnrefused")
      ) {
        return "network";
      }

      if (message.includes("401") || message.includes("unauthorized")) {
        return "auth";
      }

      if (message.includes("400") || message.includes("validation")) {
        return "validation";
      }

      if (
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("server")
      ) {
        return "server";
      }

      return "unknown";
    },
    []
  );

  /**
   * 获取错误消息
   */
  const getErrorMessage = useCallback(
    (error: Error): string => {
      // 先检查自定义消息
      const lowerMessage = error.message.toLowerCase();
      for (const [key, value] of Object.entries(customMessages)) {
        if (lowerMessage.includes(key.toLowerCase())) {
          return value;
        }
      }

      // 再检查默认消息
      for (const [key, value] of Object.entries(DEFAULT_ERROR_MESSAGES)) {
        if (lowerMessage.includes(key.toLowerCase())) {
          return value;
        }
      }

      // 返回原始消息
      return error.message;
    },
    [customMessages]
  );

  /**
   * 处理API错误
   */
  const handleError = useCallback(
    (error: unknown, context?: string): ApiError => {
      const err = error instanceof Error ? error : new Error(String(error));
      
      const apiError: ApiError = {
        code: err.message.split(":")[0] || "UNKNOWN",
        message: getErrorMessage(err),
        details: err,
        category: categorize ? categorizeError(err) : "unknown",
      };

      // 添加到错误列表
      setErrors((prev) => [...prev, apiError]);

      // 显示错误提示
      if (showToast) {
        const prefix = context ? `${context}: ` : "";
        toast.error(`${prefix}${apiError.message}`);
      }

      return apiError;
    },
    [showToast, getErrorMessage, categorize, categorizeError]
  );

  /**
   * 清除错误
   */
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * 清除特定错误
   */
  const clearError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    errors,
    handleError,
    clearErrors,
    clearError,
    getErrorMessage,
    categorizeError,
  };
}
