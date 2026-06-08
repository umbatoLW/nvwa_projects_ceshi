'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  badge,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#333] rounded-xl overflow-hidden bg-[#141414]/50 backdrop-blur-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1A1A1A]/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0ABAB5]/20 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#0ABAB5]" />
          </div>
          <span className="text-sm font-medium text-[#F5F5F5]">{title}</span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-[#888]" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[#888]" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-[#333]/50">
          {children}
        </div>
      )}
    </div>
  );
}
