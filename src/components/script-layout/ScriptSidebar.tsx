"use client";

import { cn } from "@/lib/utils";
import {
  MessageSquare,
  FileText,
  Film,
  Users,
  Library,
  Wand2,
  GitCompare,
  LucideIcon,
} from "lucide-react";

export type ScriptViewType =
  | "chat"
  | "script"
  | "storyboard"
  | "roles"
  | "assets"
  | "optimize"
  | "redline";

interface NavItem {
  id: ScriptViewType;
  label: string;
  icon: LucideIcon;
  desc: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "script", label: "剧本正文", icon: FileText, desc: "编辑与查看剧本" },
  { id: "chat", label: "AI 助手", icon: MessageSquare, desc: "与 AI 对话创作" },
  { id: "storyboard", label: "分镜脚本", icon: Film, desc: "管理分镜与生成素材" },
  { id: "roles", label: "角色设定", icon: Users, desc: "角色提取与管理" },
  { id: "assets", label: "资产库", icon: Library, desc: "服装/场景/道具统一管理" },
  { id: "optimize", label: "AI 优化", icon: Wand2, desc: "剧本优化与评分" },
  { id: "redline", label: "修改痕迹", icon: GitCompare, desc: "版本对比" },
];

interface ScriptSidebarProps {
  activeView: ScriptViewType;
  onViewChange: (view: ScriptViewType) => void;
  scriptTitle?: string;
  scriptStatus?: string;
}

export function ScriptSidebar({
  activeView,
  onViewChange,
  scriptTitle,
  scriptStatus,
}: ScriptSidebarProps) {
  return (
    <aside className="w-60 flex-shrink-0 h-full flex flex-col bg-[#0A0A0A]/80 backdrop-blur-xl border-r border-white/5">
      {/* 顶部：剧本信息 */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-sm font-medium text-foreground truncate">
          {scriptTitle || "未命名剧本"}
        </h2>
        {scriptStatus && (
          <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-[#0ABAB5]/10 text-[#0ABAB5]">
            {scriptStatus}
          </span>
        )}
      </div>

      {/* 中部：导航列表 */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-left group",
                isActive
                  ? "bg-gradient-to-r from-[#7C5CFF]/20 to-[#69E7FF]/10 text-white shadow-lg shadow-[#7C5CFF]/10"
                  : "hover:bg-white/5 text-[#9AA7C7] hover:text-white"
              )}
              title={item.desc}
            >
              <Icon
                size={18}
                className={cn(
                  "flex-shrink-0 transition-all",
                  isActive
                    ? "text-[#7C5CFF]"
                    : "text-[#9AA7C7] group-hover:text-[#69E7FF]"
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#69E7FF] animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 底部：快捷提示 */}
      <div className="p-3 border-t border-white/5">
        <p className="text-xs text-[#9AA7C7]/60 text-center">
          按 <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-[#9AA7C7]">⌘K</kbd> 快速切换视图
        </p>
      </div>
    </aside>
  );
}

export { NAV_ITEMS };
