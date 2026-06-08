"use client";

import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Upload, Eye, EyeOff, Copy, Check, Trash2, Clapperboard } from "lucide-react";
import { ScriptContentRenderer } from "@/components/script-generation";
import { ScriptJsonRenderer, isJsonScriptContent } from "@/components/script-views/ScriptJsonRenderer";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import type { ScriptEditorProps, ScriptDetail, ScriptGenerationStage } from "@/components/script-editor";

export default function ScriptEditor({
  script,
  editContent,
  setEditContent,
  // 注意：aiGeneratedContent 相关 props 已移除，剧本编辑界面完全独立
  episodeContentMap,
  setEpisodeContentMap,
  activeEpisode,
  setActiveEpisode,
  isUploading,
  uploadProgress,
  analyzeProgress,
  onFileUpload,
  onApplyToStoryboard,
}: ScriptEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(true);  // 默认预览模式，JSON格式时美观展示
  const [copied, setCopied] = useState(false);  // 复制状态
  const [showClearConfirm, setShowClearConfirm] = useState(false);  // 清空确认状态
  const previewScrollRef = useRef<HTMLDivElement>(null);  // 预览滚动容器

  // 清空编辑内容（只清空剧本编辑框，不影响创意生成的剧本输出）
  const handleClearContent = useCallback(() => {
    if (showClearConfirm) {
      // 执行清空 - 只清空剧本编辑框内容，完全独立于创意生成界面
      setEditContent('');
      setEpisodeContentMap({});
      setShowClearConfirm(false);
    } else {
      // 显示确认状态
      setShowClearConfirm(true);
      // 3秒后自动取消确认状态
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  }, [showClearConfirm, setEditContent, setEpisodeContentMap]);

  // 单集内容更新
  const handleEpisodeContentChange = useCallback((episode: number, content: string) => {
    setEpisodeContentMap(prev => {
      const updatedMap = { ...prev, [episode]: content };
      const allContent = Object.entries(updatedMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, c]) => c)
        .join('\n\n');
      setEditContent(allContent);
      return updatedMap;
    });
  }, [setEpisodeContentMap, setEditContent]);

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-heading">剧本编辑</h2>
          {/* 上传按钮 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0ABAB5]/20 hover:bg-[#0ABAB5]/30 text-[#0ABAB5] text-xs transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{uploadProgress || '处理中...'}</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>上传剧本</span>
              </>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#888888]">
          <span>共 {script?.episodeCount || 1} 集</span>
          {(script?.episodeCount ?? 1) > 1 && (
            <>
              <span className="text-[#0ABAB5]">|</span>
              <span>当前第 {activeEpisode} 集</span>
            </>
          )}
        </div>
      </div>
      {/* 三阶段进度条 - 仅在创意生成界面显示，这里不显示 */}
      
      {/* 传统进度显示 - 仅显示文件上传相关进度，不显示创意生成进度 */}
      {(isUploading || uploadProgress || analyzeProgress) && (
        <div className="mb-4 p-3 bg-[#0ABAB5]/10 border border-[#0ABAB5]/30 rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#0ABAB5]" />
          <span className="text-sm text-[#0ABAB5]">{uploadProgress || analyzeProgress || '处理中...'}</span>
        </div>
      )}
      
      {/* 集数标签栏 - 仅多集时显示 */}
      {(script?.episodeCount ?? 1) > 1 && (
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2 border-b border-[#333]">
          {Array.from({ length: script?.episodeCount ?? 1 }, (_, i) => i + 1).map(ep => (
            <button
              key={ep}
              onClick={() => setActiveEpisode(ep)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeEpisode === ep 
                  ? 'bg-[#0ABAB5] text-black' 
                  : 'bg-[#1A1A1A] text-[#888888] hover:text-[#F5F5F5]'
              }`}
            >
              第{ep}集
            </button>
          ))}
        </div>
      )}
      
      {/* AI/手动版本切换 Tab - 简化版，移到右上角 */}
      {/* 单集内容编辑器 */}
      <div className="relative flex-1 min-h-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileUpload}
          accept=".txt,.md,.docx,.pdf"
          className="hidden"
          aria-label="上传剧本文件"
        />
        
        {/* 右上角工具栏：版本切换 + 编辑/预览 + 复制 + 应用到分镜 + 清空 */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {/* 清空按钮 */}
          <button
            onClick={handleClearContent}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors ${
              showClearConfirm 
                ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30' 
                : 'bg-[#1A1A1A] border-[#333] text-[#888] hover:text-red-500 hover:border-red-500/50'
            }`}
            title={showClearConfirm ? "确认清空" : "清空内容"}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {showClearConfirm ? "确认?" : "清空"}
          </button>
          {/* 应用到分镜按钮 */}
          {onApplyToStoryboard && (
            <button
              onClick={() => {
                const currentContent = script?.episodeCount && script.episodeCount > 1 
                  ? (episodeContentMap[activeEpisode] || '') 
                  : editContent;
                if (currentContent && currentContent.trim()) {
                  onApplyToStoryboard(currentContent, activeEpisode);
                }
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#0ABAB5]/20 border border-[#0ABAB5]/50 text-xs text-[#0ABAB5] hover:bg-[#0ABAB5]/30 transition-colors"
              title="将当前剧集内容应用到分镜拆分"
            >
              <Clapperboard className="w-3.5 h-3.5" />
              分镜
            </button>
          )}
          {/* 复制按钮 */}
          <button
            onClick={() => {
              const contentToCopy = script?.episodeCount && script.episodeCount > 1 
                ? (episodeContentMap[activeEpisode] || '') 
                : editContent;
              if (contentToCopy) {
                navigator.clipboard.writeText(contentToCopy);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1A1A1A] border border-[#333] text-xs text-[#888] hover:text-[#0ABAB5] transition-colors"
            title="复制内容"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "已复制" : "复制"}
          </button>
          {/* 编辑/预览切换 */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1A1A1A] border border-[#333] text-xs text-[#888] hover:text-[#0ABAB5] transition-colors"
            title={showPreview ? "切换到编辑模式" : "切换到预览模式"}
            aria-pressed={showPreview}
            aria-label={showPreview ? "切换到编辑模式" : "切换到预览模式"}
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? "编辑" : "预览"}
          </button>
        </div>
        
        {showPreview ? (
          /* 预览模式：智能检测JSON格式，使用对应的渲染器 */
          (() => {
            // 剧本编辑界面只使用 editContent，完全独立于创意生成界面
            const displayContent = script?.episodeCount && script.episodeCount > 1 
              ? (episodeContentMap[activeEpisode] || '') 
              : editContent;
            
            // 如果是JSON格式，使用美观的卡片式渲染
            if (isJsonScriptContent(displayContent)) {
              return (
                <div ref={previewScrollRef} className="w-full h-full overflow-auto pr-2 relative">
                  <ScriptJsonRenderer 
                    content={displayContent}
                    onEpisodeClick={(ep) => {
                      if (script?.episodeCount && script.episodeCount > 1) {
                        setActiveEpisode(ep);
                      }
                    }}
                  />
                  <ScrollToTopButton scrollContainerRef={previewScrollRef} />
                </div>
              );
            }
            
            // 否则使用传统的标签高亮渲染
            return (
              <div ref={previewScrollRef} className="w-full h-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-3 overflow-auto relative">
                <ScriptContentRenderer
                  content={displayContent}
                  showTagLegend={true}
                  onTagClick={(type, value) => {
                    console.log('标签点击:', type, value);
                  }}
                />
                <ScrollToTopButton scrollContainerRef={previewScrollRef} />
              </div>
            );
          })()
        ) : (
          /* 编辑模式：传统 textarea，只编辑 editContent */
          <textarea
            key={activeEpisode}
            className="script-content w-full h-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#0ABAB5] resize-none"
            value={script?.episodeCount && script.episodeCount > 1 ? (episodeContentMap[activeEpisode] || '') : editContent}
            onChange={(e) => {
              if (script?.episodeCount && script.episodeCount > 1) {
                handleEpisodeContentChange(activeEpisode, e.target.value);
              } else {
                setEditContent(e.target.value);
              }
            }}
            placeholder={script?.episodeCount && script.episodeCount > 1 ? `第 ${activeEpisode} 集内容...` : "在此输入或粘贴剧本内容..."}
          />
        )}
      </div>

      {/* 提示信息 */}
      {script?.episodeCount && script.episodeCount > 1 && (
        <p className="text-xs text-[#888888] mt-2">
          编辑单集内容会自动保存到总剧本。集数标签栏帮助快速切换。
        </p>
      )}
    </div>
  );
}
