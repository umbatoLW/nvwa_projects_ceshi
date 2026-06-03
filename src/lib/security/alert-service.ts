/**
 * 安全异常告警服务
 */

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 
  | 'unauthorized_access'
  | 'suspicious_activity'
  | 'brute_force'
  | 'api_key_exposure'
  | 'invalid_request'
  | 'rate_limit_exceeded'
  | 'ip_blocked'
  | 'permission_denied';

/**
 * 安全告警接口
 */
export interface SecurityAlert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  ip?: string;
  userId?: string;
  endpoint?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 告警阈值配置
 */
const ALERT_THRESHOLDS = {
  // 失败次数阈值
  failedLoginAttempts: 5,
  failedApiCalls: 10,
  rateLimitViolations: 3,
  
  // 时间窗口（毫秒）
  timeWindow: 5 * 60 * 1000, // 5分钟
};

/**
 * 失败记录（内存存储，生产环境应使用Redis）
 */
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();

/**
 * 安全告警服务
 */
class AlertService {
  private alerts: SecurityAlert[] = [];
  private maxAlerts: number = 1000;

  /**
   * 发送安全告警
   */
  alert(
    type: AlertType,
    options: {
      severity: AlertSeverity;
      message: string;
      ip?: string;
      userId?: string;
      endpoint?: string;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const alert: SecurityAlert = {
      type,
      severity: options.severity,
      message: options.message,
      timestamp: new Date().toISOString(),
      ip: options.ip,
      userId: options.userId,
      endpoint: options.endpoint,
      metadata: options.metadata,
    };

    // 保存告警
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    // 输出日志
    this.logAlert(alert);

    // 高危告警需要额外处理
    if (options.severity === 'high' || options.severity === 'critical') {
      this.handleHighSeverityAlert(alert);
    }
  }

  /**
   * 记录失败尝试
   */
  recordFailedAttempt(identifier: string, type: 'login' | 'api' | 'rate_limit'): boolean {
    const key = `${type}:${identifier}`;
    const now = Date.now();
    const record = failedAttempts.get(key);

    if (!record) {
      failedAttempts.set(key, { count: 1, firstAttempt: now });
      return false;
    }

    // 检查是否在时间窗口内
    if (now - record.firstAttempt > ALERT_THRESHOLDS.timeWindow) {
      // 重置计数
      failedAttempts.set(key, { count: 1, firstAttempt: now });
      return false;
    }

    // 增加计数
    record.count++;
    failedAttempts.set(key, record);

    // 检查是否超过阈值
    const threshold = type === 'login' 
      ? ALERT_THRESHOLDS.failedLoginAttempts 
      : type === 'rate_limit'
        ? ALERT_THRESHOLDS.rateLimitViolations
        : ALERT_THRESHOLDS.failedApiCalls;

    if (record.count >= threshold) {
      this.alert('brute_force', {
        severity: 'high',
        message: `检测到可疑活动: ${identifier} 在5分钟内${type === 'login' ? '登录' : 'API'}失败${record.count}次`,
        metadata: { type, count: record.count },
      });
      return true;
    }

    return false;
  }

  /**
   * 清除失败记录
   */
  clearFailedAttempts(identifier: string, type: 'login' | 'api' | 'rate_limit'): void {
    const key = `${type}:${identifier}`;
    failedAttempts.delete(key);
  }

  /**
   * 获取最近告警
   */
  getRecentAlerts(count: number = 50): SecurityAlert[] {
    return this.alerts.slice(-count);
  }

  /**
   * 获取高危告警
   */
  getHighSeverityAlerts(count: number = 20): SecurityAlert[] {
    return this.alerts
      .filter(a => a.severity === 'high' || a.severity === 'critical')
      .slice(-count);
  }

  /**
   * 输出告警日志
   */
  private logAlert(alert: SecurityAlert): void {
    const prefix = `[SECURITY_ALERT:${alert.severity.toUpperCase()}]`;
    console.log(prefix, alert.type, alert.message, {
      ip: alert.ip,
      userId: alert.userId,
      endpoint: alert.endpoint,
      ...alert.metadata,
    });
  }

  /**
   * 处理高危告警
   */
  private handleHighSeverityAlert(alert: SecurityAlert): void {
    // 1. 记录详细日志
    console.error('[HIGH_SEVERITY_ALERT]', alert);

    // 2. 发送通知（生产环境应集成邮件/短信/webhook）
    this.sendNotification(alert);

    // 3. 自动封禁IP（可选）
    if (alert.type === 'brute_force' && alert.ip) {
      // TODO: 实现IP封禁逻辑
      console.warn(`[AUTO_BAN] IP ${alert.ip} 已被标记为可疑`);
    }
  }

  /**
   * 发送通知（占位符实现）
   */
  private sendNotification(alert: SecurityAlert): void {
    // 生产环境应集成:
    // - 邮件通知
    // - 短信通知
    // - Webhook通知
    // - 钉钉/企业微信机器人
    
    console.log('[NOTIFICATION]', alert.message);
  }
}

export const alertService = new AlertService();

/**
 * 快捷方法
 */
export const securityAlert = {
  unauthorizedAccess: (ip?: string, userId?: string, endpoint?: string) => 
    alertService.alert('unauthorized_access', { severity: 'medium', message: '未授权访问尝试', ip, userId, endpoint }),
  
  suspiciousActivity: (message: string, ip?: string, metadata?: Record<string, unknown>) =>
    alertService.alert('suspicious_activity', { severity: 'high', message, ip, metadata }),
  
  bruteForce: (ip: string, type: string, count: number) =>
    alertService.alert('brute_force', { severity: 'high', message: `暴力破解尝试: ${type}失败${count}次`, ip, metadata: { type, count } }),
  
  apiKeyExposure: (apiKeyId: string, userId?: string) =>
    alertService.alert('api_key_exposure', { severity: 'critical', message: 'API Key可能已泄露', userId, metadata: { apiKeyId } }),
  
  permissionDenied: (userId: string, endpoint: string, requiredRole: string) =>
    alertService.alert('permission_denied', { severity: 'medium', message: `权限不足: 需要${requiredRole}`, userId, endpoint }),
};
