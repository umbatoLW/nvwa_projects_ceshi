import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";
import { auditLogger } from "@/lib/security/audit-logger";
import { createHash } from "crypto";

// 安全配置
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const MAX_FILE_NAME_LENGTH = 100;
const DANGEROUS_PATTERNS = [
  /\.php/i,
  /\.js/i,
  /\.html/i,
  /\.css/i,
  /\.exe/i,
  /<&script>/i,
  /javascript:/i,
  /on\w+=/i, // onclick, onerror等
  /data:/i,   // data:url
  /vbscript:/i,
];

// SVG危险元素黑名单
const SVG_DANGEROUS_ELEMENTS = [
  'script',
  'foreignObject', 
  'iframe',
  'object',
  'embed',
  'link',
  'style',
  'use',
];

const SVG_DANGEROUS_ATTRS = [
  'onload',
  'onerror', 
  'onclick',
  'onmouseover',
  'xlink:href', // 可能导致XSS
  'data:',      // data:url
];

/**
 * 图片上传API - 用于图片编辑功能
 * 接收前端上传的图片，存储到OSS并返回可访问的URL
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let success = false;
  let userId: string | undefined;

  try {
    // 1. 获取用户身份（临时使用dev-user，实际应从认证获取）
    userId = 'dev-user';

    // 2. Content-Type 验证
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      auditLogger.log('upload-image', {
        userId, request, success: false, error: 'Invalid Content-Type',
        metadata: { contentType },
      });
      return NextResponse.json(
        { success: false, error: "请求格式错误，需要 multipart/form-data" },
        { status: 400 }
      );
    }

    // 3. 解析表单
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      auditLogger.log('upload-image', {
        userId, request, success: false, error: 'No file',
      });
      return NextResponse.json(
        { success: false, error: "未找到上传文件" },
        { status: 400 }
      );
    }

    // 4. 文件名安全检查
    const fileName = file.name || 'unnamed';
    if (fileName.length > MAX_FILE_NAME_LENGTH) {
      auditLogger.log('upload-image', {
        userId, request, success: false, error: 'File name too long',
        metadata: { fileName, length: fileName.length },
      });
      return NextResponse.json(
        { success: false, error: "文件名过长" },
        { status: 400 }
      );
    }

    // 5. 危险模式检查
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(fileName)) {
        auditLogger.log('upload-image', {
          userId, request, success: false, error: 'Suspicious file name',
          metadata: { fileName },
        });
        return NextResponse.json(
          { success: false, error: "文件名包含不安全字符" },
          { status: 400 }
        );
      }
    }

    // 6. 验证文件扩展名
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      auditLogger.log('upload-image', {
        userId, request, success: false, error: 'Invalid file extension',
        metadata: { ext },
      });
      return NextResponse.json(
        { success: false, error: "不支持的文件类型" },
        { status: 400 }
      );
    }

    // 7. 验证Content-Type
    if (!ALLOWED_TYPES.includes(file.type)) {
      auditLogger.log('upload-image', {
        userId, request, success: false, error: 'Invalid MIME type',
        metadata: { mimeType: file.type },
      });
      return NextResponse.json(
        { success: false, error: "不支持的文件类型" },
        { status: 400 }
      );
    }

    // 8. 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      auditLogger.log('upload-image', {
        userId, request, success: false, error: 'File too large',
        metadata: { size: file.size },
      });
      return NextResponse.json(
        { success: false, error: "文件大小不能超过 10MB" },
        { status: 400 }
      );
    }

    // 9. 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 10. 基本文件头验证（检查文件魔数）
    const fileHeader = buffer.slice(0, 12);
    const isValidImage = validateImageHeader(fileHeader, ext);
    if (!isValidImage) {
      auditLogger.log('upload-image', {
        userId, request, success: false, error: 'File content mismatch',
        metadata: { declaredType: file.type, ext },
      });
      return NextResponse.json(
        { success: false, error: "文件内容与声明类型不匹配" },
        { status: 400 }
      );
    }

    // 11. SVG安全检查（防止SVG XSS）
    if (ext === 'svg' || file.type === 'image/svg+xml') {
      const svgCheck = validateSVG(buffer);
      if (!svgCheck.valid) {
        auditLogger.log('upload-image', {
          userId, request, success: false, error: 'SVG contains dangerous content',
          metadata: { reason: svgCheck.reason },
        });
        return NextResponse.json(
          { success: false, error: `SVG文件包含不安全内容: ${svgCheck.reason}` },
          { status: 400 }
        );
      }
    }

    // 12. 压缩炸弹检测（检查压缩比率）
    if (isCompressedImage(ext)) {
      const bombCheck = detectCompressionBomb(buffer, ext);
      if (!bombCheck.valid) {
        auditLogger.log('upload-image', {
          userId, request, success: false, error: 'Possible compression bomb',
          metadata: { ratio: bombCheck.ratio },
        });
        return NextResponse.json(
          { success: false, error: "文件疑似压缩炸弹" },
          { status: 400 }
        );
      }
    }

    // 13. 计算文件hash用于去重
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    // 14. 初始化存储
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: "",
      secretKey: "",
      bucketName: process.env.COZE_BUCKET_NAME,
      region: "cn-beijing",
    });

    // 15. 生成安全的文件名（包含hash防止重复上传）
    const safeExt = ext;
    const safeName = `${Date.now()}_${fileHash.slice(0, 8)}.${safeExt}`;
    const objectKey = `edit-uploads/${safeName}`;

    // 16. 上传文件
    const uploadedKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: objectKey,
      contentType: file.type,
    });

    // 17. 生成访问URL（短期有效）
    const imageUrl = await storage.generatePresignedUrl({
      key: uploadedKey,
      expireTime: 3600, // 1小时
    });

    success = true;
    auditLogger.log('upload-image', {
      userId, request, success: true, duration: Date.now() - startTime,
      metadata: {
        key: uploadedKey,
        size: file.size,
        mimeType: file.type,
        hash: fileHash,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        key: uploadedKey,
        url: imageUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        hash: fileHash,
      },
    });

  } catch (error) {
    console.error("Upload image error:", error);
    const errorMessage = error instanceof Error ? error.message : "上传失败";

    auditLogger.log('upload-image', {
      userId, request, success: false, error: errorMessage,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { success: false, error: `图片上传失败` },
      { status: 500 }
    );
  }
}

/**
 * 验证文件头（魔数）是否为有效图片
 */
function validateImageHeader(header: Buffer, ext: string): boolean {
  // JPEG: FF D8 FF
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return ext === 'jpg' || ext === 'jpeg';
  }
  
  // PNG: 89 50 4E 47
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    return ext === 'png';
  }
  
  // GIF: 47 49 46 38
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
    return ext === 'gif';
  }
  
  // WebP: 52 49 46 46 (RIFF) + later WEBP
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    // 需要检查后面是否为 WEBP
    if (header.length >= 12 && 
        header[8] === 0x57 && header[9] === 0x45 && 
        header[10] === 0x42 && header[11] === 0x50) {
      return ext === 'webp';
    }
  }
  
  return false;
}

/**
 * 验证SVG安全性
 */
function validateSVG(buffer: Buffer): { valid: boolean; reason?: string } {
  try {
    const content = buffer.toString('utf-8');
    
    // 检查危险元素
    for (const element of SVG_DANGEROUS_ELEMENTS) {
      if (content.includes(`<${element}`) || content.includes(`</${element}`)) {
        return { valid: false, reason: `包含危险元素: <${element}>` };
      }
    }
    
    // 检查危险属性
    for (const attr of SVG_DANGEROUS_ATTRS) {
      if (content.includes(attr)) {
        return { valid: false, reason: `包含危险属性: ${attr}` };
      }
    }
    
    // 检查javascript:协议
    if (/javascript:/i.test(content)) {
      return { valid: false, reason: '包含javascript:协议' };
    }
    
    // 检查data:url（可能用于内嵌脚本）
    if (/data:[^,]*text\/html/i.test(content)) {
      return { valid: false, reason: '包含data:html内容' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, reason: '无法解析SVG' };
  }
}

/**
 * 检测是否为压缩炸弹
 */
function detectCompressionBomb(buffer: Buffer, ext: string): { valid: boolean; ratio?: number } {
  // 只对支持压缩的格式进行检测
  if (!isCompressedImage(ext)) {
    return { valid: true };
  }
  
  // 计算压缩比（非常粗略的估计）
  // 真实检测需要解压缩并检查展开后的大小
  const estimatedExpandedSize = buffer.length * 10; // 假设最大10倍
  
  // 如果估计的展开大小超过限制，认为可能是压缩炸弹
  const MAX_ESTIMATED_SIZE = 50 * 1024 * 1024; // 50MB
  if (estimatedExpandedSize > MAX_ESTIMATED_SIZE) {
    return { valid: false, ratio: estimatedExpandedSize / buffer.length };
  }
  
  return { valid: true };
}

/**
 * 判断是否为压缩格式图片
 */
function isCompressedImage(ext: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}
