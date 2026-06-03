/**
 * 平台API Key管理模块
 * 用于获取各平台的API Key配置
 */

import { getSupabaseClient } from "@/storage/database/supabase-client";
import { decryptApiKey, isEncrypted } from "@/lib/security/encryption";

// 平台与模型的映射关系
export const MODEL_PLATFORM_MAP: Record<string, string> = {
  // 阿里云百炼
  "wan2.7-text2image": "aliyun",
  "wan2.7-image-pro": "aliyun",
  "wan2.1-t2v-14b": "aliyun",
  "wan2.1-t2v-1.3b": "aliyun",
  "wanx2.1-t2v-plus": "aliyun",
  "wanx2.1-i2v-plus": "aliyun",
  "qwen-plus": "aliyun",
  "qwen-max": "aliyun",
  "qwen-turbo": "aliyun",
  "text-to-3d": "aliyun",
  "image-to-3d": "aliyun",
  "image-edit": "aliyun",
  
  // DeepSeek (文档: https://api.deepseek.com)
  "deepseek-v4-flash": "deepseek",  // 快速模型
  "deepseek-v4-pro": "deepseek",    // 高级模型（支持思考模式）
  "deepseek-chat": "deepseek",       // 将于 2026/07/24 弃用，对应 v4-flash
  "deepseek-reasoner": "deepseek",   // 将于 2026/07/24 弃用，对应 v4-pro 思考模式
  
  // Kimi (Moonshot)
  "kimi-k2.5": "kimi",
  "kimi": "kimi",
  "moonshot-v1-8k": "kimi",
  "moonshot-v1-32k": "kimi",
  "moonshot-v1-128k": "kimi",
  
  // 即梦 (Seedream)
  "seedream-3.0-t2i": "jimeng",
  "seedream-3.0-i2i": "jimeng",
  "seedream-4.6-t2i": "jimeng",
  "seedance2.0": "jimeng",
  "jimeng-videos": "jimeng",
  
  // Vidu
  "vidu-2": "vidu",
  "vidu/viduq3-pro_text2video": "vidu",
  "vidu/viduq3-pro_img2video": "vidu",
  
  // 可灵
  "kling/kling-v3-video-generation": "kling",
};

// 平台基础URL配置
export const PLATFORM_BASE_URLS: Record<string, string> = {
  aliyun: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  deepseek: "https://api.deepseek.com/v1",  // DeepSeek API 端点
  kimi: "https://api.moonshot.cn/v1",
  jimeng: "https://visual.volcengineapi.com",
  vidu: "", // 待文档补充
  kling: "", // 待文档补充
};

// 平台配置类型
export interface PlatformConfig {
  apiKey: string;
  secretKey?: string; // 火山引擎平台需要
  baseUrl: string;
  platform: string;
}

// 缓存
let platformKeysCache: Record<string, PlatformConfig> = {};
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取模型对应的平台
 */
export function getModelPlatform(modelKey: string): string {
  return MODEL_PLATFORM_MAP[modelKey] || "aliyun"; // 默认阿里云
}

/**
 * 获取平台的API Key和配置
 */
export async function getPlatformConfig(platform: string): Promise<PlatformConfig | null> {
  // 检查缓存
  const now = Date.now();
  if (cacheTime && now - cacheTime < CACHE_TTL && platformKeysCache[platform]) {
    return platformKeysCache[platform];
  }
  
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("platform_api_keys")
      .select("api_key, secret_key, base_url, is_active")
      .eq("platform", platform)
      .eq("is_active", true)
      .single();
    
    if (error || !data) {
      // 如果数据库中没有，返回null
      return null;
    }
    
    const config: PlatformConfig = {
      apiKey: decryptApiKeyIfNeeded(data.api_key),
      secretKey: data.secret_key ? decryptApiKeyIfNeeded(data.secret_key) : undefined,
      baseUrl: data.base_url || PLATFORM_BASE_URLS[platform] || "",
      platform,
    };
    
    // 更新缓存
    platformKeysCache[platform] = config;
    cacheTime = now;
    
    return config;
  } catch (error) {
    console.error(`[getPlatformConfig] Error fetching ${platform}:`, error);
    return null;
  }
}

/**
 * 根据模型获取对应的平台API Key
 * 这是主要的对外接口
 */
export async function getApiKeyForModel(modelKey: string): Promise<PlatformConfig | null> {
  const platform = getModelPlatform(modelKey);
  const config = await getPlatformConfig(platform);
  
  if (!config || !config.apiKey) {
    return null;
  }
  
  return config;
}

/**
 * 清除缓存（用于更新配置后）
 */
export function clearPlatformKeysCache() {
  platformKeysCache = {};
  cacheTime = 0;
}

/**
 * 解密API Key（如果已加密）
 */
function decryptApiKeyIfNeeded(encryptedKey: string): string {
  if (!encryptedKey) {
    return encryptedKey;
  }
  
  // 检查是否已加密
  if (isEncrypted(encryptedKey)) {
    try {
      return decryptApiKey(encryptedKey);
    } catch (error) {
      console.error('[PlatformKeys] API Key解密失败:', error);
      return encryptedKey;
    }
  }
  
  // 未加密，直接返回（兼容旧数据）
  return encryptedKey;
}
