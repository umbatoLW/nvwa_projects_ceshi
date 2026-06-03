"use client";

import React, { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Mail } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** 是否在生产环境显示详细错误 */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // 调用错误回调
    this.props.onError?.(error, errorInfo);
    
    // 生产环境上报错误
    if (process.env.NODE_ENV === "production") {
      console.error("[ErrorBoundary]", error, errorInfo);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isProduction = process.env.NODE_ENV === "production";

      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#141414] border border-[#333333] rounded-2xl p-8 text-center">
            {/* 错误图标 */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* 标题 */}
            <h1 className="text-xl font-bold text-white mb-2">
              抱歉，出现了一些问题
            </h1>
            <p className="text-[#888888] mb-6">
              请尝试刷新页面或返回首页
            </p>

            {/* 错误详情（仅开发环境） */}
            {!isProduction && this.props.showDetails && this.state.error && (
              <div className="mb-6 p-4 bg-[#0A0A0A] rounded-lg text-left">
                <p className="text-red-400 text-sm font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                返回首页
              </Button>
              <Button
                onClick={this.handleReload}
                className="flex items-center gap-2 bg-[#0ABAB5] hover:bg-[#09A9A4]"
              >
                <RefreshCw className="w-4 h-4" />
                刷新页面
              </Button>
            </div>

            {/* 联系支持 */}
            <div className="mt-6 pt-6 border-t border-[#333333]">
              <p className="text-[#666666] text-sm">
                如果问题持续存在，请联系技术支持
              </p>
              <a
                href="mailto:support@example.com"
                className="text-[#0ABAB5] text-sm flex items-center justify-center gap-1 mt-1"
              >
                <Mail className="w-3 h-3" />
                support@example.com
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 轻量级错误边界Hook（用于局部错误捕获）
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err);
    } else {
      setError(new Error(String(err)));
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}
