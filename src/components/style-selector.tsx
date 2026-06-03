"use client";

import { useState } from "react";
import { Palette, ChevronDown } from "lucide-react";
import { VISUAL_STYLES } from "@/lib/visual-styles";

interface StyleSelectorProps {
  value: string;
  onChange: (styleId: string) => void;
  className?: string;
}

export function StyleSelector({ value, onChange, className = "" }: StyleSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = VISUAL_STYLES.find((s) => s.id === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#333333] text-sm text-[#F5F5F5] hover:border-primary/50 transition-colors w-full"
      >
        <Palette className="w-4 h-4 text-primary" />
        <span className="flex-1 text-left truncate">
          {selected ? selected.name : "默认风格"}
        </span>
        {selected && (
          <span
            className="w-3 h-3 rounded-full border border-white/10 shrink-0"
            style={{ backgroundColor: selected.previewColor }}
          />
        )}
        <ChevronDown className={`w-4 h-4 text-[#888888] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-lg bg-[#1A1A1A] border border-[#333333] shadow-xl py-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors ${
                !value ? "text-primary bg-primary/10" : "text-[#F5F5F5]"
              }`}
            >
              <span className="w-3 h-3 rounded-full border border-white/10 bg-[#333333] shrink-0" />
              <span>默认风格（无增强）</span>
            </button>
            {VISUAL_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  onChange(style.id);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors ${
                  value === style.id ? "text-primary bg-primary/10" : "text-[#F5F5F5]"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/10 shrink-0"
                  style={{ backgroundColor: style.previewColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{style.name}</div>
                  <div className="text-xs text-[#888888] truncate">{style.description}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function StyleBadge({ styleId, onClick }: { styleId: string; onClick?: () => void }) {
  const style = VISUAL_STYLES.find((s) => s.id === styleId);
  if (!style) return null;
  return (
    <span
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: style.previewColor }}
      />
      {style.name}
    </span>
  );
}
