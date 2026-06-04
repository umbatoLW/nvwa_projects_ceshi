"use client";

import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Upload, Eye, EyeOff } from "lucide-react";
import { ThreeStageProgress } from "@/components/script-generation";
import { FiveDimensionScoreCard } from "@/components/script-generation";
import { ScriptContentRenderer } from "@/components/script-generation";
import { ScriptJsonRenderer, isJsonScriptContent } from "@/components/script-views/ScriptJsonRenderer";

interface ScriptGenerationStage {
  stage: number;
  name: string;
  output: string;
  detail?: string;
}

interface ScriptEditorProps {
  script: ScriptDetail | null;
  editContent: string;
  setEditContent: (v: string) => void;
  aiGeneratedContent?: string;
  contentVersion?: 'manual' | 'ai';
  setContentVersion?: (v: 'manual' | 'ai') => void;
  episodeContentMap: Record<number, string>;
  setEpisodeContentMap: (v: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  activeEpisode: number;
  setActiveEpisode: (v: number) => void;
  isUploading: boolean;
  uploadProgress: string;
  analyzeProgress: string;
  isGeneratingScript: boolean;
  scriptIdea: string;
  setScriptIdea: (v: string) => void;
  targetEpisodes: number;
  setTargetEpisodes: (v: number) => void;
  generatedOutline: Record<string, unknown> | null;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateFullScript: () => void;
  stageProgress?: ScriptGenerationStage | null;  // 三阶段进度（可选）
}

interface ScriptDetail {
  id: string;
  title: string;
  content: string;
  episodeCount?: number;
  wordCount?: string | number;
  sceneCount?: number;
  status?: string;
  type?: string;
  tags?: string[];
  synopsis?: string;
  scenes?: ScriptScene[];
  storyboards?: ScriptStoryboard[];
  roles?: ScriptRole[];
  coverImage?: string;
  genre?: string;
}

interface ScriptScene {
  num: number;
  title: string;
  location: string;
  time: string;
  content: string;
}

interface ScriptStoryboard {
  num: number;
  duration: string;
  description: string;
  character: string;
  shot: string;
  camera: string;
  audio: string;
}

interface ScriptRole {
  name: string;
  tag: string;
  description: string;
  lines: number;
  appearance: string;
  costume: string;
  feature: string;
}

export default function ScriptEditor({
  script,
  editContent,
  setEditContent,
  aiGeneratedContent = '',
  contentVersion = 'manual',
  setContentVersion,
  episodeContentMap,
  setEpisodeContentMap,
  activeEpisode,
  setActiveEpisode,
  isUploading,
  uploadProgress,
  analyzeProgress,
  isGeneratingScript,
  scriptIdea,
  setScriptIdea,
  targetEpisodes,
  setTargetEpisodes,
  generatedOutline,
  onFileUpload,
  onGenerateFullScript,
  stageProgress,
}: ScriptEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(true);  // 默认预览模式，JSON格式时美观展示

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
          {script?.episodeCount && script.episodeCount > 1 && (
            <>
              <span className="text-[#0ABAB5]">|</span>
              <span>当前第 {activeEpisode} 集</span>
            </>
          )}
        </div>
      </div>
      
      {/* 剧本生成面板 - 仅当剧本为空时显示 */}
      {!editContent?.trim() && (
        <div className="mb-6 p-4 bg-[#141414] border border-[#333] rounded-xl">
          <h3 className="text-sm font-ui mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0ABAB5]" />
            从创意生成剧本
          </h3>
          <textarea
            className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg p-3 text-sm mb-3 resize-none focus:outline-none focus:border-[#0ABAB5] font-body"
            rows={4}
            value={scriptIdea}
            onChange={(e) => setScriptIdea(e.target.value)}
            placeholder="输入你的剧本创意或大纲，例如：&#10;一个都市甜宠剧，讲述霸道总裁和普通女孩的爱情故事...&#10;男主是冷面总裁，女主是元气满满的咖啡店老板娘..."
            disabled={isGeneratingScript}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888]">目标集数：</span>
              <input
                type="number"
                className="w-16 bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#0ABAB5]"
                value={targetEpisodes}
                onChange={(e) => setTargetEpisodes(Number(e.target.value))}
                min={1}
                max={100}
                disabled={isGeneratingScript}
              />
              <span className="text-xs text-[#888]">集</span>
            </div>
            <button 
              onClick={onGenerateFullScript}
              disabled={isGeneratingScript || !scriptIdea.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0ABAB5] text-black text-sm font-medium hover:bg-[#0ABAB5]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingScript ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  生成剧本
                </>
              )}
            </button>
          </div>
          {generatedOutline && (
            <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg">
              <p className="text-xs text-[#888] mb-1">生成大纲：</p>
              <p className="text-sm font-ui">{generatedOutline.title as string}</p>
              <p className="text-xs text-[#888] mt-1">{generatedOutline.logline as string}</p>
            </div>
          )}
        </div>
      )}
      
      {/* 三阶段生成进度 - 使用 P2 开发的 ThreeStageProgress 组件（受控模式） */}
      {stageProgress && isGeneratingScript && (
        <div className="mb-4">
          <ThreeStageProgress
            stages={[
              { stage: 1, name: '核心对话生成', progress: stageProgress.stage > 1 ? 100 : stageProgress.stage === 1 ? 50 : 0, status: stageProgress.stage > 1 ? 'completed' : stageProgress.stage === 1 ? 'running' : 'pending' },
              { stage: 2, name: '完整大纲生成', progress: stageProgress.stage > 2 ? 100 : stageProgress.stage === 2 ? 50 : 0, status: stageProgress.stage > 2 ? 'completed' : stageProgress.stage === 2 ? 'running' : 'pending' },
              { stage: 3, name: '逐集撰写', progress: stageProgress.stage > 3 ? 100 : stageProgress.stage === 3 ? 50 : 0, status: stageProgress.stage > 3 ? 'completed' : stageProgress.stage === 3 ? 'running' : 'pending' },
            ]}
            currentStage={stageProgress.stage}
          />
        </div>
      )}

      {/* 传统进度显示（非三阶段模式时） */}
      {(isUploading || (isGeneratingScript && !stageProgress) || uploadProgress || analyzeProgress) && (
        <div className="mb-4 p-3 bg-[#0ABAB5]/10 border border-[#0ABAB5]/30 rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#0ABAB5]" />
          <span className="text-sm text-[#0ABAB5]">{uploadProgress || analyzeProgress || '处理中...'}</span>
        </div>
      )}
      
      {/* 集数标签栏 - 仅多集时显示 */}
      {script?.episodeCount && script.episodeCount > 1 && (
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2 border-b border-[#333]">
          {Array.from({ length: script.episodeCount }, (_, i) => i + 1).map(ep => (
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
        
        {/* 右上角工具栏：版本切换 + 编辑/预览 */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {/* 版本切换 */}
          {aiGeneratedContent && setContentVersion && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#1A1A1A] rounded-lg border border-[#333]">
              <button
                onClick={() => setContentVersion('manual')}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  contentVersion === 'manual'
                    ? 'bg-[#0ABAB5] text-black'
                    : 'text-[#888] hover:text-[#F5F5F5]'
                }`}
              >
                手动
              </button>
              <button
                onClick={() => setContentVersion('ai')}
                className={`px-2 py-0.5 rounded text-xs transition-colors flex items-center gap-1 ${
                  contentVersion === 'ai'
                    ? 'bg-[#0ABAB5] text-black'
                    : 'text-[#888] hover:text-[#F5F5F5]'
                }`}
              >
                AI
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              </button>
            </div>
          )}
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
            const displayContent = script?.episodeCount && script.episodeCount > 1 
              ? (episodeContentMap[activeEpisode] || '') 
              : (contentVersion === 'ai' && aiGeneratedContent ? aiGeneratedContent : editContent);
            
            // 如果是JSON格式，使用美观的卡片式渲染
            if (isJsonScriptContent(displayContent)) {
              return (
                <div className="w-full h-full overflow-auto pr-2">
                  <ScriptJsonRenderer 
                    content={displayContent}
                    onEpisodeClick={(ep) => {
                      if (script?.episodeCount && script.episodeCount > 1) {
                        setActiveEpisode(ep);
                      }
                    }}
                  />
                </div>
              );
            }
            
            // 否则使用传统的标签高亮渲染
            return (
              <div className="w-full h-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-3 overflow-auto">
                <ScriptContentRenderer
                  content={displayContent}
                  showTagLegend={true}
                  onTagClick={(type, value) => {
                    console.log('标签点击:', type, value);
                  }}
                />
              </div>
            );
          })()
        ) : (
          /* 编辑模式：传统 textarea */
          <textarea
            key={activeEpisode}
            className={`script-content w-full h-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#0ABAB5] resize-none ${
              contentVersion === 'ai' && aiGeneratedContent ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            value={script?.episodeCount && script.episodeCount > 1 ? (episodeContentMap[activeEpisode] || '') : (contentVersion === 'ai' && aiGeneratedContent ? aiGeneratedContent : editContent)}
            onChange={(e) => {
              if (contentVersion === 'ai' && aiGeneratedContent) return;
              if (script?.episodeCount && script.episodeCount > 1) {
                handleEpisodeContentChange(activeEpisode, e.target.value);
              } else {
                setEditContent(e.target.value);
              }
            }}
            readOnly={contentVersion === 'ai' && !!aiGeneratedContent}
            placeholder={script?.episodeCount && script.episodeCount > 1 ? `第 ${activeEpisode} 集内容...` : "在此输入或粘贴剧本内容..."}
          />
        )}
      </div>
      
      {/* 五维度评分卡片 - 使用 P2 开发的 FiveDimensionScoreCard 组件 */}
      {script && (editContent?.trim() || aiGeneratedContent?.trim()) && (
        <div className="mt-4">
          <FiveDimensionScoreCard
            scriptId={script.id}
            scriptContent={contentVersion === 'ai' && aiGeneratedContent ? aiGeneratedContent : editContent}
          />
        </div>
      )}

      {/* 提示信息 */}
      {script?.episodeCount && script.episodeCount > 1 && (
        <p className="text-xs text-[#888888] mt-2">
          编辑单集内容会自动保存到总剧本。集数标签栏帮助快速切换。
        </p>
      )}
    </div>
  );
}
