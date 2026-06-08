# 女娲平台迁移文件清单

## 一、核心代码目录（必须打包）

### 1. 源代码 `src/`
```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # 后端 API 路由
│   ├── dashboard/            # 仪表盘页面
│   ├── scripts/              # 剧本管理页面
│   ├── characters/           # 角色管理页面
│   ├── assets/               # 资产管理页面
│   ├── workspace/            # 工作区页面
│   ├── settings/             # 设置页面
│   ├── page.tsx              # 首页
│   ├── layout.tsx            # 根布局
│   └── globals.css           # 全局样式
├── components/               # React 组件
│   ├── ui/                   # shadcn/ui 组件库
│   ├── script-chat/          # 剧本对话组件
│   ├── storyboard/           # 分镜相关组件
│   └── ...其他组件
├── lib/                      # 工具库
│   ├── prompt-knowledge/     # 知识库（核心！）
│   ├── character/            # 角色一致性
│   ├── credits.ts            # 积分系统
│   └── ...其他工具
├── hooks/                    # 自定义 Hooks
└── storage/                  # 存储层
```

### 2. 配置文件（必须）
```
package.json                  # 依赖配置
tsconfig.json                 # TypeScript 配置
next.config.ts                # Next.js 配置
tailwind.config.ts            # Tailwind 配置
postcss.config.mjs            # PostCSS 配置
.coze                         # 扣子部署配置
AGENTS.md                     # 项目规范文档
DESIGN.md                     # 设计规范文档
```

### 3. 静态资源
```
public/                       # 静态文件
  ├── images/                 # 图片资源
  ├── icons/                  # 图标
  └── fonts/                  # 字体文件
```

### 4. 迁移文件
```
migration/
  └── schema.sql              # 数据库表结构
```

## 二、不需要打包的目录

```
node_modules/                 # 依赖包（新账号重新安装）
.next/                        # 构建缓存
.git/                         # Git历史（可选保留）
app/work/logs/                # 日志文件
```

## 三、打包命令

在项目根目录执行：
```bash
# 创建迁移包（排除不必要的文件）
zip -r nuwa-migration.zip \
  src/ \
  public/ \
  migration/ \
  package.json \
  package-lock.json \
  tsconfig.json \
  next.config.ts \
  tailwind.config.ts \
  postcss.config.mjs \
  .coze \
  AGENTS.md \
  DESIGN.md \
  components.json \
  -x "node_modules/*" \
  -x ".next/*" \
  -x "*.log"
```

## 四、新账号操作步骤

1. 创建新项目（选择 Next.js 模板）
2. 上传解压代码文件
3. 在扣子控制台执行 `migration/schema.sql`
4. 安装依赖：`pnpm install`
5. 启动项目：`pnpm dev`

## 五、数据库表清单

共 14 张表：
1. scripts - 剧本表
2. characters - 角色表
3. assets - 资产表
4. projects - 项目表
5. workflows - 工作流表
6. generations - 生成记录表
7. user_credits - 用户积分表
8. credit_transactions - 积分交易表
9. model_pricing - 模型定价表
10. user_settings - 用户设置表
11. admin_settings - 管理员设置表
12. platform_api_keys - 平台API密钥表
13. chat_sessions - 聊天会话表
14. analytics_events - 分析事件表

## 六、核心依赖包

关键依赖（package.json 中已定义）：
- next: 16.x
- react: 19.x
- typescript: 5.x
- @radix-ui/* (shadcn/ui 基础)
- coze-coding-dev-sdk (AI 能力)
- @supabase/supabase-js (数据库)
- reactflow (工作区画布)
- framer-motion (动效)
