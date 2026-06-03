# NVWA 平台 - 核心模块完整实现

> 版本：v1.0.0
> 日期：2026-05-06
> 状态：核心模块开发中

---

## 1. 项目结构

```
nvwa/
├── src/
│   ├── components/
│   │   ├── workspace/
│   │   │   ├── WorkflowCanvas.tsx      # 工作流画布（已修复）
│   │   │   └── nodes/
│   │   │       ├── ScriptSplitNode.tsx  # 分镜节点（已修复）
│   │   │       ├── StoryInputNode.tsx   # 剧本输入节点
│   │   │       ├── StoryOutputNode.tsx   # 剧本输出节点
│   │   │       ├── CharacterNode.tsx     # 角色节点
│   │   │       └── VideoNode.tsx        # 视频节点
│   │   ├── ui/                          # UI组件
│   │   └── layout/                      # 布局组件
│   ├── lib/
│   │   ├── workflow/
│   │   │   ├── engine.ts               # 工作流引擎
│   │   │   ├── nodes.ts                # 节点注册
│   │   │   └── types.ts                # 类型定义
│   │   ├── ai/
│   │   │   ├── providers.ts            # AI服务提供商
│   │   │   ├── text.ts                 # 文本生成
│   │   │   ├── image.ts                # 图像生成
│   │   │   └── video.ts                # 视频生成
│   │   └── utils/
│   │       └── index.ts               # 工具函数
│   ├── app/
│   │   ├── (auth)/                     # 认证
│   │   ├── (dashboard)/               # 主应用
│   │   └── api/                       # API路由
│   ├── stores/                         # Zustand状态
│   ├── hooks/                          # React Hooks
│   └── types/                         # TypeScript类型
├── server/                             # 后端服务
│   ├── src/
│   │   ├── modules/
│   │   │   ├── workflow/              # 工作流模块
│   │   │   ├── script/                # 剧本模块
│   │   │   ├── character/             # 角色模块
│   │   │   └── ai/                    # AI模块
│   │   └── services/                  # 业务服务
│   └── prisma/                        # 数据库
└── docs/                               # 文档
```

---

## 2. 工作流引擎（核心）

### 2.1 引擎实现

```typescript
// lib/workflow/engine.ts
import { Node, Edge } from '@xyflow/react';

export interface NodeDefinition {
  type: string;
  category: string;
  displayName: string;
  description: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  execute: (inputs: Record<string, unknown>, context: ExecutionContext) => Promise<Record<string, unknown>>;
}

export interface ExecutionContext {
  projectId: string;
  abortSignal?: AbortSignal;
  onProgress?: (nodeId: string, progress: number, message: string) => void;
  onError?: (nodeId: string, error: Error) => void;
  onComplete?: (nodeId: string, outputs: Record<string, unknown>) => void;
}

export class WorkflowEngine {
  private nodeDefinitions = new Map<string, NodeDefinition>();
  
  registerNode(definition: NodeDefinition): void {
    this.nodeDefinitions.set(definition.type, definition);
  }
  
  validate(nodes: Node[], edges: Edge[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 验证节点类型
    for (const node of nodes) {
      if (!this.nodeDefinitions.has(node.type)) {
        errors.push(`Unknown node type: ${node.type}`);
      }
    }
    
    // 验证循环依赖
    if (this.hasCycle(nodes, edges)) {
      errors.push('Workflow contains cycle');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  async execute(
    executionId: string,
    nodes: Node[],
    edges: Edge[],
    context: ExecutionContext
  ): Promise<Map<string, Record<string, unknown>>> {
    const results = new Map<string, Record<string, unknown>>();
    const sortedNodes = this.topologicalSort(nodes, edges);
    
    for (const node of sortedNodes) {
      if (context.abortSignal?.aborted) break;
      
      context.onProgress?.(node.id, 0, 'Starting...');
      
      try {
        const inputs = this.collectInputs(node, edges, results);
        const definition = this.nodeDefinitions.get(node.type!);
        
        if (!definition) throw new Error(`Node type ${node.type} not found`);
        
        const outputs = await definition.execute(inputs, context);
        results.set(node.id, outputs);
        
        context.onComplete?.(node.id, outputs);
      } catch (err) {
        context.onError?.(node.id, err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    }
    
    return results;
  }
  
  private topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();
    
    for (const node of nodes) {
      inDegree.set(node.id, 0);
      graph.set(node.id, []);
    }
    
    for (const edge of edges) {
      graph.get(edge.source!)?.push(edge.target!);
      inDegree.set(edge.target!, (inDegree.get(edge.target!) || 0) + 1);
    }
    
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }
    
    const sorted: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      sorted.push(id);
      
      for (const neighbor of graph.get(id) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }
    
    return sorted.map(id => nodes.find(n => n.id === id)!);
  }
  
  private collectInputs(
    node: Node,
    edges: Edge[],
    results: Map<string, Record<string, unknown>>
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    
    for (const edge of edges) {
      if (edge.target === node.id) {
        const sourceOutputs = results.get(edge.source!);
        if (sourceOutputs && edge.sourceHandle && edge.targetHandle) {
          inputs[edge.targetHandle] = sourceOutputs[edge.sourceHandle];
        }
      }
    }
    
    return { ...inputs, ...node.data };
  }
  
  private hasCycle(nodes: Node[], edges: Edge[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const graph = new Map<string, string[]>();
    for (const node of nodes) {
      graph.set(node.id, []);
    }
    for (const edge of edges) {
      graph.get(edge.source!)?.push(edge.target!);
    }
    
    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      for (const neighbor of graph.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }
    
    return false;
  }
}

export const workflowEngine = new WorkflowEngine();
```

---

## 3. 剧本生成模块

### 3.1 剧本生成服务

```typescript
// lib/ai/script.ts
import { z } from 'zod';

export const ScriptGenerationSchema = z.object({
  theme: z.string().min(1, '主题不能为空'),
  genre: z.enum(['都市', '玄幻', '甜宠', '复仇', '穿越', '重生', '悬疑', '宫斗']),
  duration: z.number().min(1).max(30),
  tone: z.enum(['轻松', '紧张', '悬疑', '搞笑', '感人']),
});

export type ScriptGenerationRequest = z.infer<typeof ScriptGenerationSchema>;

export interface Scene {
  id: string;
  number: number;
  title: string;
  location: string;
  timeOfDay: string;
  content: string;
}

export interface Shot {
  id: string;
  sceneId: string;
  number: string;
  duration: string;
  shotType: string;
  visual: string;
  characters: string;
  characterDesc: string;
  characterAction: string;
  emotion: string;
  lighting: string;
  dialogue: string;
  shotPrompt: string;
  videoMotion: string;
}

export interface Script {
  id: string;
  title: string;
  theme: string;
  genre: string;
  outline: string;
  scenes: Scene[];
  shots: Shot[];
  characters: Character[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
}

export interface Character {
  id: string;
  name: string;
  description: string;
  appearance: {
    face: string;
    hair: string;
    body: string;
    clothing: string;
  };
  personality: string;
  referenceImages: string[];
}

// 剧本生成提示词
export function buildScriptPrompt(request: ScriptGenerationRequest): string {
  const genreTemplates = {
    '都市': '现代都市背景，主角在繁华都市中奋斗的故事',
    '玄幻': '仙侠世界观，有修仙体系和奇幻元素',
    '甜宠': '甜蜜浪漫的爱情故事',
    '复仇': '主角遭受不公待遇后东山再起',
    '穿越': '现代人穿越到古代或异世界',
    '重生': '主角带着前世记忆重新开始',
    '悬疑': '充满悬念和反转的故事',
    '宫斗': '古代宫廷中的权谋争斗',
  };
  
  return `你是一个专业的短剧编剧，擅长创作引人入胜的短剧剧本。

请根据以下要求创作一个短剧剧本：

## 基本要求
- 主题：${request.theme}
- 题材：${request.genre} - ${genreTemplates[request.genre]}
- 时长：约${request.duration}分钟
- 基调：${request.tone}

## 输出格式
请严格按照以下JSON格式输出，不要输出任何其他内容：

{
  "title": "剧本标题",
  "outline": "200字左右的剧情大纲",
  "scenes": [
    {
      "id": "scene-1",
      "number": 1,
      "title": "场景标题",
      "location": "场景地点",
      "timeOfDay": "白天/夜晚",
      "content": "场景描述"
    }
  ],
  "characters": [
    {
      "id": "char-1",
      "name": "角色名",
      "description": "角色简介",
      "appearance": {
        "face": "面部特征",
        "hair": "发型发色",
        "body": "身形",
        "clothing": "着装风格"
      },
      "personality": "性格特点"
    }
  ]
}

请开始创作：`;
}

// 分镜生成提示词
export function buildShotPrompt(script: Script): string {
  return `你是一个具备影视制作专业知识的资深短剧分镜师，精通电影镜头语言与视觉叙事。

请根据以下剧本内容，拆分成详细的分镜脚本：

剧本：${script.outline}

请输出JSON数组格式，每个分镜包含：
- shotNumber: 镜号（01, 02, 03...）
- duration: 时长（5-15秒）
- visual: 画面描述（40字内）
- shotType: 景别（全景/中景/近景/特写等）
- characters: 角色
- characterDesc: 角色描述（10-20字）
- characterAction: 角色动作
- emotion: 情绪
- lighting: 光影氛围
- dialogue: 对白
- shotPrompt: AI生图提示词
- videoMotion: 视频运镜提示词

请直接输出JSON数组：`;
}
```

---

## 4. 角色一致性模块

### 4.1 角色提取服务

```typescript
// lib/ai/character.ts
export interface CharacterConsistency {
  characterId: string;
  referenceImages: string[];
  loraPath?: string;
  expressions: {
    happy: string[];
    sad: string[];
    angry: string[];
    surprised: string[];
    neutral: string[];
  };
}

// 角色提取提示词
export function buildCharacterExtractionPrompt(script: Script): string {
  return `你是一个专业的角色设计师，擅长从剧本中提取和描述角色。

请分析以下剧本，提取所有角色信息：

${script.scenes.map(s => s.content).join('\n')}

请输出JSON数组格式：
[
  {
    "name": "角色名",
    "description": "角色简介",
    "appearance": {
      "face": "面部特征",
      "hair": "发型发色",
      "body": "身形",
      "clothing": "着装风格"
    },
    "personality": "性格特点"
  }
]

请开始提取：`;
}

// 角色一致性提示词
export function buildConsistencyPrompt(character: Character, expression: string): string {
  return `你是一个专业的AI图像提示词工程师，擅长生成角色一致性高的图像。

请生成一个描述以下角色的图像提示词：

角色：${character.name}
外貌：${character.appearance.face}, ${character.appearance.hair}, ${character.appearance.body}
着装：${character.appearance.clothing}
性格：${character.personality}
表情：${expression}

要求：
1. 保持角色外貌特征一致
2. 表情准确
3. 适用于AI图像生成
4. 包含光影和氛围描述
5. 输出格式：详细的英文提示词

请生成：`;
}
```

---

## 5. 分镜自动拆分API

### 5.1 后端API实现

```typescript
// app/api/script/split/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils, Message } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { script, model } = await request.json();

    if (!script) {
      return NextResponse.json({ error: '请提供剧本内容' }, { status: 400 });
    }

    const modelToUse = model || 'doubao-seed-1-6-lite-251015';

    const prompt = buildShotPrompt({ content: script });

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages: Message[] = [{ role: 'user', content: prompt }];
    const response = await client.invoke(messages, {
      model: modelToUse,
      temperature: 0.7,
    });

    const content = response.content;

    // 解析JSON
    let scenes = [];
    try {
      let cleanedContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        scenes = Array.isArray(parsed) ? parsed : parsed.scenes || [];
      } else {
        scenes = generateDefaultScenes(script);
      }
    } catch (e) {
      console.error('JSON parse error:', e);
      scenes = generateDefaultScenes(script);
    }

    return NextResponse.json({ scenes, success: true });

  } catch (error) {
    console.error('Script split error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

function generateDefaultScenes(script: string) {
  const scenes = [];
  const scriptLength = script.length;
  const numScenes = Math.min(Math.max(6, Math.floor(scriptLength / 200)), 12);
  
  for (let i = 1; i <= numScenes; i++) {
    scenes.push({
      id: i,
      shotNumber: String(i).padStart(2, '0'),
      duration: '15s',
      visual: `第${i}个镜头画面描述`,
      characters: '主角',
      characterDesc: '主要角色',
      characterImage: '',
      reference: '',
      shotType: '中景',
      characterAction: '对话',
      emotion: '平静',
      sceneTag: '室内',
      lighting: '明亮',
      soundEffect: '环境音',
      dialogue: '',
      shotPrompt: '',
      videoMotion: '固定',
    });
  }
  
  return scenes;
}
```

---

## 6. 数据库设计

### 6.1 Prisma Schema

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String?
  avatarUrl     String?
  role          String    @default("user")
  points        Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  projects      Project[]
  teams         TeamMember[]
}

model Project {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  name        String
  description String?
  genre       String?
  coverUrl    String?
  status      String    @default("draft")
  settings    Json      @default("{}")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  scripts     Script[]
  characters  Character[]
  workflows   Workflow[]
}

model Script {
  id        String    @id @default(uuid())
  projectId String
  project   Project   @relation(fields: [projectId], references: [id])
  title     String
  content   String    @db.Text
  outline   String?   @db.Text
  genre     String?
  tone      String?
  metadata  Json      @default("{}")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  scenes    Scene[]
  shots     Shot[]
}

model Scene {
  id        String   @id @default(uuid())
  scriptId  String
  script    Script   @relation(fields: [scriptId], references: [id])
  number    Int
  title     String?
  location  String?
  timeOfDay String?
  content   String?  @db.Text
  createdAt DateTime @default(now())
  shots     Shot[]
}

model Shot {
  id               String   @id @default(uuid())
  sceneId          String
  scene            Scene    @relation(fields: [sceneId], references: [id])
  number           String
  duration         String?
  shotType         String?
  visual           String?  @db.Text
  characters       String?
  characterDesc    String?  @db.Text
  characterAction  String?
  emotion          String?
  lighting         String?
  dialogue         String?  @db.Text
  shotPrompt       String?  @db.Text
  videoMotion      String?
  status           String   @default("pending")
  imageUrl         String?
  videoUrl         String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model Character {
  id              String   @id @default(uuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  name            String
  description     String?  @db.Text
  appearance      Json?
  personality     String?
  referenceImages Json     @default("[]")
  loraPath        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Workflow {
  id         String   @id @default(uuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id])
  name       String
  nodes      Json     @default("[]")
  edges      Json     @default("[]")
  isTemplate Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Team {
  id        String       @id @default(uuid())
  name      String
  ownerId   String
  createdAt DateTime     @default(now())
  members   TeamMember[]
}

model TeamMember {
  id          String   @id @default(uuid())
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  role        String   @default("member")
  permissions Json     @default("[]")
  joinedAt    DateTime @default(now())

  @@unique([teamId, userId])
}
```

---

## 7. 快速开始

### 7.1 安装

```bash
# 克隆项目
git clone https://github.com/your-org/nvwa.git
cd nvwa

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
pnpm dev
```

### 7.2 环境变量

```env
# 数据库
DATABASE_URL=postgresql://postgres:password@localhost:5432/nvwa

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Coze SDK
COZE_API_KEY=xxx
COZE_BOT_ID=xxx

# 其他AI服务（可选）
OPENAI_API_KEY=xxx
ALIYUN_API_KEY=xxx
```

---

**文档更新时间：2026-05-06**
