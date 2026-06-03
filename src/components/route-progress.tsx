"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 路由变化时启动进度条
    setVisible(true);
    setProgress(10);

    if (timerRef.current) clearInterval(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // 页面加载完成后（短时间后）完成进度条
    hideTimerRef.current = setTimeout(() => {
      setProgress(100);
      if (timerRef.current) clearInterval(timerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 400);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px]">
      <div
        className="h-full bg-[#0ABAB5] transition-all duration-300 ease-out"
        style={{
          width: `${Math.min(progress, 100)}%`,
          opacity: progress >= 100 ? 0 : 1,
          transition: "width 200ms ease-out, opacity 300ms ease-out",
          boxShadow: "0 0 8px rgba(10, 186, 181, 0.6)",
        }}
      />
    </div>
  );
}
