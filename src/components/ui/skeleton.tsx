"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.ComponentProps<"div"> {
  className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[#1A1A1A]",
        className
      )}
      style={style}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#141414] border border-[#333333] rounded-xl p-4 space-y-3">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// 预定义的高度百分比，避免渲染中调用Math.random()
const CHART_HEIGHTS = [45, 67, 34, 78, 52, 89, 43, 61, 75, 38, 82, 56];

export function ChartSkeleton() {
  return (
    <div className="w-full h-64 flex items-end gap-2 p-4">
      {CHART_HEIGHTS.map((height, i) => (
        <Skeleton
          key={i}
          className="flex-1"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}
