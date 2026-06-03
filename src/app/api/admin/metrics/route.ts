import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/security/admin-auth";
import {
  getAllMetrics,
  exportPrometheusMetrics,
  getRequestStats,
} from "@/lib/monitor/metrics";

/**
 * GET /api/admin/metrics
 * 获取系统监控指标
 */
export async function GET(request: NextRequest) {
  // 权限检查
  const authResult = await checkAdminPermission(request);
  if (!authResult.allowed) {
    return NextResponse.json(
      { error: authResult.reason || "无权限" },
      { status: authResult.reason === "未登录" ? 401 : 403 }
    );
  }

  // 检查是否请求Prometheus格式
  const accept = request.headers.get("accept") || "";
  const format = request.nextUrl.searchParams.get("format");

  if (format === "prometheus" || accept.includes("text/plain")) {
    return new NextResponse(exportPrometheusMetrics(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // 获取查询参数
  const endpoint = request.nextUrl.searchParams.get("endpoint");

  // 构建响应
  const metrics = getAllMetrics();
  const response: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    system: {
      memory: {
        heapUsed: formatBytes(metrics.system.memory.heapUsed),
        heapTotal: formatBytes(metrics.system.memory.heapTotal),
        rss: formatBytes(metrics.system.memory.rss),
        external: formatBytes(metrics.system.memory.external),
      },
      uptime: formatUptime(metrics.system.uptime),
      cpuUser: metrics.system.cpu.user,
      cpuSystem: metrics.system.cpu.system,
    },
    counters: metrics.counters,
    gauges: metrics.gauges,
    histograms: metrics.histograms,
  };

  // 如果指定了endpoint，添加请求统计
  if (endpoint) {
    const stats = getRequestStats(endpoint);
    if (stats) {
      response.endpointStats = {
        endpoint,
        total: stats.total,
        success: stats.success,
        error: stats.error,
        avgDuration: `${stats.avgDuration.toFixed(2)}ms`,
        p50: `${stats.p50.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        successRate: `${((stats.success / stats.total) * 100).toFixed(2)}%`,
      };
    }
  }

  return NextResponse.json(response);
}

/**
 * 格式化字节
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 格式化运行时间
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}
