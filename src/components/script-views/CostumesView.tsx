"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Shirt, RefreshCw, Zap, ArrowLeft, Copy, Pencil, Trash2, FolderPlus, ChevronDown, ChevronUp } from "lucide-react";
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

interface CostumesViewProps {
  costumeByEpisode: Record<number, ExtractedItem[]>;
  costumeEpisodes: number[];
  showCostumeEpisodes: boolean;
  selectedEpisodeDetail: { type: 'costume' | 'scene' | 'prop' | null; episode: number | null };
  streamingItems: StreamingItem[];
  streamingText: string;
  isStreaming: boolean;
  isExtractingCostumes: boolean;
  isAnalyzing: boolean;
  isBatchExtracting: boolean;
  analyzeProgress: string;
  batchProgress: { completed: number; total: number; currentEpisode: number; currentType: string } | null;
  script: Script | null;
  onExtractCostumes: () => void;
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

export default function CostumesView({
  costumeByEpisode,
  costumeEpisodes,
  showCostumeEpisodes,
  selectedEpisodeDetail,
  streamingItems,
  streamingText,
  isStreaming,
  isExtractingCostumes,
  isAnalyzing,
  isBatchExtracting,
  analyzeProgress,
  batchProgress,
  script,
  onExtractCostumes,
  onGetEpisodeDetail,
  onBackToEpisodeList,
  onRegenerateEpisode,
  onReAnalyzeEpisodes,
  onBatchExtract,
  onDeleteItem,
  onEditItem,
  onCopyPrompt,
  onApplyToAssetLibrary,
}: CostumesViewProps) {
  // 集数详情页
  if (selectedEpisodeDetail.type === 'costume' && selectedEpisodeDetail.episode) {
    const episode = selectedEpisodeDetail.episode;
    const items = streamingItems.length > 0 ? streamingItems : costumeByEpisode[episode] || [];
    
    return (
      <div className="flex-1 flex flex-col min-h-0 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onBackToEpisodeList('costume')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
            <h2 className="text-lg font-semibold">第{episode}集 - 服装详情</h2>
          </div>
          {!isStreaming && costumeByEpisode[episode] && costumeByEpisode[episode].length > 0 && (
            <Button size="sm" variant="outline" onClick={() => onRegenerateEpisode('costume', episode)}>
              <RefreshCw className="w-4 h-4 mr-1" /> 重新生成
            </Button>
          )}
        </div>
        
        {isStreaming && streamingText && (
          <StreamingOutputDisplay
            text={streamingText}
            title="正在分析服装..."
          />
        )}
        
        {items.length > 0 && (
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              {items.map((item, i) => (
                <div key={i} className="bg-muted border border-[#333] rounded-xl p-5 space-y-3 hover:border-nvwa-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-nvwa-primary/20 flex items-center justify-center">
                      <Shirt className="w-5 h-5 text-nvwa-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.character}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" title="复制提示词" onClick={() => navigator.clipboard.writeText(item.imagePrompt || '')}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="编辑" onClick={() => onEditItem({ type: 'costume', episode, index: i, data: item as ExtractedItem })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {onApplyToAssetLibrary && (
                        <Button size="sm" variant="ghost" className="text-nvwa-primary hover:text-nvwa-primary/80" title="应用到资产库" onClick={() => onApplyToAssetLibrary(item as ExtractedItem, 'costume')}>
                          <FolderPlus className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" title="删除" onClick={() => onDeleteItem('costume', episode, i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground"><span className="text-nvwa-primary font-medium">对应人物：</span>{item.character || '-'}</p>
                      <p className="text-muted-foreground"><span className="text-nvwa-primary font-medium">服装风格：</span>{item.style || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground"><span className="text-nvwa-primary font-medium">服装细节：</span>{item.details || item.description || '-'}</p>
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
            <p className="text-sm text-muted-foreground">正在分析第{episode}集服装...</p>
          </div>
        )}
        
        {!isStreaming && items.length === 0 && !costumeByEpisode[episode] && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            暂无服装数据
          </div>
        )}
      </div>
    );
  }

  // 显示集数卡片
  if (showCostumeEpisodes && costumeEpisodes.length > 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">服装提取</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onReAnalyzeEpisodes('costume')} 
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
            onClick={() => onBatchExtract('costume')}
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
            {costumeEpisodes.map(ep => (
              <button
                key={ep}
                onClick={() => onGetEpisodeDetail('costume', ep)}
                className="bg-muted border border-[#333] rounded-xl p-4 hover:border-nvwa-primary hover:bg-nvwa-surface transition-all cursor-pointer text-left group aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-10 h-10 rounded-full bg-nvwa-primary flex items-center justify-center mb-2 group-hover:bg-nvwa-primary/80 transition-colors">
                  <span className="text-lg font-bold text-black">{ep}</span>
                </div>
                <h3 className="font-medium text-foreground text-sm">第{ep}集</h3>
                <p className="text-[10px] text-muted-foreground">点击查看详情</p>
                {costumeByEpisode[ep] && (
                  <p className="text-[10px] text-nvwa-primary mt-1">{costumeByEpisode[ep].length} 件服装</p>
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
        <h2 className="text-lg font-semibold">服装提取</h2>
        <Button size="sm" onClick={onExtractCostumes} disabled={isExtractingCostumes}>
          {isExtractingCostumes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shirt className="w-4 h-4" />}
          提取服装
        </Button>
      </div>
      {isExtractingCostumes ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-nvwa-primary" />
          <p className="text-sm text-muted-foreground">{analyzeProgress || '正在分析剧本集数结构...'}</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          暂无服装数据，点击右上角&ldquo;提取服装&rdquo;按钮开始
        </div>
      )}
    </div>
  );
}
