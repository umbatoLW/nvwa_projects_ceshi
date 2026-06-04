
# 女娲(NVWA) — P2-8 最小前端适配指令（独立执行）

> 执行时机：P2-1 ~ P2-7 全部完成后，作为P2阶段最后一个任务执行
> 原则：不改整体UI、不加新页面、不改主题颜色、只改现有组件解析逻辑
> 预计工期：4-6小时
> 分支：在 feature/p2-script-knowledge 分支上直接commit，标记为 [P2-8]

---

## 一、禁止事项（严格遵守）

- ❌ 禁止创建新页面（不新增 /review、/quality 等路由）
- ❌ 禁止修改整体布局（不改侧边栏、顶部导航、底部footer）
- ❌ 禁止修改主题颜色（保持现有黑底#000、青边#06b6d4、白字#fff）
- ❌ 禁止引入新UI库（只用现有 shadcn/ui + Tailwind + Lucide React）
- ❌ 禁止修改按钮位置、表单结构、画布尺寸
- ✅ 只允许：在现有组件内部增加解析逻辑、条件渲染、折叠面板

---

## 二、任务清单

---

### 子任务 P2-8.1：三阶段进度展示（改造现有SSE解析）

**目标**：让用户在点击【生成剧本】后，看到具体的生成阶段（构建对话→设计大纲→撰写第N集），而不是模糊的"正在生成..."

**修改文件**：找到前端处理 `/api/ai/generate-full-script` SSE 流的组件（通常是剧本生成页面或对话框组件）

**假设当前代码结构**（根据女娲现有架构推断，请Coze根据实际代码调整）：

```typescript
// 当前可能的SSE处理代码（在剧本生成组件中）
// 文件位置可能是：src/app/scripts/generate/page.tsx 或 src/components/script-generator.tsx

const [script, setScript] = useState<any>(null);
const [loading, setLoading] = useState(false);
const [progressText, setProgressText] = useState('正在生成...');

const generateScript = async (params: any) => {
  setLoading(true);
  setProgressText('正在生成...');

  const response = await fetch('/api/ai/generate-full-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          // ❌ 旧逻辑：只处理最终内容
          if (data.content) {
            setScript(data.content);
          }

        } catch (e) {
          // ignore parse error
        }
      }
    }
  }

  setLoading(false);
};
```

**改造后代码**：

```typescript
// 新增状态（在现有state区域添加，不删除原有state）
const [generationStage, setGenerationStage] = useState<'idle' | 'stage1' | 'stage2' | 'stage3' | 'complete' | 'error'>('idle');
const [stageProgress, setStageProgress] = useState({
  currentEpisode: 0,
  totalPreview: 3,
  stageName: '',
  stageMessage: '',
});
const [outline, setOutline] = useState<any>(null); // 大纲预览（可选）
const [episodes, setEpisodes] = useState<any[]>([]); // 逐集预览
const [reviewWarning, setReviewWarning] = useState<string | null>(null);

// 改造SSE解析逻辑（在原有fetch处理中替换data解析部分）
for (const line of lines) {
  if (line.startsWith('data: ')) {
    try {
      const data = JSON.parse(line.slice(6));

      // ✅ 新逻辑：识别stage字段
      if (data.stage) {
        switch (data.stage) {
          case 'stage1':
            setGenerationStage('stage1');
            if (data.status === 'running') {
              setStageProgress(prev => ({ ...prev, stageName: '核心对话', stageMessage: data.message || '正在构建角色对话片段...' }));
            } else if (data.status === 'completed') {
              setStageProgress(prev => ({ ...prev, stageName: '核心对话', stageMessage: '角色对话构建完成' }));
              // 可选：保存对话预览
              if (data.data?.dialogues) {
                console.log('Dialogues:', data.data.dialogues);
              }
            }
            break;

          case 'stage2':
            setGenerationStage('stage2');
            if (data.status === 'running') {
              setStageProgress(prev => ({ ...prev, stageName: '故事大纲', stageMessage: data.message || '正在设计完整故事大纲...' }));
            } else if (data.status === 'completed') {
              setStageProgress(prev => ({ ...prev, stageName: '故事大纲', stageMessage: '大纲设计完成' }));
              if (data.data) {
                setOutline(data.data); // 保存大纲供预览
              }
            }
            break;

          case 'stage3':
            setGenerationStage('stage3');
            if (data.status === 'running' || data.status === 'progress') {
              setStageProgress(prev => ({
                ...prev,
                stageName: '逐集撰写',
                stageMessage: data.message || `正在撰写第${data.currentEpisode || 1}集...`,
                currentEpisode: data.currentEpisode || prev.currentEpisode,
                totalPreview: data.totalPreview || prev.totalPreview,
              }));
            } else if (data.status === 'episode_complete') {
              setStageProgress(prev => ({
                ...prev,
                stageName: '逐集撰写',
                stageMessage: `第${data.currentEpisode}集撰写完成`,
                currentEpisode: data.currentEpisode,
              }));
              if (data.episode) {
                setEpisodes(prev => [...prev, data.episode]);
              }
            }
            break;

          case 'review_warning':
            // 质量评分警告
            if (data.review) {
              setReviewWarning(`前3集评分 ${data.review.total}分（${data.review.rating}），${data.message || '建议优化后再继续'}`);
            }
            break;

          case 'complete':
            setGenerationStage('complete');
            setStageProgress(prev => ({ ...prev, stageName: '完成', stageMessage: '剧本生成完成！' }));
            if (data.data) {
              setScript(data.data);
            }
            break;

          case 'error':
            setGenerationStage('error');
            setStageProgress(prev => ({ ...prev, stageName: '错误', stageMessage: data.error || '生成失败' }));
            break;
        }
      }

      // 保留旧逻辑兼容（如果后端仍返回content）
      if (data.content && !data.stage) {
        setScript(data.content);
      }

    } catch (e) {
      // ignore parse error
    }
  }
}

// 重置函数（在重新生成时调用）
const resetGeneration = () => {
  setGenerationStage('idle');
  setStageProgress({ currentEpisode: 0, totalPreview: 3, stageName: '', stageMessage: '' });
  setOutline(null);
  setEpisodes([]);
  setReviewWarning(null);
  setScript(null);
};
```

**UI渲染改造**（在现有加载/进度展示区域，通常是进度条或loading文字下方）：

```tsx
{/* 在原有loading区域替换或补充 */}
{loading && (
  <div className="w-full space-y-3">
    {/* 阶段指示器 */}
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${
          generationStage === 'stage1' ? 'bg-cyan-400 animate-pulse' :
          generationStage === 'stage2' || generationStage === 'stage3' || generationStage === 'complete' ? 'bg-green-400' :
          'bg-gray-600'
        }`} />
        <span className={generationStage === 'stage1' ? 'text-cyan-400' : 'text-gray-400'}>对话</span>
      </div>
      <div className="w-4 h-px bg-gray-700" />
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${
          generationStage === 'stage2' ? 'bg-cyan-400 animate-pulse' :
          generationStage === 'stage3' || generationStage === 'complete' ? 'bg-green-400' :
          'bg-gray-600'
        }`} />
        <span className={generationStage === 'stage2' ? 'text-cyan-400' : 'text-gray-400'}>大纲</span>
      </div>
      <div className="w-4 h-px bg-gray-700" />
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${
          generationStage === 'stage3' ? 'bg-cyan-400 animate-pulse' :
          generationStage === 'complete' ? 'bg-green-400' :
          'bg-gray-600'
        }`} />
        <span className={generationStage === 'stage3' ? 'text-cyan-400' : 'text-gray-400'}>剧本</span>
      </div>
    </div>

    {/* 当前阶段详情 */}
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800">
      {generationStage === 'stage1' && <MessageSquare className="w-5 h-5 text-cyan-400 animate-pulse" />}
      {generationStage === 'stage2' && <FileText className="w-5 h-5 text-cyan-400 animate-pulse" />}
      {generationStage === 'stage3' && <BookOpen className="w-5 h-5 text-cyan-400 animate-pulse" />}
      {generationStage === 'complete' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
      {generationStage === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}

      <div className="flex-1">
        <div className="text-sm font-medium text-white">
          {stageProgress.stageName || '准备中'}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {stageProgress.stageMessage}
          {generationStage === 'stage3' && stageProgress.totalPreview > 0 && (
            <span className="ml-2 text-cyan-400">
              ({stageProgress.currentEpisode}/{stageProgress.totalPreview})
            </span>
          )}
        </div>
      </div>

      {/* 进度条（仅stage3显示） */}
      {generationStage === 'stage3' && stageProgress.totalPreview > 0 && (
        <div className="w-24">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${(stageProgress.currentEpisode / stageProgress.totalPreview) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>

    {/* 质量警告 */}
    {reviewWarning && (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-950/30 border border-yellow-900/50">
        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
        <div className="text-xs text-yellow-400">{reviewWarning}</div>
      </div>
    )}
  </div>
)}
```

**需要引入的图标**（如果现有组件没有）：
```typescript
import { MessageSquare, FileText, BookOpen, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
```

**验收标准**：
```bash
# 1. 构建测试
pnpm build
# 预期：0错误

# 2. 功能测试
# 点击【生成剧本】
# 预期：
# - 首先显示 "对话" 节点闪烁，文字"正在构建角色对话片段..."
# - 然后 "大纲" 节点闪烁，文字"正在设计完整故事大纲..."
# - 然后 "剧本" 节点闪烁，文字"正在撰写第1集..." → "第2集..." → "第3集..."
# - 每个阶段切换时，前面的节点变成绿色完成状态
# - stage3 显示进度条 (1/3) → (2/3) → (3/3)
# - 如果评分<30分，显示黄色警告条
# - 完成后 "剧本" 节点变绿，显示"剧本生成完成！"

# 3. 兼容性测试
# 如果后端返回旧格式（无stage字段，只有content）
# 预期：仍然正常显示内容，不报错
```

---

### 子任务 P2-8.2：五维度评分卡片（在现有剧本预览区添加折叠面板）

**目标**：用户在生成剧本后，能在剧本内容下方看到"剧本质量评分"的可折叠卡片，包含5个维度分数和优化建议。

**修改文件**：找到显示剧本内容的组件（通常是 `ScriptPreview`、`ScriptDetail` 或 `page.tsx` 中的剧本展示区域）

**假设当前剧本展示代码**：

```tsx
// 当前可能的剧本展示代码
<div className="space-y-4">
  <h2 className="text-xl font-bold text-white">{script.title}</h2>
  <div className="text-gray-300 whitespace-pre-wrap">{script.content}</div>
  {/* ...其他信息... */}
</div>
```

**改造后代码**（在 `script.content` 下方插入）：

```tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Star, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

// 在剧本展示组件中新增state
const [reviewOpen, setReviewOpen] = useState(false);

// 假设 review 数据来自后端（通过props或state传入）
// 如果P2-3的review-script API还没接入，可以先mock数据测试UI
const review = script?.review; // 或从单独API获取

{/* 在剧本内容下方插入 */}
{review && (
  <div className="mt-6 border border-gray-800 rounded-lg overflow-hidden">
    {/* 评分卡片头部（始终可见） */}
    <button
      onClick={() => setReviewOpen(!reviewOpen)}
      className="w-full flex items-center justify-between p-4 bg-gray-900/80 hover:bg-gray-900 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
          review.total >= 45 ? 'bg-green-500/20 text-green-400' :
          review.total >= 38 ? 'bg-blue-500/20 text-blue-400' :
          review.total >= 30 ? 'bg-yellow-500/20 text-yellow-400' :
          review.total >= 25 ? 'bg-orange-500/20 text-orange-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {review.total}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-white">
            剧本质量评分
            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
              review.total >= 45 ? 'bg-green-500/20 text-green-400' :
              review.total >= 38 ? 'bg-blue-500/20 text-blue-400' :
              review.total >= 30 ? 'bg-yellow-500/20 text-yellow-400' :
              review.total >= 25 ? 'bg-orange-500/20 text-orange-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {review.rating}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {review.total >= 45 ? '可直接投流，具备爆款潜质' :
             review.total >= 38 ? '质量优秀，微调后可投流' :
             review.total >= 30 ? '基本可用，需针对性修改' :
             review.total >= 25 ? '问题较多，需大幅修改' :
             '建议重新创作'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {review.issues?.length > 0 && (
          <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
            {review.issues.length} 个问题
          </span>
        )}
        {reviewOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </button>

    {/* 评分详情（折叠内容） */}
    {reviewOpen && (
      <div className="p-4 space-y-4 border-t border-gray-800">
        {/* 五维度雷达图（简化版：用5个横向条形图代替） */}
        <div className="space-y-3">
          {[
            { key: 'rhythm', label: '节奏', icon: TrendingUp, color: 'bg-cyan-400' },
            { key: 'satisfaction', label: '爽点', icon: Star, color: 'bg-yellow-400' },
            { key: 'dialogue', label: '台词', icon: MessageSquare, color: 'bg-purple-400' },
            { key: 'format', label: '格式', icon: FileText, color: 'bg-blue-400' },
            { key: 'continuity', label: '连贯', icon: CheckCircle2, color: 'bg-green-400' },
          ].map(({ key, label, icon: Icon, color }) => {
            const score = review[key as keyof typeof review] as number;
            return (
              <div key={key} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="w-12 text-xs text-gray-400 shrink-0">{label}</div>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${score * 10}%` }}
                  />
                </div>
                <div className={`w-8 text-xs font-medium text-right ${
                  score >= 8 ? 'text-green-400' :
                  score >= 6 ? 'text-yellow-400' :
                  score >= 4 ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {score}
                </div>
              </div>
            );
          })}
        </div>

        {/* 亮点 */}
        {review.highlights && review.highlights.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              亮点
            </div>
            <div className="flex flex-wrap gap-2">
              {review.highlights.map((highlight: string, i: number) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 问题清单 */}
        {review.issues && review.issues.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              待优化问题
            </div>
            <div className="space-y-2">
              {review.issues.map((issue: any, i: number) => (
                <div key={i} className="p-3 rounded bg-gray-900/50 border border-gray-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      issue.level === '阻断' ? 'bg-red-500/20 text-red-400' :
                      issue.level === '建议' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {issue.level}
                    </span>
                    <span className="text-xs text-gray-400">
                      {issue.dimension}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">{issue.description}</div>
                  <div className="text-xs text-gray-500">
                    <span className="text-cyan-400">建议：</span>{issue.suggestion}
                  </div>
                  {(issue.episodeNumber || issue.sceneNumber) && (
                    <div className="text-xs text-gray-600">
                      位置：{issue.episodeNumber ? `第${issue.episodeNumber}集` : ''}
                      {issue.sceneNumber ? ` 场景${issue.sceneNumber}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 修订优先级 */}
        {review.revisionPriority && review.revisionPriority.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-cyan-400">修订优先级</div>
            <div className="space-y-1.5">
              {review.revisionPriority.map((item: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-medium">
                    {i + 1}
                  </span>
                  <div className="text-gray-400">
                    <div className="text-gray-300">{item.issue}</div>
                    <div className="text-gray-500 mt-0.5">{item.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}
```

**接入后端API**（如果剧本生成时自动返回review数据）：

如果 `generate-full-script` 的 `complete` stage 中包含了 `review` 字段，直接读取即可。

如果 review 需要单独调用 `POST /api/ai/review-script`，在剧本生成完成后自动调用：

```typescript
// 在剧本生成完成后
useEffect(() => {
  if (script && !script.review) {
    fetchReview(script);
  }
}, [script]);

const fetchReview = async (scriptData: any) => {
  try {
    const response = await fetch('/api/ai/review-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: JSON.stringify(scriptData.episodes || scriptData),
        characters: scriptData.characters || [],
      }),
    });

    if (response.ok) {
      const review = await response.json();
      setScript((prev: any) => ({ ...prev, review }));
    }
  } catch (error) {
    console.error('Review fetch failed:', error);
    // 失败不阻断，静默处理
  }
};
```

**验收标准**：
```bash
# 1. 构建测试
pnpm build
# 预期：0错误

# 2. 视觉测试
# 生成剧本后，剧本内容下方出现评分卡片
# 预期：
# - 头部显示总分（如40）和评级（如"优良"）
# - 总分圆圈颜色：45+绿色/38+蓝色/30+黄色/25+橙色/<25红色
# - 点击卡片展开/折叠
# - 展开后显示5个横向条形图（节奏/爽点/台词/格式/连贯）
# - 条形图颜色与分数匹配（8+绿/6+黄/4+橙/<4红）
# - 显示亮点标签（绿色小标签）
# - 显示问题列表（带阻断/建议/微调级别标签）
# - 显示修订优先级（1/2/3编号）

# 3. 数据测试
# 如果后端返回review数据，卡片正确显示
# 如果后端未返回review数据，卡片不显示（不报错）
```

---

### 子任务 P2-8.3：付费卡点高亮标记（在剧本内容中渲染标签）

**目标**：用户在剧本内容中看到 `[PAYWALL]` 标记被渲染为醒目的黄色标签，直观知道付费卡点位置。

**修改文件**：找到渲染剧本内容的组件（通常是显示 `script.content` 或 `episode.content` 的地方）

**改造方案**：在渲染剧本文本前，先做字符串替换/正则处理：

```typescript
// 工具函数：渲染带标记的剧本内容
function renderScriptContent(content: string): React.ReactNode {
  if (!content) return null;

  // 分割文本，识别标记
  const parts = content.split(/(\[PAYWALL\]|\[爽感:[^\]]+\]|\[钩子:[^\]]+\])/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part === '[PAYWALL]') {
          return (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
              <Lock className="w-3 h-3" />
              付费卡点
            </span>
          );
        }

        if (part.startsWith('[爽感:')) {
          const type = part.match(/\[爽感:([^\]]+)\]/)?.[1] || '';
          return (
            <span key={i} className="inline-flex items-center px-2 py-0.5 mx-1 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 whitespace-nowrap">
              ⚡ {type}
            </span>
          );
        }

        if (part.startsWith('[钩子:')) {
          const type = part.match(/\[钩子:([^\]]+)\]/)?.[1] || '';
          return (
            <span key={i} className="inline-flex items-center px-2 py-0.5 mx-1 rounded text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 whitespace-nowrap">
              🎣 {type}
            </span>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// 使用方式（替换原有的 {content} 渲染）
// 原代码：<div className="text-gray-300 whitespace-pre-wrap">{episode.content}</div>
// 改造后：
<div className="text-gray-300 whitespace-pre-wrap">
  {renderScriptContent(episode.content)}
</div>
```

**如果剧本内容是JSON结构而非纯文本**（根据女娲现有格式），在渲染场景/对话时处理：

```typescript
// 如果剧本是结构化数据（scenes/dialogues）
function renderScene(scene: any): React.ReactNode {
  return (
    <div className="space-y-2">
      {/* 场景头 */}
      <div className="text-xs text-gray-500 font-mono">
        {scene.location} | {scene.time}
      </div>

      {/* 场景描述 */}
      <div className="text-sm text-gray-400 italic">
        {renderScriptContent(scene.description)}
      </div>

      {/* 对话 */}
      {scene.dialogues?.map((dialogue: any, i: number) => (
        <div key={i} className="pl-4 border-l-2 border-gray-800">
          <span className="text-cyan-400 text-sm font-medium">{dialogue.character}：</span>
          <span className="text-gray-300 text-sm">{renderScriptContent(dialogue.line)}</span>
          {dialogue.emotion && (
            <span className="text-xs text-gray-600 ml-2">（{dialogue.emotion}）</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

**验收标准**：
```bash
# 1. 构建测试
pnpm build
# 预期：0错误

# 2. 视觉测试
# 在剧本内容中包含 [PAYWALL] 标记
# 预期：渲染为黄色标签，带锁图标和"付费卡点"文字

# 3. 视觉测试
# 在剧本内容中包含 [爽感:打脸] 标记
# 预期：渲染为紫色标签，带闪电图标和"打脸"文字

# 4. 视觉测试
# 在剧本内容中包含 [钩子:情绪钩] 标记
# 预期：渲染为青色标签，带鱼钩图标和"情绪钩"文字

# 5. 兼容性测试
# 剧本内容中无标记
# 预期：正常渲染纯文本，不报错
```

---

## 三、P2-8 整体验收标准

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| 1 | 构建测试 | `pnpm build` | 0错误 |
| 2 | 三阶段进度 | 点击【生成剧本】 | 看到"对话→大纲→剧本"三节点进度指示器，依次闪烁变绿 |
| 3 | 阶段文字 | 观察进度区域 | stage1显示"构建角色对话"，stage2显示"设计故事大纲"，stage3显示"撰写第N集" |
| 4 | 进度条 | stage3期间 | 显示 (1/3) → (2/3) → (3/3) 进度条 |
| 5 | 质量警告 | 如果评分<30 | 显示黄色警告条"前3集评分XX分（XX），建议优化" |
| 6 | 评分卡片 | 剧本生成完成后 | 内容下方出现评分卡片，显示总分和评级 |
| 7 | 卡片展开 | 点击评分卡片 | 展开显示5个维度条形图、亮点、问题、修订优先级 |
| 8 | 卡片折叠 | 再次点击 | 折叠回头部状态 |
| 9 | 付费标记 | 剧本中有[PAYWALL] | 渲染为黄色"付费卡点"标签 |
| 10 | 爽感标记 | 剧本中有[爽感:打脸] | 渲染为紫色"打脸"标签 |
| 11 | 钩子标记 | 剧本中有[钩子:情绪钩] | 渲染为青色"情绪钩"标签 |
| 12 | 无标记兼容 | 剧本中无标记 | 正常渲染，无异常 |
| 13 | 基线保护 | Phase 0+1+2全部API测试 | 100%通过 |

---

## 四、回滚命令

```bash
# 如果P2-8出现问题，单独回滚
git revert <commit-hash-of-p2-8>

# 或者只回滚某个子任务
git revert <commit-hash-of-p2-8-1>
git revert <commit-hash-of-p2-8-2>
git revert <commit-hash-of-p2-8-3>
```

---

## 五、提交格式

```bash
# 子任务分别提交
git add src/components/script-generator.tsx  # 或实际修改的文件
git commit -m "[P2-8.1] feat: 三阶段进度展示（SSE stage解析+进度指示器UI）"

git add src/components/script-preview.tsx  # 或实际修改的文件
git commit -m "[P2-8.2] feat: 五维度评分卡片（折叠面板+条形图+问题清单）"

git add src/components/script-renderer.tsx  # 或实际修改的文件
git commit -m "[P2-8.3] feat: 付费卡点高亮标记（PAYWALL/爽感/钩子标签渲染）"
```

---

*P2-8 指令结束。请作为P2阶段最后一个任务执行，验收通过后整个P2阶段完成。*
