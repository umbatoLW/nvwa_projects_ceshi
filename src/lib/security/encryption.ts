/**
 * API Key加密工具
 * 使用AES-256-GCM加密算法
 */

import crypto from 'crypto';

/**
 * 加密配置
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * 获取加密密钥
 * 从环境变量读取，确保32字节长度
 */
function getEncryptionKey(): Buffer {
  const key = process.env.API_KEY_ENCRYPTION_SECRET;
  
  if (!key) {
    throw new Error('API_KEY_ENCRYPTION_SECRET环境变量未配置');
  }
  
  // 如果密钥长度不足32字节，使用PBKDF2派生
  if (key.length < 32) {
    return crypto.pbkdf2Sync(key, 'api-key-salt', 100000, 32, 'sha256');
  }
  
  // 截取前32字节
  return Buffer.from(key.slice(0, 32));
}

/**
 * 加密API Key
 * @param apiKey 原始API Key
 * @returns 加密后的字符串（base64格式）
 */
export function encryptApiKey(apiKey: string): string {
  if (!apiKey) {
    throw new Error('API Key不能为空');
  }
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // 派生密钥（使用salt增加安全性）
  const derivedKey = crypto.pbkdf2Sync(key, salt, 10000, 32, 'sha256');
  
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 格式: salt:iv:authTag:encrypted
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':');
}

/**
 * 解密API Key
 * @param encryptedKey 加密的API Key
 * @returns 原始API Key
 */
export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey) {
    throw new Error('加密Key不能为空');
  }
  
  const key = getEncryptionKey();
  const parts = encryptedKey.split(':');
  
  if (parts.length !== 4) {
    // 可能是未加密的旧数据，直接返回
    // 生产环境应该抛出错误
    console.warn('[Encryption] 检测到未加密的API Key格式');
    return encryptedKey;
  }
  
  const [saltHex, ivHex, authTagHex, encrypted] = parts;
  
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  // 派生密钥
  const derivedKey = crypto.pbkdf2Sync(key, salt, 10000, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);
  
  try {
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('API Key解密失败');
  }
}

/**
 * 检查字符串是否已加密
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 4 && parts.every(p => /^[0-9a-f]+$/i.test(p));
}

/**
 * API Key脱敏显示
 * 保留前4位和后4位，中间用星号替代
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 8) {
    return '****';
  }
  
  const prefix = apiKey.slice(0, 4);
  const suffix = apiKey.slice(-4);
  const maskedLength = Math.min(apiKey.length - 8, 8);
  const masked = '*'.repeat(maskedLength);
  
  return `${prefix}${masked}${suffix}`;
}

/**
 * 验证加密配置是否正确
 */
export function validateEncryptionConfig(): { valid: boolean; error?: string } {
  try {
    const key = process.env.API_KEY_ENCRYPTION_SECRET;
    
    if (!key) {
      return { valid: false, error: 'API_KEY_ENCRYPTION_SECRET环境变量未配置' };
    }
    
    // 测试加密解密
    const testKey = 'test-api-key-123456';
    const encrypted = encryptApiKey(testKey);
    const decrypted = decryptApiKey(encrypted);
    
    if (decrypted !== testKey) {
      return { valid: false, error: '加密解密测试失败' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: String(error) };
  }
}
