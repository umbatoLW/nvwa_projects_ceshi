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
import { Loader2, Send, Trash2, Sparkles, AlertCircle } from "lucide-react";

interface ScriptChatPanelProps {
  scriptId: string;
  onApplyToScript?: (content: string) => void;
  // 从创意生成相关 props
  scriptIdea?: string;
  setScriptIdea?: (idea: string) => void;
  targetEpisodes?: number;
  setTargetEpisodes?: (count: number) => void;
  onGenerateFullScript?: () => void;
  isGeneratingScript?: boolean;
  stageProgress?: { currentStage: number; isComplete: boolean } | null;
}

const AVAILABLE_MODELS = [
  { value: "qwen-plus", label: "通义千问 Plus", platform: "aliyun", available: true },
  { value: "qwen-turbo", label: "通义千问 Turbo", platform: "aliyun", available: true },
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash", platform: "deepseek", available: true },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro", platform: "deepseek", available: true },
  { value: "kimi-k2.5", label: "Kimi K2.5", platform: "kimi", available: false, note: "需配置API Key" },
];

export function ScriptChatPanel({ 
  scriptId, 
  onApplyToScript,
  scriptIdea = "",
  setScriptIdea,
  targetEpisodes = 3,
  setTargetEpisodes,
  onGenerateFullScript,
  isGeneratingScript = false,
  stageProgress,
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
  const [activeMode, setActiveMode] = useState<'chat' | 'generate'>('chat');
  const [creativeMode, setCreativeMode] = useState<'short' | 'medium' | 'long'>('medium');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">
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
            onClick={clearHistory}
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
            onClick={() => setActiveMode('chat')}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors ${
              activeMode === 'chat' 
                ? 'bg-[#0ABAB5]/20 text-[#0ABAB5] font-medium' 
                : 'text-[#888888] hover:text-[#F5F5F5]'
            }`}
          >
            AI 对话助手
          </button>
          <button
            onClick={() => setActiveMode('generate')}
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          </div>

          {/* 输入区 */}
          <div className="p-4 border-t border-[#333] bg-[#141414]">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-[#141414] rounded-lg p-4 border border-[#333]">
            <h3 className="text-sm font-medium mb-3 text-[#F5F5F5]">从创意生成完整剧本</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#888888] mb-1 block">剧本创意</label>
                <Textarea
                  className="w-full bg-[#1A1A1A] border-[#333] resize-none min-h-[100px]"
                  placeholder="输入你的剧本创意，例如：现代都市职场剧，讲述一个刚毕业的女大学生进入顶级广告公司，面对职场霸凌和爱情纠葛..."
                  value={scriptIdea}
                  onChange={(e) => setScriptIdea?.(e.target.value)}
                  disabled={isGeneratingScript}
                />
              </div>
              
              {/* 创作模式选择器 - P-Show-5 */}
              <div>
                <label className="text-xs text-[#888888] mb-2 block">创作模式</label>
                <div className="flex gap-2">
                  {[
                    { value: 'short', label: '短篇', desc: '1-3集', episodes: 3 },
                    { value: 'medium', label: '中篇', desc: '5-10集', episodes: 8 },
                    { value: 'long', label: '长篇', desc: '15-30集', episodes: 20 },
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
                <label className="text-xs text-[#888888] mb-1 block">目标集数</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#0ABAB5]"
                  value={targetEpisodes}
                  onChange={(e) => setTargetEpisodes?.(parseInt(e.target.value, 10) || 1)}
                  disabled={isGeneratingScript}
                />
              </div>
              <Button
                onClick={onGenerateFullScript}
                disabled={isGeneratingScript || !scriptIdea.trim()}
                className="w-full bg-[#0ABAB5] hover:bg-[#0ABAB5]/90 disabled:opacity-50"
              >
                {isGeneratingScript ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    正在生成...（{stageProgress?.currentStage ? ['核心对话', '完整大纲', '逐集撰写'][stageProgress.currentStage - 1] : '准备中'}）
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成完整剧本
                  </>
                )}
              </Button>
              {isGeneratingScript && (
                <div className="text-xs text-[#0ABAB5]">
                  生成过程中请勿关闭页面，你可以切换到其他标签页继续工作...
                </div>
              )}
            </div>
          </div>

          {/* 生成提示 */}
          <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#333]">
            <h4 className="text-xs font-medium text-[#888888] mb-2">提示</h4>
            <ul className="text-xs text-[#666] space-y-1 list-disc list-inside">
              <li>创意越详细，生成的剧本越符合预期</li>
              <li>可以指定题材、时代背景、主要角色设定</li>
              <li>生成完成后会自动创建 AI 版本，不会覆盖你的手动编辑</li>
            </ul>
          </div>
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
