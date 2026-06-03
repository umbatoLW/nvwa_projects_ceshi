"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Mail, Bug } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 生产环境上报错误
    if (process.env.NODE_ENV === "production") {
      console.error("[GlobalError]", error);
    }
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="bg-[#0A0A0A] min-h-screen flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-[#141414] border border-[#333333] rounded-2xl p-8 text-center">
          {/* 错误图标 */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          {/* 错误标题 */}
          <h1 className="text-2xl font-bold text-white mb-2">
            抱歉，出现了一些问题
          </h1>
          <p className="text-[#888888] mb-6">
            我们已经记录了这个错误并会尽快修复
          </p>

          {/* 错误ID */}
          {error.digest && (
            <div className="mb-6 p-3 bg-[#0A0A0A] rounded-lg">
              <p className="text-[#666666] text-xs">
                错误ID: <span className="font-mono">{error.digest}</span>
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 bg-[#0ABAB5] hover:bg-[#09A9A4]"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard")}
              className="w-full flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              返回首页
            </Button>
          </div>

          {/* 技术支持 */}
          <div className="mt-8 pt-6 border-t border-[#333333]">
            <p className="text-[#666666] text-sm mb-3">
              如果问题持续存在，请联系技术支持
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="mailto:support@example.com"
                className="text-[#0ABAB5] text-sm flex items-center gap-1 hover:underline"
              >
                <Mail className="w-3 h-3" />
                support@example.com
              </a>
              <a
                href="#"
                className="text-[#0ABAB5] text-sm flex items-center gap-1 hover:underline"
              >
                <Bug className="w-3 h-3" />
                提交Bug
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
