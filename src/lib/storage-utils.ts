/**
 * 云存储文件删除工具
 * 使用 coze-coding-dev-sdk 的 S3Storage 接口
 */

import { S3Storage } from "coze-coding-dev-sdk";

// 初始化存储客户端
function getStorageClient() {
  return new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    accessKey: "",
    secretKey: "",
    bucketName: process.env.COZE_BUCKET_NAME,
    region: "cn-beijing",
  });
}

/**
 * 从URL中提取文件key
 */
function extractFileKey(url: string): string | null {
  try {
    // base64数据无需删除
    if (url.startsWith('data:')) {
      return null;
    }

    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // 移除开头的斜杠和bucket名称（如果有）
    // URL格式: https://bucket.tos-region.volces.com/path/to/file
    // 或: https://bucket.oss-region.aliyuncs.com/path/to/file
    const parts = pathname.split('/').filter(Boolean);
    
    // 返回文件路径
    return parts.join('/');
  } catch {
    return null;
  }
}

/**
 * 删除云存储文件
 * @param url 文件URL
 * @returns 删除结果 { success: boolean, error?: string }
 */
export async function deleteStorageFile(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    // base64数据无需删除
    if (url.startsWith('data:')) {
      return { success: true };
    }

    const fileKey = extractFileKey(url);
    
    if (!fileKey) {
      return { success: false, error: '无法解析文件路径' };
    }

    const storage = getStorageClient();
    const result = await storage.deleteFile({ fileKey });
    
    return { success: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('[Storage] 删除文件失败:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 批量删除云存储文件
 */
export async function deleteStorageFiles(urls: string[]): Promise<{ success: number; failed: number }> {
  const results = await Promise.all(urls.map(url => deleteStorageFile(url)));
  return {
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };
}
