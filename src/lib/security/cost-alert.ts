/**
 * 成本预警服务
 * 监控AI API调用成本，提供预警通知
 */

import { logger } from "@/lib/logger";

// 成本配置（以美元计）
const COST_CONFIG = {
  // 各类型成本阈值
  thresholds: {
    daily: {
      warning: 10,   // 日消费警告阈值
      critical: 50,  // 日消费严重阈值
    },
    monthly: {
      warning: 200,
      critical: 1000,
    },
  },
  // 各API的单次预估成本
  perCallCost: {
    "generate-image": 0.02,      // $0.02/张
    "generate-video": 0.50,      // $0.50/视频
    "generate-3d": 0.30,         // $0.30/模型
    "chat": 0.001,               // $0.001/次
    "generate-script": 0.05,     // $0.05/次
    "extract-stream": 0.03,      // $0.03/次
    "split-scenes": 0.02,        // $0.02/次
  },
};

// 成本记录
interface CostRecord {
  userId: string;
  endpoint: string;
  cost: number;
  timestamp: number;
}

// 成本统计
interface CostStats {
  daily: number;
  monthly: number;
  byEndpoint: Record<string, number>;
}

// 内存存储
const costRecords: CostRecord[] = [];
const userCosts = new Map<string, CostStats>();

// 预警状态
interface AlertState {
  dailyWarningSent: boolean;
  dailyCriticalSent: boolean;
  monthlyWarningSent: boolean;
  monthlyCriticalSent: boolean;
}

const alertStates = new Map<string, AlertState>();

/**
 * 记录API调用成本
 */
export function recordApiCost(
  endpoint: keyof typeof COST_CONFIG.perCallCost,
  userId: string,
  customCost?: number
): void {
  const cost = customCost || COST_CONFIG.perCallCost[endpoint] || 0;
  const now = Date.now();

  // 记录成本
  costRecords.push({
    userId,
    endpoint,
    cost,
    timestamp: now,
  });

  // 更新用户成本统计
  updateUserCostStats(userId, endpoint, cost);

  // 检查预警
  checkAndAlert(userId);

  logger.debug(`[CostAlert] Recorded $${cost.toFixed(4)} for ${endpoint} by user ${userId}`);
}

/**
 * 更新用户成本统计
 */
function updateUserCostStats(userId: string, endpoint: string, cost: number): void {
  if (!userCosts.has(userId)) {
    userCosts.set(userId, {
      daily: 0,
      monthly: 0,
      byEndpoint: {},
    });
  }

  const stats = userCosts.get(userId)!;
  stats.daily += cost;
  stats.monthly += cost;
  stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + cost;
}

/**
 * 检查并发送预警
 */
function checkAndAlert(userId: string): void {
  const stats = userCosts.get(userId);
  if (!stats) return;

  const config = COST_CONFIG.thresholds;
  const now = new Date();

  // 初始化预警状态
  if (!alertStates.has(userId)) {
    alertStates.set(userId, {
      dailyWarningSent: false,
      dailyCriticalSent: false,
      monthlyWarningSent: false,
      monthlyCriticalSent: false,
    });
  }

  const state = alertStates.get(userId)!;

  // 检查日消费
  if (stats.daily >= config.daily.critical && !state.dailyCriticalSent) {
    sendAlert(userId, "critical", "daily", stats.daily);
    state.dailyCriticalSent = true;
  } else if (stats.daily >= config.daily.warning && !state.dailyWarningSent) {
    sendAlert(userId, "warning", "daily", stats.daily);
    state.dailyWarningSent = true;
  }

  // 检查月消费
  if (stats.monthly >= config.monthly.critical && !state.monthlyCriticalSent) {
    sendAlert(userId, "critical", "monthly", stats.monthly);
    state.monthlyCriticalSent = true;
  } else if (stats.monthly >= config.monthly.warning && !state.monthlyWarningSent) {
    sendAlert(userId, "warning", "monthly", stats.monthly);
    state.monthlyWarningSent = true;
  }
}

/**
 * 发送预警通知
 */
function sendAlert(
  userId: string,
  level: "warning" | "critical",
  period: "daily" | "monthly",
  amount: number
): void {
  const levelText = level === "critical" ? "严重" : "警告";
  const periodText = period === "daily" ? "今日" : "本月";

  logger.warn(
    `[CostAlert] ${levelText}: 用户 ${userId} ${periodText}消费已达 $${amount.toFixed(2)}`
  );

  // 这里可以集成邮件、短信或Webhook通知
  // 示例：发送到webhook
  if (process.env.COST_ALERT_WEBHOOK) {
    fetch(process.env.COST_ALERT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        level,
        period,
        amount,
        timestamp: new Date().toISOString(),
        message: `${levelText}: ${periodText}消费已达 $${amount.toFixed(2)}`,
      }),
    }).catch((err) => {
      logger.error(`[CostAlert] Failed to send webhook notification:`, err);
    });
  }
}

/**
 * 获取用户成本统计
 */
export function getUserCostStats(userId: string): CostStats {
  return (
    userCosts.get(userId) || {
      daily: 0,
      monthly: 0,
      byEndpoint: {},
    }
  );
}

/**
 * 检查用户是否可以继续使用（成本限制）
 */
export function canUserProceed(userId: string): { allowed: boolean; reason?: string } {
  const stats = userCosts.get(userId);
  if (!stats) return { allowed: true };

  const config = COST_CONFIG.thresholds;

  // 检查是否超过严重阈值
  if (stats.daily >= config.daily.critical) {
    return {
      allowed: false,
      reason: `今日消费已达 $${stats.daily.toFixed(2)}，已超过限制，请明天再试`,
    };
  }

  if (stats.monthly >= config.monthly.critical) {
    return {
      allowed: false,
      reason: `本月消费已达 $${stats.monthly.toFixed(2)}，已超过限制，请联系管理员`,
    };
  }

  return { allowed: true };
}

/**
 * 重置日统计（应在每天0点执行）
 */
export function resetDailyStats(): void {
  for (const [userId, stats] of userCosts) {
    stats.daily = 0;
    stats.byEndpoint = {};
  }

  // 重置预警状态
  for (const [userId, state] of alertStates) {
    state.dailyWarningSent = false;
    state.dailyCriticalSent = false;
  }

  logger.info("[CostAlert] Daily stats reset");
}

/**
 * 重置月统计（应在每月1日0点执行）
 */
export function resetMonthlyStats(): void {
  for (const [userId, stats] of userCosts) {
    stats.monthly = 0;
  }

  // 重置月度预警状态
  for (const [userId, state] of alertStates) {
    state.monthlyWarningSent = false;
    state.monthlyCriticalSent = false;
  }

  logger.info("[CostAlert] Monthly stats reset");
}

/**
 * 清理过期记录
 */
export function cleanupOldRecords(): void {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

  // 只保留最近一个月的记录
  while (costRecords.length > 0 && costRecords[0].timestamp < oneMonthAgo) {
    costRecords.shift();
  }
}

// 定期清理
setInterval(cleanupOldRecords, 3600000); // 每小时清理一次
