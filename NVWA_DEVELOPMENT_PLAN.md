# NVWA 平台开发计划

> 版本：v1.0.0  
> 日期：2026-05-06  
> 状态：进行中

---

## 1. 开发阶段

### Phase 1: 修复与完善（P0）

**目标：修复现有项目的BUG，完善核心功能**

| 任务 | 优先级 | 状态 | 说明 |
|------|--------|------|------|
| 修复分镜表格自动分镜问题 | P0 | 🔴 进行中 | 分镜节点无法接收上游数据 |
| 完善节点数据流转逻辑 | P0 | 🔴 进行中 | 节点间数据传递 |
| 修复工作流画布拖拽问题 | P1 | 🟡 待处理 | React Flow配置 |
| 完善API接口 | P1 | 🟡 待处理 | 前后端对接 |

### Phase 2: 核心功能开发（P1）

**目标：基于开源项目开发核心模块**

| 任务 | 优先级 | 状态 | 参考项目 |
|------|--------|------|----------|
| 工作流引擎开发 | P0 | 🟡 待处理 | drama-workshop |
| 剧本生成模块 | P0 | 🟡 待处理 | short-drama + ViMax |
| 分镜自动拆分 | P0 | 🟡 待处理 | drama-workshop + Toonflow |
| 角色一致性管理 | P1 | 🟡 待处理 | StoryDiffusion + AutoStory |
| 图像生成集成 | P1 | 🟡 待处理 | Story-Flicks + ViMax |
| 视频生成集成 | P1 | 🟡 待处理 | SkyReels + ViMax |

### Phase 3: 高级功能（P2）

**目标：完善高级功能**

| 任务 | 优先级 | 状态 | 说明 |
|------|--------|------|------|
| 用户系统 | P1 | 🟡 待处理 | 注册/登录/权限 |
| 积分系统 | P2 | ⚪ 待处理 | 积分消耗/会员 |
| 团队协作 | P2 | ⚪ 待处理 | 团队管理/权限 |
| 项目管理 | P1 | 🟡 待处理 | CRUD |
| 素材管理 | P2 | ⚪ 待处理 | 素材库 |

### Phase 4: 优化与部署（P3）

**目标：性能优化与部署**

| 任务 | 优先级 | 状态 | 说明 |
|------|--------|------|------|
| 前端优化 | P2 | ⚪ 待处理 | 性能/体验 |
| 后端优化 | P2 | ⚪ 待处理 | 缓存/队列 |
| 部署文档 | P1 | ⚪ 待处理 | Docker/K8s |
| 监控日志 | P3 | ⚪ 待处理 | 日志/监控 |

---

## 2. 每日开发任务

### 2026-05-06 下午

#### 2.1 开源项目分析 ✅

- [x] 分析GitHub_Clone表格
- [x] 收集16个开源项目
- [x] 分析核心架构和代码

#### 2.2 技术架构设计 ✅

- [x] 创建NVWA_TECHNICAL_ARCHITECTURE.md
- [x] 设计系统架构
- [x] 设计数据库结构
- [x] 设计API接口
- [x] 设计工作流引擎

#### 2.3 创建开发计划 ✅

- [x] 创建NVWA_DEVELOPMENT_PLAN.md
- [x] 制定开发阶段
- [x] 制定每日任务

---

## 3. Bug修复清单

### 3.1 分镜表格自动分镜问题 ✅ 已修复

**问题描述：**
- 分镜节点无法接收上游节点的剧本数据
- 拆分后的分镜数据无法显示
- 分镜数据无法传递到下一个节点

**原因分析：**
- 数据传递逻辑缺失
- 节点间数据格式不匹配
- 状态管理问题
- **useEffect依赖数组不完整**
- **数据竞态条件**

**解决方案：**
1. ✅ 实现节点间的数据传递机制
2. ✅ 统一数据格式
3. ✅ 完善状态管理
4. ✅ 修复useEffect依赖数组
5. ✅ 使用useRef确保使用最新数据
6. ✅ 添加详细调试日志

**修复文件：**
- `/workspace/projects/nvwa/src/components/workspace/nodes/ScriptSplitNode.tsx`
- `/workspace/projects/nvwa/src/components/workspace/WorkflowCanvas.tsx`

### 3.2 其他已知问题

| 问题 | 描述 | 优先级 |
|------|------|--------|
| 分镜无法自动分镜 | 点击拆分按钮无反应 | P0 |
| 角色一致性差 | 多次生成角色不一致 | P1 |
| 视频生成失败 | API调用错误 | P1 |
| 工作流保存失败 | 数据持久化问题 | P1 |

---

## 4. 代码规范

### 4.1 命名规范

```typescript
// 文件命名
// 组件: PascalCase
StoryInputNode.tsx
ScriptSplitNode.tsx

// Hooks: camelCase + use前缀
useWorkflow.ts
useProject.ts

// 工具函数: camelCase
formatDate.ts
validateSchema.ts

// 类型/接口: PascalCase
interface StoryNode {}
type WorkflowEdge = {}

// 常量: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 100 * 1024 * 1024;
```

### 4.2 组件规范

```tsx
// 组件模板
'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  className?: string;
  onAction?: (data: unknown) => void;
}

export function Component({ className, onAction }: ComponentProps) {
  const [state, setState] = useState<string>('');
  
  const handleClick = useCallback(() => {
    onAction?.(state);
  }, [state, onAction]);
  
  return (
    <div className={cn('component', className)}>
      <button onClick={handleClick}>
        Action
      </button>
    </div>
  );
}
```

### 4.3 API规范

```typescript
// 请求格式
interface ApiRequest<T = unknown> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  data?: T;
  params?: Record<string, string>;
}

// 响应格式
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

---

## 5. Git提交规范

```bash
# 格式
<type>(<scope>): <subject>

# 示例
feat(workflow): add script split node
fix(shots): resolve auto-split issue
docs(readme): update installation guide
refactor(api): simplify request handling
```

**Type类型：**
- feat: 新功能
- fix: Bug修复
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试
- chore: 构建/工具

---

## 6. 代码审查清单

### 6.1 功能检查

- [ ] 功能是否符合需求
- [ ] 边界条件是否处理
- [ ] 错误处理是否完善
- [ ] 是否有性能问题

### 6.2 代码质量

- [ ] 命名是否清晰
- [ ] 注释是否完整
- [ ] 是否遵循规范
- [ ] 是否有重复代码

### 6.3 测试

- [ ] 单元测试是否通过
- [ ] 集成测试是否通过
- [ ] E2E测试是否通过

---

## 7. 进度追踪

### 7.1 整体进度

```
Phase 1: 修复与完善 [====          ] 25%
Phase 2: 核心功能开发 [              ] 0%
Phase 3: 高级功能 [                 ] 0%
Phase 4: 优化与部署 [               ] 0%
```

### 7.2 今日完成

- [x] 分析16个开源项目
- [x] 创建技术架构文档
- [x] 创建开发计划文档
- [ ] 分析当前项目BUG
- [ ] 修复分镜自动分镜问题

---

**下次更新：完成BUG修复后**
