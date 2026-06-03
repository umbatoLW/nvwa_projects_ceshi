"use client";

import { useState } from "react";
import { Sparkles, Image, Video, Box, Music, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-sidebar"; 

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  features: string[];
}

const tools: ToolCard[] = [
  {
    id: "script",
    title: "AI 剧本生成",
    description: "根据主题、风格自动生成短剧剧本",
    icon: <Sparkles className="w-6 h-6" />,
    color: "#0ABAB5",
    path: "/workspace",
    features: ["主题生成", "大纲生成", "分镜脚本", "角色设定"],
  },
  {
    id: "image",
    title: "AI 图像生成",
    description: "文生图、参考图生图、图像编辑",
    icon: <Image className="w-6 h-6" />,
    color: "#FF6B6B",
    path: "/create/image",
    features: ["文生图", "参考图", "局部重绘", "风格转换", "图像超分"],
  },
  {
    id: "video",
    title: "AI 视频生成",
    description: "文生视频、图生视频、视频编辑",
    icon: <Video className="w-6 h-6" />,
    color: "#4ECDC4",
    path: "/create/video",
    features: ["文生视频", "图生视频", "参考视频", "视频编辑"],
  },
  {
    id: "3d",
    title: "AI 3D生成",
    description: "文生3D、图生3D、多视角生3D",
    icon: <Box className="w-6 h-6" />,
    color: "#A78BFA",
    path: "/create/3d",
    features: ["文生3D", "图生3D", "多视角3D"],
  },
  {
    id: "music",
    title: "AI 音乐生成",
    description: "根据风格、歌词生成背景音乐",
    icon: <Music className="w-6 h-6" />,
    color: "#EC4899",
    path: "/create/music",
    features: ["风格音乐", "歌词生成", "背景音乐"],
  },
];

export default function CreatePage() {
  const router = useRouter();
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  return (
    <AppShell>
      {/* Header */}
      <div className="border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-[#F5F5F5] mb-2">
            AI 创作工具箱
          </h1>
          <p className="text-[#888888]">
            全功能 AI 创作平台，一站完成剧本、图像、视频、3D、音乐生成
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => router.push(tool.path)}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
              className="group relative bg-[#141414] border border-[#1A1A1A] rounded-2xl p-6 text-left
                hover:border-[#333333] hover:bg-[#1A1A1A] transition-all duration-300
                hover:shadow-lg hover:shadow-black/50"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${tool.color}15`, color: tool.color }}
                >
                  {tool.icon}
                </div>
                <ArrowRight
                  className={`w-5 h-5 text-[#888888] transition-all duration-300 ${
                    hoveredTool === tool.id
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2"
                  }`}
                />
              </div>

              <h3 className="text-lg font-semibold text-[#F5F5F5] mb-1">
                {tool.title}
              </h3>
              <p className="text-sm text-[#888888] mb-4">{tool.description}</p>

              <div className="flex flex-wrap gap-2">
                {tool.features.map((feature) => (
                  <span
                    key={feature}
                    className="px-2.5 py-1 text-xs bg-[#0A0A0A] text-[#888888] rounded-full
                      border border-[#1A1A1A]"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
