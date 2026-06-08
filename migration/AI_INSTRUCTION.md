# AI 编程助手指令 - 女娲平台 UI 重构

## 指令使用说明

将以下指令复制粘贴到新账号的扣子AI编程助手中，开始重构开发。

---

## 完整指令（复制以下内容）

```
我要开发一个AI智能短剧创作平台"女娲"，需要UI重构。请仔细阅读以下要求：

### 一、项目初始化

1. 使用 Next.js 16 App Router + React 19 + TypeScript 5
2. 使用 Tailwind CSS 4 + shadcn/ui 组件库
3. 仅使用 pnpm 管理依赖
4. 项目文件放在 src/ 目录下

### 二、首页（必须按此实现，不可修改）

首页（`src/app/page.tsx`）使用全屏视频轮播背景，深色主题 + 蒂芙尼蓝强调色：

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const videos = [
  { src: 'https://image01.vidu.zone/vidu/landing-page/sailboat.14774333.mp4', poster: 'https://image01.vidu.zone/vidu/media-asset/sailboat-8eee19ce.webp' },
  { src: 'https://image01.vidu.zone/vidu/landing-page/girl.6e936562.mp4', poster: 'https://image01.vidu.zone/vidu/media-asset/girl-2a1d4663.webp' },
  { src: 'https://image01.vidu.zone/vidu/landing-page/banner2.c92f22ed.mp4', poster: 'https://image01.vidu.zone/vidu/media-asset/banner2-9da68e3f.webp' },
  { src: 'https://image01.vidu.zone/vidu/landing-page/explosion.e0203d2f.mp4', poster: 'https://image01.vidu.zone/vidu/media-asset/explosion-63d7069f.webp' },
  { src: 'https://image01.vidu.zone/vidu/landing-page/banner3.64dda4ef.mp4', poster: 'https://image01.vidu.zone/vidu/media-asset/banner3-3b5b55f3.webp' },
];

export default function HomePage() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveIndex((prev) => (prev + 1) % videos.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Video layers */}
      {videos.map((video, index) => (
        <div key={index} className="absolute inset-0 w-full h-full transition-opacity duration-1000" style={{ opacity: index === activeIndex ? 1 : 0, zIndex: 1 }}>
          <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" poster={video.poster}>
            <source src={video.src} type="video/mp4" />
          </video>
        </div>
      ))}
      
      {/* Dark overlay */}
      <div className="absolute inset-0 z-[2]" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.3) 40%, rgba(10,10,10,0.1) 60%, rgba(10,10,10,0.4) 100%)' }} />
      
      {/* Logo */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-[#0ABAB5] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="font-bold text-base text-white">NVWA</span>
        </Link>
      </div>
      
      {/* Center content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
        <h1 className="mb-8 text-center font-semibold text-white leading-tight" style={{ fontSize: 'clamp(32px, 6vw, 80px)', textShadow: '0px 2.25px 2.25px rgba(0, 0, 0, 0.25)' }}>
          一念成剧&nbsp;&nbsp;&nbsp;&nbsp;万象生辉
        </h1>
        <Link href="/dashboard" className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#0ABAB5] text-black font-semibold text-base transition-all hover:shadow-[0_0_30px_rgba(10,186,181,0.5)] hover:scale-105">
          立即创作
        </Link>
      </div>
    </div>
  );
}
```

### 三、设计风格（全局）

配色方案：
- 背景: #0A0A0A（极深黑）
- 卡片: #141414
- 悬浮卡片: #1A1A1A
- 主色: #0ABAB5（蒂芙尼蓝）
- 主文字: #F5F5F5
- 次文字: #888888
- 边框: #333333

视觉关键词：沉浸式、视觉冲击、动态交互、专业感、玻璃拟态、发光效果

### 四、页面结构（需要开发）

| 页面 | 路径 | 功能描述 |
|------|------|---------|
| 仪表盘 | /dashboard | 创作中心首页，统计卡片+快捷入口+最近创作 |
| 剧本库 | /scripts | 剧本卡片瀑布流，搜索筛选 |
| 剧本详情 | /scripts/[id] | 沉浸式编辑器，分屏布局 |
| 角色库 | /characters | 角色卡片网格展示 |
| 角色详情 | /characters/[id] | 角色档案卡片 |
| 资产库 | /assets | 素材库画廊 |
| 工作区 | /workspace | 可视化创作画布 |
| 设置 | /settings | 分组卡片设置 |
| 创作-生图 | /create/image | AI文生图工具 |
| 创作-生视频 | /create/video | AI文生视频工具 |
| 剧本编辑 | /scripts/[id]/chat | AI剧本创作对话 |
| 分镜编辑 | /scripts/[id]/storyboard | 分镜生成工具 |

### 五、后端 API 接口（必须实现）

AI 相关：
- POST /api/ai/generate-image - AI生图（返回taskId，轮询）
- POST /api/ai/generate-video - AI生视频
- POST /api/ai/generate-full-script - 完整剧本生成（SSE流式）
- POST /api/ai/chat - AI对话
- GET /api/ai/tasks/[id] - 任务状态查询

数据 CRUD：
- GET/POST /api/scripts - 剧本列表/创建
- GET/PUT/DELETE /api/scripts/[id] - 剧本详情/更新/删除
- GET/POST /api/characters - 角色列表/创建
- GET/POST /api/assets - 资产列表/创建

用户相关：
- GET /api/credits - 积分查询
- GET /api/settings - 用户设置

### 六、数据库表（Supabase）

主要表：
- scripts: 剧本表
- characters: 角色表
- assets: 资产表
- user_credits: 用户积分
- generations: 生成记录

### 七、核心功能

1. 剧本创作：从创意生成完整剧本，支持多集
2. 角色设计：AI生成角色形象，三视图一致性
3. 分镜生成：根据剧本生成分镜图
4. AI生图：支持万相、即梦等模型
5. AI生视频：支持可灵等模型
6. 积分系统：按次计费

### 八、开发优先级

1. 首页（已在上面给出代码）
2. Dashboard 仪表盘
3. 剧本库 + 剧本详情
4. AI生图/生视频页面
5. 角色库 + 角色详情
6. 其他页面

请按照以上要求开始开发，确保首页完全按照给定代码实现，其他页面按照高级AI智能创作平台的视觉风格设计。
```

---

## 指令说明

### 指令包含内容

1. **首页完整代码** - 直接复制可用
2. **设计风格规范** - 配色、视觉关键词
3. **页面结构清单** - 所有路由和功能
4. **API 接口列表** - 后端需要实现的接口
5. **数据库表** - 主要数据结构
6. **核心功能** - 业务功能点
7. **开发优先级** - 开发顺序建议

### 使用建议

1. **分段执行**：可以按页面逐个开发，先完成首页和 Dashboard
2. **参考原型**：可以要求 AI 先生成原型图，确认后再开发
3. **增量验证**：每完成一个页面就测试功能是否正常

---

## 附录：功能迁移检查清单

开发完成后，逐项检查：

- [ ] 首页视频轮播正常
- [ ] Dashboard 统计数据展示
- [ ] 剧本创建和编辑流程
- [ ] AI生图功能（万相/即梦模型）
- [ ] AI生视频功能
- [ ] 角色创建和展示
- [ ] 积分扣费正常
- [ ] 数据持久化正常
- [ ] 深色主题一致
- [ ] 无 console 错误
