# 女娲项目本地迁移指南

> 本文档包含所有后端数据、数据库数据、API配置等信息，用于在本地 Trae_CN 环境中继续开发。

---

## 一、环境变量配置

### 1.1 必需环境变量

创建 `.env.local` 文件，填入以下配置：

```bash
# 阿里云百炼 API Key (用于生图、生视频、LLM)
DASHSCOPE_API_KEY=sk-afd254e17b744eabad4879ae73627c69

# Supabase 数据库配置
SUPABASE_URL=https://lmhoexerqluulcdsqgnt.supabase.co
SUPABASE_ANON_KEY=sb_publishable_2YqWzVK_QFgTgTv934jfBQ_CSD7h_Lh

# 可选：绕过认证（仅开发环境）
# BYPASS_AUTH=true
```

### 1.2 可选环境变量

```bash
# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_key

# Kimi API
KIMI_API_KEY=your_kimi_key

# Vidu API
VIDU_API_KEY=your_vidu_key

# 可灵 API
KLING_API_KEY=your_kling_key
```

---

## 二、数据库配置

### 2.1 Supabase 数据库信息

| 配置项 | 值 |
|--------|-----|
| 项目URL | https://lmhoexerqluulcdsqgnt.supabase.co |
| Anon Key | sb_publishable_2YqWzVK_QFgTgTv934jfBQ_CSD7h_Lh |

### 2.2 数据库表结构

共有 **13 张数据表**：

| 表名 | 列数 | 说明 |
|------|------|------|
| `assets` | 14 | 资产库 |
| `characters` | 13 | 角色库 |
| `chat_sessions` | 6 | 聊天会话 |
| `credit_transactions` | 10 | 积分交易记录 |
| `generations` | 8 | AI生成记录 |
| `health_check` | 2 | 健康检查 |
| `model_pricing` | 9 | 模型定价 |
| `platform_api_keys` | 10 | 平台API Key配置 |
| `projects` | 6 | 项目 |
| `scripts` | 20 | 剧本库 |
| `user_credits` | 7 | 用户积分 |
| `user_settings` | 7 | 用户设置 |
| `workflows` | 8 | 工作流 |

### 2.3 初始化 SQL 脚本

完整的建表 SQL 脚本位于：`/workspace/projects/supabase-init.sql`

在 Supabase SQL Editor 中执行此脚本即可创建所有表结构。

### 2.4 表结构详情

#### scripts 表（剧本）
```sql
id              VARCHAR      PRIMARY KEY DEFAULT gen_random_uuid()
title           VARCHAR      NOT NULL
genre           VARCHAR      DEFAULT ''
synopsis        TEXT         DEFAULT ''
content         TEXT         DEFAULT ''
scenes          INTEGER      DEFAULT 0
characters      INTEGER      DEFAULT 0
status          VARCHAR      DEFAULT 'draft'
created_at      TIMESTAMPTZ  DEFAULT now()
updated_at      TIMESTAMPTZ  DEFAULT now()
user_id         VARCHAR
storyboards     JSONB        DEFAULT '[]'
roles           JSONB        DEFAULT '[]'
costumes        JSONB        DEFAULT '{}'
extracted_scenes JSONB       DEFAULT '{}'
props           JSONB        DEFAULT '{}'
episode_count   INTEGER      DEFAULT 0
word_count      INTEGER      DEFAULT 0
scene_count     INTEGER      DEFAULT 0
cover_image     TEXT
```

#### characters 表（角色）
```sql
id                  VARCHAR      PRIMARY KEY DEFAULT gen_random_uuid()
name                VARCHAR      NOT NULL
avatar              TEXT         DEFAULT ''
description         TEXT         DEFAULT ''
personality         TEXT         DEFAULT ''
tags                JSONB        DEFAULT '[]'
views               JSONB        DEFAULT '[]'
expressions         JSONB        DEFAULT '[]'
status              VARCHAR      DEFAULT 'draft'
created_at          TIMESTAMPTZ  DEFAULT now()
user_id             VARCHAR
forbidden_features  TEXT         DEFAULT ''
consistency_anchor  TEXT         DEFAULT ''
```

#### generations 表（AI生成记录）
```sql
id          UUID         PRIMARY KEY DEFAULT gen_random_uuid()
type        VARCHAR      NOT NULL
prompt      TEXT
model       VARCHAR
params      JSONB
results     JSONB
user_id     VARCHAR
created_at  TIMESTAMPTZ  DEFAULT now()
```

---

## 三、API 路由清单

### 3.1 完整 API 列表（共 55 个）

#### AI 相关 API
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/ai/analyze-episodes` | POST | 分析剧集 |
| `/api/ai/batch-extract` | POST | 批量提取 |
| `/api/ai/chat` | POST | AI 对话 |
| `/api/ai/compliance-check` | POST | 合规检查 |
| `/api/ai/consistency-check` | POST | 一致性检查 |
| `/api/ai/edit-image` | POST | 图片编辑 |
| `/api/ai/edit-video` | POST | 视频编辑 |
| `/api/ai/execute-node` | POST | 执行节点 |
| `/api/ai/extract-roles` | POST | 提取角色 |
| `/api/ai/extract-stream` | POST | 流式提取 |
| `/api/ai/generate-3d` | POST | 生成 3D |
| `/api/ai/generate-character-image` | POST | 生成角色图片 |
| `/api/ai/generate-character-views` | POST | 生成角色视图 |
| `/api/ai/generate-character` | POST | 生成角色 |
| `/api/ai/generate-full-script` | POST | 生成完整剧本 |
| `/api/ai/generate-image` | POST | **生成图片** |
| `/api/ai/generate-script-cover` | POST | 生成剧本封面 |
| `/api/ai/generate-script` | POST | 生成剧本 |
| `/api/ai/generate-video` | POST | **生成视频** |
| `/api/ai/optimize-prompt` | POST | 优化提示词 |
| `/api/ai/optimize-stream` | POST | 流式优化 |
| `/api/ai/parse-document` | POST | 解析文档 |
| `/api/ai/split-scenes` | POST | 分割场景 |
| `/api/ai/tasks/[id]` | GET | 查询任务状态 |

#### 管理相关 API
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/admin/metrics` | GET | 获取指标 |
| `/api/admin/platform-keys` | GET/POST | 平台 Key 管理 |

#### 认证相关 API
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/auth/register` | POST | 注册 |

#### 资源相关 API
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/assets` | GET/POST | 资产列表/创建 |
| `/api/assets/[id]` | GET/PUT/DELETE | 资产详情/更新/删除 |
| `/api/characters` | GET/POST | 角色列表/创建 |
| `/api/characters/[id]` | GET/PUT/DELETE | 角色详情/更新/删除 |
| `/api/scripts` | GET/POST | 剧本列表/创建 |
| `/api/scripts/[id]` | GET/PUT/DELETE | 剧本详情/更新/删除 |
| `/api/projects` | GET/POST | 项目列表/创建 |
| `/api/projects/[id]` | GET/PUT/DELETE | 项目详情/更新/删除 |
| `/api/workflows` | GET/POST | 工作流列表/创建 |
| `/api/workflows/[id]` | GET/PUT/DELETE | 工作流详情/更新/删除 |
| `/api/generations` | GET | 生成记录列表 |
| `/api/generations/[id]` | GET | 生成记录详情 |

#### 积分相关 API
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/credits` | GET | 获取用户积分 |
| `/api/credits/pricing` | GET | 获取定价信息 |
| `/api/credits/recharge` | POST | 积分充值 |
| `/api/credits/transactions` | GET | 积分交易记录 |

#### 其他 API
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/dashboard/stats` | GET | 仪表盘统计 |
| `/api/analytics` | GET | 分析数据 |
| `/api/download` | POST | 下载文件 |
| `/api/fetch-url` | POST | 获取 URL 内容 |
| `/api/image-proxy` | GET | 图片代理 |
| `/api/parse-document` | POST | 解析文档 |
| `/api/upload-image` | POST | 上传图片 |
| `/api/settings` | GET/PUT | 用户设置 |
| `/api/chat-sessions` | GET/POST | 聊天会话 |

---

## 四、生图功能配置

### 4.1 支持的图片模型

| 模型ID | 名称 | 平台 | 特性 |
|--------|------|------|------|
| `wan2.7-image-pro` | 万相 2.7 Pro | 阿里云 | 文生图、图生图、编辑、组图 |
| `wan2.7-image` | 万相 2.7 | 阿里云 | 文生图、图生图、编辑 |
| `wanx2.1-t2i-turbo` | 通义万相 2.1 Turbo | 阿里云 | 文生图 |
| `wanx2.1-t2i-plus` | 通义万相 2.1 Plus | 阿里云 | 文生图 |
| `seedream-3.0-t2i` | 即梦 Seedream 3.0 文生图 | 即梦 | 文生图 |
| `seedream-3.0-i2i` | 即梦 Seedream 3.0 图生图 | 即梦 | 图生图 |
| `seedream-4.6-t2i` | 即梦 Seedream 4.6 文生图 | 即梦 | 文生图 |

### 4.2 生图 API 调用示例

```typescript
// POST /api/ai/generate-image
const response = await fetch('/api/ai/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '一只可爱的猫咪',
    model: 'wan2.7-image-pro',  // 可选，默认 wan2.7-image-pro
    size: '1024x1024',          // 可选
    n: 1,                        // 生成数量，可选
    referenceImages: [],         // 参考图片，可选
    enableSequential: false,     // 组图模式，可选
    thinkingMode: false,         // 思考模式，可选
  })
});
```

### 4.3 定价配置

| 模型 | 定价 Key | 说明 |
|------|----------|------|
| wan2.7 系列 | `wan2.7-text2image` | 通义万相 2.7 |
| wanx 系列 | `wanx-text2image` | 通义万相 2.1 |
| seedream-3.0 | `seedream-3.0-t2i` | 即梦 3.0 |
| seedream-4.6 | `seedream-4.6-t2i` | 即梦 4.6 |
| seedance-2.0 | `seedance-2.0-t2i` | 即梦 Seedance 2.0 |

---

## 五、生视频功能配置

### 5.1 支持的视频模型

| 模型ID | 名称 | 类型 | 时长 | 分辨率 |
|--------|------|------|------|--------|
| `seedance2` | Seedance 2.0 | 文生视频/图生视频 | 5s | 1080p |
| `seedance2_face` | Seedance 2.0 人脸 | 图生视频 | 5s | 1080p |
| `wan2.7-t2v-2026-04-25` | 万相 2.7 文生视频 | 文生视频 | 5s | 720p |
| `wan2.7-i2v-2026-04-25` | 万相 2.7 图生视频 | 图生视频 | 5s | 720p |
| `happyhorse-1.0-t2v` | 快乐马 1.0 文生视频 | 文生视频 | 5s | 720p |
| `happyhorse-1.0-i2v` | 快乐马 1.0 图生视频 | 图生视频 | 5s | 720p |
| `happyhorse-1.0-r2v` | 快乐马 1.0 参考视频 | 参考生视频 | 5s | 720p |
| `vidu/viduq3-pro_text2video` | Vidu Q3 Pro 文生视频 | 文生视频 | 5-16s | 1080p |
| `vidu/viduq3-pro_img2video` | Vidu Q3 Pro 图生视频 | 图生视频 | 5-16s | 1080p |
| `kling/kling-v3-video-generation` | 可灵 V3 视频生成 | 文生视频 | 5-10s | 1080p |

### 5.2 生视频 API 调用示例

```typescript
// POST /api/ai/generate-video (提交任务)
const response = await fetch('/api/ai/generate-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '一只猫咪在草地上奔跑',
    model: 'seedance2',         // 模型ID
    image: 'https://...',       // 图生视频时的输入图片
    duration: 5,                // 视频时长（秒）
    aspectRatio: '16:9',        // 画面比例
  })
});

// GET /api/ai/generate-video?taskId=xxx&model=seedance2 (查询状态)
const status = await fetch('/api/ai/generate-video?taskId=xxx&model=seedance2');
```

### 5.3 视频生成流程

1. **提交任务** → 返回 `taskId`
2. **轮询状态** → GET 请求带 `taskId`
3. **状态枚举**：
   - `PENDING` - 等待中
   - `RUNNING` - 生成中
   - `SUCCEEDED` - 成功（返回视频URL）
   - `FAILED` - 失败

---

## 六、多平台 API Key 配置

### 6.1 平台与模型映射

```typescript
const MODEL_PLATFORM_MAP = {
  // 阿里云百炼
  "wan2.7-image-pro": "aliyun",
  "wan2.7-text2image": "aliyun",
  "qwen-plus": "aliyun",
  
  // DeepSeek
  "deepseek-v4-flash": "deepseek",
  "deepseek-v4-pro": "deepseek",
  
  // Kimi (Moonshot)
  "kimi-k2.5": "kimi",
  
  // 即梦
  "seedream-3.0-t2i": "jimeng",
  "seedance2.0": "jimeng",
  
  // Vidu
  "vidu/viduq3-pro_text2video": "vidu",
  
  // 可灵
  "kling/kling-v3-video-generation": "kling",
};
```

### 6.2 平台 Base URL

| 平台 | Base URL |
|------|----------|
| aliyun | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| deepseek | `https://api.deepseek.com/v1` |
| kimi | `https://api.moonshot.cn/v1` |
| jimeng | `https://visual.volcengineapi.com` |

### 6.3 配置平台 Key 的方式

**方式一：环境变量**
```bash
DASHSCOPE_API_KEY=xxx      # 阿里云
DEEPSEEK_API_KEY=xxx       # DeepSeek
KIMI_API_KEY=xxx           # Kimi
```

**方式二：数据库配置**（推荐）
通过 `/api/admin/platform-keys` 接口配置，支持加密存储。

---

## 七、认证与安全

### 7.1 认证方式

支持两种认证方式：
1. **Bearer Token** - `Authorization: Bearer <token>`
2. **x-session Header** - `x-session: <token>`

### 7.2 认证流程

1. 登录 → `/api/auth/login` → 返回 session token
2. 请求携带 token → proxy.ts 校验
3. 校验失败 → 返回 401

### 7.3 开发环境绕过认证

```bash
# .env.local
BYPASS_AUTH=true  # 仅开发环境有效
```

---

## 八、本地开发启动步骤

### 8.1 克隆代码

```bash
git clone <your-repo-url>
cd nvwa-project
```

### 8.2 安装依赖

```bash
pnpm install
```

### 8.3 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local，填入上述环境变量
```

### 8.4 初始化数据库

1. 登录 Supabase 项目
2. 打开 SQL Editor
3. 执行 `supabase-init.sql` 脚本

### 8.5 启动开发服务

```bash
pnpm dev
# 或
coze dev
```

### 8.6 访问应用

```
http://localhost:5000
```

---

## 九、验证生图生视频功能

### 9.1 测试生图

```bash
curl -X POST http://localhost:5000/api/ai/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "一只可爱的猫咪", "model": "wan2.7-image-pro"}'
```

### 9.2 测试生视频

```bash
# 提交任务
curl -X POST http://localhost:5000/api/ai/generate-video \
  -H "Content-Type: application/json" \
  -d '{"prompt": "一只猫咪在奔跑", "model": "seedance2"}'

# 查询状态
curl "http://localhost:5000/api/ai/generate-video?taskId=xxx&model=seedance2"
```

---

## 十、常见问题

### Q1: 生图失败，提示 "API Key 无效"
**A**: 检查 `.env.local` 中的 `DASHSCOPE_API_KEY` 是否正确

### Q2: 数据库连接失败
**A**: 检查 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确

### Q3: 视频生成一直 PENDING
**A**: 视频生成是异步任务，需要轮询查询状态

### Q4: 本地开发需要登录吗？
**A**: 设置 `BYPASS_AUTH=true` 可绕过认证

---

## 附录：文件结构

```
/workspace/projects/
├── .env.local                    # 环境变量配置
├── supabase-init.sql             # 数据库初始化脚本
├── MIGRATION_GUIDE.md            # 本文档
├── src/
│   ├── app/
│   │   ├── api/                  # API 路由
│   │   │   ├── ai/               # AI 相关 API
│   │   │   │   ├── generate-image/
│   │   │   │   └── generate-video/
│   │   │   ├── auth/             # 认证 API
│   │   │   ├── scripts/          # 剧本 API
│   │   │   └── ...
│   │   ├── page.tsx              # 首页
│   │   └── globals.css           # 全局样式
│   ├── lib/
│   │   ├── ai-client.ts          # AI 客户端（核心）
│   │   ├── platform-keys.ts      # 平台 Key 管理
│   │   ├── seedance-adapter.ts   # Seedance 适配器
│   │   ├── jimeng-adapter.ts     # 即梦适配器
│   │   └── ...
│   └── storage/
│       └── database/
│           └── supabase-client.ts # Supabase 客户端
└── ...
```

---

**最后更新**: 2026-05-25
**维护者**: AI Assistant
