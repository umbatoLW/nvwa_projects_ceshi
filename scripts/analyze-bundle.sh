#!/bin/bash

# Bundle 分析脚本
# 用于分析 Next.js 打包体积

echo "🔍 开始分析 Bundle..."

# 设置分析环境变量
export ANALYZE=true

# 运行构建
echo "📦 正在构建..."
pnpm build

echo "✅ 构建完成！"
echo ""
echo "📊 分析报告已生成："
echo "  - .next/analyze/client.html  (客户端包)"
echo "  - .next/analyze/server.html  (服务端包)"
echo "  - .next/analyze/edge.html    (Edge包)"
echo ""
echo "💡 提示：用浏览器打开上述 HTML 文件查看详细分析"
