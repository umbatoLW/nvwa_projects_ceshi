import type { NextConfig } from 'next';
import path from 'path';

// 简化配置，避免 top-level await 问题
// bundle analyzer 通过环境变量 ANALYZE=true 单独运行
const nextConfig: NextConfig = {
  // 启用 bundle analysis
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
    // 启用CSS优化（需要安装critters）
    // optimizeCss: true,
  },

  // webpack 配置
  webpack: (config, { isServer }) => {
    // three.js 只在客户端加载
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // 优化 dagre
    config.resolve.alias = {
      ...config.resolve.alias,
      dagre$: path.resolve(__dirname, 'node_modules/dagre/index.js'),
    };

    return config;
  },

  allowedDevOrigins: ['*.dev.coze.site'],
  
  // 图片优化配置（Lighthouse优化）
  images: {
    // 优先使用现代图片格式
    formats: ['image/avif', 'image/webp'],
    // 图片缓存时间（1天）
    minimumCacheTTL: 60 * 60 * 24,
    // 允许的远程图片域名
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
    // 图片尺寸配置
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 压缩配置
  compress: true,
  
  // 生产环境优化
  poweredByHeader: false,
  
  // 设置 Turbopack 根目录，消除多 lockfile 警告
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
