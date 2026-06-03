"use client";

import React, { memo, useMemo } from 'react';
import { Type, Scissors, Users, Shield, Image, Video, FileOutput } from 'lucide-react';

interface PaletteItem {
  type: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

interface PaletteCategory {
  category: string;
  color: string;
  items: PaletteItem[];
}

const paletteItems: PaletteCategory[] = [
  {
    category: '输入',
    color: '#0ABAB5',
    items: [
      { type: 'input', label: '创意输入', icon: Type },
      { type: 'input', label: '角色导入', icon: Users },
      { type: 'input', label: '素材上传', icon: Image },
    ],
  },
  {
    category: '处理',
    color: '#A855F7',
    items: [
      { type: 'process', label: '剧本创作', icon: Type },
      { type: 'process', label: '分镜拆分', icon: Scissors },
      { type: 'process', label: '角色提取', icon: Users },
      { type: 'process', label: '内容审查', icon: Shield },
    ],
  },
  {
    category: '生成',
    color: '#33CCCC',
    items: [
      { type: 'text2image', label: '文生图', icon: Image },
      { type: 'text2video', label: '文生视频', icon: Video },
      { type: 'image2video', label: '图生视频', icon: Video },
      { type: 'characterViews', label: '角色三视图', icon: Users },
    ],
  },
  {
    category: '输出',
    color: '#22C55E',
    items: [
      { type: 'output', label: '剧本输出', icon: FileOutput },
      { type: 'output', label: '成片输出', icon: FileOutput },
    ],
  },
];

interface NodePaletteProps {
  onDragStart: (e: React.DragEvent, type: string, label: string) => void;
}

/**
 * 节点面板组件
 * 从 workspace/page.tsx 拆分出来，使用 memo 优化性能
 */
export const NodePalette = memo<NodePaletteProps>(({ onDragStart }) => {
  // 缓存整个面板渲染结果
  const categories = useMemo(() => paletteItems.map((cat) => (
    <div key={cat.category}>
      <div 
        className="text-xs font-semibold mb-2 uppercase tracking-wider"
        style={{ color: cat.color }}
      >
        {cat.category}
      </div>
      <div className="space-y-2">
        {cat.items.map((item) => (
          <div
            key={item.label}
            draggable
            onDragStart={(e) => onDragStart(e, item.type, item.label)}
            className="flex items-center gap-2 p-2 rounded-lg bg-[#0F0F0F] hover:bg-[#252525] cursor-grab active:cursor-grabbing transition-colors"
          >
            <item.icon size={16} style={{ color: cat.color }} />
            <span className="text-gray-300 text-sm">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )), [onDragStart]);

  return (
    <div className="absolute left-4 top-4 z-10 w-64 bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 shadow-2xl">
      <h3 className="text-white font-bold mb-4 text-sm">节点面板</h3>
      <div className="space-y-4">
        {categories}
      </div>
    </div>
  );
});

NodePalette.displayName = 'NodePalette';
