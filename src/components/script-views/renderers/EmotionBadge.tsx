import { Target, Flame, Zap, Heart, Sparkles, Star } from 'lucide-react';
import { getEmotionColor } from './emotion-config';

interface EmotionBadgeProps {
  emotion: string;
  showIcon?: boolean;
  className?: string;
}

// 图标映射 - 在组件外部定义
const EMOTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  悬: Target,
  燃: Flame,
  爽: Zap,
  甜: Heart,
  暖: Sparkles,
  虐: Star,
  default: Sparkles,
};

export function EmotionBadge({ emotion, showIcon = true, className = '' }: EmotionBadgeProps) {
  const emotionColor = getEmotionColor(emotion);
  const IconComponent = EMOTION_ICONS[emotion] || EMOTION_ICONS.default;

  return (
    <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${emotionColor} ${className}`}>
      {showIcon && <IconComponent className="w-3 h-3" />}
      {emotion}
    </span>
  );
}
