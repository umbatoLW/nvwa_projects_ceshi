/**
 * 监控系统基础指标
 * 收集和暴露应用性能指标
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// 指标类型
export interface Metric {
  name: string;
  value: number;
  type: "counter" | "gauge" | "histogram";
  labels?: Record<string, string>;
  timestamp: string;
}

// 内存存储（生产环境应使用Prometheus/Grafana）
const metricsStore: Metric[] = [];
const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const histograms = new Map<string, number[]>();

// 请求统计
interface RequestStats {
  total: number;
  success: number;
  error: number;
  avgDuration: number;
  p50: number;
  p95: number;
  p99: number;
}

const requestDurations = new Map<string, number[]>();

/**
 * 记录计数器
 */
export function incrementCounter(name: string, labels?: Record<string, string>): void {
  const key = `${name}:${JSON.stringify(labels || {})}`;
  const current = counters.get(key) || 0;
  counters.set(key, current + 1);
  
  // 记录到存储
  metricsStore.push({
    name,
    value: current + 1,
    type: "counter",
    labels,
    timestamp: new Date().toISOString(),
  });
  
  // 保持最近10000条
  if (metricsStore.length > 10000) {
    metricsStore.shift();
  }
}

/**
 * 设置仪表值
 */
export function setGauge(name: string, value: number, labels?: Record<string, string>): void {
  const key = `${name}:${JSON.stringify(labels || {})}`;
  gauges.set(key, value);
  
  metricsStore.push({
    name,
    value,
    type: "gauge",
    labels,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 记录直方图值
 */
export function recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
  const key = `${name}:${JSON.stringify(labels || {})}`;
  const values = histograms.get(key) || [];
  values.push(value);
  
  // 保持最近1000个值
  if (values.length > 1000) {
    values.shift();
  }
  
  histograms.set(key, values);
}

/**
 * 记录请求持续时间
 */
export function recordRequestDuration(
  endpoint: string,
  duration: number,
  status: number
): void {
  const key = `${endpoint}:${Math.floor(status / 100)}xx`;
  const durations = requestDurations.get(key) || [];
  durations.push(duration);
  
  // 保持最近1000个值
  if (durations.length > 1000) {
    durations.shift();
  }
  
  requestDurations.set(key, durations);
  
  // 记录到直方图
  recordHistogram("request_duration_ms", duration, { endpoint, status: String(status) });
  
  // 更新计数器
  incrementCounter("requests_total", { endpoint, status: String(status) });
}

/**
 * 计算百分位数
 */
function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * 获取请求统计
 */
export function getRequestStats(endpoint: string): RequestStats | null {
  const durations: number[] = [];
  let total = 0;
  let success = 0;
  let error = 0;
  
  for (const [key, values] of requestDurations.entries()) {
    if (key.startsWith(endpoint)) {
      durations.push(...values);
      total += values.length;
      if (key.includes("2xx") || key.includes("3xx")) {
        success += values.length;
      } else {
        error += values.length;
      }
    }
  }
  
  if (durations.length === 0) return null;
  
  const sorted = [...durations].sort((a, b) => a - b);
  
  return {
    total,
    success,
    error,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    p50: calculatePercentile(sorted, 50),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
  };
}

/**
 * 获取系统指标
 */
export function getSystemMetrics(): {
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  uptime: number;
} {
  return {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
  };
}

/**
 * 获取所有指标
 */
export function getAllMetrics(): {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, { count: number; sum: number; avg: number; min: number; max: number }>;
  system: ReturnType<typeof getSystemMetrics>;
} {
  const histogramStats: Record<string, { count: number; sum: number; avg: number; min: number; max: number }> = {};
  
  for (const [key, values] of histograms.entries()) {
    if (values.length > 0) {
      histogramStats[key] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }
  }
  
  return {
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    histograms: histogramStats,
    system: getSystemMetrics(),
  };
}

/**
 * 指标导出（Prometheus格式）
 */
export function exportPrometheusMetrics(): string {
  const metrics = getAllMetrics();
  const lines: string[] = [];
  
  // 系统指标
  lines.push(`# HELP process_memory_heap_used_bytes Process heap memory used`);
  lines.push(`# TYPE process_memory_heap_used_bytes gauge`);
  lines.push(`process_memory_heap_used_bytes ${metrics.system.memory.heapUsed}`);
  
  lines.push(`# HELP process_memory_heap_total_bytes Process heap memory total`);
  lines.push(`# TYPE process_memory_heap_total_bytes gauge`);
  lines.push(`process_memory_heap_total_bytes ${metrics.system.memory.heapTotal}`);
  
  lines.push(`# HELP process_memory_rss_bytes Process RSS memory`);
  lines.push(`# TYPE process_memory_rss_bytes gauge`);
  lines.push(`process_memory_rss_bytes ${metrics.system.memory.rss}`);
  
  lines.push(`# HELP process_uptime_seconds Process uptime`);
  lines.push(`# TYPE process_uptime_seconds gauge`);
  lines.push(`process_uptime_seconds ${Math.floor(metrics.system.uptime)}`);
  
  // 计数器
  lines.push(`# HELP app_counters_total Application counters`);
  lines.push(`# TYPE app_counters_total counter`);
  for (const [key, value] of Object.entries(metrics.counters)) {
    const [name, labels] = key.split(":");
    lines.push(`app_counters_total{name="${name}"} ${value}`);
  }
  
  // 仪表
  lines.push(`# HELP app_gauges Application gauges`);
  lines.push(`# TYPE app_gauges gauge`);
  for (const [key, value] of Object.entries(metrics.gauges)) {
    const [name] = key.split(":");
    lines.push(`app_gauges{name="${name}"} ${value}`);
  }
  
  return lines.join("\n");
}

/**
 * 定期收集系统指标
 */
let metricsInterval: NodeJS.Timeout | null = null;

export function startMetricsCollection(intervalMs: number = 60000): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  
  // 初始收集
  collectSystemMetrics();
  
  // 定期收集
  metricsInterval = setInterval(() => {
    collectSystemMetrics();
  }, intervalMs);
  
  logger.info(`指标收集已启动，间隔: ${intervalMs}ms`);
}

export function stopMetricsCollection(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    logger.info("指标收集已停止");
  }
}

/**
 * 收集系统指标
 */
function collectSystemMetrics(): void {
  const metrics = getSystemMetrics();
  
  setGauge("process_memory_heap_used", metrics.memory.heapUsed);
  setGauge("process_memory_heap_total", metrics.memory.heapTotal);
  setGauge("process_memory_rss", metrics.memory.rss);
  setGauge("process_memory_external", metrics.memory.external);
  setGauge("process_uptime_seconds", Math.floor(metrics.uptime));
}

/**
 * 监控中间件
 */
export function withMetrics(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const start = Date.now();
    const endpoint = request.nextUrl.pathname;
    
    try {
      incrementCounter("requests_incoming", { endpoint });
      
      const response = await handler(request);
      
      const duration = Date.now() - start;
      recordRequestDuration(endpoint, duration, response.status);
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      recordRequestDuration(endpoint, duration, 500);
      
      incrementCounter("requests_errors", { endpoint });
      
      throw error;
    }
  };
}
