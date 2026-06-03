"use client";

import { Button } from "@/components/ui/button";
import { StoryboardCard } from "@/components/StoryboardCard";
import { Loader2, Layers, Film, Download } from "lucide-react";

interface ScriptStoryboard {
  num: number;
  duration: string;
  description: string;
  character: string;
  shot: string;
  camera: string;
  audio: string;
  imgUrl?: string;
  videoUrl?: string;
}

interface EpisodeInfo {
  episode: number;
  title: string;
  synopsis: string;
}

interface StoryboardViewProps {
  storyboards: ScriptStoryboard[];
  storyboardImages?: Record<number, string>;
  storyboardVideos?: Record<number, string>;
  scriptId?: string;
  episodes: EpisodeInfo[];
  episodeCount: number;
  isSplitting: boolean;
  isAnalyzingEpisodes: boolean;
  generatingEpisode: number | null;
  showEpisodeSelector: boolean;
  selectedEpisodes: number[];
  content: string;
  onSplitScenes: () => void;
  onExportExcel: () => void;
  onImageGenerated: (index: number, url: string) => void;
  onVideoGenerated?: (index: number, url: string) => void;
  onPromptOptimized?: (index: number, optimizedPrompt: string) => void;
  onSetShowEpisodeSelector: (show: boolean) => void;
  onToggleEpisodeSelection: (episode: number) => void;
  onToggleSelectAll: () => void;
  onGenerateBySelectedEpisodes: () => void;
  onSetActiveView: (view: string) => void;
}

export default function StoryboardView({
  storyboards,
  storyboardImages,
  storyboardVideos,
  scriptId,
  episodes,
  episodeCount,
  isSplitting,
  isAnalyzingEpisodes,
  generatingEpisode,
  showEpisodeSelector,
  selectedEpisodes,
  content,
  onSplitScenes,
  onExportExcel,
  onImageGenerated,
  onVideoGenerated,
  onPromptOptimized,
  onSetShowEpisodeSelector,
  onToggleEpisodeSelection,
  onToggleSelectAll,
  onGenerateBySelectedEpisodes,
  onSetActiveView,
}: StoryboardViewProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">分镜脚本</h2>
        <div className="flex items-center gap-2">
          {generatingEpisode && (
            <span className="text-xs text-[#0ABAB5] bg-[#0ABAB5]/10 px-3 py-1 rounded-full">
              正在生成第 {generatingEpisode} 集...
            </span>
          )}
          <Button 
            size="sm" 
            onClick={onSplitScenes} 
            disabled={isSplitting || isAnalyzingEpisodes}
            className="gap-1.5"
          >
            {isSplitting || isAnalyzingEpisodes ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            {isAnalyzingEpisodes ? "分析集数中..." : isSplitting ? "生成中..." : "生成分镜"}
          </Button>
        </div>
      </div>

      {/* 分集选择器 */}
      {showEpisodeSelector && episodes.length > 0 && (
        <div className="mb-4 p-4 bg-[#141414] border border-[#333] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0ABAB5]" />
              <h3 className="text-sm font-medium">选择要生成分镜的集数</h3>
              <span className="text-xs text-[#888888]">（已选 {selectedEpisodes.length}/{episodes.length} 集）</span>
            </div>
            <button
              onClick={onToggleSelectAll}
              className="text-xs text-[#0ABAB5] hover:underline"
            >
              {selectedEpisodes.length === episodes.length ? '取消全选' : '全选'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto mb-4">
            {episodes.map((episode) => (
              <button
                key={episode.episode}
                onClick={() => onToggleEpisodeSelection(episode.episode)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedEpisodes.includes(episode.episode)
                    ? 'border-[#0ABAB5] bg-[#0ABAB5]/10'
                    : 'border-[#333] bg-[#1A1A1A] hover:border-[#0ABAB5]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedEpisodes.includes(episode.episode)
                      ? 'bg-[#0ABAB5] border-[#0ABAB5]'
                      : 'border-[#555]'
                  }`}>
                    {selectedEpisodes.includes(episode.episode) && (
                      <span className="text-black text-xs">✓</span>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    第{episode.episode}集
                  </span>
                </div>
                <p className="text-[10px] text-[#888888] mt-1 truncate">
                  {episode.title || episode.synopsis}
                </p>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetShowEpisodeSelector(false)}
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={onGenerateBySelectedEpisodes}
              disabled={selectedEpisodes.length === 0}
              className="gap-1.5"
            >
              <Film className="w-4 h-4" />
              生成 {selectedEpisodes.length > 0 ? `(${selectedEpisodes.length}集)` : ''} 分镜
            </Button>
          </div>
        </div>
      )}

      {/* 生成状态 */}
      {isSplitting && !generatingEpisode && (
        <div className="mb-4 p-4 bg-[#0ABAB5]/10 border border-[#0ABAB5]/30 rounded-lg">
          <div className="flex items-center gap-2 text-[#0ABAB5]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">正在调用 AI 生成分镜，请稍候...</span>
          </div>
          <p className="text-xs text-[#888888] mt-2">首次生成可能需要 1-2 分钟，请耐心等待</p>
        </div>
      )}

      {/* 分镜列表 */}
      {storyboards && storyboards.length > 0 ? (
        <div className="flex-1 overflow-auto">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-[#888888]">
              共 {storyboards.length} 个分镜
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={onExportExcel}
                className="flex items-center gap-1.5 text-xs text-[#0ABAB5] hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                导出Excel
              </button>
              {episodes.length > 0 && (
                <button
                  onClick={() => onSetShowEpisodeSelector(true)}
                  className="text-xs text-[#0ABAB5] hover:underline"
                >
                  + 添加更多分镜
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {storyboards.map((sb, index) => (
              <StoryboardCard 
                key={index} 
                sb={{ ...sb, imgUrl: storyboardImages?.[index] || sb.imgUrl, videoUrl: storyboardVideos?.[index] || sb.videoUrl }}
                index={index}
                scriptId={scriptId}
                onImageGenerated={(url) => onImageGenerated(index, url)}
                onVideoGenerated={onVideoGenerated ? (url) => onVideoGenerated(index, url) : undefined}
                onPromptOptimized={onPromptOptimized ? (prompt) => onPromptOptimized(index, prompt) : undefined}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-[#333333]" />
          </div>
          {!content?.trim() ? (
            <>
              <p className="text-[#F5F5F5] font-medium mb-2">剧本内容为空</p>
              <p className="text-sm text-[#888888] mb-4">请先在左侧「剧本预览」页面输入或导入剧本内容</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onSetActiveView("script")}
                className="border-[#0ABAB5]/30 text-[#0ABAB5] hover:bg-[#0ABAB5]/10"
              >
                去写剧本
              </Button>
            </>
          ) : (
            <>
              <p className="text-[#F5F5F5] font-medium mb-2">暂无分镜数据</p>
              <p className="text-sm text-[#888888] mb-4">点击上方「生成分镜」按钮，AI 将为您拆分剧本</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
