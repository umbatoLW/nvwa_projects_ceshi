"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Sparkles,
  PenTool,
  Image,
  Video,
  Newspaper,
  X,
  Bot,
  Brain,
  MessageSquare,
  Square,
  Layers,
  Palette,
  Film,
  Globe,
  FileText,
  Zap,
  BookOpen,
  Microscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// 类型定义
// ============================================================================

interface LinkItem {
  id: string;
  label: string;
  url: string;
  description?: string;
  // 使用 Lucide 图标组件
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  // 或者使用首字母+颜色
  initials?: string;
  color?: string;
}

interface LinkGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  items: LinkItem[];
}

// ============================================================================
// 链接配置
// ============================================================================

const LINK_GROUPS: LinkGroup[] = [
  {
    id: "text",
    title: "文本创作",
    icon: PenTool,
    color: "from-violet-600/60 to-violet-500/40",
    items: [
      { id: "doubao", label: "豆包", url: "https://www.doubao.com/", description: "字节跳动 AI 助手", initials: "豆", color: "bg-violet-600/50" },
      { id: "deepseek", label: "DeepSeek", url: "https://chat.deepseek.com/", description: "深度求索 AI", initials: "D", color: "bg-cyan-600/50" },
      { id: "kimi", label: "Kimi", url: "https://kimi.moonshot.cn/", description: "月之暗面 AI", initials: "K", color: "bg-fuchsia-600/50" },
      { id: "chatgpt", label: "ChatGPT", url: "https://chat.openai.com/", description: "OpenAI 对话 AI", icon: Bot },
      { id: "claude", label: "Claude", url: "https://claude.ai/", description: "Anthropic AI 助手", initials: "C", color: "bg-amber-600/50" },
      { id: "yiyan", label: "文心一言", url: "https://yiyan.baidu.com/", description: "百度 AI 对话", initials: "文", color: "bg-blue-600/50" },
      { id: "tongyi", label: "通义千问", url: "https://tongyi.aliyun.com/", description: "阿里云 AI", initials: "通", color: "bg-orange-600/50" },
      { id: "zhipu", label: "智谱清言", url: "https://chatglm.cn/", description: "智谱 AI", initials: "智", color: "bg-teal-600/50" },
    ],
  },
  {
    id: "image",
    title: "AI 生图",
    icon: Image,
    color: "from-fuchsia-600/60 to-fuchsia-500/40",
    items: [
      { id: "midjourney", label: "Midjourney", url: "https://www.midjourney.com/", description: "顶级 AI 绘画", initials: "MJ", color: "bg-indigo-600/50" },
      { id: "dalle", label: "DALL·E", url: "https://openai.com/dall-e-3", description: "OpenAI 生图模型", initials: "D3", color: "bg-emerald-600/50" },
      { id: "jimeng", label: "即梦", url: "https://jimeng.jianying.com/", description: "字节 AI 绘画", initials: "即", color: "bg-rose-600/50" },
      { id: "liblib", label: "LiblibAI", url: "https://www.liblibai.com/", description: "AI 绘画社区", initials: "L", color: "bg-purple-600/50" },
      { id: "stable", label: "Stability AI", url: "https://stability.ai/", description: "Stable Diffusion", icon: Palette },
      { id: "ideogram", label: "Ideogram", url: "https://ideogram.ai/", description: "文字渲染专家", initials: "I", color: "bg-sky-600/50" },
    ],
  },
  {
    id: "video",
    title: "AI 生视频",
    icon: Video,
    color: "from-cyan-600/60 to-cyan-500/40",
    items: [
      { id: "runway", label: "Runway", url: "https://runwayml.com/", description: "视频生成领先者", initials: "R", color: "bg-violet-600/50" },
      { id: "pika", label: "Pika", url: "https://pika.art/", description: "AI 视频创作", initials: "P", color: "bg-amber-600/50" },
      { id: "sora", label: "Sora", url: "https://openai.com/sora", description: "OpenAI 视频模型", icon: Film },
      { id: "kling", label: "可灵 AI", url: "https://klingai.kuaishou.com/", description: "快手 AI 视频", initials: "可", color: "bg-rose-600/50" },
      { id: "vidu", label: "Vidu", url: "https://www.vidu.studio/", description: "生数科技视频", initials: "V", color: "bg-blue-600/50" },
      { id: "luma", label: "Luma AI", url: "https://lumalabs.ai/", description: "3D 与视频生成", initials: "Lu", color: "bg-lime-600/50" },
    ],
  },
  {
    id: "news",
    title: "AI 资讯",
    icon: Newspaper,
    color: "from-emerald-600/60 to-emerald-500/40",
    items: [
      { id: "producthunt", label: "Product Hunt", url: "https://www.producthunt.com/", description: "新产品发现", initials: "P", color: "bg-red-600/50" },
      { id: "futurepedia", label: "Futurepedia", url: "https://www.futurepedia.io/", description: "AI 工具百科", initials: "F", color: "bg-cyan-600/50" },
      { id: "theverge", label: "The Verge AI", url: "https://www.theverge.com/ai-artificial-intelligence", description: "AI 科技新闻", icon: Globe },
      { id: "huggingface", label: "Hugging Face", url: "https://huggingface.co/", description: "AI 模型社区", initials: "H", color: "bg-yellow-600/50" },
      { id: "arxiv", label: "arXiv AI", url: "https://arxiv.org/list/cs.AI/recent", description: "AI 学术论文", icon: FileText },
      { id: "machinelearning", label: "ML Mastery", url: "https://machinelearningmastery.com/", description: "ML 学习资源", icon: BookOpen },
    ],
  },
];

// ============================================================================
// 主组件
// ============================================================================

export function AiToolbox() {
  // 状态
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("text");

  // 拖动状态
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const hasMovedRef = useRef(false);

  // ============================================================================
  // 拖动逻辑
  // ============================================================================

  const BALL_SIZE = 48;
  const PANEL_WIDTH = 320;
  const PANEL_HEIGHT = 500;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) {
      return;
    }
    
    e.preventDefault();
    hasMovedRef.current = false;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    const deltaX = dragRef.current.startX - e.clientX;
    const deltaY = dragRef.current.startY - e.clientY;
    
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasMovedRef.current = true;
    }
    
    const maxX = isExpanded ? window.innerWidth - PANEL_WIDTH : window.innerWidth - BALL_SIZE;
    const maxY = isExpanded ? window.innerHeight - PANEL_HEIGHT : window.innerHeight - BALL_SIZE;
    
    setPosition({
      x: Math.max(0, Math.min(maxX, dragRef.current.startPosX + deltaX)),
      y: Math.max(0, Math.min(maxY, dragRef.current.startPosY + deltaY)),
    });
  }, [isDragging, isExpanded]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ============================================================================
  // 打开链接
  // ============================================================================

  const openLink = (url: string) => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ============================================================================
  // 渲染链接图标
  // ============================================================================

  const renderLinkIcon = (link: LinkItem, groupColor: string) => {
    // 如果有图标组件，使用图标
    if (link.icon) {
      const IconComponent = link.icon;
      return (
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center",
          `bg-gradient-to-br ${groupColor}`,
          "opacity-70 group-hover:opacity-100 transition-opacity"
        )}>
          <IconComponent size={14} className="text-white" />
        </div>
      );
    }
    
    // 否则使用首字母+渐变背景
    return (
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs",
        link.color || `bg-gradient-to-br ${groupColor}`,
        "opacity-80 group-hover:opacity-100 transition-opacity"
      )}>
        {link.initials || link.label[0]}
      </div>
    );
  };

  // ============================================================================
  // 渲染
  // ============================================================================

  const currentGroup = LINK_GROUPS.find((g) => g.id === selectedGroup);

  return (
    <>
      {/* 跳动小球 */}
      <div
        className={cn(
          "fixed z-50 cursor-pointer select-none",
          isExpanded && "pointer-events-none"
        )}
        style={{
          right: position.x,
          bottom: position.y,
        }}
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!isDragging && !hasMovedRef.current) setIsExpanded(true);
        }}
      >
        <div
          className={cn(
            "relative w-12 h-12 rounded-full",
            "bg-gradient-to-br from-nvwa-primary to-nvwa-accent",
            "shadow-lg shadow-nvwa-primary/30",
            "flex items-center justify-center",
            "transition-transform duration-300",
            !isExpanded && "animate-bounce-subtle",
            isDragging && "scale-110"
          )}
        >
          <Sparkles className="w-5 h-5 text-white" />
          <div className="absolute inset-0 rounded-full bg-nvwa-primary/30 animate-ping" />
        </div>
      </div>

      {/* 展开面板 */}
      {isExpanded && (
        <div
          className={cn(
            "fixed z-50 w-80 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden",
            isDragging ? "cursor-move" : "cursor-default"
          )}
          style={{
            right: position.x,
            bottom: position.y,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nvwa-primary to-nvwa-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-white select-none">AI 工具箱</span>
            </div>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setIsExpanded(false)}
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* 分组选择器 */}
          <div className="flex gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto">
            {LINK_GROUPS.map((group) => (
              <button
                key={group.id}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setSelectedGroup(group.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  selectedGroup === group.id
                    ? "bg-nvwa-primary/20 text-nvwa-accent"
                    : "text-white/40 hover:text-white/60 hover:bg-white/5"
                )}
              >
                <group.icon size={14} />
                {group.title}
              </button>
            ))}
          </div>

          {/* 链接列表 */}
          <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
            {currentGroup?.items.map((link) => (
              <button
                key={link.id}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => openLink(link.url)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                  "text-left group hover:bg-white/5"
                )}
              >
                {renderLinkIcon(link, currentGroup.color)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-white/80 group-hover:text-white transition-colors">
                    {link.label}
                  </div>
                  {link.description && (
                    <div className="text-xs text-white/40 truncate">{link.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* 快速访问 */}
          <div className="border-t border-white/10 p-3">
            <div className="text-xs text-white/40 mb-2 select-none">快速访问</div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "豆包", url: "https://www.doubao.com/", initials: "豆", color: "bg-violet-600/50" },
                { label: "DeepSeek", url: "https://chat.deepseek.com/", initials: "D", color: "bg-cyan-600/50" },
                { label: "Kimi", url: "https://kimi.moonshot.cn/", initials: "K", color: "bg-fuchsia-600/50" },
                { label: "即梦", url: "https://jimeng.jianying.com/", initials: "即", color: "bg-rose-600/50" },
              ].map((link) => (
                <button
                  key={link.label}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => openLink(link.url)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-all"
                >
                  <span className={cn("w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold text-white", link.color)}>
                    {link.initials}
                  </span>
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 自定义动画 */}
      <style jsx global>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

export default AiToolbox;
