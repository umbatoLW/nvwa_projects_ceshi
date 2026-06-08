# 女娲短剧创作平台 - 迁移指南

## 一、迁移包内容

已生成迁移包：`migration/nuwa-migration.tar.gz` (约 635KB)

包含内容：
- ✅ 完整源代码 (src/)
- ✅ 静态资源 (public/)
- ✅ 数据库表结构 (migration/schema.sql)
- ✅ 项目配置文件
- ✅ 设计规范文档

---

## 二、新账号操作步骤

### 步骤 1：下载迁移包
在当前账号下载 `migration/nuwa-migration.tar.gz`

### 步骤 2：新账号创建项目
1. 登录新账号的扣子 AI 编程平台
2. 创建新项目，选择 **Next.js** 模板
3. 等待项目初始化完成

### 步骤 3：上传代码
将迁移包解压，上传所有文件到新项目（覆盖默认文件）

### 步骤 4：执行数据库 SQL
在扣子控制台的数据库管理中，执行 `migration/schema.sql` 创建所有表

### 步骤 5：安装依赖并启动
```bash
pnpm install
pnpm dev
```

---

## 三、完整复原 AI 指令

在新账号的 AI 编程助手中发送以下指令：

```
请帮我复原"女娲短剧创作平台"项目。

## 项目背景
这是一个 AI 驱动的短剧创作工具，帮助用户从创意到成片的全流程创作。

## 技术栈
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui 组件库
- Supabase 数据库（扣子内置）
- coze-coding-dev-sdk（AI 能力）

## 核心功能模块
1. 创意输入 → AI 生成剧本大纲
2. 剧本编辑器（分集、场景、角色）
3. 角色一致性管理（角色圣经、参考图）
4. 分镜生成（文生图）
5. 积分系统
6. 用户设置

## 数据库表
已提供 schema.sql，包含 14 张表：
scripts, characters, assets, projects, workflows, generations,
user_credits, credit_transactions, model_pricing, user_settings,
admin_settings, platform_api_keys, chat_sessions, analytics_events

## 知识库系统
位于 src/lib/prompt-knowledge/，包含：
- 角色一致性知识库
- 逻辑一致性知识库
- 常见错误知识库
- 开篇规则知识库

## 请执行
1. 我会上传代码文件，请帮我解压并放置到正确位置
2. 执行 schema.sql 创建数据库表
3. 检查依赖是否完整
4. 启动项目验证
```

---

## 四、保留首页重新开发其他页面指令

如果只想保留首页样式，其他页面重新开发，使用以下指令：

```
请帮我基于女娲平台的首页样式，重新开发其他功能页面。

## 保留内容
请保留以下文件不变：
- src/app/page.tsx（首页）
- src/app/globals.css（全局样式，特别是首页视频轮播相关）
- src/app/layout.tsx（根布局）
- DESIGN.md（设计规范）

## 设计风格参考
根据 DESIGN.md 中的毛玻璃风格：
- 背景：#070A14
- 玻璃层：rgba(255,255,255,.08)
- 主色：#7C5CFF
- 强调色：#69E7FF
- 文本：#F7FAFF / #9AA7C7

## 需要重新开发的页面
1. /dashboard - 仪表盘（统计卡片、快捷操作）
2. /scripts - 剧本库列表
3. /scripts/[id] - 剧本详情页（编辑器、分镜、角色等 Tab）
4. /characters - 角色库
5. /assets - 资产库
6. /workspace - 工作区画布（React Flow）
7. /settings - 设置页

## 核心功能需求
1. AI 剧本生成（调用 coze-coding-dev-sdk）
2. 流式输出（SSE）
3. 角色一致性（角色圣经）
4. 分镜生图
5. 积分系统

## 数据库
已提供 schema.sql，请先执行创建表结构。

## 请使用 shadcn/ui 组件
项目已配置 shadcn/ui，位于 src/components/ui/

请按照以上要求，先创建基础页面结构，再逐步实现功能。
```

---

## 五、文件清单核对

迁移前请核对以下关键文件：

| 类别 | 文件 | 必须 |
|------|------|------|
| 配置 | package.json | ✅ |
| 配置 | tsconfig.json | ✅ |
| 配置 | next.config.ts | ✅ |
| 配置 | .coze | ✅ |
| 规范 | AGENTS.md | ✅ |
| 规范 | DESIGN.md | ✅ |
| 数据库 | migration/schema.sql | ✅ |
| 首页 | src/app/page.tsx | ✅ |
| 布局 | src/app/layout.tsx | ✅ |
| 样式 | src/app/globals.css | ✅ |
| 知识库 | src/lib/prompt-knowledge/* | ✅ |
| API | src/app/api/** | ✅ |

---

## 六、注意事项

1. **数据库凭证**：扣子新账号会自动提供新的 Supabase 凭证，无需手动配置

2. **环境变量**：以下变量由扣子平台自动注入：
   - `COZE_SUPABASE_URL`
   - `COZE_SUPABASE_ANON_KEY`
   - `COZE_PROJECT_DOMAIN_DEFAULT`
   - `DEPLOY_RUN_PORT`

3. **AI 服务**：通过 `coze-coding-dev-sdk` 调用，无需配置 API Key

4. **对象存储**：使用扣子内置存储，无需额外配置

---

完成迁移后，项目即可在新账号正常运行！
