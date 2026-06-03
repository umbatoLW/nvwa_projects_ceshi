/**
 * 管理员权限验证模块
 * 用于保护管理员接口
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { logger } from "@/lib/logger";
import crypto from "crypto";

/**
 * 用户角色类型
 */
export type UserRole = "user" | "admin" | "super_admin";

/**
 * 管理员权限检查结果
 */
export interface AuthCheckResult {
  allowed: boolean;
  reason?: string;
  userId?: string;
  role?: UserRole;
}

/**
 * 管理员权限检查
 */
export async function checkAdminPermission(request: NextRequest): Promise<AuthCheckResult> {
  // 1. 检查是否登录
  const user = await getCurrentUser(request);
  
  if (!user) {
    return { allowed: false, reason: "未登录" };
  }

  // 2. 检查用户角色（从用户元数据或自定义表获取）
  // TODO: 需要在数据库中添加用户角色表或在supabase auth中配置
  const userRole = (user as any).role || "user";

  if (userRole !== "admin" && userRole !== "super_admin") {
    return { allowed: false, reason: "需要管理员权限", userId: user.id, role: userRole };
  }

  return { allowed: true, userId: user.id, role: userRole };
}

/**
 * 管理员认证中间件包装函数
 */
export function withAdminAuth(
  handler: (request: NextRequest, context: { userId: string; role: UserRole }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authResult = await checkAdminPermission(request);

    if (!authResult.allowed) {
      return NextResponse.json(
        { success: false, error: authResult.reason || "无权限" },
        { status: authResult.reason === "未登录" ? 401 : 403 }
      );
    }

    return handler(request, {
      userId: authResult.userId!,
      role: authResult.role!,
    });
  };
}

/**
 * 二次密码验证检查
 * 用于敏感操作（如修改API Key）
 */
export async function verifySecondPassword(
  userId: string,
  secondPassword: string
): Promise<boolean> {
  try {
    const storedHash = await getSecondPasswordHash(userId);
    
    if (!storedHash) {
      logger.warn(`二次密码未设置: ${userId}`);
      return false;
    }
    
    // 使用PBKDF2进行安全比较
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) {
      return false;
    }
    
    const computedHash = hashPassword(secondPassword, salt);
    return computedHash === hash;
  } catch (error) {
    logger.error('二次密码验证失败:', error);
    return false;
  }
}

/**
 * 设置用户二次密码
 */
export async function setSecondPassword(
  userId: string,
  secondPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const salt = generateSalt();
    const hash = hashPassword(secondPassword, salt);
    const storedHash = `${salt}:${hash}`;
    
    const supabase = getSupabaseClient();
    
    // 存储到专门的admin_settings表
    const { error: upsertError } = await supabase
      .from('admin_settings')
      .upsert({
        user_id: userId,
        second_password_hash: storedHash,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });
    
    if (upsertError) {
      logger.error('设置二次密码失败:', upsertError);
      return { success: false, error: '设置失败' };
    }
    
    logger.info(`二次密码已设置: ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error('设置二次密码异常:', error);
    return { success: false, error: '系统错误' };
  }
}

/**
 * 检查用户是否已设置二次密码
 */
export async function hasSecondPassword(userId: string): Promise<boolean> {
  const hash = await getSecondPasswordHash(userId);
  return hash !== null;
}

/**
 * 生成随机盐
 */
function generateSalt(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 使用PBKDF2哈希密码
 */
function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
}

/**
 * 获取二次密码哈希
 */
async function getSecondPasswordHash(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    
    // 从admin_settings表获取
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('second_password_hash')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // 表不存在或记录不存在
      if (error.code !== 'PGRST116') {
        logger.error('获取二次密码哈希失败:', error);
      }
      return null;
    }
    
    return settings?.second_password_hash || null;
  } catch (error) {
    logger.error('获取二次密码哈希异常:', error);
    return null;
  }
}

/**
 * IP白名单检查
 */

// 允许的IP列表（生产环境应从数据库或配置读取）
const ALLOWED_ADMIN_IPS = new Set([
  // 公司IP
  '10.0.0.0/8',
  // 添加特定IP
  '127.0.0.1',
  '::1',
]);

/**
 * 检查IP是否在白名单中
 */
export function isIpAllowed(ip: string): boolean {
  // 在开发环境允许所有IP
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // 检查是否在白名单中
  return ALLOWED_ADMIN_IPS.has(ip);
}

/**
 * 获取客户端IP
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
