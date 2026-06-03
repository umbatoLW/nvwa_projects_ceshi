"use client";

import { ReactNode } from "react";
import { ErrorBoundary } from "./error-boundary";

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

/**
 * 全局错误边界包装器
 * 用于在 layout.tsx 中包裹整个应用
 */
export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  return (
    <ErrorBoundary
      showDetails={process.env.NODE_ENV !== "production"}
      onError={(error, errorInfo) => {
        // 生产环境上报错误
        if (process.env.NODE_ENV === "production") {
          console.error("[GlobalError]", error, errorInfo);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
