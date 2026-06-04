
# 女娲(NVWA)AI短剧智创聚合平台 — Coze AI编程助手 Phase 1 开发指令

> 前置条件：Phase 0 已验收通过，hotfix/p0-emergency 已合并到 main，已打 tag v0.9.1-hotfix
> 本阶段目标：建立稳定的技术底座，为后续功能开发铺路
> 预计工期：3-5天

---

## 一、你的角色与能力边界（与Phase 0一致）

**你是**：精通 Next.js 16 App Router + TypeScript 5.x + Drizzle ORM + Supabase + Redis + Tailwind CSS v4 + shadcn/ui 的高级全栈工程师。

**你的任务**：在当前已合并Phase 0的main分支基线上，按清单执行Phase 1基础设施加固。每个任务完成后必须提供**可验证的代码 diff + 测试用例 + 回滚命令**。

**你不得**：
- 引入新的UI框架（禁止Vue/Element Plus/Gradio等）
- 修改现有shadcn/ui主题和色彩变量
- 改变现有字体栈和布局网格
- 在一个阶段内同时修改多个功能域（禁止边开发边修复）
- 删除任何现有功能代码（只能标记为@deprecated，保留fallback）
- 改变现有API路由的接口契约（输入输出格式必须和Phase 0一致）

---

## 二、分支策略

```bash
# 从main切出Phase 1分支
git checkout main
git pull origin main
git checkout -b feature/p1-infrastructure
```

**提交格式**：`[P1-N] type: 简短描述`
- 例：`[P1-1] feat: 补全Drizzle ORM schema（全局素材库/角色多形象/用户设置）`
- 例：`[P1-2] feat: 接入Redis替换内存限流器`
- 例：`[P1-3] refactor: 统一错误处理中间件`

**每个任务独立commit**，禁止一个commit改多个不相关文件。

---

## 三、基线保护（Phase 0的10项功能+Phase 1新增功能）

Phase 1结束后，以下功能必须**100%可用**：

### Phase 0基线（必须保留）
1. `POST /api/ai/generate-full-script` — 流式输出JSON结构剧本
2. `POST /api/ai/split-scenes` — 输出分镜JSON数组
3. `POST /api/ai/extract-characters` — 输出角色列表
4. `POST /api/ai/extract-scenes` — 输出场景列表
5. `POST /api/ai/generate-image` — 输出图片URL
6. `POST /api/ai/generate-video` — 输出视频URL/taskId
7. `POST /api/ai/generate-character-views` — 输出三视图
8. `POST /api/ai/compliance-check` — 输出检测结果
9. `POST /api/ai/consistency-check` — 输出合并建议
10. `GET /workspace` — React Flow画布可渲染

### Phase 1新增基线（新增功能必须可用）
11. `POST /api/ai/generate-full-script` — JSON解析不再因LLM输出格式偏差而崩溃（jsonrepair兜底）
12. `POST /api/ai/split-scenes` — 同上，JSON解析鲁棒
13. `POST /api/ai/extract-characters` — 同上
14. `POST /api/ai/extract-scenes` — 同上
15. `POST /api/ai/batch-extract` — 并发执行，非串行for循环
16. `POST /api/ai/edit-video` — Redis限流生效，多实例共享
17. `POST /api/ai/generate-3d` — Redis限流生效
18. `GET /workspace` — 页面组件拆分后功能无损，加载更快

---

## 四、Phase 1 任务清单

---

### 任务 P1-1：补全 Drizzle ORM Schema（参考 drama-workshop）

**问题描述**：
- `src/lib/db/schema.ts` 多次请求失败，可能不完整或损坏
- 缺少全局素材库表、角色多形象表、用户设置表、备选帧表、Agent记忆表、Skill文件表
- 没有数据库迁移脚本，Schema可能未实际部署
- `src/lib/db/index.ts` 同样获取失败，数据库连接配置不明

**修复步骤**：

#### 1.1 检查当前schema.ts状态

```bash
# 检查文件是否存在且完整
ls -la src/lib/db/schema.ts
wc -l src/lib/db/schema.ts
head -50 src/lib/db/schema.ts
tail -50 src/lib/db/schema.ts
```

如果文件不存在或为空，从Git历史恢复：
```bash
git log --oneline -- src/lib/db/schema.ts | head -5
# 找到最近可用版本
git show <hash>:src/lib/db/schema.ts > src/lib/db/schema.ts.recovered
# 对比后恢复
cp src/lib/db/schema.ts.recovered src/lib/db/schema.ts
```

#### 1.2 在现有Schema基础上新增表（不删除现有表）

打开 `src/lib/db/schema.ts`，在现有表定义之后追加以下表：

```typescript
// ============================================
// Phase 1 新增表：全局素材库（参考LocalMiniDrama）
// ============================================

export const globalAssets = sqliteTable('global_assets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type', { enum: ['character', 'scene', 'prop'] }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  tags: text('tags'), // JSON数组字符串
  usageCount: integer('usage_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const globalAssetsRelations = relations(globalAssets, ({ one }) => ({
  user: one(users, { fields: [globalAssets.userId], references: [users.id] }),
}));

// ============================================
// Phase 1 新增表：项目引用全局素材（LocalMiniDrama）
// ============================================

export const projectAssetRefs = sqliteTable('project_asset_refs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  globalAssetId: text('global_asset_id').notNull(),
  role: text('role'), // 在项目中的角色名称
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const projectAssetRefsRelations = relations(projectAssetRefs, ({ one }) => ({
  project: one(projects, { fields: [projectAssetRefs.projectId], references: [projects.id] }),
  globalAsset: one(globalAssets, { fields: [projectAssetRefs.globalAssetId], references: [globalAssets.id] }),
}));

// ============================================
// Phase 1 新增表：角色多形象（参考drama-workshop）
// ============================================

export const characterAppearances = sqliteTable('character_appearances', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull(),
  appearanceType: text('appearance_type', { 
    enum: ['front', 'side', 'back', 'expression', 'action', 'grid_panel'] 
  }).notNull(),
  imageUrl: text('image_url').notNull(),
  description: text('description'),
  embedding: text('embedding'), // 序列化向量（pgvector阶段改为vector类型）
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const characterAppearancesRelations = relations(characterAppearances, ({ one }) => ({
  character: one(characters, { fields: [characterAppearances.characterId], references: [characters.id] }),
}));

// ============================================
// Phase 1 新增表：用户级AI配置（参考drama-workshop）
// ============================================

export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  llmModel: text('llm_model').default('qwen-plus'),
  imageModel: text('image_model').default('wanxiang-v2.1'),
  videoModel: text('video_model').default('seedance-2.0'),
  visualStyle: text('visual_style').default('cinematic'),
  defaultTone: text('default_tone').default('dramatic'),
  defaultGenre: text('default_genre').default('都市甜宠'),
  defaultTotalEpisodes: integer('default_total_episodes').default(60),
  defaultEpisodeDuration: integer('default_episode_duration').default(90), // 秒
  config: text('config'), // JSON字符串，扩展配置
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

// ============================================
// Phase 1 新增表：备选帧（参考ViMax）
// ============================================

export const alternativeFrames = sqliteTable('alternative_frames', {
  id: text('id').primaryKey(),
  prompt: text('prompt').notNull(),
  imageUrl: text('image_url').notNull(),
  overallScore: real('overall_score'),
  qualityScores: text('quality_scores'), // JSON: {aesthetic, consistency, promptAlignment, composition}
  selectionStrategy: text('selection_strategy', { enum: ['best_overall', 'best_consistency', 'best_aesthetic'] }),
  shotId: text('shot_id'), // 关联的分镜ID
  projectId: text('project_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================
// Phase 1 新增表：Agent记忆（参考Toonflow）
// ============================================

export const agentMemories = sqliteTable('agent_memories', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  agentType: text('agent_type', { 
    enum: ['script', 'character', 'storyboard', 'image', 'video', 'audio', 'compose', 'summary'] 
  }).notNull(),
  content: text('content').notNull(),
  embedding: text('embedding'), // 序列化向量
  memoryType: text('memory_type', { enum: ['short_term', 'long_term', 'summary'] }).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  importance: real('importance').default(0.5), // 0-1
});

// ============================================
// Phase 1 新增表：Skill文件（参考Toonflow）
// ============================================

export const skillFiles = sqliteTable('skill_files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  agentType: text('agent_type', { 
    enum: ['script', 'character', 'storyboard', 'image', 'video', 'audio', 'compliance', 'review'] 
  }).notNull(),
  version: integer('version').notNull(),
  content: text('content').notNull(), // Markdown格式
  variables: text('variables'), // JSON数组：模板变量名列表
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================
// Phase 1 新增表：项目模板（参考AI Story）
// ============================================

export const projectTemplates = sqliteTable('project_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config').notNull(), // JSON: {llmModel, imageModel, videoModel, visualStyle, tone, genre, totalEpisodes}
  characterTemplates: text('character_templates'), // JSON: Character[]
  promptTemplates: text('prompt_templates'), // JSON: Record<string, string>
  createdBy: text('created_by').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  usageCount: integer('usage_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

#### 1.3 确保现有表关系正确

检查现有表（users/projects/scripts/scenes/shots/characters/assets/workflows/teams/team_members/points_transactions）的关系定义是否完整。如果缺少relations定义，补充：

```typescript
// 确保所有表都有relations定义（示例）
export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  scripts: many(scripts),
  scenes: many(scenes),
  shots: many(shots),
  characters: many(characters),
  assets: many(assets),
  workflows: many(workflows),
}));

// 类似补充其他表的relations...
```

#### 1.4 创建数据库迁移脚本

在 `src/lib/db/migrations/` 目录下创建迁移文件（如果不存在则创建目录）：

```bash
mkdir -p src/lib/db/migrations
```

创建 `src/lib/db/migrations/001_add_phase1_tables.sql`：

```sql
-- Phase 1 迁移：新增全局素材库、角色多形象、用户设置、备选帧、Agent记忆、Skill文件、项目模板

-- 全局素材库
CREATE TABLE IF NOT EXISTS global_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('character', 'scene', 'prop')),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  tags TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_global_assets_user ON global_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_global_assets_type ON global_assets(type);

-- 项目引用全局素材
CREATE TABLE IF NOT EXISTS project_asset_refs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  global_asset_id TEXT NOT NULL,
  role TEXT,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_project_asset_refs_project ON project_asset_refs(project_id);

-- 角色多形象
CREATE TABLE IF NOT EXISTS character_appearances (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  appearance_type TEXT NOT NULL CHECK(appearance_type IN ('front', 'side', 'back', 'expression', 'action', 'grid_panel')),
  image_url TEXT NOT NULL,
  description TEXT,
  embedding TEXT,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_character_appearances_character ON character_appearances(character_id);

-- 用户级AI配置
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  llm_model TEXT DEFAULT 'qwen-plus',
  image_model TEXT DEFAULT 'wanxiang-v2.1',
  video_model TEXT DEFAULT 'seedance-2.0',
  visual_style TEXT DEFAULT 'cinematic',
  default_tone TEXT DEFAULT 'dramatic',
  default_genre TEXT DEFAULT '都市甜宠',
  default_total_episodes INTEGER DEFAULT 60,
  default_episode_duration INTEGER DEFAULT 90,
  config TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- 备选帧
CREATE TABLE IF NOT EXISTS alternative_frames (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  overall_score REAL,
  quality_scores TEXT,
  selection_strategy TEXT CHECK(selection_strategy IN ('best_overall', 'best_consistency', 'best_aesthetic')),
  shot_id TEXT,
  project_id TEXT NOT NULL,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_alternative_frames_project ON alternative_frames(project_id);
CREATE INDEX IF NOT EXISTS idx_alternative_frames_shot ON alternative_frames(shot_id);

-- Agent记忆
CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_type TEXT NOT NULL CHECK(agent_type IN ('script', 'character', 'storyboard', 'image', 'video', 'audio', 'compose', 'summary')),
  content TEXT NOT NULL,
  embedding TEXT,
  memory_type TEXT NOT NULL CHECK(memory_type IN ('short_term', 'long_term', 'summary')),
  timestamp INTEGER,
  importance REAL DEFAULT 0.5
);
CREATE INDEX IF NOT EXISTS idx_agent_memories_project ON agent_memories(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON agent_memories(agent_type);

-- Skill文件
CREATE TABLE IF NOT EXISTS skill_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  agent_type TEXT NOT NULL CHECK(agent_type IN ('script', 'character', 'storyboard', 'image', 'video', 'audio', 'compliance', 'review')),
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  variables TEXT,
  is_default INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_skill_files_agent ON skill_files(agent_type);

-- 项目模板
CREATE TABLE IF NOT EXISTS project_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config TEXT NOT NULL,
  character_templates TEXT,
  prompt_templates TEXT,
  created_by TEXT NOT NULL,
  is_public INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_project_templates_public ON project_templates(is_public);
```

创建回滚脚本 `src/lib/db/migrations/001_add_phase1_tables_rollback.sql`：

```sql
-- Phase 1 回滚：删除新增表（谨慎执行，会丢失数据）
DROP TABLE IF EXISTS project_templates;
DROP TABLE IF EXISTS skill_files;
DROP TABLE IF EXISTS agent_memories;
DROP TABLE IF EXISTS alternative_frames;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS character_appearances;
DROP TABLE IF EXISTS project_asset_refs;
DROP TABLE IF EXISTS global_assets;
```

#### 1.5 修复 src/lib/db/index.ts

打开 `src/lib/db/index.ts`，确保：

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
// 或 import { drizzle } from 'drizzle-orm/postgres-js';
// 根据实际使用的数据库驱动

import * as schema from './schema';

// 确保导出所有表和关系
export const db = drizzle(process.env.DATABASE_URL!, { schema });

// 导出schema供外部使用
export * from './schema';
```

如果使用的是Supabase/PostgreSQL，确保连接字符串正确：

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || process.env.COZE_SUPABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or COZE_SUPABASE_URL is required');
}

const client = postgres(connectionString, { 
  prepare: false, // 某些环境下需要
  max: 10 // 连接池大小
});

export const db = drizzle(client, { schema });
export * from './schema';
```

#### 1.6 执行迁移

```bash
# 如果是SQLite（better-sqlite3）
# 手动执行SQL或使用drizzle-kit

# 如果是PostgreSQL/Supabase
# 在Supabase SQL Editor中执行迁移脚本
# 或在本地开发环境执行

# 验证表是否创建成功
# 通过drizzle-kit生成迁移（如果配置了）
npx drizzle-kit generate
npx drizzle-kit migrate
```

**验收标准**：
```bash
# 1. TypeScript编译通过
pnpm build
# 预期：0错误

# 2. 数据库连接正常
# 在任意API路由中添加测试：
# const result = await db.select().from(globalAssets).limit(1);
# 不报错即正常

# 3. 新表可通过Drizzle ORM查询
# 验证方式：启动开发服务器，访问任意页面不报错
pnpm dev
# 预期：无数据库连接错误
```

**回滚命令**：
```bash
# 数据库回滚（在Supabase SQL Editor或本地执行rollback SQL）
# 代码回滚
git revert <commit-hash-of-p1-1>
```

---

### 任务 P1-2：接入 Redis，替换内存限流器（参考 AI Story 架构）

**问题描述**：
- `ai-rate-limiter.ts` 使用 `Map` 存储限流数据，多实例部署时不共享，用户可绕过限流
- `cost-alert.ts` 使用内存数组 `costRecords`，重启后成本统计清零
- `circuit-breaker.ts` 使用内存 `Map`，分布式部署失效
- 服务重启后所有限流/成本/熔断状态丢失

**修复步骤**：

#### 2.1 安装依赖

```bash
pnpm add redis ioredis
# 或 pnpm add @upstash/redis（如果使用Upstash Serverless Redis）
```

#### 2.2 创建 Redis 客户端配置

创建 `src/lib/redis.ts`：

```typescript
import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

if (!redisUrl) {
  console.warn('REDIS_URL not configured, falling back to memory storage (not recommended for production)');
}

export const redis = redisUrl ? new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
}) : null;

// 健康检查
export async function checkRedisHealth(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

// 优雅关闭
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
  }
}
```

在 `.env.example` 和 `.env.local` 中添加：
```
REDIS_URL=redis://localhost:6379
# 或 UPSTASH_REDIS_REST_URL=https://... (如果使用Upstash)
```

#### 2.3 重构 ai-rate-limiter.ts

打开 `src/lib/security/ai-rate-limiter.ts`，改为Redis存储：

```typescript
import { redis } from '@/lib/redis';

interface RateLimitConfig {
  windowMs: number;   // 时间窗口（毫秒）
  maxRequests: number; // 窗口内最大请求数
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

const DEFAULT_CONFIG: Record<string, RateLimitConfig> = {
  'generate-full-script': { windowMs: 60 * 1000, maxRequests: 5 },      // 1分钟5次
  'generate-image': { windowMs: 60 * 1000, maxRequests: 20 },           // 1分钟20次
  'generate-video': { windowMs: 60 * 1000, maxRequests: 10 },         // 1分钟10次
  'generate-3d': { windowMs: 5 * 60 * 1000, maxRequests: 3 },          // 5分钟3次
  'edit-video': { windowMs: 60 * 1000, maxRequests: 5 },
  'compliance-check': { windowMs: 60 * 1000, maxRequests: 30 },
  'chat': { windowMs: 60 * 1000, maxRequests: 60 },
  'default': { windowMs: 60 * 1000, maxRequests: 30 },
};

export async function rateLimit(
  userId: string,
  endpoint: string,
  customConfig?: RateLimitConfig
): Promise<RateLimitResult> {
  const config = customConfig || DEFAULT_CONFIG[endpoint] || DEFAULT_CONFIG['default'];
  const key = `rate_limit:${userId}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // 如果Redis不可用，降级到内存（仅开发环境）
  if (!redis) {
    console.warn('Redis unavailable, using memory fallback for rate limiting');
    return memoryRateLimit(userId, endpoint, config);
  }

  try {
    // 使用Redis Sorted Set实现滑动窗口限流
    // 1. 清理过期请求
    await redis.zremrangebyscore(key, 0, windowStart);

    // 2. 获取当前窗口内的请求数
    const currentCount = await redis.zcard(key);

    if (currentCount >= config.maxRequests) {
      // 获取最早请求的过期时间
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldest.length > 1 ? parseInt(oldest[1]) + config.windowMs : now + config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
      };
    }

    // 3. 记录本次请求
    await redis.zadd(key, now, `${now}:${Math.random()}`);
    // 4. 设置key过期时间（窗口的2倍，确保清理）
    await redis.pexpire(key, config.windowMs * 2);

    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetTime: now + config.windowMs,
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Redis故障时放行（避免完全阻断服务）
    return {
      allowed: true,
      remaining: 0,
      resetTime: now + config.windowMs,
    };
  }
}

// 内存降级（仅开发环境使用）
const memoryStore = new Map<string, number[]>();

function memoryRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = memoryStore.get(key) || [];
  const validTimestamps = timestamps.filter(t => t > windowStart);

  if (validTimestamps.length >= config.maxRequests) {
    const resetTime = validTimestamps[0] + config.windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000),
    };
  }

  validTimestamps.push(now);
  memoryStore.set(key, validTimestamps);

  return {
    allowed: true,
    remaining: config.maxRequests - validTimestamps.length,
    resetTime: now + config.windowMs,
  };
}

// 获取限流状态（用于前端展示）
export async function getRateLimitStatus(
  userId: string,
  endpoint: string
): Promise<{ remaining: number; resetTime: number }> {
  const config = DEFAULT_CONFIG[endpoint] || DEFAULT_CONFIG['default'];
  const key = `rate_limit:${userId}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  if (!redis) {
    const timestamps = memoryStore.get(`${userId}:${endpoint}`) || [];
    const validCount = timestamps.filter(t => t > windowStart).length;
    return {
      remaining: Math.max(0, config.maxRequests - validCount),
      resetTime: timestamps.length > 0 ? timestamps[0] + config.windowMs : now + config.windowMs,
    };
  }

  try {
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);
    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');

    return {
      remaining: Math.max(0, config.maxRequests - count),
      resetTime: oldest.length > 1 ? parseInt(oldest[1]) + config.windowMs : now + config.windowMs,
    };
  } catch {
    return { remaining: config.maxRequests, resetTime: now + config.windowMs };
  }
}
```

#### 2.4 重构 cost-alert.ts

打开 `src/lib/security/cost-alert.ts`，改为Redis存储：

```typescript
import { redis } from '@/lib/redis';

interface CostRecord {
  userId: string;
  model: string;
  cost: number;
  timestamp: number;
  endpoint: string;
}

interface CostAlertConfig {
  dailyBudget: number;      // 每日预算上限（元）
  hourlyBudget: number;     // 每小时预算上限
  alertThreshold: number;   // 预警阈值（预算的百分比，如0.8表示80%）
}

const DEFAULT_COST_CONFIG: CostAlertConfig = {
  dailyBudget: 500,    // 每日500元
  hourlyBudget: 100,   // 每小时100元
  alertThreshold: 0.8, // 80%预警
};

// 记录成本（所有API路由在成功调用后调用此函数）
export async function recordCost(
  userId: string,
  model: string,
  cost: number,
  endpoint: string
): Promise<{ alert: boolean; message?: string }> {
  if (!redis) {
    console.warn('Redis unavailable, cost tracking disabled');
    return { alert: false };
  }

  const now = Date.now();
  const hourKey = `cost:${userId}:${new Date().toISOString().slice(0, 13)}`; // 精确到小时
  const dayKey = `cost:${userId}:${new Date().toISOString().slice(0, 10)}`;   // 精确到天

  try {
    // 记录到小时和天的Sorted Set
    const record: CostRecord = { userId, model, cost, timestamp: now, endpoint };

    await Promise.all([
      redis.zadd(hourKey, now, JSON.stringify(record)),
      redis.zadd(dayKey, now, JSON.stringify(record)),
      // 设置过期时间（小时key保留2小时，天key保留2天）
      redis.pexpire(hourKey, 2 * 60 * 60 * 1000),
      redis.pexpire(dayKey, 2 * 24 * 60 * 60 * 1000),
    ]);

    // 计算当前小时和当天累计成本
    const [hourTotal, dayTotal] = await Promise.all([
      calculateTotalCost(hourKey),
      calculateTotalCost(dayKey),
    ]);

    // 检查预警
    const config = DEFAULT_COST_CONFIG;
    const alerts = [];

    if (hourTotal >= config.hourlyBudget * config.alertThreshold) {
      alerts.push(`小时成本预警：${hourTotal.toFixed(2)}元/${config.hourlyBudget}元 (${((hourTotal/config.hourlyBudget)*100).toFixed(0)}%)`);
    }
    if (dayTotal >= config.dailyBudget * config.alertThreshold) {
      alerts.push(`日成本预警：${dayTotal.toFixed(2)}元/${config.dailyBudget}元 (${((dayTotal/config.dailyBudget)*100).toFixed(0)}%)`);
    }

    // 检查熔断
    if (hourTotal >= config.hourlyBudget || dayTotal >= config.dailyBudget) {
      // 触发熔断，记录到熔断状态
      await redis.setex(`circuit_breaker:${userId}`, 3600, 'true'); // 熔断1小时
      alerts.push('成本熔断已触发，服务暂停1小时');
      return { alert: true, message: alerts.join('; ') };
    }

    if (alerts.length > 0) {
      return { alert: true, message: alerts.join('; ') };
    }

    return { alert: false };
  } catch (error) {
    console.error('Cost tracking error:', error);
    return { alert: false };
  }
}

async function calculateTotalCost(key: string): Promise<number> {
  if (!redis) return 0;

  try {
    const records = await redis.zrange(key, 0, -1);
    return records.reduce((total, record) => {
      try {
        const parsed = JSON.parse(record);
        return total + (parsed.cost || 0);
      } catch {
        return total;
      }
    }, 0);
  } catch {
    return 0;
  }
}

// 获取成本统计（用于管理后台展示）
export async function getCostStats(userId: string): Promise<{
  hourTotal: number;
  dayTotal: number;
  hourBudget: number;
  dayBudget: number;
  alert: boolean;
}> {
  const config = DEFAULT_COST_CONFIG;
  const hourKey = `cost:${userId}:${new Date().toISOString().slice(0, 13)}`;
  const dayKey = `cost:${userId}:${new Date().toISOString().slice(0, 10)}`;

  const [hourTotal, dayTotal] = await Promise.all([
    calculateTotalCost(hourKey),
    calculateTotalCost(dayKey),
  ]);

  return {
    hourTotal,
    dayTotal,
    hourBudget: config.hourlyBudget,
    dayBudget: config.dailyBudget,
    alert: hourTotal >= config.hourlyBudget * config.alertThreshold || 
           dayTotal >= config.dailyBudget * config.alertThreshold,
  };
}

// 检查是否被熔断
export async function isCircuitBroken(userId: string): Promise<boolean> {
  if (!redis) return false;

  try {
    const broken = await redis.get(`circuit_breaker:${userId}`);
    return broken === 'true';
  } catch {
    return false;
  }
}
```

#### 2.5 重构 circuit-breaker.ts

打开 `src/lib/security/circuit-breaker.ts`，改为Redis存储：

```typescript
import { redis } from '@/lib/redis';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;    // 触发熔断的连续失败次数
  successThreshold: number;    // 半开状态下恢复所需的连续成功次数
  timeout: number;             // 熔断后等待时间（毫秒）
}

const DEFAULT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000, // 1分钟
};

// 获取熔断器状态
export async function getCircuitState(
  serviceId: string,
  config: CircuitBreakerConfig = DEFAULT_BREAKER_CONFIG
): Promise<{ state: CircuitState; canExecute: boolean }> {
  if (!redis) {
    return { state: 'CLOSED', canExecute: true };
  }

  const stateKey = `circuit:${serviceId}:state`;
  const failuresKey = `circuit:${serviceId}:failures`;
  const successesKey = `circuit:${serviceId}:successes`;
  const lastFailureKey = `circuit:${serviceId}:last_failure`;

  try {
    const state = await redis.get(stateKey) as CircuitState | null;

    if (!state || state === 'CLOSED') {
      return { state: 'CLOSED', canExecute: true };
    }

    if (state === 'OPEN') {
      const lastFailure = await redis.get(lastFailureKey);
      if (lastFailure) {
        const elapsed = Date.now() - parseInt(lastFailure);
        if (elapsed >= config.timeout) {
          // 转为半开状态
          await redis.set(stateKey, 'HALF_OPEN');
          await redis.del(successesKey);
          return { state: 'HALF_OPEN', canExecute: true };
        }
      }
      return { state: 'OPEN', canExecute: false };
    }

    if (state === 'HALF_OPEN') {
      return { state: 'HALF_OPEN', canExecute: true };
    }

    return { state: 'CLOSED', canExecute: true };
  } catch {
    return { state: 'CLOSED', canExecute: true };
  }
}

// 记录成功
export async function recordSuccess(
  serviceId: string,
  config: CircuitBreakerConfig = DEFAULT_BREAKER_CONFIG
): Promise<void> {
  if (!redis) return;

  const stateKey = `circuit:${serviceId}:state`;
  const successesKey = `circuit:${serviceId}:successes`;
  const failuresKey = `circuit:${serviceId}:failures`;

  try {
    const state = await redis.get(stateKey) as CircuitState | null;

    if (state === 'HALF_OPEN') {
      const successes = await redis.incr(successesKey);
      if (successes >= config.successThreshold) {
        // 恢复关闭状态
        await redis.set(stateKey, 'CLOSED');
        await redis.del(successesKey);
        await redis.del(failuresKey);
        await redis.del(`circuit:${serviceId}:last_failure`);
      }
    } else {
      // 关闭状态下，清理失败计数
      await redis.del(failuresKey);
    }
  } catch (error) {
    console.error('Circuit breaker success tracking error:', error);
  }
}

// 记录失败
export async function recordFailure(
  serviceId: string,
  config: CircuitBreakerConfig = DEFAULT_BREAKER_CONFIG
): Promise<void> {
  if (!redis) return;

  const stateKey = `circuit:${serviceId}:state`;
  const failuresKey = `circuit:${serviceId}:failures`;
  const lastFailureKey = `circuit:${serviceId}:last_failure`;

  try {
    const state = await redis.get(stateKey) as CircuitState | null;

    if (state === 'HALF_OPEN') {
      // 半开状态再次失败，立即熔断
      await redis.set(stateKey, 'OPEN');
      await redis.set(lastFailureKey, Date.now().toString());
      return;
    }

    const failures = await redis.incr(failuresKey);

    if (failures >= config.failureThreshold) {
      // 触发熔断
      await redis.set(stateKey, 'OPEN');
      await redis.set(lastFailureKey, Date.now().toString());
    }
  } catch (error) {
    console.error('Circuit breaker failure tracking error:', error);
  }
}

// 执行带熔断保护的函数
export async function withCircuitBreaker<T>(
  serviceId: string,
  fn: () => Promise<T>,
  config?: CircuitBreakerConfig
): Promise<T> {
  const { canExecute } = await getCircuitState(serviceId, config);

  if (!canExecute) {
    throw new Error(`Service ${serviceId} is currently unavailable due to circuit breaker`);
  }

  try {
    const result = await fn();
    await recordSuccess(serviceId, config);
    return result;
  } catch (error) {
    await recordFailure(serviceId, config);
    throw error;
  }
}
```

#### 2.6 更新所有使用限流/成本/熔断的API路由

确保以下API路由使用新的Redis版函数：

```typescript
// 在每个API路由文件顶部检查并更新导入

// 旧导入（如果有的话）：
// import { rateLimit } from '@/lib/security/ai-rate-limiter';

// 新导入（保持路径不变，函数已更新）：
import { rateLimit } from '@/lib/security/ai-rate-limiter';

// 在POST处理函数开头添加：
const rateLimitResult = await rateLimit(userId, 'generate-full-script'); // 或对应endpoint
if (!rateLimitResult.allowed) {
  return Response.json({ 
    error: 'Rate limit exceeded', 
    code: 'RATE_LIMITED',
    retryAfter: rateLimitResult.retryAfter 
  }, { status: 429 });
}
```

需要更新的路由列表：
- `src/app/api/ai/generate-full-script/route.ts`
- `src/app/api/ai/generate-image/route.ts`
- `src/app/api/ai/generate-video/route.ts`
- `src/app/api/ai/generate-3d/route.ts`
- `src/app/api/ai/edit-video/route.ts`（已在P0-3添加，需确认使用新版rateLimit）
- `src/app/api/ai/chat/route.ts`
- `src/app/api/ai/compliance-check/route.ts`
- 其他所有AI生成类API路由

**验收标准**：
```bash
# 1. Redis连接正常
# 启动Redis（本地开发）
redis-server

# 2. 测试限流
curl -X POST http://localhost:3000/api/ai/generate-full-script   -H "Cookie: session=..."   -H "Content-Type: application/json"   -d '{"prompt":"test"}'
# 连续执行6次（超过1分钟5次限制）
# 第6次预期：429 Rate limit exceeded

# 3. 多实例测试（模拟）
# 启动两个Next.js实例（不同端口）
# 在一个实例上触发限流
# 在另一个实例上访问同一用户同一接口
# 预期：也被限流（证明Redis共享生效）

# 4. 成本记录测试
# 成功调用后检查Redis
edis-cli ZRANGE "cost:<userId>:<hour>" 0 -1
# 预期：有记录

# 5. 熔断测试
# 连续失败5次同一服务
# 第6次预期：Service xxx is currently unavailable
```

**回滚命令**：
```bash
git revert <commit-hash-of-p1-2>
# Redis数据无需回滚（不影响原有功能）
```

---

### 任务 P1-3：统一错误处理中间件

**问题描述**：
- 每个API路由都重复写 `try-catch + console.error + return 500`
- 错误格式不统一，前端难以处理
- 没有错误追踪ID，难以定位问题
- 没有错误分级（用户错误/系统错误/第三方错误）

**修复步骤**：

#### 3.1 创建统一错误类

创建 `src/lib/errors.ts`：

```typescript
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean; // true=用户可处理的错误，false=系统错误
  public readonly requestId: string;
  public readonly timestamp: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = false,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.requestId = crypto.randomUUID();
    this.timestamp = new Date().toISOString();
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.isOperational ? this.message : 'Internal server error',
      code: this.code,
      requestId: this.requestId,
      ...(this.isOperational && this.details ? { details: this.details } : {}),
    };
  }
}

// 预定义常见错误
export const Errors = {
  // 4xx 客户端错误
  BadRequest: (message: string, details?: Record<string, unknown>) => 
    new AppError(message, 'BAD_REQUEST', 400, true, details),

  Unauthorized: (message: string = 'Unauthorized') => 
    new AppError(message, 'UNAUTHORIZED', 401, true),

  Forbidden: (message: string = 'Forbidden') => 
    new AppError(message, 'FORBIDDEN', 403, true),

  NotFound: (resource: string) => 
    new AppError(`${resource} not found`, 'NOT_FOUND', 404, true),

  RateLimited: (retryAfter?: number) => 
    new AppError('Rate limit exceeded', 'RATE_LIMITED', 429, true, retryAfter ? { retryAfter } : undefined),

  FileTooLarge: (maxSize: number) => 
    new AppError('File too large', 'FILE_TOO_LARGE', 413, true, { maxSize }),

  InvalidFileType: (allowedTypes: string[]) => 
    new AppError('Invalid file type', 'INVALID_TYPE', 415, true, { allowedTypes }),

  // 5xx 服务器错误
  InternalError: (message: string = 'Internal server error') => 
    new AppError(message, 'INTERNAL_ERROR', 500, false),

  ServiceUnavailable: (service: string) => 
    new AppError(`Service ${service} is unavailable`, 'SERVICE_UNAVAILABLE', 503, false),

  AIProviderError: (provider: string, message: string) => 
    new AppError(`AI provider ${provider} error: ${message}`, 'AI_PROVIDER_ERROR', 502, false, { provider }),

  DatabaseError: (message: string) => 
    new AppError(`Database error: ${message}`, 'DATABASE_ERROR', 500, false),
};
```

#### 3.2 创建API错误处理包装器

创建 `src/lib/api-handler.ts`：

```typescript
import { AppError } from './errors';
import { logger } from './logger';

export type ApiHandler<T = unknown> = (req: Request) => Promise<T>;

export function createApiHandler<T>(handler: ApiHandler<T>) {
  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      const result = await handler(req);

      // 记录成功日志
      logger.info({
        requestId,
        method: req.method,
        url: req.url,
        duration: Date.now() - startTime,
        status: 200,
      });

      return Response.json(result);
    } catch (error) {
      // 记录错误日志
      logger.error({
        requestId,
        method: req.method,
        url: req.url,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof AppError) {
        return Response.json(error.toJSON(), { 
          status: error.statusCode,
          headers: {
            'X-Request-Id': error.requestId,
          }
        });
      }

      // 未知错误
      const appError = new AppError(
        'Internal server error',
        'INTERNAL_ERROR',
        500,
        false
      );

      return Response.json(appError.toJSON(), { 
        status: 500,
        headers: {
          'X-Request-Id': appError.requestId,
        }
      });
    }
  };
}
```

#### 3.3 升级 logger.ts

打开 `src/lib/logger.ts`，改为结构化日志：

```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  [key: string]: unknown;
}

class Logger {
  private log(level: LogEntry['level'], message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };

    // 开发环境输出到控制台
    if (process.env.NODE_ENV === 'development') {
      const color = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
      }[level];

      console.log(`${color}[${entry.timestamp}] ${level.toUpperCase()}: ${message}\x1b[0m`);
      if (meta && Object.keys(meta).length > 0) {
        console.log('  Meta:', JSON.stringify(meta, null, 2));
      }
    } else {
      // 生产环境输出JSON（便于日志收集系统解析）
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log('debug', message, meta);
  }

  info(message: string | Record<string, unknown>, meta?: Record<string, unknown>) {
    if (typeof message === 'string') {
      this.log('info', message, meta);
    } else {
      this.log('info', 'Structured log', message);
    }
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  }

  error(message: string | Error | Record<string, unknown>, meta?: Record<string, unknown>) {
    if (message instanceof Error) {
      this.log('error', message.message, { 
        stack: message.stack,
        ...meta 
      });
    } else if (typeof message === 'string') {
      this.log('error', message, meta);
    } else {
      this.log('error', 'Structured error', message);
    }
  }
}

export const logger = new Logger();
```

#### 3.4 改造一个示例API路由（以 generate-full-script 为例）

打开 `src/app/api/ai/generate-full-script/route.ts`，改为使用统一错误处理：

```typescript
import { createApiHandler } from '@/lib/api-handler';
import { Errors } from '@/lib/errors';
import { auth } from '@/lib/server-auth';
import { rateLimit } from '@/lib/security/ai-rate-limiter';
import { checkCredits, deductCredits } from '@/lib/credits';

export const POST = createApiHandler(async (req) => {
  // 1. 认证
  const session = await auth();
  if (!session?.user?.id) {
    throw Errors.Unauthorized();
  }
  const userId = session.user.id;

  // 2. 限流
  const rateLimitResult = await rateLimit(userId, 'generate-full-script');
  if (!rateLimitResult.allowed) {
    throw Errors.RateLimited(rateLimitResult.retryAfter);
  }

  // 3. 积分检查
  const hasCredits = await checkCredits(userId, 100);
  if (!hasCredits) {
    throw Errors.Forbidden('Insufficient credits');
  }

  // 4. 参数解析
  const body = await req.json();
  if (!body.prompt && !body.outline) {
    throw Errors.BadRequest('Either prompt or outline is required');
  }

  // 5. 业务逻辑
  // ...原有生成逻辑

  // 6. 扣费
  await deductCredits(userId, 100, 'generate-full-script', { model: body.model });

  // 7. 返回结果
  return { success: true, script: generatedScript };
});
```

**注意**：由于这个改动涉及所有API路由，Phase 1只做**3-5个核心路由**的改造作为示例，其余路由在后续Phase中逐步迁移。**不要一次性改所有路由**。

Phase 1优先改造的路由：
1. `generate-full-script/route.ts`
2. `generate-image/route.ts`
3. `generate-video/route.ts`
4. `split-scenes/route.ts`
5. `edit-video/route.ts`（已在P0-3改造，需适配新错误类）

**验收标准**：
```bash
# 1. 测试统一错误格式
curl -X POST http://localhost:3000/api/ai/generate-full-script   -H "Content-Type: application/json"   -d '{}'
# 预期：400错误，返回JSON格式：
# {"error":"Either prompt or outline is required","code":"BAD_REQUEST","requestId":"xxx"}

# 2. 测试未认证
curl -X POST http://localhost:3000/api/ai/generate-full-script
# 预期：401，{"error":"Unauthorized","code":"UNAUTHORIZED","requestId":"xxx"}

# 3. 测试限流
curl -X POST ...（连续6次）
# 预期：429，{"error":"Rate limit exceeded","code":"RATE_LIMITED","requestId":"xxx","details":{"retryAfter":30}}

# 4. 检查X-Request-Id响应头
curl -I http://localhost:3000/api/ai/generate-full-script
# 预期：响应头包含 X-Request-Id: xxx
```

**回滚命令**：
```bash
git revert <commit-hash-of-p1-3>
```

---

### 任务 P1-4：接入 jsonrepair 安全 JSON 解析（参考 LocalMiniDrama）

**问题描述**：
- `split-scenes`、`extract-characters`、`execute-node` 等API依赖正则 `match(/\{[\s\S]*\}/)` 提取JSON
- LLM经常输出带markdown代码块、多余文字、截断的JSON
- 一旦解析失败，整个请求失败，用户体验极差

**修复步骤**：

#### 4.1 安装依赖

```bash
pnpm add jsonrepair
```

#### 4.2 创建安全JSON解析模块

创建 `src/lib/json-safe-parse.ts`：

```typescript
import { jsonrepair } from 'jsonrepair';

export class JsonParseError extends Error {
  public readonly originalText: string;
  public readonly attemptedStrategies: string[];

  constructor(message: string, originalText: string, attemptedStrategies: string[]) {
    super(message);
    this.originalText = originalText;
    this.attemptedStrategies = attemptedStrategies;
    this.name = 'JsonParseError';
  }
}

export function safeJsonParse(text: string, context?: string): any {
  const attempted: string[] = [];
  const contextPrefix = context ? `[${context}] ` : '';

  // 策略1：直接解析（最干净的情况）
  try {
    attempted.push('direct_parse');
    return JSON.parse(text);
  } catch {}

  // 策略2：提取markdown代码块中的JSON
  try {
    attempted.push('markdown_codeblock');
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      const cleaned = codeBlockMatch[1].trim();
      return JSON.parse(cleaned);
    }
  } catch {}

  // 策略3：提取第一个{到最后一个}之间的内容
  try {
    attempted.push('brace_extraction');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  // 策略4：提取第一个[到最后一个]之间的内容（JSON数组）
  try {
    attempted.push('bracket_extraction');
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
  } catch {}

  // 策略5：使用jsonrepair自动修复常见错误
  try {
    attempted.push('jsonrepair');
    const repaired = jsonrepair(text);
    return JSON.parse(repaired);
  } catch {}

  // 策略6：清理常见污染后再次尝试
  try {
    attempted.push('clean_and_repair');
    // 移除常见的前缀/后缀污染
    let cleaned = text
      .replace(/^\s*Here\s+is\s+(?:the\s+)?JSON:\s*/i, '')
      .replace(/^\s*```\w*\s*/, '')
      .replace(/\s*```\s*$/, '')
      .replace(/^\s*json\s*/i, '')
      .trim();

    const repaired = jsonrepair(cleaned);
    return JSON.parse(repaired);
  } catch {}

  // 全部失败
  throw new JsonParseError(
    `${contextPrefix}无法解析JSON，已尝试${attempted.length}种策略`,
    text.slice(0, 500), // 只保留前500字符用于调试
    attempted
  );
}

// 批量安全解析（用于数组输出）
export function safeJsonParseArray(text: string, context?: string): any[] {
  try {
    const result = safeJsonParse(text, context);
    if (Array.isArray(result)) {
      return result;
    }
    // 如果解析结果是对象但预期是数组，包装为数组
    if (result && typeof result === 'object') {
      // 检查是否有数组字段
      for (const key of ['scenes', 'shots', 'characters', 'episodes', 'items', 'data']) {
        if (Array.isArray(result[key])) {
          return result[key];
        }
      }
    }
    return [result];
  } catch (error) {
    throw error;
  }
}

// 带类型验证的安全解析
export function safeJsonParseWithSchema<T>(
  text: string,
  validator: (data: unknown) => T,
  context?: string
): T {
  const parsed = safeJsonParse(text, context);
  try {
    return validator(parsed);
  } catch (error) {
    throw new JsonParseError(
      `${context || ''} JSON解析成功但Schema验证失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      text.slice(0, 500),
      ['schema_validation']
    );
  }
}
```

#### 4.3 改造 split-scenes/route.ts

打开 `src/app/api/ai/split-scenes/route.ts`，替换原有的正则提取：

```typescript
// 删除或注释掉旧代码：
// const jsonMatch = completion.choices[0].message.content.match(/\{[\s\S]*\}/);
// const scenes = JSON.parse(jsonMatch[0]);

// 替换为新代码：
import { safeJsonParseArray } from '@/lib/json-safe-parse';

// ...在获取LLM输出后
const content = completion.choices[0].message.content;

try {
  const scenes = safeJsonParseArray(content, 'split-scenes');

  // 验证每个分镜的必要字段
  const validatedScenes = scenes.map((scene, index) => ({
    sceneNumber: scene.sceneNumber || scene.scene_number || index + 1,
    location: scene.location || '未指定场景',
    time: scene.time || '日',
    description: scene.description || '',
    characters: Array.isArray(scene.characters) ? scene.characters : [],
    keyActions: Array.isArray(scene.keyActions) ? scene.keyActions : 
                Array.isArray(scene.key_actions) ? scene.key_actions : [],
    emotionalTone: scene.emotionalTone || scene.emotional_tone || 'neutral',
    visualFocus: scene.visualFocus || scene.visual_focus || '',
    duration: scene.duration || 4,
  }));

  return Response.json({ scenes: validatedScenes });
} catch (error) {
  if (error instanceof JsonParseError) {
    return Response.json({
      error: 'Failed to parse AI response',
      code: 'PARSE_ERROR',
      message: error.message,
      attemptedStrategies: error.attemptedStrategies,
      originalTextPreview: error.originalText.slice(0, 200),
    }, { status: 500 });
  }
  throw error;
}
```

#### 4.4 改造 extract-characters/route.ts

同样替换为 `safeJsonParseArray`：

```typescript
const content = completion.choices[0].message.content;
const characters = safeJsonParseArray(content, 'extract-characters');
```

#### 4.5 改造 execute-node/route.ts

```typescript
const content = completion.choices[0].message.content;
const result = safeJsonParse(content, 'execute-node');
```

#### 4.6 列出所有需要改造的文件清单

Phase 1优先改造以下文件（这些是最常出现JSON解析错误的）：
1. `src/app/api/ai/split-scenes/route.ts`
2. `src/app/api/ai/extract-characters/route.ts`
3. `src/app/api/ai/extract-scenes/route.ts`
4. `src/app/api/ai/execute-node/route.ts`
5. `src/app/api/ai/generate-full-script/route.ts`（大纲阶段和逐集阶段的JSON解析）
6. `src/app/api/ai/consistency-check/route.ts`
7. `src/app/api/ai/batch-extract/route.ts`

**其余文件在后续Phase中逐步迁移**。

**验收标准**：
```bash
# 1. 测试正常JSON解析
curl -X POST http://localhost:3000/api/ai/split-scenes   -H "Content-Type: application/json"   -H "Cookie: session=..."   -d '{"script":"第1集...","episodeNumber":1}'
# 预期：200，正常返回分镜数组

# 2. 测试带markdown代码块的JSON（模拟LLM输出）
# 在测试环境中注入带```json的mock响应
# 预期：正常解析

# 3. 测试畸形JSON（模拟LLM输出截断）
# 在测试环境中注入缺少闭合括号的mock响应
# 预期：jsonrepair自动修复，或返回详细的PARSE_ERROR

# 4. 测试完全非JSON输出
# 预期：500，返回attemptedStrategies列表和原始文本预览
```

**回滚命令**：
```bash
git revert <commit-hash-of-p1-4>
```

---

### 任务 P1-5：接入 p-limit 并发控制 + 重试（参考 LocalMiniDrama）

**问题描述**：
- `execute-node` 使用 `for` 循环串行处理每集，60集剧本需要60次API调用
- `batch-extract` 使用 `Promise.race(running)` 配合 `splice` 移除已完成任务，逻辑复杂且容易出错
- 生图/生视频没有并发控制，全部并发调用API，容易触发平台限流
- 没有失败重试机制，一次失败整个流程中断

**修复步骤**：

#### 5.1 安装依赖

```bash
pnpm add p-limit
```

#### 5.2 创建并发任务管理器

创建 `src/lib/concurrent-task.ts`：

```typescript
import pLimit from 'p-limit';
import { logger } from './logger';

interface TaskConfig {
  concurrency: number;      // 并发数，默认3
  retryCount: number;       // 重试次数，默认3
  retryDelay: number;       // 重试延迟基数（毫秒），默认5000
  retryBackoff: 'fixed' | 'exponential'; // 退避策略
}

interface TaskProgress {
  completed: number;
  total: number;
  currentItem?: any;
  failedItems: Array<{ item: any; error: string; attempts: number }>;
}

interface TaskResult<T> {
  results: T[];
  failed: Array<{ item: any; error: string; attempts: number }>;
  progress: TaskProgress;
}

const DEFAULT_CONFIG: TaskConfig = {
  concurrency: 3,
  retryCount: 3,
  retryDelay: 5000,
  retryBackoff: 'exponential',
};

class ConcurrentTaskManager {
  private config: TaskConfig;

  constructor(config: Partial<TaskConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async executeBatch<T, I>(
    items: I[],
    handler: (item: I, index: number) => Promise<T>,
    onProgress?: (progress: TaskProgress) => void | Promise<void>
  ): Promise<TaskResult<T>> {
    const limit = pLimit(this.config.concurrency);
    const total = items.length;
    let completed = 0;
    const failed: TaskResult<T>['failed'] = [];
    const results: T[] = new Array(total);

    const updateProgress = (currentItem?: I) => {
      const progress: TaskProgress = {
        completed,
        total,
        currentItem,
        failedItems: [...failed],
      };
      onProgress?.(progress);
    };

    const tasks = items.map((item, index) =>
      limit(async () => {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
          try {
            if (attempt > 0) {
              // 计算退避延迟
              const delay = this.config.retryBackoff === 'exponential'
                ? this.config.retryDelay * Math.pow(2, attempt - 1)
                : this.config.retryDelay * attempt;

              logger.info(`Retrying task ${index + 1}/${total} (attempt ${attempt + 1}/${this.config.retryCount + 1}) after ${delay}ms`);
              await sleep(delay);
            }

            const result = await handler(item, index);
            results[index] = result;
            completed++;
            updateProgress(item);
            return;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            logger.warn(`Task ${index + 1}/${total} failed (attempt ${attempt + 1}/${this.config.retryCount + 1}): ${lastError.message}`);
          }
        }

        // 所有重试都失败
        failed.push({
          item,
          error: lastError?.message || 'Unknown error',
          attempts: this.config.retryCount + 1,
        });
        completed++;
        updateProgress(item);
      })
    );

    await Promise.all(tasks);

    return {
      results: results.filter((r): r is T => r !== undefined),
      failed,
      progress: {
        completed,
        total,
        failedItems: failed,
      },
    };
  }

  // 快速执行（无进度回调简化版）
  async execute<T, I>(
    items: I[],
    handler: (item: I, index: number) => Promise<T>
  ): Promise<T[]> {
    const result = await this.executeBatch(items, handler);
    if (result.failed.length > 0) {
      logger.warn(`${result.failed.length}/${items.length} tasks failed`);
    }
    return result.results;
  }
}

export function createTaskManager(config?: Partial<TaskConfig>) {
  return new ConcurrentTaskManager(config);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 预定义常用配置
export const TaskPresets = {
  // 图像生成：并发3，重试3，指数退避
  imageGeneration: { concurrency: 3, retryCount: 3, retryDelay: 10000, retryBackoff: 'exponential' as const },

  // 视频生成：并发2，重试3（视频API更慢更贵）
  videoGeneration: { concurrency: 2, retryCount: 3, retryDelay: 15000, retryBackoff: 'exponential' as const },

  // 文本生成（LLM调用）：并发5，重试2
  textGeneration: { concurrency: 5, retryCount: 2, retryDelay: 3000, retryBackoff: 'fixed' as const },

  // 数据提取：并发5，重试2
  dataExtraction: { concurrency: 5, retryCount: 2, retryDelay: 5000, retryBackoff: 'fixed' as const },

  // 批量处理（如60集剧本）：并发3，重试2
  batchProcessing: { concurrency: 3, retryCount: 2, retryDelay: 5000, retryBackoff: 'exponential' as const },
};
```

#### 5.3 改造 batch-extract/route.ts

打开 `src/app/api/ai/batch-extract/route.ts`，替换原有的复杂并发逻辑：

```typescript
import { createTaskManager, TaskPresets } from '@/lib/concurrent-task';

// 删除旧代码：
// const running: Promise<any>[] = [];
// for (...) {
//   const promise = extract(...);
//   running.push(promise);
//   if (running.length >= MAX_CONCURRENT) {
//     await Promise.race(running);
//     running.splice(running.indexOf(...), 1);
//   }
// }

// 替换为新代码：
const manager = createTaskManager(TaskPresets.batchProcessing);

const { results, failed, progress } = await manager.executeBatch(
  episodes,
  async (episode, index) => {
    // 原有的提取逻辑
    const result = await extractFromEpisode(episode, index, projectId);
    return result;
  },
  (progress) => {
    // 实时推送进度（如果支持WebSocket）
    // ws.send(JSON.stringify({ type: 'batch-progress', ...progress }));
    logger.info(`Batch extract progress: ${progress.completed}/${progress.total}`);
  }
);

if (failed.length > 0) {
  logger.warn(`Batch extract completed with ${failed.length} failures`);
}

return Response.json({ 
  success: true, 
  results,
  failed: failed.map(f => ({ episode: f.item.episodeNumber, error: f.error })),
  summary: {
    total: episodes.length,
    succeeded: results.length,
    failed: failed.length,
  }
});
```

#### 5.4 改造 execute-node/route.ts

```typescript
import { createTaskManager, TaskPresets } from '@/lib/concurrent-task';

// 如果是批量处理多个集数
const manager = createTaskManager(TaskPresets.batchProcessing);

const results = await manager.execute(
  episodes,
  async (episode) => {
    // 原有的逐集处理逻辑
    return await processEpisode(episode);
  }
);
```

#### 5.5 改造生图/生视频相关路由

在 `generate-image/route.ts` 和 `generate-video/route.ts` 中，如果存在批量生成逻辑，使用对应Preset：

```typescript
import { createTaskManager, TaskPresets } from '@/lib/concurrent-task';

// 批量生图
const manager = createTaskManager(TaskPresets.imageGeneration);

const images = await manager.execute(
  shots,
  async (shot) => {
    return await generateImageForShot(shot);
  }
);
```

**验收标准**：
```bash
# 1. 测试串行改并发
# 提交10个生图任务
# 预期：同时只有3个在执行（观察API调用日志时间戳）

# 2. 测试失败重试
# 模拟第3个任务失败（通过mock或临时改代码）
# 预期：第3个任务自动重试3次，最终失败但其他任务不受影响

# 3. 测试指数退避
# 观察重试日志
# 预期：第1次重试延迟5秒，第2次10秒，第3次20秒

# 4. 测试进度回调
# 批量提取60集剧本
# 预期：日志中显示 "Batch extract progress: 1/60", "2/60"... 非一次性输出
```

**回滚命令**：
```bash
git revert <commit-hash-of-p1-5>
```

---

### 任务 P1-6：拆分 workspace/page.tsx 为独立组件（参考 drama-workshop）

**问题描述**：
- `src/app/workspace/page.tsx` 一个文件40KB+，包含React Flow画布、节点渲染、边处理、运行逻辑、UI状态
- 维护困难，任何小改动都可能影响整个页面
- 没有组件复用，类似功能在其他页面无法复用

**修复步骤**：

#### 6.1 创建组件目录结构

```bash
mkdir -p src/components/workspace/
mkdir -p src/components/workspace/nodes
mkdir -p src/components/workspace/edges
mkdir -p src/components/workspace/panels
mkdir -p src/hooks/workspace
```

#### 6.2 提取自定义Hook

创建 `src/hooks/workspace/use-workflow-canvas.ts`：

```typescript
import { useCallback, useState } from 'react';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
}

export function useWorkflowCanvas(initialNodes: Node[] = [], initialEdges: Edge[] = []) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }, data?: any) => {
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: data || {},
      };
      setNodes((nds) => [...nds, newNode]);
      return newNode;
    },
    [setNodes]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  return {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    addNode,
    removeNode,
    setNodes,
    setEdges,
  };
}
```

#### 6.3 提取节点组件

创建 `src/components/workspace/nodes/ScriptNode.tsx`：

```typescript
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ScriptNodeData {
  status: 'pending' | 'running' | 'completed' | 'error';
  title?: string;
  progress?: number;
  episodeCount?: number;
  errorMessage?: string;
}

const statusConfig = {
  pending: { color: 'border-gray-300 bg-white', icon: null, badge: 'secondary' },
  running: { color: 'border-blue-500 bg-blue-50', icon: Loader2, badge: 'default' },
  completed: { color: 'border-green-500 bg-green-50', icon: CheckCircle2, badge: 'secondary' },
  error: { color: 'border-red-500 bg-red-50', icon: AlertCircle, badge: 'destructive' },
} as const;

export const ScriptNode = memo(({ data, selected }: NodeProps<ScriptNodeData>) => {
  const config = statusConfig[data.status];
  const StatusIcon = config.icon;

  return (
    <div className={`rounded-lg border-2 p-4 w-64 shadow-sm transition-all ${
      selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
    } ${config.color}`}>
      <Handle type="target" position={Position.Left} id="script-in" />

      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-gray-600" />
        <span className="font-bold text-sm">剧本</span>
        <Badge variant={config.badge as any} className="text-xs">
          {data.status === 'pending' && '待生成'}
          {data.status === 'running' && '生成中'}
          {data.status === 'completed' && '已完成'}
          {data.status === 'error' && '失败'}
        </Badge>
      </div>

      <div className="text-sm text-gray-700 truncate mb-1">
        {data.title || '未命名剧本'}
      </div>

      {data.episodeCount !== undefined && (
        <div className="text-xs text-gray-500 mb-2">
          {data.episodeCount} 集
        </div>
      )}

      {data.status === 'running' && data.progress !== undefined && (
        <Progress value={data.progress} className="h-1.5" />
      )}

      {data.status === 'error' && data.errorMessage && (
        <div className="text-xs text-red-600 mt-1 truncate">
          {data.errorMessage}
        </div>
      )}

      <Handle type="source" position={Position.Right} id="script-out" />
    </div>
  );
});

ScriptNode.displayName = 'ScriptNode';
```

类似创建其他节点组件：
- `CharacterNode.tsx`
- `SceneNode.tsx`
- `StoryboardNode.tsx`
- `ImageNode.tsx`
- `VideoNode.tsx`
- `AudioNode.tsx`
- `ComposeNode.tsx`

#### 6.4 提取面板组件

创建 `src/components/workspace/panels/PropertyPanel.tsx`：

```typescript
'use client';

import { Node } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface PropertyPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
}

export function PropertyPanel({ selectedNode, onUpdateNode, onDeleteNode }: PropertyPanelProps) {
  if (!selectedNode) {
    return (
      <Card className="w-80 h-full">
        <CardContent className="pt-6 text-center text-gray-500">
          选择一个节点查看属性
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80 h-full overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-sm">节点属性</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>ID</Label>
          <Input value={selectedNode.id} disabled />
        </div>
        <div>
          <Label>类型</Label>
          <Input value={selectedNode.type || 'default'} disabled />
        </div>
        <div>
          <Label>名称</Label>
          <Input 
            value={selectedNode.data?.title || ''}
            onChange={(e) => onUpdateNode(selectedNode.id, { ...selectedNode.data, title: e.target.value })}
          />
        </div>
        {/* 根据节点类型显示不同属性 */}
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          删除节点
        </Button>
      </CardContent>
    </Card>
  );
}
```

创建 `src/components/workspace/panels/Toolbar.tsx`：

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Plus, Play, Save, Download, Upload } from 'lucide-react';

interface ToolbarProps {
  onAddNode: (type: string) => void;
  onRunWorkflow: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  isRunning: boolean;
}

export function Toolbar({ onAddNode, onRunWorkflow, onSave, onExport, onImport, isRunning }: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white border-b shadow-sm">
      <Button variant="outline" size="sm" onClick={() => onAddNode('script')}>
        <Plus className="w-4 h-4 mr-1" /> 剧本
      </Button>
      <Button variant="outline" size="sm" onClick={() => onAddNode('character')}>
        <Plus className="w-4 h-4 mr-1" /> 角色
      </Button>
      <Button variant="outline" size="sm" onClick={() => onAddNode('image')}>
        <Plus className="w-4 h-4 mr-1" /> 生图
      </Button>
      <Button variant="outline" size="sm" onClick={() => onAddNode('video')}>
        <Plus className="w-4 h-4 mr-1" /> 生视频
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      <Button 
        size="sm" 
        onClick={onRunWorkflow}
        disabled={isRunning}
      >
        <Play className="w-4 h-4 mr-1" />
        {isRunning ? '运行中...' : '运行'}
      </Button>

      <Button variant="outline" size="sm" onClick={onSave}>
        <Save className="w-4 h-4 mr-1" /> 保存
      </Button>

      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="w-4 h-4 mr-1" /> 导出
      </Button>

      <Button variant="outline" size="sm" onClick={onImport}>
        <Upload className="w-4 h-4 mr-1" /> 导入
      </Button>
    </div>
  );
}
```

#### 6.5 重构 page.tsx

打开 `src/app/workspace/page.tsx`，改为精简的组装页面：

```typescript
'use client';

import { useCallback, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowCanvas } from '@/hooks/workspace/use-workflow-canvas';
import { ScriptNode } from '@/components/workspace/nodes/ScriptNode';
import { CharacterNode } from '@/components/workspace/nodes/CharacterNode';
import { ImageNode } from '@/components/workspace/nodes/ImageNode';
import { VideoNode } from '@/components/workspace/nodes/VideoNode';
import { Toolbar } from '@/components/workspace/panels/Toolbar';
import { PropertyPanel } from '@/components/workspace/panels/PropertyPanel';

const nodeTypes: NodeTypes = {
  script: ScriptNode,
  character: CharacterNode,
  image: ImageNode,
  video: VideoNode,
  // ...其他节点类型
};

export default function WorkspacePage() {
  const {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    addNode,
    removeNode,
    setNodes,
  } = useWorkflowCanvas();

  const [isRunning, setIsRunning] = useState(false);

  const handleAddNode = useCallback((type: string) => {
    const position = { 
      x: Math.random() * 400 + 100, 
      y: Math.random() * 300 + 100 
    };
    addNode(type, position, { status: 'pending' });
  }, [addNode]);

  const handleRunWorkflow = useCallback(async () => {
    setIsRunning(true);
    try {
      // 原有运行逻辑提取到hook或service中
      // await runWorkflow(nodes, edges);
    } finally {
      setIsRunning(false);
    }
  }, [nodes, edges]);

  const handleUpdateNode = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    );
  }, [setNodes]);

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        onAddNode={handleAddNode}
        onRunWorkflow={handleRunWorkflow}
        onSave={() => { /* 保存逻辑 */ }}
        onExport={() => { /* 导出逻辑 */ }}
        onImport={() => { /* 导入逻辑 */ }}
        isRunning={isRunning}
      />

      <div className="flex-1 flex">
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Background variant="dots" gap={12} size={1} />
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
        </div>

        <PropertyPanel
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={removeNode}
        />
      </div>
    </div>
  );
}
```

**目标**：`page.tsx` 文件大小从40KB+降到 <5KB。

**验收标准**：
```bash
# 1. 文件大小检查
wc -c src/app/workspace/page.tsx
# 预期：<5000字节

# 2. 构建测试
pnpm build
# 预期：0错误

# 3. 功能测试
# 访问 /workspace
# 预期：页面正常渲染，节点可拖拽，边可连接，属性面板可显示

# 4. 基线功能测试
# 原有所有功能（添加节点、连接、运行、保存）必须正常工作
```

**回滚命令**：
```bash
git revert <commit-hash-of-p1-6>
# 如果组件拆分有问题，快速回滚到单文件版本
git checkout HEAD -- src/app/workspace/page.tsx
```

---

## 五、Phase 1 验收清单

Phase 1完成后，你必须提供以下交付物：

### 5.1 代码交付
```bash
git diff main...feature/p1-infrastructure > p1-diff.patch
```

### 5.2 测试报告

| # | 功能 | 测试命令 | 预期结果 |
|---|------|---------|---------|
| 1 | 剧本生成 | `POST /api/ai/generate-full-script` | 200 + SSE流 |
| 2 | 分镜拆分 | `POST /api/ai/split-scenes` | 200 + JSON分镜数组（jsonrepair兜底） |
| 3 | 角色提取 | `POST /api/ai/extract-characters` | 200 + 角色列表（jsonrepair兜底） |
| 4 | 场景提取 | `POST /api/ai/extract-scenes` | 200 + 场景列表 |
| 5 | 生图 | `POST /api/ai/generate-image` | 200 + 图片URL |
| 6 | 生视频 | `POST /api/ai/generate-video` | 200 + 视频URL/taskId |
| 7 | 角色三视图 | `POST /api/ai/generate-character-views` | 200 + 三视图URL |
| 8 | 合规检测 | `POST /api/ai/compliance-check` | 200 + 检测结果 |
| 9 | 一致性检查 | `POST /api/ai/consistency-check` | 200 + 合并建议 |
| 10 | 工作流画布 | `GET /workspace` | 200 + 页面渲染，组件拆分后功能无损 |
| 11 | 限流（Redis） | 连续6次 `POST /api/ai/generate-full-script` | 第6次429 |
| 12 | 成本记录 | 成功调用后查Redis | 有成本记录 |
| 13 | 熔断 | 连续5次失败同一服务 | 第6次503 |
| 14 | 统一错误格式 | `POST /api/ai/generate-full-script` (无参数) | 400 + {error,code,requestId} |
| 15 | jsonrepair | 提交畸形JSON到split-scenes | 自动修复或详细错误 |
| 16 | p-limit并发 | 批量生图10张 | 同时只有3个请求 |
| 17 | 数据库新表 | Drizzle查询新表 | 不报错 |

### 5.3 安全扫描
```bash
grep -r "sk-[a-zA-Z0-9]" src/ --include="*.ts" --include="*.tsx"
grep -r "require(" src/app/api/ --include="*.ts"
grep -r "eval\|Function\|new Function" src/ --include="*.ts" --include="*.tsx"
```

### 5.4 构建验证
```bash
pnpm install
pnpm build
# 必须0错误，0警告（TypeScript严格模式）
```

### 5.5 回滚方案
```bash
# 代码回滚
git checkout main
git branch -D feature/p1-infrastructure

# 数据库回滚（如需）
# 执行 src/lib/db/migrations/001_add_phase1_tables_rollback.sql
```

---

## 六、Phase 2 概要（供参考，不在Phase 1执行）

Phase 1验收通过后，进入Phase 2知识库与创作方法论。主要任务：

| 任务 | 来源 | 说明 |
|------|------|------|
| P2-1 | short-drama | 注入8份知识库（题材/节奏/钩子/付费/爽感/反派/合规/开篇） |
| P2-2 | short-drama | 实现五维度质量评分API（节奏/爽点/台词/格式/连贯性） |
| P2-3 | MM-StoryAgent | 实现三阶段写作流程（对话→大纲→逐集） |
| P2-4 | short-drama | 实现按需加载机制（不同任务加载不同知识片段） |
| P2-5 | short-drama | 新增review-script API路由 |
| P2-6 | SkyReels-V1 | 复制33种表情+400+动作语义库为TS常量 |
| P2-7 | SkyReels-V1 | 实现影视级提示词模板（4种预设） |
| P2-8 | Moyin Creator | 实现3层提示词融合（动作+摄影+风格） |

---

## 七、你现在应该做什么

1. **确认当前分支是 `feature/p1-infrastructure`**（从main切出）
2. **按顺序执行 P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6**
3. **每个任务完成后运行基线功能测试（10项Phase 0 + 7项Phase 1新增）**
4. **全部完成后提供：diff文件 + 测试报告 + 构建截图 + 回滚命令**
5. **等待我验收后，再进入Phase 2**

**禁止**：
- 不要提前做Phase 2的任务
- 不要在改造P1-1 Schema时"顺手"优化其他数据库代码
- 不要改变任何现有API路由的接口契约（输入输出格式必须和Phase 0一致）
- 不要一次性改所有API路由的错误处理（Phase 1只改3-5个核心路由作为示例）

---

*Phase 1 指令结束。请开始执行。*
