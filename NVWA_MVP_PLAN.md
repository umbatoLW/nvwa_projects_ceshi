# NVWA 平台 - MVP开发方案

> 版本：v1.0.0  
> 日期：2026-05-07  
> 状态：开发准备就绪

---

## 1. 项目概述

### 1.1 开发目标

基于「AI大模型短剧平台选型洞察报告」，构建一个完整的AI短剧智创聚合平台。

### 1.2 技术方案

**云端API优先**（2核4G服务器测试阶段）：
- 剧本生成：预留接口，支持多种LLM
- 图像生成：预留接口，支持多种服务
- 视频生成：预留接口，支持多种服务
- 红线检测：预留阿里云内容安全接口

---

## 2. 功能模块

### 2.1 剧本创作模块

```
剧本输入方式：
├── 一句话创意 → AI生成完整剧本
├── 大纲 → AI生成完整剧本
├── 完整剧本 → AI优化/润色
└── 外部剧本 → 上传后自动处理
```

**创作选项：**
- [ ] 仅创意（10%）
- [ ] 完整剧本（100%）
- [ ] AI优化（润色现有剧本）
- [ ] 红线检测（内容安全）

### 2.2 红线检测模块

**检测维度：**

| 检测类型 | 说明 | 参考来源 |
|----------|------|----------|
| 政治敏感 | 涉政内容 | 阿里云内容安全API |
| 暴力血腥 | 暴力场景 | 阿里云内容安全API |
| 低俗色情 | 不良内容 | 阿里云内容安全API |
| 违禁物品 | 赌博/毒品等 | 阿里云内容安全API |
| 版权问题 | 抄袭/盗版 | 文字比对 |

**开源参考：**
- short-drama 的合规审查模块
- AI短剧模型分析数据库v2 的风险提示

### 2.3 分镜拆分模块

```
输入剧本 → 自动分析 → 分镜表格
         → 手动调整
         → 导出Excel
```

**分镜字段：**
- 镜号、时长、画面描述
- 角色、角色描述、角色动作
- 景别、运镜、光影氛围
- 音效、对白、提示词

### 2.4 角色库模块

```
角色管理：
├── 创建角色（名称+描述）
├── 三视图生成（AI生成）
├── 表情包管理
├── 角色一致性锚点
└── 角色库搜索/筛选
```

**角色数据结构：**

```typescript
interface Character {
  id: string;
  name: string;
  description: string;
  appearance: {
    face: string;
    hair: string;
    body: string;
    clothing: string;
  };
  referenceImages: string[];  // 参考图
  threeViews: {            // 三视图
    front: string;
    side: string;
    back: string;
  };
  expressions: {            // 表情包
    happy: string[];
    sad: string[];
    angry: string[];
    neutral: string[];
  };
  consistency: {            // 一致性锚点
    keyFeatures: string[];
    forbiddenActions: string[];
  };
}
```

### 2.5 资产库模块

```
资产分类：
├── 角色库（角色资产）
├── 道具库（道具资产）
├── 场景库（场景资产）
└── 素材库（图片/视频/音频）
```

**资产属性：**

```typescript
interface Asset {
  id: string;
  type: 'character' | 'prop' | 'scene' | 'image' | 'video' | 'audio';
  name: string;
  description?: string;
  tags: string[];
  url: string;
  thumbnail?: string;
  visibility: 'private' | 'team' | 'public';
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.6 工作流模块

**无限画布节点编排：**

```
节点类型：
├── 输入节点
│   ├── 剧本输入
│   ├── 角色输入
│   └── 素材输入
├── 处理节点
│   ├── 剧本创作
│   ├── 剧本拆分
│   ├── 角色提取
│   ├── 内容检测
│   └── 数据转换
├── 生成节点
│   ├── 文生图
│   ├── 图生视频
│   └── 音频生成
└── 输出节点
    ├── 剧本输出
    ├── 分镜表格
    └── 视频导出
```

---

## 3. AI服务接口设计

### 3.1 统一AI服务接口

```typescript
// lib/ai/unified-service.ts

export interface AIConfig {
  // 文本生成
  text?: {
    provider: 'openai' | 'anthropic' | 'zhipu' | 'deepseek' | 'local';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  
  // 图像生成
  image?: {
    provider: 'openai' | 'midjourney' | 'dalle' | 'zhipu' | 'aliyun' | ' volcengine';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  
  // 视频生成
  video?: {
    provider: 'runway' | 'pika' | 'sora' | 'kling' | 'jimeng';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  
  // 内容安全
  safety?: {
    provider: 'aliyun' | 'baidu' | 'tencent';
    apiKey?: string;
    region?: string;
  };
}

// 模型推荐（基于洞察报告）
export const MODEL_RECOMMENDATIONS = {
  // 剧本生成 - 按成本排序
  script: [
    { name: '智谱GLM-4-Flash', cost: 0, quality: 7, provider: 'zhipu' },
    { name: 'DeepSeek-V3', cost: 0.001, quality: 8, provider: 'deepseek' },
    { name: 'GPT-4o', cost: 0.01, quality: 9, provider: 'openai' },
  ],
  
  // 图像生成 - 按性价比排序
  image: [
    { name: 'Nano Banana', cost: 0.065, quality: 8, provider: 'google' },
    { name: '即梦AI/4.0', cost: 0.07, quality: 8, provider: ' volcengine' },
    { name: 'GPT-4o Image', cost: 0.5, quality: 9, provider: 'openai' },
  ],
  
  // 视频生成 - 按实测排序
  video: [
    { name: '可灵3.0 Omni', cost: 0.18, quality: 8, provider: ' volcengine' },
    { name: 'Veo 3.1 Lite', cost: 0.36, quality: 9, provider: 'google' },
    { name: '即梦4.0', cost: 1.0, quality: 9, provider: ' volcengine' },
  ],
};

// 获取推荐模型
export function getRecommendedModel(type: 'script' | 'image' | 'video', priority: 'cost' | 'quality') {
  const models = MODEL_RECOMMENDATIONS[type];
  return priority === 'cost' 
    ? models.sort((a, b) => a.cost - b.cost)[0]
    : models.sort((a, b) => b.quality - a.quality)[0];
}
```

### 3.2 剧本生成服务

```typescript
// lib/ai/script-service.ts

export interface ScriptGenerationOptions {
  // 输入方式
  inputType: 'idea' | 'outline' | 'full';
  content: string;
  
  // 生成选项
  genre?: '都市' | '玄幻' | '甜宠' | '复仇' | '穿越' | '重生' | '悬疑' | '宫斗';
  tone?: '轻松' | '紧张' | '悬疑' | '搞笑' | '感人';
  targetDuration?: number;  // 分钟
  
  // AI配置
  model?: string;
  temperature?: number;
  
  // 功能开关
  enableRedLineCheck?: boolean;
  enableOptimization?: boolean;
}

// 剧本生成
export async function generateScript(options: ScriptGenerationOptions): Promise<ScriptResult> {
  // 1. 如果是创意/大纲，先扩展
  let content = options.content;
  if (options.inputType === 'idea' || options.inputType === 'outline') {
    content = await expandContent(content, options);
  }
  
  // 2. 红线检测
  if (options.enableRedLineCheck) {
    const checkResult = await checkRedLines(content);
    if (!checkResult.pass) {
      return {
        success: false,
        error: '内容包含违规信息',
        checkResult,
      };
    }
  }
  
  // 3. 生成剧本
  const script = await callLLM(content, options);
  
  return {
    success: true,
    script,
  };
}

// 剧本扩展（创意→大纲→完整剧本）
async function expandContent(content: string, options: ScriptGenerationOptions): Promise<string> {
  const prompt = `你是专业的短剧编剧。
根据用户输入的${options.inputType === 'idea' ? '创意' : '大纲'}，扩展为完整的剧本内容。

用户输入：${content}
题材：${options.genre || '都市'}
基调：${options.tone || '轻松'}
目标时长：${options.targetDuration || 5}分钟

请输出完整的剧本内容（包含场景描述、对白、动作等）。`;

  return callLLM(prompt, options);
}

// 红线检测（预留接口）
async function checkRedLines(content: string): Promise<RedLineCheckResult> {
  // TODO: 接入阿里云内容安全API
  // 参考：short-drama 的合规审查模块
  
  return {
    pass: true,
    issues: [],
  };
}
```

### 3.3 分镜拆分服务

```typescript
// lib/ai/storyboard-service.ts

export interface StoryboardSplitOptions {
  script: string;
  targetDuration?: number;
  shotCount?: number;
  style?: '电影感' | '短剧风' | '动画风';
}

export interface Shot {
  id: string;
  number: string;
  duration: string;
  visual: string;
  characters: string;
  characterDesc: string;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  lighting: string;
  emotion: string;
  dialogue?: string;
  shotPrompt: string;
  videoMotion: string;
}

// 分镜拆分
export async function splitToShots(options: StoryboardSplitOptions): Promise<Shot[]> {
  const prompt = buildShotPrompt(options);
  const response = await callLLM(prompt);
  return parseShotResponse(response);
}

// 构建分镜提示词
function buildShotPrompt(options: StoryboardSplitOptions): string {
  return `你是专业的短剧分镜师。

请根据以下剧本内容，拆分成详细的分镜脚本：

剧本内容：
${options.script}

要求：
- 目标时长：${options.targetDuration || 5}分钟
- 镜头数量：${options.shotCount || 8-12}个
- 风格：${options.style || '短剧风'}

输出JSON数组格式：
[
  {
    "number": "01",
    "duration": "15s",
    "visual": "画面描述（40字内）",
    "characters": "角色名",
    "characterDesc": "角色描述",
    "shotType": "景别",
    "cameraAngle": "角度",
    "cameraMovement": "运镜",
    "lighting": "光影氛围",
    "emotion": "情绪",
    "dialogue": "对白",
    "shotPrompt": "AI生图提示词",
    "videoMotion": "视频运镜提示词"
  }
]`;
}
```

### 3.4 角色生成服务

```typescript
// lib/ai/character-service.ts

export interface CharacterGenerationOptions {
  name: string;
  description: string;
  style?: '写实' | '动漫' | '3D';
  generateThreeViews?: boolean;
  generateExpressions?: boolean;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  referenceImage?: string;
  threeViews?: {
    front: string;
    side: string;
    back: string;
  };
  expressions?: {
    happy: string[];
    sad: string[];
    angry: string[];
    neutral: string[];
  };
}

// 生成角色
export async function generateCharacter(options: CharacterGenerationOptions): Promise<Character> {
  // 1. 生成参考提示词
  const prompt = buildCharacterPrompt(options);
  
  // 2. 生成参考图
  const referenceImage = await generateImage(prompt);
  
  // 3. 生成三视图（如果需要）
  let threeViews;
  if (options.generateThreeViews) {
    threeViews = await generateThreeViews(options);
  }
  
  // 4. 生成表情包（如果需要）
  let expressions;
  if (options.generateExpressions) {
    expressions = await generateExpressions(options);
  }
  
  return {
    id: generateId(),
    name: options.name,
    description: options.description,
    referenceImage,
    threeViews,
    expressions,
  };
}

// 构建角色提示词
function buildCharacterPrompt(options: CharacterGenerationOptions): string {
  return `${options.style === '写实' ? '写实风格' : options.style === '动漫' ? '动漫风格' : '3D风格'}
角色：${options.name}
描述：${options.description}

请生成一张角色全身图，要求：
- 正面站立姿势
- 清晰的五官特征
- 统一的服装风格
- 适合作为AI生成的参考图`;
}

// 生成三视图
async function generateThreeViews(options: CharacterGenerationOptions): Promise<Character['threeViews']> {
  const views = ['front', 'side', 'back'];
  const results = {};
  
  for (const view of views) {
    const prompt = `角色${options.name}的${view === 'front' ? '正面' : view === 'side' ? '侧面' : '背面'}视图
    描述：${options.description}`;
    results[view] = await generateImage(prompt);
  }
  
  return results as Character['threeViews'];
}

// 生成表情包
async function generateExpressions(options: CharacterGenerationOptions): Promise<Character['expressions']> {
  const emotions = ['happy', 'sad', 'angry', 'neutral'];
  const emotionNames = { happy: '开心', sad: '悲伤', angry: '愤怒', neutral: '平静' };
  const results = {};
  
  for (const emotion of emotions) {
    const prompt = `角色${options.name}的${emotionNames[emotion]}表情
    描述：${options.description}
    表情：${emotionNames[emotion]}`;
    results[emotion] = [await generateImage(prompt)];
  }
  
  return results as Character['expressions'];
}
```

### 3.5 文生图服务

```typescript
// lib/ai/image-service.ts

export interface ImageGenerationOptions {
  prompt: string;
  model?: 'nano-banana' | 'jimeng' | 'dalle' | 'sd';
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: string;
}

// 图像生成
export async function generateImage(options: ImageGenerationOptions): Promise<string> {
  // TODO: 根据配置的provider调用对应服务
  
  switch (options.model) {
    case 'nano-banana':
      return callGoogleImageAPI(options);
    case 'jimeng':
      return callVolcEngineImageAPI(options);
    case 'dalle':
      return callOpenAIImageAPI(options);
    default:
      return callDefaultImageAPI(options);
  }
}
```

### 3.6 图生视频服务

```typescript
// lib/ai/video-service.ts

export interface VideoGenerationOptions {
  prompt?: string;
  firstFrameUrl?: string;
  model?: 'kling' | 'jimeng' | 'veo' | 'pika';
  duration?: number;  // 秒
  resolution?: '720p' | '1080p';
  ratio?: '16:9' | '9:16' | '1:1';
}

// 视频生成
export async function generateVideo(options: VideoGenerationOptions): Promise<string> {
  // TODO: 根据配置的provider调用对应服务
  
  switch (options.model) {
    case 'kling':
      return callKlingVideoAPI(options);
    case 'jimeng':
      return callJimengVideoAPI(options);
    case 'veo':
      return callVeoVideoAPI(options);
    default:
      return callDefaultVideoAPI(options);
  }
}
```

---

## 4. 数据库设计

### 4.1 Prisma Schema

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

// 用户
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String?
  avatarUrl     String?
  role          String    @default("user")
  points        Int       @default(1000)  // 初始积分
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  projects      Project[]
  characters    Character[]
  assets       Asset[]
  teams        TeamMember[]
}

// 项目
model Project {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  name        String
  description String?
  genre       String?
  status      String    @default("draft")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  scripts     Script[]
  workflows   Workflow[]
  characters  Character[]
}

// 剧本
model Script {
  id          String    @id @default(uuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id])
  
  title       String
  content     String    // 完整剧本内容
  outline     String?   // 大纲
  inputType   String    // 'idea' | 'outline' | 'full'
  
  // 元数据
  genre       String?
  tone        String?
  duration    Int?      // 分钟
  metadata    String?   // JSON
  
  // 状态
  redLineCheck Boolean  @default(false)
  checkResult String?   // JSON
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  scenes      Scene[]
  shots       Shot[]
}

// 场景
model Scene {
  id        String   @id @default(uuid())
  scriptId  String
  script    Script   @relation(fields: [scriptId], references: [id])
  number    Int
  title     String?
  location  String?
  timeOfDay String?
  content   String?
}

// 分镜
model Shot {
  id              String   @id @default(uuid())
  scriptId        String
  script          Script   @relation(fields: [scriptId], references: [id])
  
  number          String   // "01", "02"
  duration        String?   // "15s"
  shotType        String?   // "中景"
  cameraAngle     String?   // "平视"
  cameraMovement  String?   // "推"
  
  visual          String?   // 画面描述
  characters      String?   // 角色
  characterDesc   String?   // 角色描述
  characterAction String?   // 角色动作
  emotion         String?   // 情绪
  lighting        String?   // 光影
  dialogue        String?   // 对白
  shotPrompt      String?   // AI生图提示词
  videoMotion     String?   // 运镜提示词
  
  // 生成状态
  imageUrl        String?
  videoUrl       String?
  status         String    @default("pending")
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// 角色
model Character {
  id              String   @id @default(uuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  userId          String
  user            User    @relation(fields: [userId], references: [id])
  
  name            String
  description     String?
  type            String   @default("role")  // 'role' | 'prop' | 'scene'
  
  // 一致性相关
  appearance      String?   // JSON {face, hair, body, clothing}
  referenceImages String?   // JSON
  threeViews      String?   // JSON
  expressions     String?   // JSON
  
  // 可见性
  visibility      String    @default("private")  // 'private' | 'team' | 'public'
  
  // 统计
  usageCount      Int       @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// 资产
model Asset {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  type        String   // 'character' | 'prop' | 'scene' | 'image' | 'video' | 'audio'
  name        String
  description String?
  tags        String?   // JSON array
  url         String
  thumbnail   String?
  
  // 元数据
  metadata    String?   // JSON
  
  visibility  String    @default("private")
  usageCount Int       @default(0)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// 工作流
model Workflow {
  id         String   @id @default(uuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id])
  
  name       String
  nodes      String   // JSON array
  edges      String   // JSON array
  isTemplate Boolean  @default(false)
  
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

// 团队
model Team {
  id        String       @id @default(uuid())
  name      String
  ownerId   String
  createdAt DateTime     @default(now())
  
  members   TeamMember[]
}

// 团队成员
model TeamMember {
  id          String   @id @default(uuid())
  teamId      String
  team        Team    @relation(fields: [teamId], references: [id])
  userId      String
  user        User    @relation(fields: [userId], references: [id])
  
  role        String   @default("member")  // 'owner' | 'admin' | 'member'
  permissions String   // JSON array
  
  joinedAt    DateTime  @default(now())
  
  @@unique([teamId, userId])
}

// 积分记录
model PointsTransaction {
  id          String   @id @default(uuid())
  userId      String
  
  amount      Int      // 正数=获得，负数=消耗
  type        String   // 'earn' | 'spend' | 'refund'
  description String?
  
  createdAt   DateTime  @default(now())
}
```

---

## 5. API路由设计

### 5.1 剧本相关

```
POST   /api/script/generate      生成剧本
POST   /api/script/split       拆分剧本
POST   /api/script/check       红线检测
GET    /api/scripts             获取剧本列表
GET    /api/script/:id        获取剧本详情
PUT    /api/script/:id         更新剧本
DELETE /api/script/:id         删除剧本
```

### 5.2 分镜相关

```
GET    /api/scripts/:id/shots      获取分镜列表
PUT    /api/shots/:id              更新分镜
POST   /api/shots/:id/generate     生成分镜图片
POST   /api/shots/:id/generate-video  生成分镜视频
```

### 5.3 角色相关

```
POST   /api/characters/generate     生成角色
GET    /api/characters             获取角色列表
GET    /api/characters/:id         获取角色详情
PUT    /api/characters/:id         更新角色
DELETE /api/characters/:id         删除角色
POST   /api/characters/:id/three-views  生成三视图
```

### 5.4 资产相关

```
POST   /api/assets/upload           上传资产
GET    /api/assets                 获取资产列表
GET    /api/assets/:id             获取资产详情
PUT    /api/assets/:id             更新资产
DELETE /api/assets/:id             删除资产
GET    /api/assets/types           获取资产类型
```

### 5.5 工作流相关

```
POST   /api/workflows              创建工作流
GET    /api/workflows              获取工作流列表
GET    /api/workflows/:id          获取工作流详情
PUT    /api/workflows/:id          更新工作流
DELETE /api/workflows/:id          删除工作流
POST   /api/workflows/:id/execute  执行工作流
```

---

## 6. 开发计划

### 6.1 Day 1: MVP核心

| 时间 | 任务 | 说明 |
|------|------|------|
| 上午 | 项目初始化 | Next.js + NestJS + Prisma |
| 上午 | 数据库设计 | 创建表结构 |
| 下午 | 剧本生成模块 | 输入→生成→保存 |
| 下午 | 分镜拆分模块 | 剧本→分镜表格 |
| 晚上 | 角色库基础 | CRUD + 简单生成 |

### 6.2 Day 2: AI集成

| 时间 | 任务 | 说明 |
|------|------|------|
| 上午 | AI服务接口 | 预留接口 |
| 上午 | 文生图集成 | 即梦/可灵API |
| 下午 | 图生视频集成 | 可灵API |
| 下午 | 模型推荐 | 洞察报告整合 |

### 6.3 Day 3: 用户系统

| 时间 | 任务 | 说明 |
|------|------|------|
| 上午 | 用户注册/登录 | JWT认证 |
| 上午 | 积分系统 | 积分消耗/记录 |
| 下午 | 项目管理 | CRUD |
| 下午 | 资产库完善 | 多类型支持 |

### 6.4 Day 4+: 高级功能

| 时间 | 任务 | 说明 |
|------|------|------|
| Day 4 | 工作流画布 | React Flow |
| Day 5 | 团队协作 | 团队管理 |
| Day 6 | 权限系统 | RBAC |
| Day 7 | 优化完善 | 细节打磨 |

---

## 7. 配置示例

### 7.1 .env.example

```env
# 数据库
DATABASE_URL="file:./dev.db"

# JWT密钥
JWT_SECRET="your-secret-key"

# AI服务配置（预留接口）
## 文本生成
TEXT_PROVIDER="zhipu"
ZHIPU_API_KEY=""
DEEPSEEK_API_KEY=""

## 图像生成
IMAGE_PROVIDER="aliyun"
ALIYUN_IMAGE_API_KEY=""
JIMENG_API_KEY=""

## 视频生成
VIDEO_PROVIDER="volcengine"
KILING_API_KEY=""
JIMENG_VIDEO_API_KEY=""

## 内容安全
SAFETY_PROVIDER="aliyun"
ALIYUN_SAFETY_API_KEY=""
ALIYUN_SAFETY_REGION="cn-shanghai"

# 存储
OSS_ACCESS_KEY_ID=""
OSS_ACCESS_KEY_SECRET=""
OSS_BUCKET=""
OSS_REGION=""
```

---

**文档更新时间：2026-05-07**
