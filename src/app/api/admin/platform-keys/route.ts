/**
 * 平台API Key管理API
 * 用于后台管理各平台的API Key配置
 * 
 * 安全措施:
 * 1. 管理员权限验证
 * 2. API Key加密存储
 * 3. API Key脱敏显示
 * 4. 操作审计日志
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { withAdminAuth, checkAdminPermission, getClientIp } from "@/lib/security/admin-auth";
import { encryptApiKey, decryptApiKey, maskApiKey, isEncrypted } from "@/lib/security/encryption";
import { auditLogger } from "@/lib/security/audit-logger";
import { alertService } from "@/lib/security/alert-service";

// 平台配置
export const PLATFORMS = {
  aliyun: {
    name: "阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["wan2.7-text2image", "wan2.1-t2v-14b", "wan2.1-t2v-1.3b", "qwen-plus"],
  },
  jimeng: {
    name: "即梦",
    baseUrl: "", // 待文档补充
    models: ["seedance2.0"],
  },
  vidu: {
    name: "Vidu",
    baseUrl: "", // 待文档补充
    models: ["vidu-2"],
  },
  kling: {
    name: "可灵",
    baseUrl: "", // 待文档补充
    models: [],
  },
} as const;

/**
 * 获取所有平台配置
 * 需要: 管理员权限
 * 安全: API Key脱敏显示
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  
  try {
    // 1. 管理员权限验证
    const authResult = await checkAdminPermission(request);
    
    if (!authResult.allowed) {
      // 记录未授权访问
      alertService.alert('unauthorized_access', {
        severity: 'medium',
        message: `未授权访问平台配置API: ${authResult.reason}`,
        ip,
        endpoint: '/api/admin/platform-keys',
      });
      
      return NextResponse.json(
        { success: false, error: authResult.reason || "无权限" },
        { status: authResult.reason === "未登录" ? 401 : 403 }
      );
    }

    const supabase = getSupabaseClient();
    
    // 2. 查询已配置的平台
    const { data: keys, error } = await supabase
      .from("platform_api_keys")
      .select("id, platform, api_key, base_url, models, is_active, description, created_at, updated_at")
      .order("platform");
    
    if (error) {
      return NextResponse.json({ success: false, error: "查询失败" }, { status: 500 });
    }
    
    // 3. 合并平台配置（脱敏API Key）
    const platforms = Object.entries(PLATFORMS).map(([key, config]) => {
      const saved = keys?.find((k) => k.platform === key);
      return {
        platform: key,
        name: config.name,
        baseUrl: config.baseUrl,
        defaultModels: config.models,
        hasKey: !!saved,
        isActive: saved?.is_active ?? false,
        configuredModels: saved?.models ?? [],
        // 脱敏显示API Key（如果存在）
        maskedKey: saved?.api_key ? maskApiKey(decryptIfEncrypted(saved.api_key)) : undefined,
      };
    });
    
    // 4. 记录审计日志
    auditLogger.logAdminOperation('get_platform_keys', {
      userId: authResult.userId!,
      role: authResult.role,
      request,
      success: true,
      duration: Date.now() - startTime,
    });
    
    return NextResponse.json({ success: true, data: platforms });
  } catch (error) {
    console.error("[Platform Keys API] Error:", error);
    
    auditLogger.logAdminOperation('get_platform_keys', {
      userId: 'unknown',
      request,
      success: false,
      error: String(error),
      duration: Date.now() - startTime,
    });
    
    return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
  }
}

/**
 * 保存平台API Key
 * 需要: 管理员权限
 * 安全: API Key加密存储
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  
  try {
    // 1. 管理员权限验证
    const authResult = await checkAdminPermission(request);
    
    if (!authResult.allowed) {
      alertService.alert('unauthorized_access', {
        severity: 'high',
        message: `未授权尝试保存平台API Key: ${authResult.reason}`,
        ip,
        endpoint: '/api/admin/platform-keys',
      });
      
      return NextResponse.json(
        { success: false, error: authResult.reason || "无权限" },
        { status: authResult.reason === "未登录" ? 401 : 403 }
      );
    }

    const body = await request.json();
    const { platform, apiKey, baseUrl, models, description } = body;
    
    if (!platform || !apiKey) {
      return NextResponse.json({ success: false, error: "缺少必填参数" }, { status: 400 });
    }

    // 验证平台有效性
    if (!PLATFORMS[platform as keyof typeof PLATFORMS]) {
      return NextResponse.json({ success: false, error: "无效的平台" }, { status: 400 });
    }
    
    // 2. 加密API Key
    const encryptedKey = encryptApiKey(apiKey);
    
    const supabase = getSupabaseClient();
    
    // 3. 使用upsert保存
    const { error } = await supabase
      .from("platform_api_keys")
      .upsert({
        platform,
        api_key: encryptedKey,
        base_url: baseUrl || PLATFORMS[platform as keyof typeof PLATFORMS]?.baseUrl || "",
        models: models || PLATFORMS[platform as keyof typeof PLATFORMS]?.models || [],
        description: description || "",
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "platform" });
    
    if (error) {
      console.error("[Platform Keys API] Save error:", error);
      
      auditLogger.logAdminOperation('save_platform_key', {
        userId: authResult.userId!,
        role: authResult.role,
        request,
        target: platform,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      });
      
      return NextResponse.json({ success: false, error: "保存失败" }, { status: 500 });
    }
    
    // 4. 记录审计日志
    auditLogger.logSensitiveOperation('platform_key_save', {
      userId: authResult.userId!,
      request,
      resourceType: 'platform_api_key',
      resourceId: platform,
      action: 'update',
      success: true,
      duration: Date.now() - startTime,
    });
    
    return NextResponse.json({ success: true, message: "保存成功" });
  } catch (error) {
    console.error("[Platform Keys API] Error:", error);
    
    auditLogger.logAdminOperation('save_platform_key', {
      userId: 'unknown',
      request,
      success: false,
      error: String(error),
      duration: Date.now() - startTime,
    });
    
    return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
  }
}

/**
 * 删除平台API Key
 * 需要: 管理员权限
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  
  try {
    // 1. 管理员权限验证
    const authResult = await checkAdminPermission(request);
    
    if (!authResult.allowed) {
      alertService.alert('unauthorized_access', {
        severity: 'high',
        message: `未授权尝试删除平台API Key: ${authResult.reason}`,
        ip,
        endpoint: '/api/admin/platform-keys',
      });
      
      return NextResponse.json(
        { success: false, error: authResult.reason || "无权限" },
        { status: authResult.reason === "未登录" ? 401 : 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    
    if (!platform) {
      return NextResponse.json({ success: false, error: "缺少平台参数" }, { status: 400 });
    }
    
    const supabase = getSupabaseClient();
    
    // 2. 删除
    const { error } = await supabase
      .from("platform_api_keys")
      .delete()
      .eq("platform", platform);
    
    if (error) {
      console.error("[Platform Keys API] Delete error:", error);
      
      auditLogger.logAdminOperation('delete_platform_key', {
        userId: authResult.userId!,
        role: authResult.role,
        request,
        target: platform,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      });
      
      return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
    }
    
    // 3. 记录审计日志
    auditLogger.logSensitiveOperation('platform_key_delete', {
      userId: authResult.userId!,
      request,
      resourceType: 'platform_api_key',
      resourceId: platform,
      action: 'delete',
      success: true,
      duration: Date.now() - startTime,
    });
    
    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("[Platform Keys API] Error:", error);
    
    return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
  }
}

/**
 * 解密API Key（如果已加密）
 */
function decryptIfEncrypted(encryptedKey: string): string {
  if (isEncrypted(encryptedKey)) {
    try {
      return decryptApiKey(encryptedKey);
    } catch {
      return encryptedKey;
    }
  }
  return encryptedKey;
}
