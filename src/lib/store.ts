export interface Script {
  id: string;
  title: string;
  genre: string;
  synopsis: string;
  content: string;
  scenes: number;
  characters: number;
  status: 'draft' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality: string;
  tags: string[];
  views: string[];
  expressions: string[];
  status: 'active' | 'draft';
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  url: string;
  tags: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  width?: number;
  height?: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

class MemoryStore {
  scripts: Map<string, Script> = new Map();
  characters: Map<string, Character> = new Map();
  assets: Map<string, Asset> = new Map();
  projects: Map<string, Project> = new Map();
  workflows: Map<string, Workflow> = new Map();

  constructor() {
    this.seed();
  }

  seed() {
    const now = new Date().toISOString();

    // Seed scripts
    const script1: Script = {
      id: 'script-1',
      title: '都市奇缘',
      genre: '都市爱情',
      synopsis: '在繁华都市中，两个来自不同世界的人意外相遇，展开一段跨越阶层的爱情故事。',
      content: '第一集：繁华的上海，林晓（28岁，互联网公司产品经理）每天过着996的生活...',
      scenes: 12,
      characters: 4,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    };
    const script2: Script = {
      id: 'script-2',
      title: '未来侦探',
      genre: '科幻悬疑',
      synopsis: '2045年，AI侦探与人类搭档破获连环案件。',
      content: '第一集：深夜，霓虹闪烁的新东京...',
      scenes: 8,
      characters: 3,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.scripts.set(script1.id, script1);
    this.scripts.set(script2.id, script2);

    // Seed characters
    const char1: Character = {
      id: 'char-1',
      name: '林晓',
      avatar: '',
      description: '28岁互联网公司产品经理，理性冷静，工作狂。',
      personality: '理性、冷静、坚韧',
      tags: ['主角', '都市', '职场'],
      views: ['正面', '侧面', '背面'],
      expressions: ['微笑', '愤怒', '悲伤', '惊讶'],
      status: 'active',
      createdAt: now,
    };
    const char2: Character = {
      id: 'char-2',
      name: 'AI侦探X-7',
      avatar: '',
      description: '2045年最新型人工智能侦探，拥有情感模拟模块。',
      personality: '机智、冷静、好奇',
      tags: ['主角', '科幻', 'AI'],
      views: ['正面', '侧面', '背面'],
      expressions: ['中性', '思考', '警觉'],
      status: 'active',
      createdAt: now,
    };
    this.characters.set(char1.id, char1);
    this.characters.set(char2.id, char2);

    // Seed assets
    const asset1: Asset = {
      id: 'asset-1',
      name: '都市夜景背景',
      type: 'image',
      url: '',
      tags: ['背景', '都市', '夜景'],
      createdAt: now,
    };
    const asset2: Asset = {
      id: 'asset-2',
      name: '林晓角色立绘',
      type: 'image',
      url: '',
      tags: ['角色', '立绘'],
      createdAt: now,
    };
    this.assets.set(asset1.id, asset1);
    this.assets.set(asset2.id, asset2);

    // Seed projects
    const project1: Project = {
      id: 'proj-1',
      name: '都市奇缘 - 第一集',
      type: '短剧',
      status: '制作中',
      updatedAt: now,
    };
    const project2: Project = {
      id: 'proj-2',
      name: '未来侦探 - 预告片',
      type: '预告片',
      status: '已完成',
      updatedAt: now,
    };
    this.projects.set(project1.id, project1);
    this.projects.set(project2.id, project2);

    // Seed workflows
    this.workflows.set(seedWorkflows[0].id, seedWorkflows[0]);
  }
}

export const seedWorkflows: Workflow[] = [
  {
    id: 'wf-1',
    name: '默认工作流',
    nodes: [
      { id: 'n1', type: 'input', position: { x: 80, y: 120 }, data: { label: '创意输入', description: '', status: '待处理' }, width: 260, height: 180 },
      { id: 'n2', type: 'process', position: { x: 440, y: 100 }, data: { label: '剧本创作', description: '', status: '待处理' }, width: 320, height: 260 },
      { id: 'n3', type: 'process', position: { x: 870, y: 100 }, data: { label: '内容审查', description: '', status: '待处理' }, width: 320, height: 260 },
      { id: 'n4', type: 'process', position: { x: 1300, y: 100 }, data: { label: '分镜拆分', description: '', status: '待处理' }, width: 320, height: 260 },
      { id: 'n5', type: 'text2image', position: { x: 1300, y: 460 }, data: { label: '文生图', description: '', status: '待处理', ratio: '16:9' }, width: 260, height: 320 },
      { id: 'n6', type: 'image2video', position: { x: 1660, y: 460 }, data: { label: '图生视频', description: '', status: '待处理', ratio: '16:9' }, width: 260, height: 320 },
      { id: 'n7', type: 'output', position: { x: 2020, y: 500 }, data: { label: '成片输出', description: '', status: '待处理' }, width: 280, height: 220 },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e6', source: 'n5', target: 'n6' },
      { id: 'e7', source: 'n6', target: 'n7' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const store = new MemoryStore();
