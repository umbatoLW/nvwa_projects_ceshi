/**
 * API审计日志服务
 */

interface AuditEvent {
  timestamp: string;
  event: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  success: boolean;
  error?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  // 管理员操作相关
  isAdmin?: boolean;
  role?: string;
  operation?: string;
  target?: string;
  changes?: Record<string, unknown>;
}

// 日志级别
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class AuditLogger {
  private logs: AuditEvent[] = [];
  private maxLogs: number = 1000;

  log(
    event: string,
    options: {
      userId?: string;
      request?: Request;
      endpoint?: string;
      method?: string;
      success: boolean;
      error?: string;
      duration?: number;
      metadata?: Record<string, unknown>;
    }
  ) {
    const logEntry: AuditEvent = {
      timestamp: new Date().toISOString(),
      event,
      userId: options.userId,
      success: options.success,
      error: options.error,
      duration: options.duration,
      endpoint: options.endpoint,
      method: options.method,
      metadata: options.metadata,
    };

    if (options.request) {
      logEntry.ip = options.request.headers.get('x-forwarded-for') ||
        options.request.headers.get('x-real-ip') || 'unknown';
      logEntry.userAgent = options.request.headers.get('user-agent') || 'unknown';
    }

    // 输出到console（生产环境可替换为日志系统）
    this.outputLog(logEntry);

    // 保存到内存（用于调试）
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private outputLog(entry: AuditEvent) {
    const level: LogLevel = entry.success ? 'info' : 'error';
    const prefix = `[AUDIT:${level.toUpperCase()}]`;

    const messageParts: string[] = [
      entry.event,
      entry.userId ? `user:${entry.userId}` : '',
      entry.ip ? `ip:${entry.ip}` : '',
      entry.duration ? `duration:${entry.duration}ms` : '',
      entry.success ? 'success' : `error:${entry.error}`,
    ].filter(Boolean);

    console.log(prefix, messageParts.join(' | '), entry.metadata ? entry.metadata : '');
  }

  getRecentLogs(count: number = 100): AuditEvent[] {
    return this.logs.slice(-count);
  }

  /**
   * 管理员操作审计日志
   */
  logAdminOperation(
    operation: string,
    options: {
      userId: string;
      role?: string;
      request?: Request;
      target?: string;
      success: boolean;
      error?: string;
      duration?: number;
      changes?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }
  ) {
    this.log(`admin:${operation}`, {
      ...options,
      metadata: {
        ...options.metadata,
        isAdmin: true,
        role: options.role,
        target: options.target,
        changes: options.changes,
      },
    });
  }

  /**
   * 敏感操作日志（如API Key操作）
   */
  logSensitiveOperation(
    operation: string,
    options: {
      userId: string;
      request?: Request;
      resourceType: string;
      resourceId?: string;
      action: 'create' | 'read' | 'update' | 'delete';
      success: boolean;
      error?: string;
      duration?: number;
      metadata?: Record<string, unknown>;
    }
  ) {
    this.log(`sensitive:${operation}`, {
      ...options,
      metadata: {
        ...options.metadata,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        action: options.action,
      },
    });
  }

  /**
   * 获取管理员操作日志
   */
  getAdminLogs(count: number = 50): AuditEvent[] {
    return this.logs
      .filter(log => log.event.startsWith('admin:') || log.event.startsWith('sensitive:'))
      .slice(-count);
  }

  /**
   * 安全事件日志
   */
  logSecurityEvent(
    event: string,
    options: {
      userId?: string;
      request?: Request;
      severity: 'low' | 'medium' | 'high' | 'critical';
      details?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const level = options.severity === 'critical' || options.severity === 'high' ? 'error' : 'warn';
    console[level](`[SECURITY:${options.severity.toUpperCase()}] ${event}`, {
      userId: options.userId,
      ip: options.request?.headers.get('x-forwarded-for') || options.request?.headers.get('x-real-ip') || 'unknown',
      details: options.details,
      ...options.metadata,
    });
  }
}

export const auditLogger = new AuditLogger();
