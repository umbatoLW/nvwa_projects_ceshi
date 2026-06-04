'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  Sparkles,
  Target,
  Zap,
  Heart,
  Flame,
  Swords,
  Crown,
  Star,
} from 'lucide-react';

// 标签类型定义
type TagType = 'paywall' | 'satisfaction' | 'hook';

interface ParsedSegment {
  type: 'text' | 'tag';
  content: string;
  tagType?: TagType;
  tagValue?: string;
}

// 标签匹配正则
const TAG_PATTERNS = {
  paywall: /\[PAYWALL:([^\]]+)\]/g,
  satisfaction: /\[爽感:([^\]]+)\]/g,
  hook: /\[钩子:([^\]]+)\]/g,
};

// 爽感类型图标映射
const SATISFACTION_ICONS: Record<string, React.ElementType> = {
  打脸: Zap,
  逆袭: Crown,
  复仇: Swords,
  甜宠: Heart,
  燃向: Flame,
  悬疑: Target,
  default: Sparkles,
};

// 钩子类型颜色映射
const HOOK_COLORS: Record<string, string> = {
  悬念: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  情感: 'text-pink-400 bg-pink-400/10 border-pink-400/30',
  反转: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  冲突: 'text-red-400 bg-red-400/10 border-red-400/30',
  default: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
};

interface ScriptContentRendererProps {
  content: string;
  showTagLegend?: boolean;
  onTagClick?: (type: TagType, value: string) => void;
}

export function ScriptContentRenderer({
  content,
  showTagLegend = true,
  onTagClick,
}: ScriptContentRendererProps) {
  // 解析内容，提取标签和文本
  const segments = useMemo((): ParsedSegment[] => {
    if (!content) return [];

    const result: ParsedSegment[] = [];
    let lastIndex = 0;
    const allTags: Array<{
      match: RegExpMatchArray;
      type: TagType;
      pattern: RegExp;
    }> = [];

    // 收集所有标签匹配
    for (const [type, pattern] of Object.entries(TAG_PATTERNS)) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        allTags.push({
          match,
          type: type as TagType,
          pattern,
        });
      }
    }

    // 按位置排序
    allTags.sort((a, b) => a.match.index! - b.match.index!);

    // 构建分段
    for (const { match, type } of allTags) {
      const index = match.index!;

      // 添加标签前的文本
      if (index > lastIndex) {
        result.push({
          type: 'text',
          content: content.slice(lastIndex, index),
        });
      }

      // 添加标签
      result.push({
        type: 'tag',
        content: match[0],
        tagType: type,
        tagValue: match[1],
      });

      lastIndex = index + match[0].length;
    }

    // 添加最后剩余的文本
    if (lastIndex < content.length) {
      result.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return result;
  }, [content]);

  // 统计标签数量
  const tagStats = useMemo(() => {
    const stats = { paywall: 0, satisfaction: 0, hook: 0 };
    for (const seg of segments) {
      if (seg.type === 'tag' && seg.tagType) {
        stats[seg.tagType]++;
      }
    }
    return stats;
  }, [segments]);

  // 渲染标签
  const renderTag = (seg: ParsedSegment) => {
    if (seg.type !== 'tag' || !seg.tagType) return null;

    const { tagType, tagValue } = seg;

    switch (tagType) {
      case 'paywall':
        return (
          <Badge
            variant="outline"
            className="mx-1 px-2 py-1 text-yellow-400 bg-yellow-400/10 border-yellow-400/30 cursor-pointer hover:bg-yellow-400/20"
            onClick={() => onTagClick?.(tagType, tagValue!)}
          >
            <Lock className="w-3 h-3 mr-1" />
            付费卡点: {tagValue}
          </Badge>
        );

      case 'satisfaction':
        const Icon = SATISFACTION_ICONS[tagValue || ''] || SATISFACTION_ICONS.default;
        return (
          <Badge
            variant="outline"
            className="mx-1 px-2 py-1 text-green-400 bg-green-400/10 border-green-400/30 cursor-pointer hover:bg-green-400/20"
            onClick={() => onTagClick?.(tagType, tagValue!)}
          >
            <Icon className="w-3 h-3 mr-1" />
            {tagValue}
          </Badge>
        );

      case 'hook':
        const colorClass = HOOK_COLORS[tagValue || ''] || HOOK_COLORS.default;
        return (
          <Badge
            variant="outline"
            className={`mx-1 px-2 py-1 border cursor-pointer hover:opacity-80 ${colorClass}`}
            onClick={() => onTagClick?.(tagType, tagValue!)}
          >
            <Target className="w-3 h-3 mr-1" />
            钩子: {tagValue}
          </Badge>
        );

      default:
        return (
          <span className="mx-1 px-2 py-0.5 bg-gray-500/20 rounded text-xs">
            {seg.content}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 标签统计 */}
      {showTagLegend && (tagStats.paywall > 0 || tagStats.satisfaction > 0 || tagStats.hook > 0) && (
        <div className="flex items-center gap-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#333]">
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <Lock className="w-4 h-4" />
            <span>付费卡点 ×{tagStats.paywall}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <Sparkles className="w-4 h-4" />
            <span>爽感点 ×{tagStats.satisfaction}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-400">
            <Target className="w-4 h-4" />
            <span>钩子 ×{tagStats.hook}</span>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#333] min-h-[200px]">
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {segments.map((seg, idx) => {
            if (seg.type === 'text') {
              return <span key={idx}>{seg.content}</span>;
            }
            return <span key={idx}>{renderTag(seg)}</span>;
          })}
        </div>
      </div>
    </div>
  );
}

// 简化版：仅高亮不显示统计
export function highlightScriptTags(content: string): string {
  return content
    .replace(
      TAG_PATTERNS.paywall,
      '<span class="inline-flex items-center px-2 py-0.5 mx-0.5 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded">🔒 付费卡点: $1</span>'
    )
    .replace(
      TAG_PATTERNS.satisfaction,
      '<span class="inline-flex items-center px-2 py-0.5 mx-0.5 text-xs text-green-400 bg-green-400/10 border border-green-400/30 rounded">✨ $1</span>'
    )
    .replace(
      TAG_PATTERNS.hook,
      '<span class="inline-flex items-center px-2 py-0.5 mx-0.5 text-xs text-purple-400 bg-purple-400/10 border border-purple-400/30 rounded">🎯 钩子: $1</span>'
    );
}

export default ScriptContentRenderer;
