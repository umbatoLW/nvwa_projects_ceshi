'use client';

import { useState, useMemo } from 'react';
import { X, Check, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface DiffViewerProps {
  originalText: string;
  optimizedText: string;
  onAccept?: (text: string) => void;
  onReject?: () => void;
  onClose?: () => void;
  title?: string;
  showActions?: boolean;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  originalLine?: number;
  optimizedLine?: number;
}

// 简单的行级差异检测
function computeDiff(original: string, optimized: string): DiffLine[] {
  const originalLines = original.split('\n');
  const optimizedLines = optimized.split('\n');
  const result: DiffLine[] = [];

  // 使用最长公共子序列算法
  const lcs = computeLCS(originalLines, optimizedLines);

  let origIdx = 0;
  let optIdx = 0;
  let lcsIdx = 0;

  while (origIdx < originalLines.length || optIdx < optimizedLines.length) {
    if (lcsIdx < lcs.length && 
        origIdx < originalLines.length && 
        optIdx < optimizedLines.length &&
        originalLines[origIdx] === lcs[lcsIdx] && 
        optimizedLines[optIdx] === lcs[lcsIdx]) {
      result.push({
        type: 'unchanged',
        content: originalLines[origIdx],
        originalLine: origIdx + 1,
        optimizedLine: optIdx + 1,
      });
      origIdx++;
      optIdx++;
      lcsIdx++;
    } else if (origIdx < originalLines.length && 
               (lcsIdx >= lcs.length || originalLines[origIdx] !== lcs[lcsIdx])) {
      result.push({
        type: 'removed',
        content: originalLines[origIdx],
        originalLine: origIdx + 1,
      });
      origIdx++;
    } else if (optIdx < optimizedLines.length) {
      result.push({
        type: 'added',
        content: optimizedLines[optIdx],
        optimizedLine: optIdx + 1,
      });
      optIdx++;
    }
  }

  return result;
}

// 最长公共子序列
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯找出 LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

export function DiffViewer({
  originalText,
  optimizedText,
  onAccept,
  onReject,
  onClose,
  title = '内容对比',
  showActions = true,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'diff' | 'side-by-side'>('diff');
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const diffLines = useMemo(() => {
    return computeDiff(originalText, optimizedText);
  }, [originalText, optimizedText]);

  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'added').length;
    const removed = diffLines.filter(l => l.type === 'removed').length;
    const unchanged = diffLines.filter(l => l.type === 'unchanged').length;
    return { added, removed, unchanged };
  }, [diffLines]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[90vh] bg-[#141414] border border-[#333333] rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333]">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-[#F5F5F5]">{title}</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-[#22C55E]/20 text-[#22C55E]">
                +{stats.added} 新增
              </span>
              <span className="px-2 py-1 rounded bg-[#EF4444]/20 text-[#EF4444]">
                -{stats.removed} 删除
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`p-2 rounded-lg transition-colors ${showLineNumbers ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]' : 'text-[#888888] hover:text-[#F5F5F5]'}`}
              title={showLineNumbers ? '隐藏行号' : '显示行号'}
            >
              {showLineNumbers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-1 p-1 bg-[#1A1A1A] rounded-lg">
              <button
                onClick={() => setViewMode('diff')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${viewMode === 'diff' ? 'bg-[#0ABAB5]/20 text-[#0ABAB5]' : 'text-[#888888] hover:text-[#F5F5F5]'}`}
              >
                差异视图
              </button>
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${viewMode === 'side-by-side' ? 'bg-[#0ABAB5]/20 text-[#0ABAB5]' : 'text-[#888888] hover:text-[#F5F5F5]'}`}
              >
                并排对比
              </button>
            </div>
            {onClose && (
              <button onClick={onClose} className="p-2 rounded-lg text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'diff' ? (
            <div className="font-mono text-sm">
              {diffLines.map((line, index) => (
                <div
                  key={index}
                  className={`flex ${
                    line.type === 'added' 
                      ? 'bg-[#22C55E]/10' 
                      : line.type === 'removed' 
                        ? 'bg-[#EF4444]/10' 
                        : ''
                  }`}
                >
                  {showLineNumbers && (
                    <div className="w-16 shrink-0 px-2 py-1 text-right text-xs text-[#888888] border-r border-[#333333]/50 select-none">
                      {line.type === 'removed' ? line.originalLine : 
                       line.type === 'added' ? '' : line.originalLine}
                    </div>
                  )}
                  <div className={`w-8 shrink-0 px-2 py-1 text-center text-xs select-none ${
                    line.type === 'added' 
                      ? 'text-[#22C55E]' 
                      : line.type === 'removed' 
                        ? 'text-[#EF4444]' 
                        : 'text-[#888888]'
                  }`}>
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </div>
                  <pre className={`flex-1 px-4 py-1 whitespace-pre-wrap break-all ${
                    line.type === 'removed' 
                      ? 'text-[#F5F5F5]/60 line-through' 
                      : 'text-[#F5F5F5]'
                  }`}>
                    {line.content || ' '}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 divide-x divide-[#333333]">
              {/* Original */}
              <div>
                <div className="px-4 py-2 bg-[#1A1A1A] text-xs text-[#888888] border-b border-[#333333] sticky top-0">
                  原始内容
                </div>
                <div className="font-mono text-sm">
                  {originalText.split('\n').map((line, index) => (
                    <div key={index} className="flex hover:bg-[#1A1A1A]/50">
                      {showLineNumbers && (
                        <div className="w-12 shrink-0 px-2 py-1 text-right text-xs text-[#888888] border-r border-[#333333]/50 select-none">
                          {index + 1}
                        </div>
                      )}
                      <pre className="flex-1 px-4 py-1 whitespace-pre-wrap break-all text-[#F5F5F5]/80">
                        {line || ' '}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
              {/* Optimized */}
              <div>
                <div className="px-4 py-2 bg-[#1A1A1A] text-xs text-[#0ABAB5] border-b border-[#333333] sticky top-0 flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  优化后内容
                </div>
                <div className="font-mono text-sm">
                  {optimizedText.split('\n').map((line, index) => (
                    <div key={index} className="flex hover:bg-[#0ABAB5]/5">
                      {showLineNumbers && (
                        <div className="w-12 shrink-0 px-2 py-1 text-right text-xs text-[#888888] border-r border-[#333333]/50 select-none">
                          {index + 1}
                        </div>
                      )}
                      <pre className="flex-1 px-4 py-1 whitespace-pre-wrap break-all text-[#F5F5F5]">
                        {line || ' '}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#333333]">
            <button
              onClick={onReject}
              className="px-4 py-2 rounded-lg bg-[#1A1A1A] text-[#888888] text-sm font-medium hover:text-[#F5F5F5] transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => onAccept?.(optimizedText)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0ABAB5] text-black text-sm font-medium hover:shadow-[0_0_12px_rgba(10,186,181,0.3)] transition-all"
            >
              <Check className="w-4 h-4" />
              接受优化
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 简化版本的内联差异显示
export function InlineDiff({
  original,
  optimized,
  className = '',
}: {
  original: string;
  optimized: string;
  className?: string;
}) {
  const diffLines = useMemo(() => computeDiff(original, optimized), [original, optimized]);

  return (
    <div className={`font-mono text-xs ${className}`}>
      {diffLines.slice(0, 10).map((line, index) => (
        <div
          key={index}
          className={`py-0.5 px-2 ${
            line.type === 'added' 
              ? 'bg-[#22C55E]/10 text-[#22C55E]' 
              : line.type === 'removed' 
                ? 'bg-[#EF4444]/10 text-[#EF4444] line-through' 
                : 'text-[#888888]'
          }`}
        >
          {line.type === 'added' && '+ '}
          {line.type === 'removed' && '- '}
          {line.type === 'unchanged' && '  '}
          {line.content.slice(0, 50)}
          {line.content.length > 50 ? '...' : ''}
        </div>
      ))}
      {diffLines.length > 10 && (
        <div className="text-[#888888] px-2 py-0.5">
          ... 还有 {diffLines.length - 10} 行差异
        </div>
      )}
    </div>
  );
}
