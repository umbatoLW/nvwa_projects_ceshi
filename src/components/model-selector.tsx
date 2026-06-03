"use client";

import { useState } from "react";
import { ChevronDown, Check, Sparkles, Image, Video, Box, Music, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MODELS,
  type ModelCategory,
} from "@/lib/model-config";

interface ModelSelectorProps {
  category: ModelCategory;
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
  size?: "sm" | "md";
}

const categoryIcons: Record<ModelCategory, React.ReactNode> = {
  llm: <Sparkles className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  "3d": <Box className="w-4 h-4" />,
  music: <Music className="w-4 h-4" />,
  edit: <Wand2 className="w-4 h-4" />,
};

const categoryLabels: Record<ModelCategory, string> = {
  llm: "大语言模型",
  image: "图像模型",
  video: "视频模型",
  "3d": "3D模型",
  music: "音乐模型",
  edit: "图像编辑",
};

export function ModelSelector({
  category,
  value,
  onChange,
  className,
  size = "md",
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const models = MODELS[category];
  const selected = models.find((m) => m.id === value);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg border border-[#333333]",
          "bg-[#1A1A1A] hover:bg-[#222222] transition-colors",
          "text-left",
          size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
        )}
      >
        <span className="text-[#0ABAB5]">
          {categoryIcons[category]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[#F5F5F5] truncate">
              {selected?.name || "选择模型"}
            </span>
          </div>
          {selected && "description" in selected && selected.description && size === "md" && (
            <span className="text-xs text-[#888888] truncate block">
              {selected.description}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[#888888] transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              "absolute z-50 mt-1 w-full rounded-lg border border-[#333333]",
              "bg-[#1A1A1A] shadow-2xl overflow-hidden",
              "max-h-[320px] overflow-y-auto"
            )}
          >
            <div className="px-3 py-2 text-xs text-[#888888] border-b border-[#333333]">
              {categoryLabels[category]}
            </div>
            {models.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onChange(model.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left",
                  "hover:bg-[#222222] transition-colors",
                  value === model.id && "bg-[#0ABAB5]/10"
                )}
              >
                <Check
                  className={cn(
                    "w-4 h-4 shrink-0",
                    value === model.id
                      ? "text-[#0ABAB5]"
                      : "text-transparent"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#F5F5F5]">
                      {model.name}
                    </span>
                    {Boolean((model as Record<string, unknown>).isNew) && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-[#0ABAB5]/20 text-[#0ABAB5] rounded-full">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#888888] block truncate">
                    {String((model as Record<string, unknown>).description || "")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
