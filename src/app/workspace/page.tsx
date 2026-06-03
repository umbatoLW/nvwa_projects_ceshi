'use client';

import { apiFetch } from '@/lib/api-client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import dagre from 'dagre';
import { toast } from 'sonner';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  Panel,
  type Node,
  type Edge,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './workspace.css';
import { AppShell } from '@/components/app-sidebar';
import {
  InputNode,
  ProcessNode,
  Text2ImageNode,
  Text2VideoNode,
  Image2VideoNode,
  CharacterViewsNode,
  OutputNode,
  WorkflowActionsContext,
} from '@/components/workspace/node-components';
import {
  Save,
  Undo2,
  Redo2,
  Play,
  ZoomIn,
  ZoomOut,
  Type,
  Scissors,
  Users,
  Shield,
  Image,
  Video,
  FileOutput,
  Plus,
  X,
  Layout,
  ChevronDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ── 节点类型配色 ──────────────────────────── */

const NODE_COLORS: Record<string, string> = {
  input: '#0ABAB5',
  process: '#A855F7',
  generate: '#33CCCC',
  output: '#22C55E',
  text2image: '#EC4899',
  image2video: '#8B5CF6',
  text2video: '#D946EF',
  characterViews: '#F97316',
};

export type StatusType = '待开始' | '进行中' | '已完成' | '失败' | '待处理';

/* ── 节点组件映射 ──────────────────────────────── */

const nodeTypes = {
  input: InputNode,
  process: ProcessNode,
  text2image: Text2ImageNode,
  text2video: Text2VideoNode,
  image2video: Image2VideoNode,
  characterViews: CharacterViewsNode,
  output: OutputNode,
};

/* ── 左侧面板 ──────────────────────────────── */

const paletteItems = [
  {
    category: '输入',
    color: '#0ABAB5',
    items: [
      { type: 'input' as const, label: '创意输入', icon: Type },
      { type: 'input' as const, label: '角色导入', icon: Users },
      { type: 'input' as const, label: '素材上传', icon: Image },
    ],
  },
  {
    category: '处理',
    color: '#A855F7',
    items: [
      { type: 'process' as const, label: '剧本创作', icon: Type },
      { type: 'process' as const, label: '分镜拆分', icon: Scissors },
      { type: 'process' as const, label: '角色提取', icon: Users },
      { type: 'process' as const, label: '内容审查', icon: Shield },
    ],
  },
  {
    category: '生成',
    color: '#33CCCC',
    items: [
      { type: 'text2image' as const, label: '文生图', icon: Image },
      { type: 'text2video' as const, label: '文生视频', icon: Video },
      { type: 'image2video' as const, label: '图生视频', icon: Video },
      { type: 'characterViews' as const, label: '角色三视图', icon: Users },
    ],
  },
  {
    category: '输出',
    color: '#22C55E',
    items: [
      { type: 'output' as const, label: '剧本输出', icon: FileOutput },
      { type: 'output' as const, label: '成片输出', icon: FileOutput },
    ],
  },
];

/* ── 初始节点与连线 ─────────────────────────── */

const initialNodes: Node[] = [
  { id: 'n1', type: 'input', position: { x: 80, y: 120 }, width: 260, height: 180, data: { label: '创意输入', description: '', status: '待开始' } },
  { id: 'n2', type: 'process', position: { x: 440, y: 100 }, width: 320, height: 260, data: { label: '剧本创作', description: '', status: '待开始' } },
  { id: 'n3', type: 'process', position: { x: 870, y: 100 }, width: 320, height: 260, data: { label: '内容审查', description: '', status: '待开始' } },
  { id: 'n4', type: 'process', position: { x: 1300, y: 100 }, width: 320, height: 260, data: { label: '分镜拆分', description: '', status: '待开始' } },
  { id: 'n5', type: 'text2image', position: { x: 1300, y: 460 }, width: 260, height: 320, data: { label: '文生图', description: '', status: '待开始' } },
  { id: 'n6', type: 'image2video', position: { x: 1660, y: 460 }, width: 260, height: 320, data: { label: '图生视频', description: '', status: '待开始' } },
  { id: 'n7', type: 'output', position: { x: 2020, y: 500 }, width: 280, height: 220, data: { label: '成片输出', description: '', status: '待开始' } },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'n1', target: 'n2', animated: true, style: { stroke: '#555555', strokeWidth: 1.5 } },
  { id: 'e2', source: 'n2', target: 'n3', animated: true, style: { stroke: '#555555', strokeWidth: 1.5 } },
  { id: 'e3', source: 'n3', target: 'n4', animated: true, style: { stroke: '#555555', strokeWidth: 1.5 } },
  { id: 'e4', source: 'n4', target: 'n5', animated: true, style: { stroke: '#555555', strokeWidth: 1.5 } },
  { id: 'e5', source: 'n5', target: 'n6', animated: true, style: { stroke: '#555555', strokeWidth: 1.5 } },
  { id: 'e6', source: 'n6', target: 'n7', animated: true, style: { stroke: '#555555', strokeWidth: 1.5 } },
];

/* ── Dagre 自动布局 ─────────────────────────── */

function getLayoutedElements(nodes: Node[], edges: Edge[], direction: 'LR' | 'TB' = 'LR'): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 125, nodesep: 110, marginx: 50, marginy: 50 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: node.width || 260, height: node.height || 180 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - (node.width || 260) / 2,
        y: pos.y - (node.height || 180) / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/* ── 页面 ──────────────────────────────────── */

const typeMap: Record<string, string> = {
  storyInput: 'input',
  scriptSplit: 'process',
  videoGen: 'generate',
  storyOutput: 'output',
};

export default function WorkspacePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [newNodeType, setNewNodeType] = useState('input|创意输入');
  const [zoom, setZoom] = useState(100);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const nodeIdCounter = useRef(1);
  const nodePosOffset = useRef(0);
  const runAbortRef = useRef(false);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  /* ── 撤销/重做历史栈 ─────────────────────── */
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([{ nodes: initialNodes, edges: initialEdges }]);
  const historyIndexRef = useRef(0);
  const skipHistoryRef = useRef(false);

  // 问题1修复：移除useCallback，使用普通函数避免依赖数组为空的问题
  // 因为函数内部依赖nodesRef.current和edgesRef.current，需要保证能读取最新值
  const getUpstreamResult = (nodeId: string) => {
    const upstreamEdge = edgesRef.current.find((e) => e.target === nodeId);
    if (!upstreamEdge) return null;
    const upstreamNode = nodesRef.current.find((n) => n.id === upstreamEdge.source);
    if (!upstreamNode) return null;
    const result = upstreamNode.data?.result;
    if (result && typeof result === 'object') {
      if ('content' in result) return (result as { content: string }).content;
      if ('imageUrl' in result) return (result as { imageUrl: string }).imageUrl;
      if ('videoUrl' in result) return (result as { videoUrl: string }).videoUrl;
    }
    if (typeof result === 'string') return result;
    return (upstreamNode.data?.description as string) || null;
  };

  const getUpstreamScenes = (nodeId: string) => {
    const upstreamEdge = edgesRef.current.find((e) => e.target === nodeId);
    if (!upstreamEdge) return [] as Array<Record<string, unknown>>;
    const upstreamNode = nodesRef.current.find((n) => n.id === upstreamEdge.source);
    if (!upstreamNode) return [] as Array<Record<string, unknown>>;
    const result = upstreamNode.data?.result;
    if (result && typeof result === 'object' && Array.isArray((result as Record<string, unknown>).scenes)) {
      return (result as Record<string, unknown>).scenes as Array<Record<string, unknown>>;
    }
    return [] as Array<Record<string, unknown>>;
  };

  const handleUndo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    skipHistoryRef.current = true;
    historyIndexRef.current = idx - 1;
    const state = historyRef.current[idx - 1];
    setNodes(JSON.parse(JSON.stringify(state.nodes)));
    setEdges(JSON.parse(JSON.stringify(state.edges)));
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    skipHistoryRef.current = true;
    historyIndexRef.current = idx + 1;
    const state = historyRef.current[idx + 1];
    setNodes(JSON.parse(JSON.stringify(state.nodes)));
    setEdges(JSON.parse(JSON.stringify(state.edges)));
  }, [setNodes, setEdges]);

  // 监听 nodes/edges 变化自动保存历史（撤销/重做时跳过）
  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const history = historyRef.current;
    const idx = historyIndexRef.current;
    history.splice(idx + 1);
    history.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    historyIndexRef.current = history.length - 1;
    // 限制历史栈长度
    if (history.length > 50) {
      history.shift();
      historyIndexRef.current = history.length - 1;
    }
  }, [nodes, edges]);

  const handleSaveWorkflow = useCallback(async (silent = false) => {
    if (!silent) setSaveStatus('saving');
    try {
      const res = await apiFetch('/api/workflows/wf-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '默认工作流',
          nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, width: n.width, height: n.height, data: n.data })),
          edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
          status: 'active',
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (!silent) toast.success(String('工作流已保存'));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        if (!silent) toast.error(String('保存失败: ' + (data.error || '未知错误')));
        setSaveStatus('idle');
      }
    } catch {
      if (!silent) toast.error(String('保存失败'));
      setSaveStatus('idle');
    }
  }, [nodes, edges]);

  /* ── 自动保存（防抖 2 秒） ─────────────── */
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSaveRef = useRef(handleSaveWorkflow);
  useEffect(() => { handleSaveRef.current = handleSaveWorkflow; }, [handleSaveWorkflow]);
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSaveRef.current(true);
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [nodes, edges]);

  const executeNodeById = async (nodeId: string): Promise<boolean> => {
    if (runAbortRef.current) return false;
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return false;
    const type = node.type;
    const label = (node.data?.label as string) || '';
    const description = (node.data?.description as string) || '';
    const nodeData = node.data as Record<string, unknown>;
    if (type === 'input') {
      if (label === '素材上传') {
        const imgs = nodeData.imageData;
        const list = Array.isArray(imgs) ? imgs : imgs ? [imgs as string] : [];
        const result = list.length > 0
          ? { imageUrl: list[0], images: list }
          : '【素材上传】\n请上传素材图片，上传完成后可在此节点引用。';
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, status: list.length > 0 ? '已完成' : '待处理', result } }
              : n
          )
        );
        return list.length > 0;
      }
      const content = description || label;
      setNodes((prev) => {
        const next = prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: '已完成', result: content } }
            : n
        );
        nodesRef.current = next;
        return next;
      });
      return true;
    }
    if (type === 'output') {
      const upstream = getUpstreamResult(nodeId);
      // 检查上游是否有内容
      if (!upstream) {
        const errorMsg = '【' + label + '】\n暂无上游内容，请确保前置节点已执行成功。';
        setNodes((prev) => {
          const next = prev.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, status: '执行失败', result: errorMsg } }
              : n
          );
          nodesRef.current = next;
          return next;
        });
        return false;
      }
      // 检查上游节点状态
      const upstreamEdge = edgesRef.current.find((e) => e.target === nodeId);
      if (upstreamEdge) {
        const upstreamNode = nodesRef.current.find((n) => n.id === upstreamEdge.source);
        const upstreamStatus = upstreamNode?.data?.status as string;
        if (upstreamStatus === '执行失败' || upstreamStatus === '失败' || upstreamStatus === '待处理' || upstreamStatus === '待开始') {
          const errorMsg = '【' + label + '】\n上游节点执行失败或未执行，无法输出内容。';
          setNodes((prev) => {
            const next = prev.map((n) =>
              n.id === nodeId
                ? { ...n, data: { ...n.data, status: '执行失败', result: errorMsg } }
                : n
            );
            nodesRef.current = next;
            return next;
          });
          return false;
        }
      }
      const content = upstream || description;
      setNodes((prev) => {
        const next = prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: '已完成', result: content } }
            : n
        );
        nodesRef.current = next;
        return next;
      });
      return true;
    }
    let endpoint = '';
    let body: Record<string, unknown> = {};
    if (type === 'process') {
      const upstream = getUpstreamResult(nodeId) || description || label;
      if (label === '剧本创作') {
        endpoint = '/api/ai/generate-script';
        body = { prompt: upstream || '创作短剧', genre: '都市', style: '' };
      } else if (label === '分镜拆分') {
        // 先检查上游内容审查是否通过
        const redlineNode = nodesRef.current.find((n) => {
          const edge = edgesRef.current.find((e) => e.target === nodeId && e.source === n.id);
          return edge && n.data?.label === '内容审查';
        });
        if (redlineNode) {
          const redlineResult = redlineNode.data?.result;
          const redlineText = typeof redlineResult === 'string' ? redlineResult : redlineResult && typeof redlineResult === 'object' && 'content' in redlineResult ? String((redlineResult as Record<string, unknown>).content) : '';
          const passed = /内容合规|无审查问题|通过|未发现/i.test(redlineText) && !/问题|违规|不通过|包含|存在.*(暴力|色情|政治|敏感|歧视|违法)/i.test(redlineText);
          if (!passed) {
            const failMsg = redlineText ? `内容审查未通过：${redlineText.substring(0, 80)}... 请在剧本创作节点修改后重新执行。` : '内容审查未通过，请在剧本创作节点修改后重新执行。';
            setNodes((prev) => {
              const next = prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '失败', result: failMsg } } : n));
              nodesRef.current = next;
              return next;
            });
            return false;
          }
        }
        endpoint = '/api/ai/split-scenes';
        body = { scriptContent: upstream || description };
      } else if (label === '角色提取') {
        endpoint = '/api/ai/extract-roles';
        body = { script: upstream || description };
      } else if (label === '内容审查') {
        endpoint = '/api/ai/compliance-check';
        body = { content: upstream || description };
      } else {
        endpoint = '/api/ai/split-scenes';
        body = { scriptContent: upstream || description };
      }
    } else if (type === 'text2image') {
      const scenes = getUpstreamScenes(nodeId);
      const ratio = (nodeData.ratio as string) || '16:9';
      if (scenes.length > 0) {
        const generated: Array<{ imageUrl?: string; error?: string }> = [];
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          const prompt = String(scene?.description || scene?.visual || '');
          if (!prompt) {
            generated.push({ error: '缺少提示词' });
            continue;
          }
          try {
            const res = await apiFetch('/api/ai/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, ratio, n: 1 }),
            });
            const d = await res.json();
            if (d.imageUrls && d.imageUrls.length > 0) {
              generated.push({ imageUrl: d.imageUrls[0] });
            } else {
              generated.push({ error: d.error || '生成失败' });
            }
          } catch (error) {
            generated.push({ error: error instanceof Error ? error.message : '生成失败' });
          }
          setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: `进行中 (${i + 1}/${scenes.length})`, generated } } : n)));
        }
        const result = { generated, scenes, imageUrl: generated[0]?.imageUrl };
        setNodes((prev) => {
          const next = prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '已完成', result } } : n));
          nodesRef.current = next;
          return next;
        });
        return true;
      }
      const upstream = getUpstreamResult(nodeId);
      endpoint = '/api/ai/generate-image';
      body = { prompt: upstream || description || label || '短剧场景', ratio, n: 1 };
    } else if (type === 'text2video' || type === 'image2video') {
      const upstream = getUpstreamResult(nodeId);
      const ratio = (nodeData.ratio as string) || '16:9';
      const videoBody = { prompt: upstream || description || label || '短剧片段', imageUrl: type === 'image2video' ? (upstream || '') : '', ratio };
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '进行中' } } : n)));
      try {
        const res = await apiFetch('/api/ai/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify(videoBody),
        });
        if (res.headers.get('content-type')?.includes('text/event-stream')) {
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let videoUrl = '';
          let success = false;
          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const json = line.slice(6);
              if (!json) continue;
              try {
                const parsed = JSON.parse(json) as Record<string, unknown>;
                if (parsed.type === 'progress' && typeof parsed.message === 'string') {
                  setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: `进行中: ${parsed.message}` } } : n)));
                }
                if (parsed.type === 'complete') {
                  success = Boolean(parsed.success);
                  const urls = parsed.videoUrls as string[] | undefined;
                  if (urls && urls.length > 0) videoUrl = urls[0];
                }
              } catch {
                // ignore parse error
              }
            }
          }
          if (success && videoUrl) {
            setNodes((prev) => {
              const next = prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '已完成', result: { videoUrl } } } : n));
              nodesRef.current = next;
              return next;
            });
            return true;
          } else {
            setNodes((prev) => {
              const next = prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '失败', result: '视频生成失败' } } : n));
              nodesRef.current = next;
              return next;
            });
            return false;
          }
        } else {
          const data = await res.json();
          if (data.videoUrls && data.videoUrls.length > 0) {
            setNodes((prev) => {
              const next = prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '已完成', result: { videoUrl: data.videoUrls[0] } } } : n));
              nodesRef.current = next;
              return next;
            });
            return true;
          } else {
            throw new Error(data.error || '视频生成失败');
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : '视频生成失败';
        setNodes((prev) => {
          const next = prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '失败', result: msg } } : n));
          nodesRef.current = next;
          return next;
        });
        return false;
      }
    } else if (type === 'characterViews') {
      const upstreamEdge = edgesRef.current.find((e) => e.target === nodeId);
      const upstreamImgNode = upstreamEdge
        ? nodesRef.current.find((n) => n.id === upstreamEdge.source && n.data?.label === '角色导入')
        : undefined;
      const image = (upstreamImgNode?.data?.characterImage as string) || '';
      endpoint = '/api/ai/generate-character-views';
      body = { prompt: description || label || '角色', image: image || undefined };
    } else {
      return true;
    }
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '进行中' } } : n)));
    try {
      const res = await apiFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success || data.imageUrls || data.videoUrl || data.imageUrl || data.views) {
        let result: unknown = data.data;
        if (type === 'text2image' && data.imageUrls) { result = { imageUrl: data.imageUrls[0] }; }
        else if (type === 'characterViews' && data.imageUrl) { result = { imageUrl: data.imageUrl }; }
        else if (type === 'characterViews' && data.views) { result = { views: data.views }; }
        else if (type === 'process' && typeof data.data === 'string') {
        result = { content: data.data };
        if (label === '分镜拆分' && data.scenes) {
          result = { content: data.data, scenes: data.scenes };
        }
      }
        setNodes((prev) => {
          const next = prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '已完成', result } } : n));
          nodesRef.current = next;
          return next;
        });
        return true;
      } else {
        const errMsg = data.error || '执行失败';
        const displayMsg = res.status === 401 || errMsg.includes('登录')
          ? '登录已过期，请重新登录后重试'
          : errMsg;
        setNodes((prev) => {
          const next = prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '失败', result: displayMsg } } : n));
          nodesRef.current = next;
          return next;
        });
        return false;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '执行失败';
      setNodes((prev) => {
        const next = prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '失败', result: msg } } : n));
        nodesRef.current = next;
        return next;
      });
      return false;
    }
  };

  const handleRunAll = async () => {
    if (isRunningAll || nodes.length === 0) return;
    runAbortRef.current = false;
    setIsRunningAll(true);
    setNodes((prev) => {
      const next = prev.map((n) => ({ ...n, data: { ...n.data, status: '待开始', result: undefined } }));
      nodesRef.current = next;
      return next;
    });
    // Build in-degree map using refs to avoid closure staleness
    const inDegree = new Map<string, number>();
    nodesRef.current.forEach((n) => inDegree.set(n.id, 0));
    edgesRef.current.forEach((e) => { inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1); });
    // Start with nodes that have no dependencies
    let queue = nodesRef.current.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
    // 串行执行：确保每个节点完成后才执行下一个，避免状态竞争
    while (queue.length > 0 && !runAbortRef.current) {
      const nodeId = queue.shift();
      if (!nodeId) break;
      if (runAbortRef.current) break;
      const ok = await executeNodeById(nodeId);
      if (runAbortRef.current) break;
      if (!ok) continue;
      // Decrease in-degree of downstream nodes only on success
      const downstream = edgesRef.current.filter((e) => e.source === nodeId).map((e) => e.target);
      for (const targetId of downstream) {
        const remaining = inDegree.get(targetId) || 0;
        if (remaining > 0) {
          inDegree.set(targetId, remaining - 1);
          if (remaining - 1 === 0) { queue.push(targetId); }
        }
      }
    }
    setIsRunningAll(false);
    if (!runAbortRef.current) { toast.success('工作流运行完成'); }
    else { toast.info('工作流已取消'); }
  };

  useEffect(() => {
    apiFetch('/api/workflows/wf-1')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const wf = res.data;
          let mappedNodes = wf.nodes.map((n: Node) => ({
            id: n.id,
            type: typeMap[n.type as string] || n.type,
            position: n.position,
            width: n.width || (n.data?.width as number) || 260,
            height: n.height || (n.data?.height as number) || 260,
            data: { description: '', ...n.data },
          }));
          let mappedEdges = wf.edges.map((e: Edge) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: true,
            style: { stroke: '#555555', strokeWidth: 1.5 },
          }));
          // 移除旧的分镜拆分→图生视频直连线
          mappedEdges = mappedEdges.filter(
            (e: Edge) => !(e.source === 'n4' && e.target === 'n6')
          );
          // 检测是否为旧拥挤布局（新布局 n4.x >= 1620）
          const n4 = mappedNodes.find((n: Node) => n.id === 'n4');
          const isOldLayout = n4 && (n4.position?.x ?? 0) < 1200;
          if (isOldLayout) {
            const layouted = getLayoutedElements(mappedNodes, mappedEdges, 'LR');
            mappedNodes = layouted.nodes;
            mappedEdges = layouted.edges;
          }
          skipHistoryRef.current = true;
          setNodes(mappedNodes);
          setEdges(mappedEdges);
          historyRef.current = [{ nodes: JSON.parse(JSON.stringify(mappedNodes)), edges: JSON.parse(JSON.stringify(mappedEdges)) }];
          historyIndexRef.current = 0;
        } else {
          // 后端无数据：使用 dagre 布局后的初始节点
          const layouted = getLayoutedElements(initialNodes, initialEdges, 'LR');
          skipHistoryRef.current = true;
          setNodes(layouted.nodes);
          setEdges(layouted.edges);
          historyRef.current = [{ nodes: JSON.parse(JSON.stringify(layouted.nodes)), edges: JSON.parse(JSON.stringify(layouted.edges)) }];
          historyIndexRef.current = 0;
        }
      })
      .catch(() => {
        // API 失败：使用 dagre 布局后的初始节点
        const layouted = getLayoutedElements(initialNodes, initialEdges, 'LR');
        skipHistoryRef.current = true;
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
        historyRef.current = [{ nodes: JSON.parse(JSON.stringify(layouted.nodes)), edges: JSON.parse(JSON.stringify(layouted.edges)) }];
        historyIndexRef.current = 0;
      });
  }, [setNodes, setEdges]);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#555555', strokeWidth: 1.5 } }, eds)),
    [setEdges]
  );

  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'LR');
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    toast.success('布局已优化');
  }, [nodes, edges, setNodes, setEdges]);

  const handleAddNode = (type: string, label: string) => {
    const id = `node-${nodeIdCounter.current++}`;
    nodePosOffset.current += 50;
    const offset = nodePosOffset.current % 300;
    const position = { x: 200 + offset, y: 150 + offset * 0.5 };
    const width = type === 'process' ? 320 : type === 'output' ? 280 : 260;
    const height = type === 'output' ? 220 : type === 'text2image' || type === 'text2video' || type === 'image2video' ? 320 : type === 'characterViews' ? 340 : 260;
    setNodes((prev) => [
      ...prev,
      {
        id,
        type,
        position,
        width,
        height,
        data: { label, description: '', status: '待开始' },
      },
    ]);
  };

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleExecuteNode = useCallback(async (nodeId: string) => {
    if (isRunningAll) return;
    const ok = await executeNodeById(nodeId);
    if (ok) toast.success(`节点执行完成`);
    else toast.error(`节点执行失败`);
  }, [isRunningAll, executeNodeById]);

  return (
    <AppShell>
      <div className="h-[calc(100vh-3.5rem)] flex relative">
        {/* 左侧节点面板 - 仅桌面端显示 */}
        <div className="workspace-left-panel w-52 shrink-0 border-r border-[#333333]/30 bg-[#141414] overflow-y-auto h-[calc(100vh-3.5rem)] flex-col">
          <div className="p-3 space-y-4">
            {paletteItems.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs font-medium text-[#888888] uppercase tracking-wider mb-2 px-1">
                  {group.category}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-[#888888] hover:bg-[#1A1A1A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                        onClick={() => handleAddNode(item.type, item.label)}
                      >
                        <Icon className="w-4 h-4" style={{ color: group.color }} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 画布区域 */}
        <div className="flex-1 relative">
          {/* 工具栏 */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-[#141414]/90 backdrop-blur-sm rounded-lg border border-[#333333]/30 px-2 py-1.5 min-w-0">
              <span className="text-sm font-medium text-[#F5F5F5] px-2 truncate">都市甜宠：月光下的救赎</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#0ABAB5]/10 text-[#0ABAB5] shrink-0">进行中</span>
            </div>
            <div className="flex items-center gap-1 bg-[#141414]/90 backdrop-blur-sm rounded-lg border border-[#333333]/30 px-2 py-1.5 overflow-x-auto max-w-full">
              <button className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#888888] hover:text-[#F5F5F5] transition-colors shrink-0" title="撤销" onClick={handleUndo}>
                <Undo2 className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#888888] hover:text-[#F5F5F5] transition-colors shrink-0" title="重做" onClick={handleRedo}>
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[#333333]/30 mx-1 shrink-0" />
              <button className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#888888] hover:text-[#F5F5F5] transition-colors shrink-0" onClick={() => setZoom((z) => Math.max(25, z - 25))}>
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#888888] w-10 text-center shrink-0">{zoom}%</span>
              <button className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#888888] hover:text-[#F5F5F5] transition-colors shrink-0" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[#333333]/30 mx-1 shrink-0" />
              <button className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#888888] hover:text-[#F5F5F5] transition-colors relative shrink-0" title="保存" onClick={() => handleSaveWorkflow()}>
                <Save className="w-4 h-4" />
                {saveStatus !== 'idle' && (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${saveStatus === 'saving' ? 'bg-[#0ABAB5] animate-pulse' : 'bg-green-500'}`} />
                )}
              </button>
              {isRunningAll ? (
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all" onClick={() => { runAbortRef.current = true; setIsRunningAll(false); }}>
                  <X className="w-3.5 h-3.5" />
                  取消
                </button>
              ) : (
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0ABAB5] text-black text-xs font-medium hover:shadow-[0_0_12px_rgba(10,186,181,0.3)] transition-all" onClick={handleRunAll}>
                  <Play className="w-3.5 h-3.5" />
                  运行
                </button>
              )}
            </div>
          </div>

          <WorkflowActionsContext.Provider value={{ onExecuteNode: handleExecuteNode, onDeleteNode: handleDeleteNode, isRunningAll }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeClick={(_event, edge) => setEdges((eds) => eds.filter((e) => e.id !== edge.id))}
              nodeTypes={nodeTypes}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
              defaultViewport={{ zoom: 1, x: 0, y: 0 }}
              minZoom={0.25}
              maxZoom={2}
              panOnDrag={true}
              style={{ background: '#0A0A0A' }}
              connectionLineStyle={{
                stroke: '#0ABAB5',
                strokeWidth: 2,
              }}
              connectionLineType={ConnectionLineType.SmoothStep}
            >
              <Background color="#1A1A1A" gap={24} size={1} />
              <Controls className="!bg-[#141414] !border-[#333333]/30" />
              <MiniMap
                className="!bg-[#141414] !border-[#333333]/30"
                nodeColor={(n) => NODE_COLORS[n.type || ''] || '#555'}
              />

              {/* 添加节点按钮 */}
              <Panel position="bottom-center">
                <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 overflow-x-auto max-w-[calc(100vw-2rem)]">
                  <Select
                    value={newNodeType}
                    onValueChange={(value) => setNewNodeType(value)}
                  >
                    <SelectTrigger className="w-auto min-w-[160px] bg-transparent border-none text-sm text-[#F5F5F5] h-8 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="选择节点类型" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#333333] text-[#F5F5F5] max-h-[300px]">
                      {paletteItems.flatMap((group) =>
                        group.items.map((item) => (
                          <SelectItem
                            key={`${item.type}|${item.label}`}
                            value={`${item.type}|${item.label}`}
                            className="focus:bg-[#0ABAB5]/20 focus:text-[#0ABAB5]"
                          >
                            [{group.category}] {item.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => {
                      const [type, label] = newNodeType.split('|');
                      handleAddNode(type, label);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0ABAB5] text-black text-sm font-medium hover:shadow-[0_0_16px_rgba(10,186,181,0.4)] transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加
                  </button>
                  <div className="w-px h-5 bg-[#333333] shrink-0" />
                  <button
                    onClick={handleAutoLayout}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1A1A] border border-[#333333] text-[#F5F5F5] text-sm font-medium hover:border-[#0ABAB5]/50 transition-all shrink-0"
                    title="一键优化节点布局"
                  >
                    <Layout className="w-3.5 h-3.5" />
                    优化布局
                  </button>
                </div>
              </Panel>
            </ReactFlow>
          </WorkflowActionsContext.Provider>
        </div>


      </div>
    </AppShell>
  );
}
