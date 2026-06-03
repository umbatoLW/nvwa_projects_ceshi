src/app/preview/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Workflow,
  FileText,
  Users,
  Image,
  Wand2,
  Clapperboard,
  Box,
  Paintbrush,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  Save,
  Undo2,
  Redo2,
  Plus,
  ChevronRight,
  Zap,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const mockNodes = [
  { id: '1', type: 'input', label: '创意输入', status: 'completed', position: { x: 80, y: 150 } },
  { id: '2', type: 'process', label: '剧本创作', status: 'completed', position: { x: 400, y: 100 } },
  { id: '3', type: 'process', label: '内容审查', status: 'running', position: { x: 720, y: 100 } },
  { id: '4', type: 'process', label: '分镜拆分', status: 'pending', position: { x: 1040, y: 100 } },
  { id: '5', type: 'text2image', label: '文生图', status: 'pending', position: { x: 960, y: 350 } },
  { id: '6', type: 'image2video', label: '图生视频', status: 'pending', position: { x: 1280, y: 350 } },
  { id: '7', type: 'output', label: '成片输出', status: 'pending', position: { x: 1600, y: 400 } },
];

const paletteItems = [
  { category: '输入', color: '#0ABAB5', items: ['创意输入', '角色导入', '素材上传'] },
  { category: '处理', color: '#A855F7', items: ['剧本创作', '分镜拆分', '角色提取', '内容审查'] },
  { category: '生成', color: '#33CCCC', items: ['文生图', '文生视频', '图生视频', '角色三视图'] },
  { category: '输出', color: '#22C55E', items: ['剧本输出', '成片输出'] },
];

const navItems = [
  { icon: LayoutDashboard, label: '仪表盘' },
  { icon: Workflow, label: '工作区' },
  { icon: Layers, label: '模板库' },
  { icon: FileText, label: '剧本库' },
  { icon: Users, label: '角色库' },
  { icon: Image, label: '资产库' },
];

const creationItems = [
  { icon: Wand2, label: 'AI生图', color: '#EC4899' },
  { icon: Clapperboard, label: 'AI生视频', color: '#8B5CF6' },
  { icon: Box, label: 'AI生3D', color: '#F97316' },
  { icon: Paintbrush, label: 'AI图像编辑', color: '#06B6D4' },
];

function GlassButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void; }) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-2 rounded-xl font-medium text-sm overflow-hidden transition-all duration-300 hover:scale-105"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 186, 181, 0.2), rgba(10, 186, 181, 0.05))',
        border: '1px solid rgba(10, 186, 181, 0.3)',
        boxShadow: '0 4px 20px rgba(10, 186, 181, 0.15)',
      }}
    >
      <span className="relative z-10 text-[#0ABAB5]">{children}</span>
    </button>
  );
}

function NodeCard({ node }: { node: typeof mockNodes[0] }) {
  const statusConfig = {
    completed: { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)', icon: CheckCircle2 },
    running: { color: '#0ABAB5', bg: 'rgba(10, 186, 181, 0.15)', icon: Loader2 },
    pending: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', icon: Clock },
    failed: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: AlertCircle },
  };

  const config = statusConfig[node.status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  return (
    <div
      className="relative w-64 h-44 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{ background: 'linear-gradient(145deg, #1e1e1e, #141414)' }}
    >
      {node.status === 'running' && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.color}40, transparent)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }}
        />
      )}

      <div
        className="absolute inset-1 rounded-xl p-4 flex flex-col justify-between"
        style={{ background: 'rgba(20, 20, 20, 0.85)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-xs text-gray-500">节点 {node.id}</span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h4 className="text-white font-medium mb-2">{node.label}</h4>
          <div className="flex items-center gap-2">
            <StatusIcon className="w-3.5 h-3.5" style={{ color: config.color }} />
            <span className="text-xs" style={{ color: config.color }}>
              {node.status === 'completed' && '已完成'}
              {node.status === 'running' && '进行中'}
              {node.status === 'pending' && '待开始'}
              {node.status === 'failed' && '失败'}
            </span>
          </div>
        </div>

        {node.status !== 'pending' && (
          <div className="mt-2">
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  backgroundColor: config.color,
                  width: node.status === 'completed' ? '100%' : '60%',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolPanel() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('输入');

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">节点面板</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {paletteItems.map((category) => (
          <div key={category.category}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === category.category ? null : category.category)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                <span className="text-sm text-gray-400">{category.category}</span>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-gray-500 transition-transform ${expandedCategory === category.category ? 'rotate-90' : ''}`}
              />
            </button>

            {expandedCategory === category.category && (
              <div className="px-3 pb-2 space-y-1">
                {category.items.map((item) => (
                  <button key={item} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertyPanel() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm font-medium text-white">节点属性</h3>
        <p className="text-xs text-gray-500 mt-1">内容审查</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-2 block">审查类型</label>
          <select className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            <option>全部审查</option>
            <option>内容合规</option>
            <option>版权检测</option>
            <option>敏感词过滤</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-2 block">置信度阈值</label>
          <input type="range" min="0" max="100" defaultValue="80" className="w-full" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>80%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-2 block">输出格式</label>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 rounded-lg text-xs bg-[#0ABAB5]/20 text-[#0ABAB5] border border-[#0ABAB5]/30">JSON</button>
            <button className="px-3 py-2 rounded-lg text-xs bg-gray-800 text-gray-400 border border-white/10">CSV</button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <GlassButton className="w-full">执行节点</GlassButton>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: 'rgba(20, 20, 20, 0.95)' }}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-400">工作流运行中</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>已运行 2:34</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">可用积分</span>
          <span className="text-xs font-medium text-[#0ABAB5]">5,280</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">GPU</span>
          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="w-3/4 h-full bg-[#0ABAB5] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowCanvas() {
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0A0A0A' }}>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ABAB5" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#0ABAB5" stopOpacity="1" />
            <stop offset="100%" stopColor="#0ABAB5" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <line x1="240" y1="172" x2="340" y2="122" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8,4" />
        <line x1="560" y1="122" x2="660" y2="122" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8,4" />
        <line x1="880" y1="122" x2="980" y2="122" stroke="#374151" strokeWidth="1.5" />
        <line x1="1200" y1="122" x2="1160" y2="372" stroke="#374151" strokeWidth="1.5" />
      </svg>

      {mockNodes.map((node) => (
        <div
          key={node.id}
          className="absolute transition-all duration-300 hover:-translate-y-1"
          style={{ left: node.position.x, top: node.position.y }}
        >
          <NodeCard node={node} />
        </div>
      ))}

      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full"
        style={{ background: 'rgba(20, 20, 20, 0.9)', backdropFilter: 'blur(10px)' }}
      >
        <span className="text-sm text-gray-400">拖动节点到画布开始构建工作流</span>
      </div>
    </div>
  );
}

function DashboardPreview() {
  const stats = [
    { label: '今日产出', value: '12', unit: '部', icon: Zap, color: '#0ABAB5' },
    { label: '累计创作', value: '156', unit: '部', icon: TrendingUp, color: '#33CCCC' },
    { label: '素材库', value: '892', unit: '个', icon: Image, color: '#EC4899' },
    { label: '可用积分', value: '5,280', unit: '', icon: Sparkles, color: '#F97316' },
  ];

  const recentProjects = [
    { title: '都市悬疑短剧', progress: 75, type: '剧本' },
    { title: '古风爱情故事', progress: 40, type: '分镜' },
    { title: '科幻短片', progress: 100, type: '成片' },
    { title: '校园青春剧', progress: 20, type: '创意' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-semibold text-white mb-2">仪表盘</h1>
        <p className="text-sm text-gray-500">欢迎回来，今天想创作什么类型的短剧？</p>
      </div>

      <div className="p-6 border-b border-white/10">
        <div className="grid grid-cols-4 gap-4">
          {creationItems.map((item) => (
            <button
              key={item.label}
              className="flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'rgba(20, 20, 20, 0.8)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${item.color}20` }}>
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <span className="text-sm text-gray-300">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 border-b border-white/10">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl" style={{ background: 'rgba(20, 20, 20, 0.8)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-white">{stat.value}</span>
                {stat.unit && <span className="text-xs text-gray-500">{stat.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-sm font-medium text-white mb-4">最近项目</h3>
        <div className="space-y-3">
          {recentProjects.map((project) => (
            <div
              key={project.title}
              className="p-4 rounded-xl flex items-center justify-between transition-all duration-300 hover:bg-white/5"
              style={{ background: 'rgba(20, 20, 20, 0.8)' }}
            >
              <div>
                <h4 className="text-sm text-white">{project.title}</h4>
                <span className="text-xs text-gray-500">{project.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ background: '#0ABAB5', width: `${project.progress}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">{project.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PreviewPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('workspace');

  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  return (
    <div className="relative h-screen flex overflow-hidden transition-all duration-300" style={{ backgroundColor: isFullscreen ? '#000' : '#0A0A0A' }}>
      <aside
        className="flex-shrink-0 flex flex-col transition-all duration-300"
        style={{
          width: sidebarCollapsed ? 64 : 240,
          background: 'rgba(20, 20, 20, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div className="h-16 flex items-center justify-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0ABAB5] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            {!sidebarCollapsed && <span className="font-semibold text-white">NVWA</span>}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.label.toLowerCase();
            return (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.label.toLowerCase())}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${isActive ? 'text-[#0ABAB5] bg-[#0ABAB5]/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="p-3 border-t border-white/10">
            <div className="text-xs text-gray-500 mb-2 px-3">AI 创作</div>
            {creationItems.slice(0, 2).map((item) => (
              <button key={item.label} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${item.color}20` }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                </div>
                {item.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0ABAB5] flex items-center justify-center text-black hover:scale-110 transition-transform"
        >
          <span className="text-xs">{sidebarCollapsed ? '→' : '←'}</span>
        </button>
      </aside>

      <main className="flex-1 relative flex flex-col">
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10" style={{ background: 'rgba(10, 10, 10, 0.95)' }}>
          <div className="flex items-center gap-2">
            <GlassButton onClick={() => setActiveTab('dashboard')}>仪表盘</GlassButton>
            <GlassButton onClick={() => setActiveTab('workspace')}>工作区</GlassButton>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <Undo2 className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <Redo2 className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <Save className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-white/10 mx-2" />
            <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <Play className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-white/10 mx-2" />
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-shrink-0 border-r border-white/10 overflow-hidden transition-all duration-300" style={{ width: sidebarCollapsed ? 0 : 220, background: 'rgba(15, 15, 15, 0.95)' }}>
            {!sidebarCollapsed && <ToolPanel />}
          </div>

          <div className="flex-1 relative overflow-hidden" style={{ background: '#0A0A0A' }}>
            {activeTab === 'workspace' ? <FlowCanvas /> : <DashboardPreview />}
          </div>

          <div className="flex-shrink-0 border-l border-white/10 overflow-hidden transition-all duration-300" style={{ width: sidebarCollapsed ? 0 : 280, background: 'rgba(15, 15, 15, 0.95)' }}>
            {!sidebarCollapsed && <PropertyPanel />}
          </div>
        </div>

        <StatusBar />
      </main>
    </div>
  );
}

<style>{`
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`}</style>