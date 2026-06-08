# NVWA 女娲平台 P3 全链路审查报告

> 审查时间：2026-06-04
> 审查范围：前端路由、后端 API、组件映射、状态管理

---

## 一、审查结果概览

| 审查项 | 状态 | 问题数 | 优先级 |
|--------|------|--------|--------|
| 前端路由结构 | ⚠️ 部分通过 | 6 | P1 |
| 组件映射 | ⚠️ 部分通过 | 4 | P2 |
| API 端点映射 | ✅ 通过 | 0 | - |
| 状态管理 | ⚠️ 部分通过 | 1 | P3 |
| 后端 API 路由 | ⚠️ 部分通过 | 12 | P1 |
| 静态检查 | ✅ 通过 | 0 | - |

**总计问题：23 个**

---

## 二、前端审查详情

### 2.1 路由结构审查

**问题清单**：

| 序号 | 问题描述 | 文件路径 | 优先级 |
|------|---------|---------|--------|
| F-1 | 缺失子路由：scripts/[id]/chat | src/app/scripts/[id]/chat/page.tsx | P1 |
| F-2 | 缺失子路由：scripts/[id]/storyboard | src/app/scripts/[id]/storyboard/page.tsx | P1 |
| F-3 | 缺失子路由：scripts/[id]/assets | src/app/scripts/[id]/assets/page.tsx | P1 |
| F-4 | 缺失子路由：scripts/[id]/roles | src/app/scripts/[id]/roles/page.tsx | P1 |
| F-5 | 缺失子路由：scripts/[id]/optimize | src/app/scripts/[id]/optimize/page.tsx | P1 |
| F-6 | 缺失子路由：scripts/[id]/redline | src/app/scripts/[id]/redline/page.tsx | P1 |

**说明**：当前 scripts/[id]/page.tsx 通过 View 切换实现多视图，未拆分为独立路由。

### 2.2 组件映射审查

**问题清单**：

| 序号 | 问题描述 | 文件路径 | 大小 | 优先级 |
|------|---------|---------|------|--------|
| C-1 | 组件过大：StoryboardCard.tsx | src/components/StoryboardCard.tsx | 41KB | P2 |
| C-2 | 组件过大：node-components.tsx | src/components/workspace/node-components.tsx | 30KB | P2 |
| C-3 | 组件过大：ScriptChatPanel.tsx | src/components/script-chat/ScriptChatPanel.tsx | 16KB | P2 |
| C-4 | 组件过大：FiveDimensionScoreCard.tsx | src/components/script-generation/FiveDimensionScoreCard.tsx | 15KB | P2 |

**已拆分组件**：
- ✅ ScriptJsonRenderer.tsx → renderers/ 子目录
- ✅ ScriptEditor.tsx → script-editor/types.ts
- ✅ ThreeStageProgress.tsx → progress/ 子目录

### 2.3 状态管理审查

**问题清单**：

| 序号 | 问题描述 | 优先级 |
|------|---------|--------|
| S-1 | ScriptPageContext 已创建但未实际应用 | P3 |

**说明**：ScriptPageContext.tsx 已创建，定义了统一状态结构和 reducer，但尚未在 layout.tsx 中包裹 Provider。

---

## 三、后端审查详情

### 3.1 API 路由完整性审查

**问题清单**：

| 序号 | 问题描述 | 预期路径 | 优先级 |
|------|---------|---------|--------|
| A-1 | 缺失 API：optimize-dialogue | /api/ai/optimize-dialogue | P1 |
| A-2 | 缺失 API：generate-subtitles | /api/ai/generate-subtitles | P2 |
| A-3 | 缺失 API：generate-bgm | /api/ai/generate-bgm | P2 |
| A-4 | 缺失 API：export-docx | /api/ai/export-docx | P2 |
| A-5 | 缺失 API：export-pdf | /api/ai/export-pdf | P2 |
| A-6 | 缺失 API：export-csv | /api/ai/export-csv | P2 |
| A-7 | 缺失 API：composite-video | /api/ai/composite-video | P1 |
| A-8 | 缺失 API：semantic-search | /api/ai/semantic-search | P2 |
| A-9 | 缺失 API：search-assets | /api/ai/search-assets | P2 |
| A-10 | 缺失 API：redline-compare | /api/ai/redline-compare | P1 |
| A-11 | 缺失 API：switch-model | /api/ai/switch-model | P2 |
| A-12 | 缺失 API：generate-storyboard-batch | /api/ai/generate-storyboard-batch | P1 |

**已存在 API**：
- ✅ /api/ai/generate-character
- ✅ /api/ai/generate-character-views
- ✅ /api/ai/consistency-check
- ✅ /api/ai/optimize-prompt
- ✅ /api/ai/execute-node
- ✅ /api/ai/batch-extract
- ✅ /api/ai/analyze-episodes
- ✅ /api/ai/compliance-check

---

## 四、修复优先级排序

### P1 级（阻塞功能）

| 问题 | 影响 | 建议修复方案 |
|------|------|-------------|
| F-1~F-6 缺失子路由 | 无法直接访问子视图 URL | 创建子路由 page.tsx 或保持当前 View 切换模式 |
| A-1 optimize-dialogue | 对话优化功能不可用 | 创建 API 路由 |
| A-7 composite-video | 视频合成功能不可用 | 创建 API 路由 |
| A-10 redline-compare | 修改痕迹对比不可用 | 创建 API 路由 |
| A-12 generate-storyboard-batch | 批量分镜不可用 | 创建 API 路由 |

### P2 级（影响体验）

| 问题 | 影响 | 建议修复方案 |
|------|------|-------------|
| C-1~C-4 组件过大 | 维护困难，性能影响 | 进一步拆分组件 |
| A-2~A-6, A-8~A-9, A-11 缺失 API | 导出/搜索/字幕等功能不可用 | 创建 API 路由 |

### P3 级（技术债务）

| 问题 | 影响 | 建议修复方案 |
|------|------|-------------|
| S-1 ScriptPageContext 未应用 | 状态管理未简化 | 在 layout.tsx 中包裹 Provider |

---

## 五、审查结论

### 通过项
- ✅ 静态检查通过（tsc --noEmit）
- ✅ API 端点映射正确（前端调用的 API 后端都有）
- ✅ 核心组件已拆分（ScriptJsonRenderer, ScriptEditor, ThreeStageProgress）
- ✅ 核心功能 API 已实现（generate-character, consistency-check 等）

### 待修复项
- ⚠️ 6 个子路由缺失（当前使用 View 切换，功能可用但 URL 不变）
- ⚠️ 12 个 P3 API 缺失（部分功能不可用）
- ⚠️ 4 个组件超过 10KB（待进一步拆分）

### 建议
1. **子路由问题**：当前 View 切换模式功能完整，可保持现状；若需独立 URL 访问，再创建子路由
2. **API 缺失问题**：按优先级创建缺失 API，P1 级优先处理
3. **组件拆分问题**：渐进式拆分，优先处理 node-components.tsx

---

## 六、验证命令

```bash
# 静态检查
pnpm ts-check

# 构建检查
pnpm build

# 服务启动
pnpm dev
```

验证结果：✅ 全部通过
