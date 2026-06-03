"use client";

interface AIStreamStateLike {
  isRunning: boolean;
  progress: number;
  stage: string;
  message: string;
  error: string | null;
  run?: unknown;
  reset?: unknown;
}

interface AIProgressBarProps {
  stream: AIStreamStateLike;
  className?: string;
}

export function AIProgressBar({
  stream,
  className = "",
}: AIProgressBarProps) {
  const { isRunning, progress } = stream;
  if (!isRunning) return null;

  return (
    <div className={`w-full h-[2px] bg-[#0A0A0A] overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
