import { Target, Flame, Zap, Heart, Sparkles, Star, LucideIcon } from 'lucide-react';

// 情绪标签颜色映射
export const EMOTION_COLORS: Record<string, string> = {
  悬: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  燃: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  爽: 'bg-green-500/20 text-green-400 border-green-500/30',
  甜: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  暖: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  虐: 'bg-red-500/20 text-red-400 border-red-500/30',
  default: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

// 情绪图标映射
export const EMOTION_ICONS: Record<string, LucideIcon> = {
  悬: Target,
  燃: Flame,
  爽: Zap,
  甜: Heart,
  暖: Sparkles,
  虐: Star,
  default: Sparkles,
};

// 获取情绪颜色
export function getEmotionColor(emotion: string): string {
  return EMOTION_COLORS[emotion] || EMOTION_COLORS.default;
}

// 获取情绪图标
export function getEmotionIcon(emotion: string): LucideIcon {
  return EMOTION_ICONS[emotion] || EMOTION_ICONS.default;
}
