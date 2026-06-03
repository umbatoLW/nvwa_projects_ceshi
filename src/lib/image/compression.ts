/**
 * 图片压缩工具
 * 使用Canvas API进行图片压缩（浏览器端）或Sharp（服务端）
 * 
 * 服务端使用需要安装: pnpm add sharp
 */

export interface CompressOptions {
  quality?: number; // 1-100
  maxWidth?: number;
  maxHeight?: number;
  format?: "jpeg" | "png" | "webp";
  preserveMetadata?: boolean;
}

export interface CompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  format: string;
}

/**
 * 检查是否支持Sharp（服务端）
 */
function isSharpAvailable(): boolean {
  try {
    require.resolve("sharp");
    return true;
  } catch {
    return false;
  }
}

/**
 * 服务端压缩图片（使用Sharp）
 */
export async function compressImageServer(
  buffer: Buffer,
  options: CompressOptions = {}
): Promise<CompressionResult> {
  const {
    quality = 80,
    maxWidth = 1920,
    maxHeight = 1920,
    format = "webp",
  } = options;

  const originalSize = buffer.length;

  // 动态导入sharp（如果可用）
  if (!isSharpAvailable()) {
    console.warn("Sharp不可用，返回原始图片");
    return {
      buffer,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      width: 0,
      height: 0,
      format: "unknown",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sharp = require("sharp");

  const image = sharp(buffer);
  const metadata = await image.metadata();

  let transformer = image.resize(maxWidth, maxHeight, {
    fit: "inside",
    withoutEnlargement: true,
  });

  switch (format) {
    case "jpeg":
      transformer = transformer.jpeg({ quality, mozjpeg: true });
      break;
    case "png":
      transformer = transformer.png({ quality, compressionLevel: 9 });
      break;
    case "webp":
    default:
      transformer = transformer.webp({ quality });
      break;
  }

  const compressedBuffer = await transformer.toBuffer();

  return {
    buffer: compressedBuffer,
    originalSize,
    compressedSize: compressedBuffer.length,
    compressionRatio: compressedBuffer.length / originalSize,
    width: metadata.width || 0,
    height: metadata.height || 0,
    format,
  };
}

/**
 * 生成缩略图
 */
export async function generateThumbnailServer(
  buffer: Buffer,
  size = 200
): Promise<Buffer> {
  if (!isSharpAvailable()) {
    console.warn("Sharp不可用，返回原始图片");
    return buffer;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sharp = require("sharp");

  return sharp(buffer)
    .resize(size, size, { fit: "cover" })
    .webp({ quality: 70 })
    .toBuffer();
}

/**
 * 获取图片元数据
 */
export async function getImageMetadata(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
} | null> {
  if (!isSharpAvailable()) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require("sharp");
    const metadata = await sharp(buffer).metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || "unknown",
      size: buffer.length,
      hasAlpha: metadata.hasAlpha || false,
    };
  } catch {
    return null;
  }
}

/**
 * 浏览器端压缩图片（使用Canvas）
 */
export async function compressImageBrowser(
  file: File,
  options: CompressOptions = {}
): Promise<Blob> {
  const {
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1920,
    format = "image/webp",
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 计算缩放后的尺寸
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // 创建Canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建Canvas上下文"));
        return;
      }

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("图片压缩失败"));
          }
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };

    img.src = url;
  });
}

/**
 * 检查图片是否需要压缩
 */
export function shouldCompress(
  size: number,
  width: number,
  height: number,
  threshold = 500 * 1024 // 500KB
): boolean {
  // 超过阈值或尺寸过大
  return size > threshold || width > 1920 || height > 1920;
}

/**
 * 计算压缩质量（根据图片大小动态调整）
 */
export function calculateQuality(size: number): number {
  // 小于100KB，高质量
  if (size < 100 * 1024) return 90;
  // 100KB-500KB，中等质量
  if (size < 500 * 1024) return 80;
  // 500KB-1MB，较低质量
  if (size < 1024 * 1024) return 70;
  // 大于1MB，低质量
  return 60;
}
