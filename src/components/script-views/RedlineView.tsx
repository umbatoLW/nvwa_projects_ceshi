"use client";

import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";

interface RedlineViewProps {
  checkResult: string | null;
  isChecking: boolean;
  onCheck: () => void;
}

export default function RedlineView({
  checkResult,
  isChecking,
  onCheck,
}: RedlineViewProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">内容审查</h2>
        <Button size="sm" onClick={onCheck} disabled={isChecking}>
          {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
          内容审查
        </Button>
      </div>
      <div className="flex-1 flex flex-col space-y-4">
        <div className="text-sm text-muted-foreground">AI 将分析剧本中的敏感内容和合规风险</div>
        {checkResult ? (
          <div className="flex-1 bg-[#141414] border border-[#333] rounded-xl p-6 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed overflow-auto">
            {checkResult}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            点击右上角&ldquo;内容审查&rdquo;开始分析
          </div>
        )}
      </div>
    </div>
  );
}
