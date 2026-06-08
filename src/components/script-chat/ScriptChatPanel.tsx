"use client";

import React, { useRef, useEffect, useState } from "react";
import { useChatSession, ChatMessage } from "@/hooks/useChatSession";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Trash2, Sparkles, AlertCircle, Check, PenLine, ArrowUp, ChevronDown, FileText } from "lucide-react";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";

interface StageProgressDetail {
  stage: number;
  name: string;
  output: string;
  detail?: string;
}

interface ScriptChatPanelProps {
  scriptId: string;
  onApplyToScript?: (content: string) => void;
  // 已有剧本内容（来自数据库，用于在创意生成界面显示参考）
  existingScriptContent?: string;
  // 从创意生成相关 props
  scriptIdea?: string;
  setScriptIdea?: (idea: string) => void;
  targetEpisodes?: number;
  setTargetEpisodes?: (count: number) => void;
  creativeMode?: 'short' | 'medium' | 'long';
  setCreativeMode?: (mode: 'short' | 'medium' | 'long') => void;
  onGenerateFullScript?: (model?: string) => void;
  isGeneratingScript?: boolean;
  isContinuing?: boolean; // 续写状态（独立于生成状态）
  onCancelGeneration?: () => void; // 新增：取消生成
  stageProgress?: { currentStage: number; isComplete: boolean } | null;
  stageProgressDetail?: StageProgressDetail | null;
  // 大纲相关
  generatedOutline?: Record<string, unknown> | string | null;
  setGeneratedOutline?: (outline: Record<string, unknown> | string | null) => void;
  // 剧本输出相关 props
  aiGeneratedContent?: string;
  setAiGeneratedContent?: (content: string) => void;
  // 续写相关 props
  generatedEpisodes?: number;
  totalEpisodes?: number;
  onContinueWriting?: (episodesToWrite: number, model?: string) => void; // 修改：传递续写集数和模型
  episodesPerWrite?: number; // 新增：每次续写集数
  setEpisodesPerWrite?: (count: number) => void; // 新增：设置每次续写集数
  // 模式切换回调
  onModeChange?: (mode: 'chat' | 'generate') => void;
  // 初始模式（由父组件根据 URL 参数决定）
  initialMode?: 'chat' | 'generate';
  // 清空所有内容（包括剧本）
  onClearAll?: () => void;
}

const AVAILABLE_MODELS = [
  { value: "qwen-plus", label: "通义千问 Plus", platform: "aliyun", available: true },
  { value: "qwen-turbo", label: "通义千问 Turbo", platform: "aliyun", available: true },
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash", platform: "deepseek", available: true },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro", platform: "deepseek", available: true },
  { value: "kimi-k2.5", label: "Kimi K2.5", platform: "kimi", available: false, note: "需配置API Key" },
];

// 三阶段配置
const STAGES = [
  { id: 1, name: '核心对话', desc: '分析创意，提炼核心对话框架' },
  { id: 2, name: '完整大纲', desc: '构建分集大纲，规划剧情走向' },
  { id: 3, name: '逐集撰写', desc: '按大纲逐集生成完整剧本' },
];

// 格式化大纲JSON为易读文本
function formatOutlineToText(outline: Record<string, unknown> | string | null): string {
  if (!outline) return '';
  if (typeof outline === 'string') {
    // 尝试解析字符串为JSON
    try {
      const parsed = JSON.parse(outline);
      return formatOutlineToText(parsed);
    } catch {
      return outline;
    }
  }
  
  const lines: string[] = [];
  
  // 标题
  if (outline.title) {
    lines.push(`【剧名】${outline.title}`);
    lines.push('');
  }
  
  // 类型
  if (outline.genre) {
    lines.push(`【类型】${outline.genre}`);
    lines.push('');
  }
  
  // 一句话梗概
  if (outline.logline) {
    lines.push(`【一句话梗概】`);
    lines.push(outline.logline as string);
    lines.push('');
  }
  
  // 主要角色
  const mainCharacters = outline.mainCharacters as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(mainCharacters) && mainCharacters.length > 0) {
    lines.push(`【主要角色】`);
    mainCharacters.forEach((char) => {
      lines.push(`  ● ${char.name}（${char.role}）`);
      if (char.description) {
        // 描述可能较长，按句号分段缩进
        const desc = char.description as string;
        if (desc.length > 60) {
          lines.push(`    ${desc.substring(0, 60)}...`);
        } else {
          lines.push(`    ${desc}`);
        }
      }
    });
    lines.push('');
  }
  
  // 反派
  const villains = outline.villains as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(villains) && villains.length > 0) {
    lines.push(`【反派角色】`);
    villains.forEach((villain) => {
      lines.push(`  ● 第${villain.layer}层：${villain.name}（${villain.role}）`);
    });
    lines.push('');
  }
  
  // 分集大纲
  const episodes = outline.episodes as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(episodes) && episodes.length > 0) {
    lines.push(`【分集大纲】共 ${episodes.length} 集`);
    lines.push('');
    episodes.forEach((ep) => {
      const epNum = ep.episode;
      const epTitle = ep.title || '未命名';
      lines.push(`══════════════════════════════`);
      lines.push(`【第${epNum}集】${epTitle}`);
      if (ep.summary) {
        lines.push(`剧情：${ep.summary}`);
      }
      // 情绪节拍和钩子类型
      const tags: string[] = [];
      if (ep.emotionBeat) tags.push(`情绪：${ep.emotionBeat}`);
      if (ep.hookType) tags.push(`钩子：${ep.hookType}`);
      if (ep.isPaywall) tags.push('付费点');
      if (tags.length > 0) {
        lines.push(`（${tags.join(' | ')}）`);
      }
    });
    lines.push(`══════════════════════════════`);
  }
  
  return lines.join('\n');
}

// 将易读文本解析回JSON（用于编辑时）
function parseTextToOutline(text: string): Record<string, unknown> | string {
  // 如果是有效的JSON，直接解析
  try {
    return JSON.parse(text);
  } catch {
    // 不是JSON，返回原始字符串
    return text;
  }
}

export function ScriptChatPanel({ 
  scriptId, 
  onApplyToScript,
  existingScriptContent = "", // 已有剧本内容（来自数据库）
  scriptIdea = "",
  setScriptIdea,
  targetEpisodes = 3,
  setTargetEpisodes,
  creativeMode: propCreativeMode,
  setCreativeMode: propSetCreativeMode,
  onGenerateFullScript,
  isGeneratingScript = false,
  isContinuing = false, // 续写状态（独立于生成状态）
  onCancelGeneration, // 新增：取消生成
  stageProgress,
  stageProgressDetail,
  generatedOutline,
  setGeneratedOutline,
  aiGeneratedContent = "",
  setAiGeneratedContent,
  generatedEpisodes = 0,
  totalEpisodes = 0,
  onContinueWriting,
  episodesPerWrite = 3, // 默认每次续写3集
  setEpisodesPerWrite,
  onModeChange,
  initialMode = 'chat',
  onClearAll,
}: ScriptChatPanelProps) {
  const {
    messages,
    currentModel,
    setCurrentModel,
    isStreaming,
    sendMessage,
    abort,
    clearHistory,
  } = useChatSession(scriptId);

  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<'chat' | 'generate'>(initialMode);
  const [localCreativeMode, setLocalCreativeMode] = useState<'short' | 'medium' | 'long'>('medium');
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(true); // 大纲折叠状态
  
  // 滚动容器 ref
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const creativeScrollRef = useRef<HTMLDivElement>(null);
  // 使用 props 中的 creativeMode，如果没有则使用本地状态
  const creativeMode = propCreativeMode ?? localCreativeMode;
  const setCreativeMode = propSetCreativeMode ?? setLocalCreativeMode;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // 输出内容：优先使用 AI 生成内容，其次使用已有剧本内容（来自数据库）
  // 不再使用 localOutputContent，避免组件卸载时数据丢失
  const outputContent = aiGeneratedContent || existingScriptContent;
  const setOutputContent = setAiGeneratedContent || (() => {});
  
  // 判断内容来源（用于显示提示）
  const contentSource = aiGeneratedContent ? 'ai' : (existingScriptContent ? 'existing' : 'none');

  // 获取当前选中的模型信息
  const currentModelInfo = AVAILABLE_MODELS.find(m => m.value === currentModel);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 获取当前阶段进度百分比
  const getStageProgressPercent = () => {
    if (!stageProgress) return 0;
    const current = stageProgress.currentStage;
    // 每个阶段占 33.33%
    return Math.min(current * 33.33, 100);
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] min-h-0">
      {/* 顶部栏 */}
      <div className="px-4 py-3 border-b border-[#333] bg-[#141414]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0ABAB5]" />
            <h2 className="font-semibold">剧本创作助手</h2>
          </div>
        
        <div className="flex items-center gap-3">
          {/* 模型选择器 */}
          <Select value={currentModel} onValueChange={setCurrentModel}>
            <SelectTrigger className="w-[160px] bg-[#1A1A1A] border-[#333]">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* 清空对话 */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              // 在创意生成模式下，同时清空剧本内容
              if (activeMode === 'generate' && onClearAll) {
                if (confirm('确定要清空所有内容吗？包括剧本、大纲、已生成集数等。')) {
                  clearHistory();
                  onClearAll();
                }
              } else {
                clearHistory();
              }
            }}
            className="text-[#888888] hover:text-[#F5F5F5]"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            清空
          </Button>
        </div>
        </div>

        {/* 模式切换 */}
        <div className="flex items-center gap-1 bg-[#1A1A1A] rounded-lg p-1 mt-2">
          <button
            onClick={() => { setActiveMode('chat'); onModeChange?.('chat'); }}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors ${
              activeMode === 'chat' 
                ? 'bg-[#0ABAB5]/20 text-[#0ABAB5] font-medium' 
                : 'text-[#888888] hover:text-[#F5F5F5]'
            }`}
          >
            AI 对话助手
          </button>
          <button
            onClick={() => { setActiveMode('generate'); onModeChange?.('generate'); }}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors ${
              activeMode === 'generate' 
                ? 'bg-[#0ABAB5]/20 text-[#0ABAB5] font-medium' 
                : 'text-[#888888] hover:text-[#F5F5F5]'
            }`}
          >
            从创意生成
          </button>
        </div>
      </div>

      {/* 模型状态提示 */}
      {currentModelInfo && !currentModelInfo.available && (
        <div className="mx-4 mt-3 px-3 py-2 bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-[#FF6B35]" />
          <span className="text-[#FF6B35]">
            {currentModelInfo.note}（在平台设置中配置 {currentModelInfo.platform.toUpperCase()} API Key）
          </span>
        </div>
      )}

      {activeMode === 'chat' ? (
        <>
          {/* 消息列表 */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 relative min-h-[200px] max-h-[calc(100vh-280px)]">
            {messages.map((message) => (
              <ChatMessageItem 
                key={message.id} 
                message={message} 
                onApply={onApplyToScript}
              />
            ))}
            {isStreaming && (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0ABAB5]/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#0ABAB5]" />
                </div>
                <div className="bg-[#1A1A1A] rounded-xl px-4 py-3 border border-[#333]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0ABAB5]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            <ScrollToTopButton scrollContainerRef={messagesContainerRef} />
          </div>

          {/* 输入区 */}
          <div className="p-3 border-t border-[#333] bg-[#141414]">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                className="flex-1 bg-[#1A1A1A] border-[#333] resize-none min-h-[60px] max-h-[120px]"
                placeholder="输入你的剧本创意或问题..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
              />
              <div className="flex flex-col gap-2">
                {isStreaming ? (
                  <Button 
                    onClick={abort}
                    variant="outline"
                    className="border-[#333] text-[#888888]"
                  >
                    停止
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="bg-[#0ABAB5] hover:bg-[#0ABAB5]/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-[#888888] mt-2">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </>
      ) : (
        /* 从创意生成模式 */
        <div 
          ref={creativeScrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 relative"
        >
          <div className="bg-[#141414] rounded-lg p-4 border border-[#333]">
            <h3 className="text-sm font-medium mb-3 text-[#F5F5F5]">从创意生成完整剧本</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#888888] mb-1 block">剧本创意</label>
                <Textarea
                  className="w-full bg-[#1A1A1A] border-[#333] resize-none h-[120px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#333] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#444]"
                  placeholder="输入你的剧本创意，创意越详细，生成的剧本越符合预期，可以指定题材、时代背景、主要角色设定，例如：现代都市职场剧，讲述一个刚毕业的女大学生进入顶级广告公司，面对职场霸凌和爱情纠葛..."
                  value={scriptIdea}
                  onChange={(e) => setScriptIdea?.(e.target.value)}
                  disabled={isGeneratingScript}
                />
              </div>
              
              {/* 创作模式选择器 */}
              <div>
                <label className="text-xs text-[#888888] mb-2 block">创作模式</label>
                <div className="flex gap-2">
                  {[
                    { value: 'short', label: '短剧', desc: '60-90秒/集', episodes: 3 },
                    { value: 'medium', label: '中剧', desc: '2-3分钟/集', episodes: 8 },
                    { value: 'long', label: '长剧', desc: '5-8分钟/集', episodes: 20 },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        setCreativeMode(mode.value as 'short' | 'medium' | 'long');
                        setTargetEpisodes?.(mode.episodes);
                      }}
                      disabled={isGeneratingScript}
                      className={`flex-1 py-2 px-3 rounded-lg border transition-all text-center ${
                        creativeMode === mode.value
                          ? 'bg-[#0ABAB5]/20 border-[#0ABAB5] text-[#0ABAB5]'
                          : 'bg-[#1A1A1A] border-[#333] text-[#888888] hover:border-[#0ABAB5]/50 hover:text-[#F5F5F5]'
                      }`}
                    >
                      <div className="text-sm font-medium">{mode.label}</div>
                      <div className="text-xs opacity-70">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-[#888888] mb-2 block">目标集数</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetEpisodes?.(Math.max(1, targetEpisodes - 1))}
                    disabled={isGeneratingScript || targetEpisodes <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[#1A1A1A] border border-[#333] text-[#888888] hover:text-[#F5F5F5] hover:border-[#0ABAB5]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className="w-full bg-[#1A1A1A] border border-[#333] rounded-md px-3 py-2 text-sm text-foreground text-center focus:outline-none focus:border-[#0ABAB5] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={targetEpisodes}
                      onChange={(e) => setTargetEpisodes?.(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
                      disabled={isGeneratingScript}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTargetEpisodes?.(Math.min(50, targetEpisodes + 1))}
                    disabled={isGeneratingScript || targetEpisodes >= 50}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[#1A1A1A] border border-[#333] text-[#888888] hover:text-[#F5F5F5] hover:border-[#0ABAB5]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onGenerateFullScript?.(currentModel)}
                  disabled={isGeneratingScript || !scriptIdea.trim()}
                  className="flex-1 bg-[#0ABAB5] hover:bg-[#0ABAB5]/90 disabled:opacity-50"
                >
                  {isGeneratingScript ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      正在生成...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成完整剧本
                    </>
                  )}
                </Button>
                {isGeneratingScript && onCancelGeneration && (
                  <Button
                    onClick={onCancelGeneration}
                    variant="destructive"
                    className="px-4"
                  >
                    取消
                  </Button>
                )}
              </div>
              
              {/* 三阶段流程动画 - 横向进度条 */}
              {(isGeneratingScript || stageProgress || outputContent) && (
                <div className="mt-4 space-y-3">
                  {/* 阶段指示器 */}
                  <div className="flex items-center gap-2">
                    {STAGES.map((stage, idx) => {
                      const isActive = stageProgress?.currentStage === stage.id;
                      const isComplete = stageProgress && stageProgress.currentStage > stage.id;
                      const isPending = !stageProgress || stageProgress.currentStage < stage.id;
                      
                      return (
                        <React.Fragment key={stage.id}>
                          {/* 阶段节点 */}
                          <div className="flex flex-col items-center flex-1">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                              ${isComplete 
                                ? 'bg-[#0ABAB5] text-black' 
                                : isActive 
                                  ? 'bg-[#0ABAB5]/20 text-[#0ABAB5] ring-2 ring-[#0ABAB5] ring-offset-2 ring-offset-[#141414]' 
                                  : 'bg-[#1A1A1A] text-[#888888] border border-[#333]'}
                            `}>
                              {isComplete ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                stage.id
                              )}
                            </div>
                            <span className={`text-xs mt-1.5 transition-colors ${
                              isComplete || isActive ? 'text-[#0ABAB5]' : 'text-[#888888]'
                            }`}>
                              {stage.name}
                            </span>
                          </div>
                          
                          {/* 连接线 */}
                          {idx < STAGES.length - 1 && (
                            <div className={`
                              h-0.5 w-8 transition-colors
                              ${isComplete 
                                ? 'bg-[#0ABAB5]' 
                                : 'bg-[#333]'}
                            `} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  
                  {/* 横向进度条 */}
                  <div className="relative h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0ABAB5] to-[#0ABAB5]/60 rounded-full transition-all duration-500"
                      style={{ width: `${getStageProgressPercent()}%` }}
                    />
                    {/* 动画光效 */}
                    {isGeneratingScript && (
                      <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-[#0ABAB5]/30 to-transparent animate-shimmer" />
                    )}
                  </div>
                  
                  {/* 当前阶段详情 */}
                  {stageProgressDetail && (
                    <div className="text-xs text-[#888888] flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-[#0ABAB5]" />
                      <span>{stageProgressDetail.name}：{stageProgressDetail.detail || '处理中...'}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* 完整大纲 + 剧本输出 - 左右布局 */}
              {(generatedOutline || outputContent) && (
                <div className="mt-6 flex gap-4">
                  {/* 左侧：完整大纲 */}
                  {generatedOutline && (
                    <div className="flex-1 min-w-0">
                      <div className="p-4 bg-[#1A1A1A]/80 border border-[#333]/60 rounded-lg h-full flex flex-col transition-all duration-200 hover:border-[#0ABAB5]/50 hover:bg-[#1A1A1A]/95 hover:shadow-[0_0_12px_rgba(10,186,181,0.1)]">
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#333]/40">
                          <div className="w-7 h-7 rounded-md bg-[#0ABAB5]/25 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-[#0ABAB5]" />
                          </div>
                          <div>
                            <span className="text-sm text-[#F5F5F5]">完整大纲</span>
                            <span className="text-xs text-[#666] ml-2">
                              {typeof generatedOutline === 'string' 
                                ? `${generatedOutline.length} 字符` 
                                : Object.keys(generatedOutline).length > 0 
                                  ? `${Object.keys(generatedOutline).length} 条` 
                                  : ''}
                            </span>
                          </div>
                        </div>
                        <textarea
                          className="flex-1 w-full bg-transparent resize-none text-sm leading-[1.75] overflow-y-auto text-[#F5F5F5]/95 placeholder:text-[#666] focus:outline-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full min-h-[300px]"
                          value={formatOutlineToText(generatedOutline)}
                          onChange={(e) => {
                            const parsed = parseTextToOutline(e.target.value);
                            setGeneratedOutline?.(parsed);
                          }}
                          placeholder="完整大纲将在这里显示..."
                        />

                      </div>
                    </div>
                  )}
                  
                  {/* 右侧：剧本输出 */}
                  {outputContent && (
                    <div className="flex-1 min-w-0">
                      <div className="p-4 bg-[#1A1A1A]/80 border border-[#333]/60 rounded-lg h-full flex flex-col transition-all duration-200 hover:border-[#0ABAB5]/50 hover:bg-[#1A1A1A]/95 hover:shadow-[0_0_12px_rgba(10,186,181,0.1)]">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#333]/40">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-md bg-[#0ABAB5]/25 flex items-center justify-center">
                              <PenLine className="w-4 h-4 text-[#0ABAB5]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm text-[#F5F5F5]">剧本输出</span>
                              {contentSource === 'existing' && (
                                <span className="text-xs text-[#0ABAB5]/70">（已有剧本内容，可继续创作）</span>
                              )}
                              {contentSource === 'ai' && (
                                <span className="text-xs text-[#666]">（AI生成内容）</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(outputContent);
                                const btn = document.activeElement as HTMLButtonElement;
                                const originalText = btn.textContent;
                                btn.textContent = '已复制';
                                setTimeout(() => { btn.textContent = originalText; }, 1500);
                              }}
                              className="h-6 px-2 text-xs text-[#666] hover:text-[#F5F5F5] hover:bg-white/5"
                            >
                              复制
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onApplyToScript?.(outputContent)}
                              className="h-6 px-2 text-xs text-[#0ABAB5] hover:text-[#0ABAB5]/80 hover:bg-[#0ABAB5]/5"
                            >
                              应用
                            </Button>
                          </div>
                        </div>
                        <textarea
                          className="flex-1 w-full bg-transparent resize-none text-sm leading-[1.75] overflow-y-auto text-[#F5F5F5]/95 placeholder:text-[#666] focus:outline-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full min-h-[300px]"
                          value={outputContent}
                          onChange={(e) => setOutputContent(e.target.value)}
                          placeholder="生成的剧本将在这里显示..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* 续写状态和按钮 - 有输出内容或已开始生成时显示 */}
              {(outputContent || generatedEpisodes > 0) && (
                <div className="space-y-3 pt-3 border-t border-[#333]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#F5F5F5]">续写控制</span>
                    {generatedEpisodes > 0 && totalEpisodes > 0 && (
                      <span className="text-sm text-[#0ABAB5]">
                        已生成 {generatedEpisodes}/{totalEpisodes} 集
                      </span>
                    )}
                  </div>
                  
                  {/* 进度条 */}
                  {generatedEpisodes > 0 && totalEpisodes > 0 && (
                    <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-[#0ABAB5] to-[#0ABAB5]/60 h-2 rounded-full transition-all"
                        style={{ width: `${(generatedEpisodes / totalEpisodes) * 100}%` }}
                      />
                    </div>
                  )}
                  
                  {/* 续写集数选择 - 有输出内容或已开始生成时显示 */}
                  {onContinueWriting && (outputContent || generatedEpisodes > 0) && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#888888]">每次续写</span>
                      <div className="flex items-center gap-1">
                        {[1, 3, 5, 10].map((num) => (
                          <button
                            key={num}
                            onClick={() => setEpisodesPerWrite?.(num)}
                            disabled={isGeneratingScript}
                            className={`px-2.5 py-1 rounded text-xs transition-colors ${
                              episodesPerWrite === num
                                ? 'bg-[#0ABAB5] text-black'
                                : num > 5
                                  ? 'bg-[#1A1A1A] text-[#F5F5F5] hover:bg-[#0ABAB5]/20'
                                  : 'bg-[#1A1A1A] text-[#888888] hover:bg-[#0ABAB5]/20 hover:text-[#F5F5F5]'
                            }`}
                          >
                            {num}集
                          </button>
                        ))}
                      </div>
                      {episodesPerWrite > 5 && (
                        <span className="text-xs text-yellow-500">⚠️ 建议不超过5集</span>
                      )}
                    </div>
                  )}
                  
                  {/* 续写按钮 - 仅在有已生成内容时显示 */}
                  {onContinueWriting && generatedEpisodes > 0 && totalEpisodes > 0 && (
                    <Button
                      onClick={() => onContinueWriting(episodesPerWrite, currentModel)}
                      disabled={isContinuing || generatedEpisodes >= totalEpisodes}
                      className="w-full bg-gradient-to-r from-[#0ABAB5] to-[#089090] hover:from-[#0ABAB5]/90 hover:to-[#089090]/90 text-white shadow-lg shadow-[#0ABAB5]/20"
                    >
                      {isContinuing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          续写中...
                        </>
                      ) : generatedEpisodes >= totalEpisodes ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          全部 {totalEpisodes} 集已生成完成
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          续写 {Math.min(episodesPerWrite, totalEpisodes - generatedEpisodes)} 集
                        </>
                      )}
                    </Button>
                  )}
                  
                  <p className="text-xs text-[#888888]">
                    {generatedEpisodes > 0 && generatedEpisodes < totalEpisodes 
                      ? `点击续写，AI 将接续已生成内容继续创作后续 ${Math.min(episodesPerWrite, totalEpisodes - generatedEpisodes)} 集`
                      : "续写功能会基于已生成的大纲和核心对话，继续创作后续集数"}
                  </p>
                </div>
              )}
              
              {isGeneratingScript && (
                <div className="text-xs text-[#0ABAB5]">
                  生成过程中请勿关闭页面，你可以切换到其他标签页继续工作...
                </div>
              )}
            </div>
          </div>

          {/* 回到顶部按钮 */}
          <ScrollToTopButton scrollContainerRef={creativeScrollRef} />
        </div>
      )}
    </div>
  );
}

// 单条消息组件
function ChatMessageItem({ 
  message, 
  onApply 
}: { 
  message: ChatMessage; 
  onApply?: (content: string) => void;
}) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div 
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isUser 
            ? "bg-[#0ABAB5] text-black" 
            : "bg-[#1A1A1A] border border-[#333]"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 text-xs text-[#888888]">
            <Sparkles className="w-3 h-3" />
            <span>{message.model || "AI"}</span>
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap">
          {message.content}
        </div>
        {!isUser && message.content && (
          <div className="flex justify-end mt-2">
            <Button 
              size="sm" 
              variant="ghost"
              className="text-xs text-[#0ABAB5] hover:text-[#0ABAB5]/80"
              onClick={() => onApply?.(message.content)}
            >
              应用到剧本
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
