#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

path = '/workspace/projects/src/app/workspace/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find start and end of handleRunAll
start_line = None
end_line = None
for i, line in enumerate(lines):
    if 'const handleRunAll = async () => {' in line:
        start_line = i
    if start_line is not None and i > start_line:
        stripped = line.strip()
        # End when we hit a new top-level const (2-space indent) that isn't inside handleRunAll
        if stripped.startswith('const ') and not stripped.startswith('const {'):
            # Count indent of this line
            indent = len(line) - len(line.lstrip())
            if indent <= 2:
                end_line = i
                break

if start_line is None or end_line is None:
    print(f'ERROR: Could not find handleRunAll boundaries: start={start_line}, end={end_line}')
    exit(1)

print(f'Found handleRunAll from line {start_line+1} to {end_line}')

new_code = '''  const executeNodeById = async (nodeId: string): Promise<boolean> => {
    if (runAbortRef.current) return false;
    const node = nodes.find((n) => n.id === nodeId);
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
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: '已完成', result: content } }
            : n
        )
      );
      return true;
    }
    if (type === 'output') {
      const upstream = getUpstreamResult(nodeId);
      const content = upstream || description || '【' + label + '】\n暂无上游内容，请确保前置节点已执行。';
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: '已完成', result: content } }
            : n
        )
      );
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
        endpoint = '/api/ai/split-scenes';
        body = { scriptContent: upstream || description };
      } else if (label === '角色提取') {
        endpoint = '/api/ai/execute-node';
        body = { nodeType: 'characterExtract', inputs: { script: upstream || description } };
      } else if (label === '红线检测') {
        endpoint = '/api/ai/execute-node';
        body = { nodeType: 'complianceCheck', inputs: { content: upstream || description } };
      } else {
        endpoint = '/api/ai/split-scenes';
        body = { scriptContent: upstream || description };
      }
    } else if (type === 'text2image') {
      const upstream = getUpstreamResult(nodeId);
      endpoint = '/api/ai/generate-image';
      body = { prompt: upstream || description || label || '短剧场景' };
    } else if (type === 'text2video') {
      const upstream = getUpstreamResult(nodeId);
      endpoint = '/api/ai/generate-video';
      body = { prompt: upstream || description || label || '短剧片段', imageUrl: '' };
    } else if (type === 'image2video') {
      const upstreamImg = getUpstreamResult(nodeId);
      endpoint = '/api/ai/generate-video';
      body = { prompt: description || label || '短剧片段', imageUrl: upstreamImg || '' };
    } else if (type === 'characterViews') {
      const upstreamImgNode = nodes.find((n) => {
        const edge = edges.find((e) => e.target === nodeId && e.source === n.id);
        return edge && n.data?.label === '角色导入';
      });
      const image = (upstreamImgNode?.data?.imageData as string) || '';
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
        else if ((type === 'text2video' || type === 'image2video') && data.videoUrl) { result = { videoUrl: data.videoUrl }; }
        else if (type === 'characterViews' && data.imageUrl) { result = { imageUrl: data.imageUrl }; }
        else if (type === 'characterViews' && data.views) { result = { views: data.views }; }
        else if (type === 'process' && typeof data.data === 'string') { result = { content: data.data }; }
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '已完成', result } } : n)));
        return true;
      } else {
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '失败', result: data.error || '执行失败' } } : n)));
        return false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '执行失败';
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: '失败', result: msg } } : n)));
      return false;
    }
  };

  const handleRunAll = async () => {
    if (isRunningAll || nodes.length === 0) return;
    runAbortRef.current = false;
    setIsRunningAll(true);
    setNodes((prev) => prev.map((n) => ({ ...n, data: { ...n.data, status: '待开始', result: undefined } })));
    // Build in-degree map
    const inDegree = new Map<string, number>();
    nodes.forEach((n) => inDegree.set(n.id, 0));
    edges.forEach((e) => { inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1); });
    // Start with nodes that have no dependencies
    let queue = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
    while (queue.length > 0 && !runAbortRef.current) {
      const batch = [...queue];
      queue = [];
      await Promise.allSettled(
        batch.map(async (nodeId) => {
          if (runAbortRef.current) return;
          await executeNodeById(nodeId);
          if (runAbortRef.current) return;
          // Decrease in-degree of downstream nodes
          const downstream = edges.filter((e) => e.source === nodeId).map((e) => e.target);
          for (const targetId of downstream) {
            const remaining = inDegree.get(targetId) || 0;
            if (remaining > 0) {
              inDegree.set(targetId, remaining - 1);
              if (remaining - 1 === 0) { queue.push(targetId); }
            }
          }
        })
      );
    }
    setIsRunningAll(false);
    if (!runAbortRef.current) { toast.success('工作流运行完成'); }
    else { toast.info('工作流已取消'); }
  };

'''

new_lines = lines[:start_line] + [new_code] + lines[end_line:]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'Replaced lines {start_line+1}-{end_line} successfully.')
