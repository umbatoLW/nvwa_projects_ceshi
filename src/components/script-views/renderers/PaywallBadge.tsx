import { Lock } from 'lucide-react';

interface PaywallBadgeProps {
  className?: string;
}

export function PaywallBadge({ className = '' }: PaywallBadgeProps) {
  return (
    <span className={`flex items-center gap-1 text-xs text-yellow-400 ${className}`}>
      <Lock className="w-3 h-3" />
      付费卡点
    </span>
  );
}
