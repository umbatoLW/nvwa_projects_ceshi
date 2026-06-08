"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
}

const SYSTEM_PROMPT = `你是一位专业的短剧剧本创作助手。你将帮助用户：
1. 从一句话创意扩展为完整剧本大纲
2. 完善人物设定和人物关系
3. 设计每集的核心剧情和冲突
4. 优化对白和场景描写
5. 提供专业的剧本创作建议

请用专业、友好的风格与用户交流，在适当时候主动提问以获取更多信息。`;

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "欢迎使用剧本创作助手！请告诉我你的创意，比如：\n• 我想写一个关于职场逆袭的故事\n• 一个穿越到古代的甜宠剧\n• 围绕家庭矛盾的都市情感剧\n\n请描述你的基本想法，我会帮你逐步完善！",
  timestamp: Date.now(),
};

export function useChatSession(scriptId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [currentModel, setCurrentModel] = useState("deepseek-v4-pro");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 加载历史对话
  useEffect(() => {
    if (!scriptId) {
      setIsLoading(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/chat-sessions?scriptId=${scriptId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.messages?.length > 0) {
            setMessages(data.data.messages);
            if (data.data.model) {
              setCurrentModel(data.data.model);
            }
          }
        }
      } catch (error) {
        console.error("加载对话历史失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [scriptId]);

  // 保存对话到数据库（防抖）
  const saveToDatabase = useCallback(
    async (msgs: ChatMessage[], model: string) => {
      if (!scriptId) return;

      // 清除之前的定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 防抖保存
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch("/api/chat-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scriptId,
              messages: msgs,
              model,
            }),
          });
        } catch (error) {
          console.error("保存对话历史失败:", error);
        }
      }, 1000);
    },
    [scriptId]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsStreaming(true);

      const assistantMessageId = `assistant-${Date.now()}`;
      let fullContent = "";

      // 添加空的助手消息
      const messagesWithAssistant = [
        ...newMessages,
        {
          id: assistantMessageId,
          role: "assistant" as const,
          content: "",
          timestamp: Date.now(),
          model: currentModel,
        },
      ];
      setMessages(messagesWithAssistant);

      try {
        abortRef.current = new AbortController();

        // 构建对话历史（排除欢迎消息）
        // 【修复】限制对话历史长度，防止超出 Token 限制
        const MAX_HISTORY_CHARS = 8000; // 约 4000 tokens
        let conversationHistory = newMessages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));
        
        // 如果历史过长，从旧到新截断
        let totalChars = conversationHistory.reduce((sum, m) => sum + m.content.length, 0);
        while (totalChars > MAX_HISTORY_CHARS && conversationHistory.length > 1) {
          const removed = conversationHistory.shift();
          totalChars -= removed?.content.length || 0;
        }

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...conversationHistory,
              { role: "user", content },
            ],
            stream: true,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "请求失败" }));
          throw new Error(errorData.error || "请求失败");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("无法读取响应");

        const decoder = new TextDecoder();
        let finalMessages = messagesWithAssistant;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text" && data.content) {
                  fullContent += data.content;
                  finalMessages = finalMessages.map((m) =>
                    m.id === assistantMessageId ? { ...m, content: fullContent } : m
                  );
                  setMessages(finalMessages);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }

        // 保存最终消息到数据库
        saveToDatabase(finalMessages, currentModel);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          const errorMessage = (error as Error).message || "抱歉，发生了错误，请重试。";
          const errorMessages = messagesWithAssistant.map((m) =>
            m.id === assistantMessageId ? { ...m, content: `❌ ${errorMessage}` } : m
          );
          setMessages(errorMessages);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, currentModel, isStreaming, saveToDatabase]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearHistory = useCallback(async () => {
    // 清空前端状态
    setMessages([
      {
        id: "cleared",
        role: "assistant",
        content: "对话已清空。请告诉我你的剧本创意！",
        timestamp: Date.now(),
      },
    ]);

    // 清空数据库中的对话历史
    if (scriptId) {
      try {
        await fetch(`/api/chat-sessions?scriptId=${scriptId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("清空对话历史失败:", error);
      }
    }
  }, [scriptId]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    currentModel,
    setCurrentModel,
    isStreaming,
    isLoading,
    sendMessage,
    abort,
    clearHistory,
  };
}
