"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Package, RefreshCw, Zap, ArrowLeft, Copy, Pencil, Trash2, Library, FolderPlus, ChevronDown, ChevronUp } from "lucide-react";
import { cleanContent, cleanAiOutput } from "@/lib/content/content-cleaner";

// 流式输出显示组件 - 使用玻璃拟态样式
function StreamingOutputDisplay({ text, title }: { text: string; title: string }) {
  const [expanded, setExpanded] = useState(false);
  // 使用 cleanAiOutput 实时清洗 JSON 键值对
  const cleanedText = cleanAiOutput(text.slice(-800));
  const fullText = cleanAiOutput(text);
  
  return (
    <div className="mb-4 p-4 rounded-xl bg-muted/60 backdrop-blur-sm border border-white/10 shadow-lg">
      <div className="flex items-center gap-2 text-nvwa-primary mb-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-sm text-nvwa-text-secondary/90 whitespace-pre-wrap font-mono leading-relaxed">
        {expanded ? fullText : cleanedText}
      </div>
      {text.length > 800 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-nvwa-accent hover:text-nvwa-accent/80 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              收起完整输出
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              展开完整输出
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface ExtractedItem {
  name: string;
  character?: string;
  style?: string;
  details?: string;
  description?: string;
  imagePrompt?: string;
}

interface StreamingItem {
  name?: string;
  character?: string;
  style?: string;
  details?: string;
  description?: string;
  imagePrompt?: string;
  content?: string;
  status?: 'pending' | 'streaming' | 'completed';
}

interface Script {
  id: string;
  title: string;
  episodeCount?: number;
}

interface PropsViewProps {
  propsByEpisode: Record<number, ExtractedItem[]>;
  propEpisodes: number[];
  showPropEpisodes: boolean;
  selectedEpisodeDetail: { type: 'costume' | 'scene' | 'prop' | null; episode: number | null };
  streamingItems: StreamingItem[];
  streamingText: string;
  isStreaming: boolean;
  isExtractingProps: boolean;
  isAnalyzing: boolean;
  isBatchExtracting: boolean;
  analyzeProgress: string;
  batchProgress: { completed: number; total: number; currentEpisode: number; currentType: string } | null;
  script: Script | null;
  onExtractProps: () => void;
  onGetEpisodeDetail: (type: 'costume' | 'scene' | 'prop', episode: number, forceRegenerate?: boolean) => void;
  onBackToEpisodeList: (type: 'costume' | 'scene' | 'prop') => void;
  onRegenerateEpisode: (type: 'costume' | 'scene' | 'prop', episode: number) => void;
  onReAnalyzeEpisodes: (type: 'costume' | 'scene' | 'prop') => void;
  onBatchExtract: (type: 'costume' | 'scene' | 'prop') => void;
  onDeleteItem: (type: 'costume' | 'scene' | 'prop', episode: number, index: number) => void;
  onEditItem: (item: { type: 'costume' | 'scene' | 'prop'; episode: number; index: number; data: ExtractedItem }) => void;
  onCopyPrompt: (text: string) => void;
  onApplyToAssetLibrary?: (item: ExtractedItem, type: 'costume' | 'scene' | 'prop') => Promise<void>;
}

export default function PropsView({
  propsByEpisode,
  propEpisodes,
  showPropEpisodes,
  selectedEpisodeDetail,
  streamingItems,
  streamingText,
  isStreaming,
  isExtractingProps,
  isAnalyzing,
  isBatchExtracting,
  analyzeProgress,
  batchProgress,
  script,
  onExtractProps,
  onGetEpisodeDetail,
  onBackToEpisodeList,
  onRegenerateEpisode,
  onReAnalyzeEpisodes,
  onBatchExtract,
  onDeleteItem,
  onEditItem,
  onCopyPrompt,
  onApplyToAssetLibrary,
}: PropsViewProps) {
  // 集数详情页
  if (selectedEpisodeDetail.type === 'prop' && selectedEpisodeDetail.episode) {
    const episode = selectedEpisodeDetail.episode;
    const items = streamingItems.length > 0 ? streamingItems : propsByEpisode[episode] || [];
    
    return (
      <div className="flex-1 flex flex-col min-h-0 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onBackToEpisodeList('prop')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
            <h2 className="text-lg font-semibold">第{episode}集 - 道具详情</h2>
          </div>
          {!isStreaming && propsByEpisode[episode] && propsByEpisode[episode].length > 0 && (
            <Button size="sm" variant="outline" onClick={() => onRegenerateEpisode('prop', episode)}>
              <RefreshCw className="w-4 h-4 mr-1" /> 重新生成
            </Button>
          )}
        </div>
        
        {isStreaming && streamingText && (
          <StreamingOutputDisplay
            text={streamingText}
            title="正在分析道具..."
          />
        )}
        
        {items.length > 0 && (
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              {items.map((item, i) => (
                <div key={i} className="bg-muted border border-[#333] rounded-xl p-5 space-y-3 hover:border-nvwa-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-nvwa-primary/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-nvwa-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.character}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {onApplyToAssetLibrary && (
                        <Button size="sm" variant="ghost" className="text-nvwa-primary hover:text-nvwa-primary/80" title="应用到资产库" onClick={() => onApplyToAssetLibrary(item as ExtractedItem, 'prop')}>
                          <FolderPlus className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" title="复制提示词" onClick={() => navigator.clipboard.writeText(item.imagePrompt || '')}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="编辑" onClick={() => onEditItem({ type: 'prop', episode, index: i, data: item as ExtractedItem })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" title="删除" onClick={() => onDeleteItem('prop', episode, i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground"><span className="text-nvwa-primary font-medium">对应人物：</span>{item.character || '-'}</p>
                      <p className="text-muted-foreground"><span className="text-nvwa-primary font-medium">道具风格：</span>{item.style || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground"><span className="text-nvwa-primary font-medium">道具细节：</span>{item.details || item.description || '-'}</p>
                    </div>
                  </div>
                  <div className="bg-nvwa-bg rounded-lg p-3 border border-[#222]">
                    <p className="text-xs text-nvwa-primary mb-1">生图提示词</p>
                    <p className="text-sm text-muted-foreground">{item.imagePrompt || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {isStreaming && items.length === 0 && !streamingText && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-nvwa-primary" />
            <p className="text-sm text-muted-foreground">正在分析第{episode}集道具...</p>
          </div>
        )}
        
        {!isStreaming && items.length === 0 && !propsByEpisode[episode] && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            暂无道具数据
          </div>
        )}
      </div>
    );
  }

  // 显示集数卡片
  if (showPropEpisodes && propEpisodes.length > 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">道具提取</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onReAnalyzeEpisodes('prop')} 
            disabled={isAnalyzing}
            className="text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            重新分集
          </Button>
        </div>
        {isAnalyzing && analyzeProgress && (
          <div className="mb-4 p-3 bg-orange-400/10 border border-orange-400/30 rounded-lg">
            <div className="flex items-center gap-2 text-orange-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{analyzeProgress}</span>
            </div>
          </div>
        )}
        
        {isBatchExtracting && batchProgress && (
          <div className="mb-4 p-3 bg-nvwa-primary/10 border border-nvwa-primary/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-nvwa-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">批量提取中...</span>
              </div>
              <span className="text-sm text-muted-foreground">{batchProgress.completed}/{batchProgress.total}</span>
            </div>
            <div className="w-full h-2 bg-nvwa-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-nvwa-primary transition-all duration-300"
                style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              正在处理第 {batchProgress.currentEpisode} 集
            </p>
          </div>
        )}
        
        <div className="mb-4 flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onBatchExtract('prop')}
            disabled={isBatchExtracting || !script?.episodeCount}
            className="text-nvwa-primary border-nvwa-primary/30 hover:bg-nvwa-primary/10"
          >
            {isBatchExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            批量提取全部
          </Button>
          {script?.episodeCount && (
            <span className="text-xs text-muted-foreground">共 {script.episodeCount} 集</span>
          )}
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {propEpisodes.map(ep => (
              <button
                key={ep}
                onClick={() => onGetEpisodeDetail('prop', ep)}
                className="bg-muted border border-[#333] rounded-xl p-4 hover:border-nvwa-primary hover:bg-nvwa-surface transition-all cursor-pointer text-left group aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-10 h-10 rounded-full bg-nvwa-primary flex items-center justify-center mb-2 group-hover:bg-nvwa-primary/80 transition-colors">
                  <span className="text-lg font-bold text-black">{ep}</span>
                </div>
                <h3 className="font-medium text-foreground text-sm">第{ep}集</h3>
                <p className="text-[10px] text-muted-foreground">点击查看详情</p>
                {propsByEpisode[ep] && (
                  <p className="text-[10px] text-nvwa-primary mt-1">{propsByEpisode[ep].length} 个道具</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 初始状态
  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">道具提取</h2>
        <Button size="sm" onClick={onExtractProps} disabled={isExtractingProps}>
          {isExtractingProps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
          提取道具
        </Button>
      </div>
      {isExtractingProps ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-nvwa-primary" />
          <p className="text-sm text-muted-foreground">{analyzeProgress || '正在分析剧本集数结构...'}</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          暂无道具数据，点击右上角&ldquo;提取道具&rdquo;按钮开始
        </div>
      )}
    </div>
  );
}
