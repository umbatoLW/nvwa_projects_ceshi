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
}

const AVAILABLE_MODELS = [
  { value: "qwen-plus", label: "通义千问 Plus", platform: "aliyun", available: true },
  { value: "qwen-turbo", label: "通义千问 Turbo", platform: "aliyun", available: true },
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash", platform: "deepseek", available: true },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro", platform: "deepseek", available: true },
  { value: "kimi-k2.5", label: "Kimi K2.5", platform: "kimi", available: false, note: "需配置API Key" },
];

export function ScriptChatPanel({ scriptId, onApplyToScript }: ScriptChatPanelProps) {
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] bg-[#141414]">
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

      {/* 模型状态提示 */}
      {currentModelInfo && !currentModelInfo.available && (
        <div className="mx-4 mt-3 px-3 py-2 bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-[#FF6B35]" />
          <span className="text-[#FF6B35]">
            {currentModelInfo.note}（在平台设置中配置 {currentModelInfo.platform.toUpperCase()} API Key）
          </span>
        </div>
      )}

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
