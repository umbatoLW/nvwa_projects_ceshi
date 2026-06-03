/**
 * 用户行为埋点系统
 * 支持多种分析工具集成
 */

"use client";

import { logger } from "@/lib/logger";

export interface TrackEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

export interface PageViewEvent {
  page: string;
  title?: string;
  referrer?: string;
  url?: string;
}

export interface UserActionEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

// 事件类型定义
export const EventType = {
  PAGE_VIEW: "page_view",
  USER_ACTION: "user_action",
  ERROR: "error",
  PERFORMANCE: "performance",
  AI_REQUEST: "ai_request",
  AI_RESPONSE: "ai_response",
  UPLOAD: "upload",
  DOWNLOAD: "download",
} as const;

type EventTypeValue = (typeof EventType)[keyof typeof EventType];

class Analytics {
  private endpoint: string | null = null;
  private debug: boolean = false;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private eventQueue: TrackEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private maxQueueSize = 50;

  /**
   * 初始化埋点
   */
  init(config: { endpoint?: string; debug?: boolean; userId?: string }) {
    this.endpoint = config.endpoint || "/api/analytics";
    this.debug = config.debug || process.env.NODE_ENV === "development";
    this.userId = config.userId || null;
    this.sessionId = this.generateSessionId();

    if (this.debug) {
      console.log("[Analytics] Initialized:", {
        endpoint: this.endpoint,
        sessionId: this.sessionId,
      });
    }

    // 开始定期刷新队列
    this.startFlushInterval();

    // 监听页面卸载，确保数据发送
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.flush();
      });
    }
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * 追踪页面访问
   */
  trackPageView(page: string, properties?: Record<string, unknown>) {
    const eventData: Record<string, unknown> = {
      page,
      url: typeof window !== "undefined" ? window.location.href : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
      title: typeof document !== "undefined" ? document.title : "",
      ...properties,
    };

    this.track(EventType.PAGE_VIEW, eventData);
  }

  /**
   * 追踪用户行为
   */
  trackAction(
    action: string,
    category: string,
    properties?: Record<string, unknown>
  ) {
    const eventData: Record<string, unknown> = {
      action,
      category,
      ...properties,
    };

    this.track(EventType.USER_ACTION, eventData);
  }

  /**
   * 追踪AI请求
   */
  trackAIRequest(
    model: string,
    type: "image" | "video" | "chat" | "3d",
    properties?: Record<string, unknown>
  ) {
    this.track(EventType.AI_REQUEST, {
      model,
      type,
      ...properties,
    });
  }

  /**
   * 追踪AI响应
   */
  trackAIResponse(
    model: string,
    type: "image" | "video" | "chat" | "3d",
    duration: number,
    success: boolean,
    properties?: Record<string, unknown>
  ) {
    this.track(EventType.AI_RESPONSE, {
      model,
      type,
      duration,
      success,
      ...properties,
    });
  }

  /**
   * 追踪错误
   */
  trackError(
    error: Error,
    context?: Record<string, unknown>
  ) {
    this.track(EventType.ERROR, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });
  }

  /**
   * 追踪性能指标
   */
  trackPerformance(
    metric: string,
    value: number,
    properties?: Record<string, unknown>
  ) {
    this.track(EventType.PERFORMANCE, {
      metric,
      value,
      ...properties,
    });
  }

  /**
   * 通用追踪方法
   */
  track(event: string, properties?: Record<string, unknown>) {
    const payload: TrackEvent = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined,
      sessionId: this.sessionId || undefined,
    };

    // 开发环境打印
    if (this.debug) {
      console.log("[Analytics]", payload);
    }

    // 添加到队列
    this.eventQueue.push(payload);

    // 队列满了立即刷新
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * 刷新队列，发送数据到服务器
   */
  async flush() {
    if (this.eventQueue.length === 0 || !this.endpoint) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
        keepalive: true, // 确保页面卸载时也能发送
      });

      if (!response.ok) {
        logger.error("[Analytics] 发送失败:", response.status);
        // 失败时重新加入队列
        this.eventQueue = [...events, ...this.eventQueue];
      }
    } catch (error) {
      logger.error("[Analytics] 发送异常:", error);
      // 失败时重新加入队列
      this.eventQueue = [...events, ...this.eventQueue];
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * 开始定期刷新
   */
  private startFlushInterval() {
    // 每30秒刷新一次
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);
  }

  /**
   * 停止定期刷新
   */
  stopFlushInterval() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// 单例导出
export const analytics = new Analytics();

// 自动追踪页面访问
if (typeof window !== "undefined") {
  // 初始化
  analytics.init({ debug: process.env.NODE_ENV === "development" });

  // 监听路由变化（Next.js App Router）
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    analytics.trackPageView(window.location.pathname);
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    analytics.trackPageView(window.location.pathname);
    return result;
  };

  // 监听popstate事件
  window.addEventListener("popstate", () => {
    analytics.trackPageView(window.location.pathname);
  });
}
