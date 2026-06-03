"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Users, Film, Zap } from "lucide-react";

interface OptimizeViewProps {
  editContent: string;
  optimizedStreamText: string;
  isOptimizingStream: boolean;
  optimizingMode: 'polish' | 'character' | 'visual' | 'rhythm';
  onModeChange: (mode: 'polish' | 'character' | 'visual' | 'rhythm') => void;
  onOptimize: () => void;
  onOptimizedTextChange: (text: string) => void;
  onApplyToScript: (content: string) => void;
}

export default function OptimizeView({
  editContent,
  optimizedStreamText,
  isOptimizingStream,
  optimizingMode,
  onModeChange,
  onOptimize,
  onOptimizedTextChange,
  onApplyToScript,
}: OptimizeViewProps) {
  const modeOptions = [
    { key: 'polish', label: '整体润色', desc: '优化语言和节奏', icon: Sparkles },
    { key: 'character', label: '人物增强', desc: '完善人设和对话', icon: Users },
    { key: 'visual', label: '画面感强化', desc: '添加场景描写', icon: Film },
    { key: 'rhythm', label: '节奏调整', desc: '控制剧情快慢', icon: Zap },
  ] as const;

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI 优化</h2>
        <Button 
          onClick={onOptimize} 
          disabled={isOptimizingStream || !editContent.trim()}
        >
          {isOptimizingStream ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              优化中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              开始优化
            </>
          )}
        </Button>
      </div>

      {/* 优化模式选择 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {modeOptions.map(({ key, label, desc, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={`p-4 rounded-xl border text-left transition-colors ${
              optimizingMode === key
                ? 'bg-[#0ABAB5]/10 border-[#0ABAB5]'
                : 'bg-[#1A1A1A] border-[#333] hover:border-[#0ABAB5]'
            }`}
          >
            <Icon className="w-5 h-5 text-[#0ABAB5] mb-2" />
            <h3 className="font-medium">{label}</h3>
            <p className="text-xs text-[#888888]">{desc}</p>
          </button>
        ))}
      </div>

      {/* 双栏对比视图 */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* 原文 */}
        <div className="flex-1 flex flex-col bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#333]">
          <div className="px-4 py-2 bg-[#141414] border-b border-[#333] text-sm text-[#888888] flex-shrink-0">
            原文
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {editContent || '暂无内容'}
            </pre>
          </div>
        </div>

        {/* 优化结果 */}
        <div className="flex-1 flex flex-col bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#0ABAB5]/50">
          <div className="px-4 py-2 bg-[#0ABAB5]/10 border-b border-[#0ABAB5]/30 text-sm flex items-center justify-between flex-shrink-0">
            <span className="text-[#0ABAB5] font-medium">优化结果</span>
            {optimizedStreamText && (
              <Button size="sm" onClick={() => onApplyToScript(optimizedStreamText)}>
                应用到剧本
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {isOptimizingStream ? (
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {optimizedStreamText || '正在优化中...'}
                <span className="animate-pulse">|</span>
              </div>
            ) : optimizedStreamText ? (
              <textarea
                className="w-full h-full min-h-[200px] bg-transparent border-none outline-none resize-none text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                value={optimizedStreamText}
                onChange={(e) => onOptimizedTextChange(e.target.value)}
                placeholder="优化结果将显示在这里，可以手动编辑..."
              />
            ) : (
              <div className="text-center text-[#888888] py-8">
                <p>点击「开始优化」按钮生成优化内容</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
