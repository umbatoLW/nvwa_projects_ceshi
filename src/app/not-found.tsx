"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 图标 */}
        <div className="text-[120px] font-bold text-[#1A1A1A] leading-none mb-4 select-none">
          404
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          页面不存在
        </h1>
        <p className="text-[#888888] mb-8">
          您访问的页面可能已删除或地址有误
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3">
          <Link href="/dashboard">
            <Button className="w-full flex items-center justify-center gap-2 bg-[#0ABAB5] hover:bg-[#09A9A4]">
              <Home className="w-4 h-4" />
              返回首页
            </Button>
          </Link>
          <Link href="/scripts">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              浏览剧本
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="w-full flex items-center justify-center gap-2 text-[#888888]"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上一页
          </Button>
        </div>
      </div>
    </div>
  );
}
