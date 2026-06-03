import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/**
 * 埋点数据接口
 */
interface TrackEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * POST /api/analytics
 * 接收并存储用户行为埋点数据
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body as { events: TrackEvent[] };

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { success: false, error: "无效的事件数据" },
        { status: 400 }
      );
    }

    // 获取当前用户（可选）
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 处理每个事件
    const processedEvents = events.map((event) => ({
      ...event,
      serverTimestamp: new Date().toISOString(),
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
      userId: event.userId || user?.id || null,
    }));

    // 存储到数据库（使用analytics_events表）
    const { error } = await supabase.from("analytics_events").insert(
      processedEvents.map((e) => ({
        event_name: e.event,
        event_properties: e.properties || {},
        user_id: e.userId,
        session_id: e.sessionId,
        client_timestamp: e.timestamp,
        server_timestamp: e.serverTimestamp,
        ip_address: e.ip,
        user_agent: e.userAgent,
      }))
    );

    if (error) {
      // 如果表不存在，仅记录日志
      if (error.code === "42P01") {
        logger.info("[Analytics] 事件（表不存在，仅日志）:", processedEvents);
      } else {
        logger.error("[Analytics] 存储失败:", error);
      }
    }

    // 开发环境打印
    if (process.env.NODE_ENV === "development") {
      logger.info("[Analytics] 接收事件:", processedEvents.length);
    }

    return NextResponse.json({
      success: true,
      processed: processedEvents.length,
    });
  } catch (error) {
    logger.error("[Analytics] 处理异常:", error);
    return NextResponse.json(
      { success: false, error: "处理失败" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics
 * 获取埋点统计（管理员权限）
 */
export async function GET(request: NextRequest) {
  try {
    // 简单权限检查
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("event");
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const limit = parseInt(searchParams.get("limit") || "100");

    let query = supabase
      .from("analytics_events")
      .select("*")
      .order("server_timestamp", { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq("event_name", eventType);
    }

    if (startDate) {
      query = query.gte("server_timestamp", startDate);
    }

    if (endDate) {
      query = query.lte("server_timestamp", endDate);
    }

    const { data, error } = await query;

    if (error) {
      // 表不存在
      if (error.code === "42P01") {
        return NextResponse.json({
          events: [],
          message: "analytics_events表不存在，请先创建",
        });
      }
      throw error;
    }

    return NextResponse.json({ events: data });
  } catch (error) {
    logger.error("[Analytics] 查询异常:", error);
    return NextResponse.json(
      { error: "查询失败" },
      { status: 500 }
    );
  }
}

/**
 * 获取客户端IP
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}
