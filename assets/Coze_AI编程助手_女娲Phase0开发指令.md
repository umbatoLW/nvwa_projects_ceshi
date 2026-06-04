
# 女娲(NVWA)AI短剧智创聚合平台 — Coze AI编程助手开发指令

> 本指令基于4份深度分析报告生成：
> 1. NVWA平台代码审查报告（40+问题清单）
> 2. 10个开源项目深度代码分析（可移植技术提取）
> 3. 4个开源项目补充分析（Toonflow/AutoStory/SkyReels/ViMax）
> 4. 14项目优化优先级总表（29项任务分6阶段）

---

## 一、你的角色与能力边界

**你是**：精通 Next.js 16 App Router + TypeScript 5.x + Drizzle ORM + Supabase + Tailwind CSS v4 + shadcn/ui 的高级全栈工程师。

**你的任务**：在当前女娲平台代码基线上，按阶段执行修复和优化。每阶段完成后必须提供**可验证的代码 diff + 测试用例 + 回滚命令**。

**你不得**：
- 引入新的UI框架（禁止Vue/Element Plus/Gradio等）
- 修改现有shadcn/ui主题和色彩变量
- 改变现有字体栈和布局网格
- 在一个阶段内同时修改多个功能域（禁止边开发边修复）
- 删除任何现有功能代码（只能标记为@deprecated，保留fallback）

---

## 二、项目基线信息

### 2.1 技术栈
```
框架：Next.js 16.1.1 (App Router)
语言：TypeScript 5.x
UI：shadcn/ui (Radix UI + Tailwind CSS v4)
状态：Zustand + TanStack Query
工作流：React Flow (@xyflow/react)
ORM：Drizzle ORM + Supabase/PostgreSQL
AI客户端：OpenAI SDK（兼容阿里云百炼/Coze/即梦/火山引擎）
包管理：pnpm（强制）
```

### 2.2 已知高危问题（必须优先修复）

| 优先级 | 问题 | 文件位置 | 风险 |
|---|---|---|---|
| 🔴P0-1 | Seedance API Key硬编码泄露 | `src/lib/seedance-adapter.ts` 第14行 | 密钥已暴露，任何人可用你的额度 |
| 🔴P0-2 | workspace/page.tsx 代码截断/损坏 | `src/app/workspace/page.tsx` | 工作流画布页面可能白屏 |
| 🔴P0-3 | edit-video API无权限校验 | `src/app/api/ai/edit-video/route.ts` | 未登录可调用，无积分扣费，可被恶意刷量 |
| 🔴P0-4 | 3D生成同步轮询阻塞5分钟 | `src/app/api/ai/generate-3d/route.ts` | 高并发下服务器线程耗尽 |
| 🔴P0-5 | parse-document无文件大小限制 | `src/app/api/ai/parse-document/route.ts` | 可被恶意上传超大文件导致OOM |

### 2.3 当前可用功能基线（Phase 0验收时必须全部保留）

以下功能在Phase 0-1结束后必须**100%可用**，作为回归测试基线：

1. **剧本生成**：`POST /api/ai/generate-full-script` — 输入创意/大纲，流式输出JSON结构剧本
2. **分镜拆分**：`POST /api/ai/split-scenes` — 输入单集剧本，输出分镜JSON数组
3. **角色提取**：`POST /api/ai/extract-characters` — 输入剧本，输出角色列表
4. **场景提取**：`POST /api/ai/extract-scenes` — 输入剧本，输出场景列表
5. **生图**：`POST /api/ai/generate-image` — 输入提示词，输出图片URL
6. **生视频**：`POST /api/ai/generate-video` — 输入参数，输出视频URL或taskId
7. **角色三视图**：`POST /api/ai/generate-character-views` — 输入角色描述，输出三视图
8. **合规检测**：`POST /api/ai/compliance-check` — 输入文本，输出检测结果
9. **一致性检查**：`POST /api/ai/consistency-check` — 输入角色列表，输出合并建议
10. **工作流画布**：`GET /workspace` — React Flow画布可渲染、节点可拖拽

---

## 三、开发原则与流程

### 3.1 分支策略（严格遵守）

```
main          ← 稳定分支，只有验收通过的代码才能合并
  ↓
hotfix/p0     ← Phase 0紧急修复分支（从main切出）
  ↓
feature/p1    ← Phase 1基础设施分支（从main切出，等hotfix合并后rebase）
```

**你必须**：
1. 每个Phase在独立分支开发
2. 每个任务提交1个commit，commit message格式：`[P0-1] fix: 删除seedance硬编码api key`
3. Phase结束后提供 `git diff main...current-branch` 的完整输出
4. 提供回滚命令：`git revert HEAD~N..HEAD` 或 `git reset --hard <tag>`

### 3.2 验收标准（每个任务必须满足）

- [ ] **代码审查**：TypeScript无any新增，无console.log（除logger.ts外）
- [ ] **安全扫描**：无密钥硬编码，无eval/Function/new Function
- [ ] **功能测试**：基线功能10项全部通过（提供curl测试命令）
- [ ] **构建测试**：`pnpm build` 无错误
- [ ] **数据库兼容**：如有schema变更，提供迁移SQL和回滚SQL

### 3.3 禁止事项

- ❌ 禁止在一个commit中修改多个不相关文件
- ❌ 禁止删除现有API路由（只能重构内部逻辑，保留路由入口）
- ❌ 禁止改变现有数据库表名和字段名（只能新增）
- ❌ 禁止修改现有shadcn/ui组件源码
- ❌ 禁止引入新的CSS框架或UI库
- ❌ 禁止在修复过程中"顺手优化"其他代码（严格按任务清单执行）

---

## 四、Phase 0：紧急修复（1-2天）

**分支**：`hotfix/p0-emergency`
**目标**：堵住安全漏洞和系统级bug，确保现有功能不崩溃
**基线保护**：上述10项功能必须全部可用

---

### 任务 P0-1：删除Seedance API Key硬编码

**问题描述**：
`src/lib/seedance-adapter.ts` 第14行硬编码了 `SEEDANCE_API_KEY = "sk-1cad4cf7..."`，该密钥已泄露，必须立即删除并改为环境变量读取。

**修复步骤**：

1. **打开文件**：`src/lib/seedance-adapter.ts`
2. **找到并删除**：
```typescript
// 删除这行（约第14行）
const SEEDANCE_API_KEY = "sk-1cad4cf7..."; // ← 删除此行
```
3. **替换为环境变量读取**：
```typescript
// 在文件顶部添加
const SEEDANCE_API_KEY = process.env.SEEDANCE_API_KEY;

if (!SEEDANCE_API_KEY) {
  throw new Error('SEEDANCE_API_KEY environment variable is required');
}
```
4. **检查所有使用该变量的地方**，确保没有其他地方硬编码了相同密钥
5. **在 `.env.example` 中添加**：
```
SEEDANCE_API_KEY=your_seedance_api_key_here
```
6. **在 `.env.local`（开发环境）和服务器环境变量中配置真实密钥**

**验收标准**：
```bash
# 测试命令
grep -r "sk-1cad4cf7" src/ 
# 预期输出：空（没有任何匹配）

grep -r "SEEDANCE_API_KEY" src/lib/seedance-adapter.ts
# 预期输出：显示从process.env读取的代码
```

**回滚命令**：
```bash
git revert <commit-hash-of-p0-1>
```

---

### 任务 P0-2：修复 workspace/page.tsx 代码完整性

**问题描述**：
`src/app/workspace/page.tsx` 文件可能存在截断或损坏（获取到的内容显示为片段如 `{zoom}%`），导致工作流画布页面无法渲染。

**修复步骤**：

1. **检查文件完整性**：
```bash
wc -l src/app/workspace/page.tsx
# 正常应该 > 500行，如果只有几十行则确认截断

tail -20 src/app/workspace/page.tsx
# 检查文件结尾是否是完整的代码（如 export default 或闭合括号）
```

2. **如果文件截断**：
   - 从Git历史恢复最近可用版本：
   ```bash
   git log --oneline -- src/app/workspace/page.tsx
   # 找到上一个完整版本的commit hash
   git show <hash>:src/app/workspace/page.tsx > src/app/workspace/page.tsx.bak
   # 对比当前文件和备份，确认备份更完整
   cp src/app/workspace/page.tsx.bak src/app/workspace/page.tsx
   ```

3. **如果文件完整但逻辑损坏**：
   - 检查React Flow相关导入是否完整：
   ```typescript
   import ReactFlow, { 
     Background, Controls, MiniMap, 
     useNodesState, useEdgesState, addEdge 
   } from '@xyflow/react';
   import '@xyflow/react/dist/style.css';
   ```
   - 检查是否有未闭合的JSX标签或括号
   - 检查是否有未定义的变量

4. **添加错误边界保护**（防止未来组件报错导致白屏）：
   在 `src/app/workspace/page.tsx` 中添加：
```typescript
'use client';

import { ErrorBoundary } from 'react-error-boundary'; // 如未安装则使用简单版本

// 简单错误边界组件（如不想引入新依赖）
function WorkspaceErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold text-red-600 mb-4">工作流画布加载失败</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        重试
      </button>
    </div>
  );
}

// 在页面组件外层包裹
export default function WorkspacePage() {
  return (
    <ErrorBoundary FallbackComponent={WorkspaceErrorFallback}>
      <WorkspaceCanvas />
    </ErrorBoundary>
  );
}

// 将原有page内容提取为WorkspaceCanvas组件
function WorkspaceCanvas() {
  // ...原有代码
}
```

**验收标准**：
```bash
# 构建测试
pnpm build
# 必须无错误

# 页面访问测试（开发环境）
curl http://localhost:3000/workspace
# 预期：返回HTML，不是500错误
```

**回滚命令**：
```bash
git checkout HEAD -- src/app/workspace/page.tsx
```

---

### 任务 P0-3：edit-video API添加权限校验和积分扣费

**问题描述**：
`src/app/api/ai/edit-video/route.ts` 直接使用 `process.env.DASHSCOPE_API_KEY`，没有用户登录校验、没有积分扣费、没有限流，任何人都可以调用。

**修复步骤**：

1. **打开文件**：`src/app/api/ai/edit-video/route.ts`
2. **在函数开头添加权限校验**（参考其他已校验的API如 `generate-video/route.ts`）：
```typescript
import { auth } from '@/lib/server-auth'; // 或现有认证方式
import { checkCredits, deductCredits } from '@/lib/credits';
import { rateLimit } from '@/lib/security/ai-rate-limiter';

export async function POST(req: Request) {
  // 1. 用户认证
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. 限流检查
  const rateLimitResult = await rateLimit(userId, 'edit-video');
  if (!rateLimitResult.allowed) {
    return Response.json({ 
      error: 'Rate limit exceeded', 
      code: 'RATE_LIMITED',
      retryAfter: rateLimitResult.retryAfter 
    }, { status: 429 });
  }

  // 3. 积分检查（编辑视频消耗50积分，参考model_pricing表）
  const requiredCredits = 50;
  const hasCredits = await checkCredits(userId, requiredCredits);
  if (!hasCredits) {
    return Response.json({ 
      error: 'Insufficient credits', 
      code: 'INSUFFICIENT_CREDITS',
      required: requiredCredits 
    }, { status: 403 });
  }

  // ...原有逻辑

  try {
    // ...原有API调用逻辑

    // 4. 成功后扣费
    await deductCredits(userId, requiredCredits, 'edit-video', { 
      model: 'video-edit',
      duration: params.duration 
    });

    return Response.json({ success: true, result });
  } catch (error) {
    // 5. 统一错误处理
    console.error('Edit video error:', error);
    return Response.json({ 
      error: 'Video editing failed', 
      code: 'EDIT_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

3. **如果 `auth()` 或 `checkCredits` 不存在**：
   - 检查 `src/lib/server-auth.ts` 和 `src/lib/credits.ts` 是否存在
   - 如果存在但接口不同，适配现有接口
   - 如果不存在，使用 `src/app/api/ai/generate-video/route.ts` 中的校验方式复制过来

**验收标准**：
```bash
# 测试1：未登录访问
curl -X POST http://localhost:3000/api/ai/edit-video   -H "Content-Type: application/json"   -d '{"videoUrl":"test","prompt":"test"}'
# 预期：401 Unauthorized

# 测试2：登录但积分不足（需要构造测试用户）
# 预期：403 Insufficient credits

# 测试3：正常调用（需要有效session和足够积分）
# 预期：正常返回，数据库points_transactions表有扣费记录
```

**回滚命令**：
```bash
git revert <commit-hash-of-p0-3>
```

---

### 任务 P0-4：3D生成API添加超时保护

**问题描述**：
`src/app/api/ai/generate-3d/route.ts` 中 `pollTaskResult` 同步轮询最多60次×5秒=300秒，阻塞Next.js请求线程，高并发下会耗尽服务器资源。

**修复步骤**：

1. **打开文件**：`src/app/api/ai/generate-3d/route.ts`
2. **找到轮询函数**，改为带最大超时保护：
```typescript
// 修改前（假设类似这样）：
// while (status !== 'completed' && retries < 60) {
//   await sleep(5000);
//   status = await queryTask(taskId);
//   retries++;
// }

// 修改后：
const MAX_POLLING_TIME = 120000; // 最大轮询2分钟（120秒）
const POLLING_INTERVAL = 5000;   // 每5秒查询一次
const MAX_RETRIES = Math.ceil(MAX_POLLING_TIME / POLLING_INTERVAL); // 24次

async function pollTaskResultWithTimeout(taskId: string): Promise<any> {
  const startTime = Date.now();
  let retries = 0;

  while (retries < MAX_RETRIES) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= MAX_POLLING_TIME) {
      throw new Error(`3D generation polling timeout after ${elapsed}ms. TaskId: ${taskId}`);
    }

    const result = await queryTask(taskId);

    if (result.status === 'completed') {
      return result;
    }

    if (result.status === 'failed') {
      throw new Error(`3D generation failed: ${result.errorMessage || 'Unknown error'}`);
    }

    retries++;
    await sleep(POLLING_INTERVAL);
  }

  throw new Error(`3D generation polling exceeded max retries (${MAX_RETRIES}). TaskId: ${taskId}`);
}
```

3. **在API路由中添加异步任务模式**（可选但推荐，如果改动太大则只做超时保护）：
```typescript
export async function POST(req: Request) {
  // ...原有参数解析

  try {
    // 提交任务
    const taskId = await submit3DTask(params);

    // 快速轮询前3次（15秒），如果未完成则返回taskId让前端轮询
    for (let i = 0; i < 3; i++) {
      await sleep(5000);
      const result = await queryTask(taskId);
      if (result.status === 'completed') {
        return Response.json({ success: true, url: result.url });
      }
      if (result.status === 'failed') {
        throw new Error(result.errorMessage);
      }
    }

    // 15秒后仍未完成，返回taskId让前端轮询
    return Response.json({ 
      success: true, 
      taskId,
      status: 'processing',
      message: '3D generation is processing, please query later'
    });

  } catch (error) {
    return Response.json({ 
      error: '3D generation failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 新增查询接口（如果还没有）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return Response.json({ error: 'taskId required' }, { status: 400 });
  }

  try {
    const result = await pollTaskResultWithTimeout(taskId);
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Polling failed' 
    }, { status: 500 });
  }
}
```

**验收标准**：
```bash
# 测试1：正常3D生成（快速完成）
curl -X POST http://localhost:3000/api/ai/generate-3d   -H "Content-Type: application/json"   -H "Cookie: session=..."   -d '{"prompt":"a red cube","style":"realistic"}'
# 预期：15秒内返回结果或taskId

# 测试2：查询任务状态
curl "http://localhost:3000/api/ai/generate-3d?taskId=xxx"
# 预期：返回任务状态，不会阻塞超过2分钟
```

**回滚命令**：
```bash
git revert <commit-hash-of-p0-4>
```

---

### 任务 P0-5：parse-document添加文件大小和格式限制

**问题描述**：
`src/app/api/ai/parse-document/route.ts` 使用 `require('pdf2json')`，在ESM环境下可能报错，且缺少文件大小限制和格式白名单，可被恶意上传超大文件导致内存溢出。

**修复步骤**：

1. **打开文件**：`src/app/api/ai/parse-document/route.ts`
2. **添加文件大小限制**（在文件解析前）：
```typescript
import { NextRequest } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided', code: 'NO_FILE' }, { status: 400 });
    }

    // 1. 文件类型检查
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ 
        error: 'Invalid file type', 
        code: 'INVALID_TYPE',
        allowedTypes: ALLOWED_TYPES 
      }, { status: 415 });
    }

    // 2. 文件大小检查
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ 
        error: 'File too large', 
        code: 'FILE_TOO_LARGE',
        maxSize: MAX_FILE_SIZE,
        providedSize: file.size 
      }, { status: 413 });
    }

    // 3. 将require改为动态导入（ESM兼容）
    let PDFParser;
    try {
      const pdf2json = await import('pdf2json');
      PDFParser = pdf2json.default || pdf2json;
    } catch (importError) {
      console.error('Failed to import pdf2json:', importError);
      return Response.json({ 
        error: 'PDF parser not available', 
        code: 'PARSER_UNAVAILABLE' 
      }, { status: 500 });
    }

    // ...原有解析逻辑

  } catch (error) {
    console.error('Parse document error:', error);
    return Response.json({ 
      error: 'Failed to parse document', 
      code: 'PARSE_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

3. **如果文件使用Buffer读取**，添加Buffer大小检查：
```typescript
const bytes = await file.arrayBuffer();
if (bytes.byteLength > MAX_FILE_SIZE) {
  return Response.json({ error: 'File too large' }, { status: 413 });
}
```

**验收标准**：
```bash
# 测试1：上传过大文件（>10MB）
curl -X POST http://localhost:3000/api/ai/parse-document   -F "file=@/path/to/huge_file.pdf"   -H "Cookie: session=..."
# 预期：413 File too large

# 测试2：上传不允许的格式（如.exe）
curl -X POST http://localhost:3000/api/ai/parse-document   -F "file=@/path/to/file.exe"   -H "Cookie: session=..."
# 预期：415 Invalid file type

# 测试3：上传正常PDF（<10MB）
# 预期：正常解析返回
```

**回滚命令**：
```bash
git revert <commit-hash-of-p0-5>
```

---

## 五、Phase 0 验收清单

Phase 0完成后，你必须提供以下交付物：

### 5.1 代码交付
```bash
# 提供完整的diff
git diff main...hotfix/p0-emergency > p0-diff.patch
```

### 5.2 测试报告
对每个基线功能提供curl测试命令和预期输出：

| # | 功能 | 测试命令 | 预期结果 |
|---|------|---------|---------|
| 1 | 剧本生成 | `curl -X POST .../generate-full-script` | 200 + SSE流 |
| 2 | 分镜拆分 | `curl -X POST .../split-scenes` | 200 + JSON分镜数组 |
| 3 | 角色提取 | `curl -X POST .../extract-characters` | 200 + 角色列表 |
| 4 | 场景提取 | `curl -X POST .../extract-scenes` | 200 + 场景列表 |
| 5 | 生图 | `curl -X POST .../generate-image` | 200 + 图片URL |
| 6 | 生视频 | `curl -X POST .../generate-video` | 200 + 视频URL/taskId |
| 7 | 角色三视图 | `curl -X POST .../generate-character-views` | 200 + 三视图URL |
| 8 | 合规检测 | `curl -X POST .../compliance-check` | 200 + 检测结果 |
| 9 | 一致性检查 | `curl -X POST .../consistency-check` | 200 + 合并建议 |
| 10 | 工作流画布 | `curl http://.../workspace` | 200 + HTML页面 |
| 11 | edit-video权限 | `curl -X POST .../edit-video` (无session) | 401 |
| 12 | 3D生成超时 | `curl -X POST .../generate-3d` | 不阻塞>2分钟 |
| 13 | parse-document大小 | `curl -F "file=@huge.pdf"` | 413 |

### 5.3 安全扫描报告
```bash
# 运行以下命令，提供输出
grep -r "sk-[a-zA-Z0-9]" src/ --include="*.ts" --include="*.tsx"
grep -r "require(" src/app/api/ --include="*.ts"
grep -r "eval\|Function\|new Function" src/ --include="*.ts" --include="*.tsx"
```
预期：
- 无硬编码API Key（环境变量读取除外）
- 无未处理的require（全部改为动态import）
- 无eval/Function/new Function

### 5.4 构建验证
```bash
pnpm install
pnpm build
# 必须0错误，0警告（TypeScript严格模式）
```

### 5.5 回滚方案
```bash
# 如果Phase 0出现问题，执行：
git checkout main
git branch -D hotfix/p0-emergency
# 或
git reset --hard v0.9.0-baseline
```

---

## 六、Phase 1 概要（供参考，不在Phase 0执行）

Phase 0验收通过后，进入Phase 1基础设施加固。主要任务：

| 任务 | 来源 | 说明 |
|------|------|------|
| P1-1 | drama-workshop | 补全Drizzle ORM schema.ts（全局素材库/角色多形象/用户设置） |
| P1-2 | AI Story | 接入Redis，替换内存限流器（限流/成本/熔断全部持久化） |
| P1-3 | 女娲优化 | 统一错误处理中间件（src/lib/api-error.ts） |
| P1-4 | LocalMiniDrama | 接入jsonrepair，替换所有正则JSON提取 |
| P1-5 | LocalMiniDrama | 接入p-limit，批量任务并发3路+重试3次 |
| P1-6 | drama-workshop | 拆分workspace/page.tsx为独立组件（单文件<10KB） |

---

## 七、你现在应该做什么

1. **确认当前分支是 `hotfix/p0-emergency`**（从main切出）
2. **按顺序执行 P0-1 → P0-2 → P0-3 → P0-4 → P0-5**
3. **每个任务完成后运行基线功能测试**
4. **全部完成后提供：diff文件 + 测试报告 + 构建截图 + 回滚命令**
5. **等待我验收后，再进入Phase 1**

**禁止**：
- 不要提前做Phase 1的任务
- 不要在修复P0-1时"顺手"优化其他代码
- 不要改变任何现有功能的接口契约（输入输出格式必须和之前一致）

---

*指令结束。请开始执行Phase 0。*
