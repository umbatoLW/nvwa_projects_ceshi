#!/usr/bin/env python3
import re

with open('/workspace/projects/src/app/workspace/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import for new node components
old_import = '"use client";\n\nimport React, { useState, useCallback, useEffect, useRef, useMemo } from "react";'
new_import = '"use client";\n\nimport React, { useState, useCallback, useEffect, useRef } from "react";'
content = content.replace(old_import, new_import)

# 2. Replace nodeTypes definition block with import
old_node_types = """const nodeTypes: NodeTypes = useMemo(
  () => ({
    input: (props: NodeProps) => {
      const data = props.data as Record<string, unknown>;
      const status = (data?.status as string) || '待处理';
      return (
        <div className={`relative rounded-xl bg-[#141414] border-2 px-4 py-3 min-w-[180px] shadow-lg transition-all duration-300 hover:shadow-xl ${
          status === '进行中'
            ? 'node-pulse-running'
            : status === '已完成'
            ? 'border-emerald-500/60'
            : status === '失败'
            ? 'border-red-500/60'
            : 'border-[#333333] hover:border-[#0ABAB5]'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#F5F5F5]">{String(data?.label || '输入')}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(props.id);
              }}
              className="text-[#555555] hover:text-red-400 transition-colors p-0.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-xs text-[#888888] line-clamp-2">{String(data?.description || '')}</div>
          <Handle type="source" position={Position.Bottom} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[status as StatusType]?.bg || 'bg-[#1A1A1A]'} ${STATUS_CONFIG[status as StatusType]?.text || 'text-[#888888]'}`}>
              {status}
            </span>
          </div>
        </div>
      );
    },
    process: (props: NodeProps) => {
      const data = props.data as Record<string, unknown>;
      const status = (data?.status as string) || '待处理';
      return (
        <div className={`relative rounded-xl bg-[#141414] border-2 px-4 py-3 min-w-[180px] shadow-lg transition-all duration-300 hover:shadow-xl ${
          status === '进行中'
            ? 'node-pulse-running'
            : status === '已完成'
            ? 'border-emerald-500/60'
            : status === '失败'
            ? 'border-red-500/60'
            : 'border-[#333333] hover:border-[#0ABAB5]'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#F5F5F5]">{String(data?.label || '处理')}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteNode(props.id);
                }}
                disabled={status === '进行中'}
                className="text-[#0ABAB5] hover:text-[#0ABAB5]/80 transition-colors p-0.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(props.id);
                }}
                className="text-[#555555] hover:text-red-400 transition-colors p-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-[#888888] line-clamp-2">{String(data?.description || '')}</div>
          <Handle type="target" position={Position.Top} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <Handle type="source" position={Position.Bottom} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[status as StatusType]?.bg || 'bg-[#1A1A1A]'} ${STATUS_CONFIG[status as StatusType]?.text || 'text-[#888888]'}`}>
              {status}
            </span>
          </div>
        </div>
      );
    },
    text2image: (props: NodeProps) => {
      const data = props.data as Record<string, unknown>;
      const status = (data?.status as string) || '待处理';
      return (
        <div className={`relative rounded-xl bg-[#141414] border-2 px-4 py-3 min-w-[180px] shadow-lg transition-all duration-300 hover:shadow-xl ${
          status === '进行中'
            ? 'node-pulse-running'
            : status === '已完成'
            ? 'border-emerald-500/60'
            : status === '失败'
            ? 'border-red-500/60'
            : 'border-[#333333] hover:border-[#0ABAB5]'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#F5F5F5]">{String(data?.label || '文生图')}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteNode(props.id);
                }}
                disabled={status === '进行中'}
                className="text-[#0ABAB5] hover:text-[#0ABAB5]/80 transition-colors p-0.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(props.id);
                }}
                className="text-[#555555] hover:text-red-400 transition-colors p-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-[#888888] line-clamp-2">{String(data?.description || '')}</div>
          <Handle type="target" position={Position.Top} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <Handle type="source" position={Position.Bottom} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[status as StatusType]?.bg || 'bg-[#1A1A1A]'} ${STATUS_CONFIG[status as StatusType]?.text || 'text-[#888888]'}`}>
              {status}
            </span>
          </div>
        </div>
      );
    },
    text2video: (props: NodeProps) => {
      const data = props.data as Record<string, unknown>;
      const status = (data?.status as string) || '待处理';
      return (
        <div className={`relative rounded-xl bg-[#141414] border-2 px-4 py-3 min-w-[180px] shadow-lg transition-all duration-300 hover:shadow-xl ${
          status === '进行中'
            ? 'node-pulse-running'
            : status === '已完成'
            ? 'border-emerald-500/60'
            : status === '失败'
            ? 'border-red-500/60'
            : 'border-[#333333] hover:border-[#0ABAB5]'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#F5F5F5]">{String(data?.label || '文生视频')}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteNode(props.id);
                }}
                disabled={status === '进行中'}
                className="text-[#0ABAB5] hover:text-[#0ABAB5]/80 transition-colors p-0.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(props.id);
                }}
                className="text-[#555555] hover:text-red-400 transition-colors p-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-[#888888] line-clamp-2">{String(data?.description || '')}</div>
          <Handle type="target" position={Position.Top} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <Handle type="source" position={Position.Bottom} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[status as StatusType]?.bg || 'bg-[#1A1A1A]'} ${STATUS_CONFIG[status as StatusType]?.text || 'text-[#888888]'}`}>
              {status}
            </span>
          </div>
        </div>
      );
    },
    image2video: (props: NodeProps) => {
      const data = props.data as Record<string, unknown>;
      const status = (data?.status as string) || '待处理';
      return (
        <div className={`relative rounded-xl bg-[#141414] border-2 px-4 py-3 min-w-[180px] shadow-lg transition-all duration-300 hover:shadow-xl ${
          status === '进行中'
            ? 'node-pulse-running'
            : status === '已完成'
            ? 'border-emerald-500/60'
            : status === '失败'
            ? 'border-red-500/60'
            : 'border-[#333333] hover:border-[#0ABAB5]'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#F5F5F5]">{String(data?.label || '图生视频')}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteNode(props.id);
                }}
                disabled={status === '进行中'}
                className="text-[#0ABAB5] hover:text-[#0ABAB5]/80 transition-colors p-0.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(props.id);
                }}
                className="text-[#555555] hover:text-red-400 transition-colors p-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-[#888888] line-clamp-2">{String(data?.description || '')}</div>
          <Handle type="target" position={Position.Top} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <Handle type="source" position={Position.Bottom} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[status as StatusType]?.bg || 'bg-[#1A1A1A]'} ${STATUS_CONFIG[status as StatusType]?.text || 'text-[#888888]'}`}>
              {status}
            </span>
          </div>
        </div>
      );
    },
    characterViews: (props: NodeProps) => {
      const data = props.data as Record<string, unknown>;
      const status = (data?.status as string) || '待处理';
      return (
        <div className={`relative rounded-xl bg-[#141414] border-2 px-4 py-3 min-w-[180px] shadow-lg transition-all duration-300 hover:shadow-xl ${
          status === '进行中'
            ? 'node-pulse-running'
            : status === '已完成'
            ? 'border-emerald-500/60'
            : status === '失败'
            ? 'border-red-500/60'
            : 'border-[#333333] hover:border-[#0ABAB5]'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#F5F5F5]">{String(data?.label || '角色三视图')}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteNode(props.id);
                }}
                disabled={status === '进行中'}
                className="text-[#0ABAB5] hover:text-[#0ABAB5]/80 transition-colors p-0.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(props.id);
                }}
                className="text-[#555555] hover:text-red-400 transition-colors p-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-[#888888] line-clamp-2">{String(data?.description || '')}</div>
          <Handle type="target" position={Position.Top} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <Handle type="source" position={Position.Bottom} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[status as StatusType]?.bg || 'bg-[#1A1A1A]'} ${STATUS_CONFIG[status as StatusType]?.text || 'text-[#888888]'}`}>
              {status}
            </span>
          </div>
        </div>
      );
    },
    output: (props: NodeProps) => {
      const data = props.data as Record<string, unknown>;
      const status = (data?.status as string) || '待处理';
      return (
        <div className={`relative rounded-xl bg-[#141414] border-2 px-4 py-3 min-w-[180px] shadow-lg transition-all duration-300 hover:shadow-xl ${
          status === '进行中'
            ? 'node-pulse-running'
            : status === '已完成'
            ? 'border-emerald-500/60'
            : status === '失败'
            ? 'border-red-500/60'
            : 'border-[#333333] hover:border-[#0ABAB5]'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#F5F5F5]">{String(data?.label || '输出')}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(props.id);
              }}
              className="text-[#555555] hover:text-red-400 transition-colors p-0.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-xs text-[#888888] line-clamp-2">{String(data?.description || '')}</div>
          <Handle type="target" position={Position.Top} className="!bg-[#555555] !w-2.5 !h-2.5" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[status as StatusType]?.bg || 'bg-[#1A1A1A]'} ${STATUS_CONFIG[status as StatusType]?.text || 'text-[#888888]'}`}>
              {status}
            </span>
          </div>
        </div>
      );
    },
  }),
  []
);"""

# Find and replace
if old_node_types in content:
    content = content.replace(old_node_types, "")
    print("Replaced nodeTypes block")
else:
    print("WARNING: nodeTypes block not found exactly")

# 3. Remove selectedNode related states
content = content.replace(
    "const [selectedNode, setSelectedNode] = useState<string | null>(null);",
    ""
)

# 4. Remove handleNodeClick
content = content.replace(
    """  const handleNodeClick = useCallback((_event: React.MouseEvent, node: { id: string }) => {
    setSelectedNode(node.id);
  }, []);""",
    ""
)

# 5. Remove selectedNodeData memo
content = content.replace(
    """  const selectedNodeData = useMemo(() => {
    if (!selectedNode) return null;
    return nodes.find((n) => n.id === selectedNode)?.data || null;
  }, [selectedNode, nodes]);""",
    ""
)

# 6. Remove selectedNodeType and selectedNodeLabel
content = content.replace(
    """  const selectedNodeType = selectedNodeData ? (selectedNodeData.type as string) : null;
  const selectedNodeLabel = selectedNodeData ? (selectedNodeData.label as string) || '' : '';""",
    ""
)

# 7. Remove updateNodeData (moved to individual nodes via useReactFlow)
old_update = """  const updateNodeData = (key: string, value: unknown) => {
    if (!selectedNode) return;
    setNodes((prev) => {
      const next = prev.map((n) =>
        n.id === selectedNode
          ? { ...n, data: { ...n.data, [key]: value } }
          : n
      );
      nodesRef.current = next;
      return next;
    });
  };"""
content = content.replace(old_update, "")

# 8. Remove handleImageUpload for selected node
old_handle_image = """  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageData = ev.target?.result as string;
      setNodes((prev) => {
        const next = prev.map((n) =>
          n.id === selectedNode
            ? { ...n, data: { ...n.data, imageData } }
            : n
        );
        nodesRef.current = next;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };"""
content = content.replace(old_handle_image, "")

# 9. Remove handleDocumentUpload for selected node
old_doc_upload = """  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;
    if (
      !file.name.endsWith('.txt') &&
      !file.name.endsWith('.docx') &&
      !file.name.endsWith('.pdf')
    ) {
      toast.error('仅支持 .txt, .docx, .pdf 格式');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch('/api/ai/upload-document', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.content) {
        updateNodeData('description', data.content);
        toast.success('文档上传成功');
      } else {
        toast.error(data.error || '文档解析失败');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '上传失败';
      toast.error(msg);
    }
  };"""
content = content.replace(old_doc_upload, "")

# 10. Remove export functions (moved to output node)
content = content.replace(
    """  const exportToTxt = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToDocx = async (content: string, filename: string) => {
    const res = await apiFetch('/api/ai/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCsv = (rows: Record<string, unknown>[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]).join(',');
    const csvRows = rows.map((row) =>
      Object.values(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };""",
    ""
)

# 11. Modify onNodeClick to not set selectedNode
content = content.replace(
    "onNodeClick={handleNodeClick}",
    ""
)

# 12. Remove right panel JSX
# Find the right panel div and remove it
right_panel_pattern = r'<div className="w-[320px] border-l border-\[#222222\] bg-\[#0A0A0A\] p-4 overflow-y-auto">.*?</div>\s*</div>\s*);'
match = re.search(right_panel_pattern, content, re.DOTALL)
if match:
    content = content[:match.start()] + ");" + content[match.end():]
    print("Removed right panel")
else:
    print("WARNING: Right panel not found, trying alternative...")
    # Alternative: find and remove from "{/* 右侧属性面板 */}" to the closing divs
    alt_pattern = r'\{\/\* 右侧属性面板 \*\/\}.*?</div>\s*</div>\s*\);'
    match = re.search(alt_pattern, content, re.DOTALL)
    if match:
        content = content[:match.start()] + "  );" + content[match.end():]
        print("Removed right panel (alternative)")
    else:
        print("ERROR: Could not find right panel")

# 13. Adjust ReactFlow container to take full width
content = content.replace(
    'className="flex-1 relative"',
    'className="w-full h-full relative"'
)

# 14. Remove selectedNode from handleDeleteNode
content = content.replace(
    """  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNode === nodeId) {
        setSelectedNode(null);
      }
    },
    [setNodes, setEdges, selectedNode]
  );""",
    """  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );"""
)

# 15. Add nodeTypes import and definition
# We need to add: import { InputNode, ProcessNode, ... } from '@/components/workspace/node-components';
# And: const nodeTypes: NodeTypes = { input: InputNode, process: ProcessNode, ... };

# Find the position after imports to add new import
import_section_end = content.find("import { apiFetch } from '@/lib/api-client';")
if import_section_end > 0:
    line_end = content.find('\n', import_section_end) + 1
    content = content[:line_end] + "import {\n  InputNode,\n  ProcessNode,\n  Text2ImageNode,\n  Text2VideoNode,\n  Image2VideoNode,\n  CharacterViewsNode,\n  OutputNode,\n} from '@/components/workspace/node-components';\n" + content[line_end:]
    print("Added node component imports")

# Find position to add nodeTypes (after typeMap definition)
typeMap_pos = content.find("const typeMap: Record<string, string> = {")
if typeMap_pos > 0:
    # Find end of STATUS_CONFIG block
    status_config_end = content.find("};\n", content.find("const STATUS_CONFIG"))
    if status_config_end > 0:
        insert_pos = status_config_end + 3
        nodeTypes_def = """
const nodeTypes: NodeTypes = {
  input: InputNode,
  process: ProcessNode,
  text2image: Text2ImageNode,
  text2video: Text2VideoNode,
  image2video: Image2VideoNode,
  characterViews: CharacterViewsNode,
  output: OutputNode,
};
"""
        content = content[:insert_pos] + nodeTypes_def + content[insert_pos:]
        print("Added nodeTypes definition")

# 16. Remove unused imports (Image, Video, Trash2, Play, Download from lucide-react)
# We still need some of these in the toolbar, so only remove if not used elsewhere
# Let's keep them for now and let lint catch unused ones

# 17. Add StatusType export to page.tsx so node-components can import it
# We need to add: export type StatusType = '待开始' | '进行中' | '已完成' | '失败' | '待处理';
# Find STATUS_CONFIG definition and add export before it
status_config_pos = content.find("const STATUS_CONFIG")
if status_config_pos > 0:
    content = content[:status_config_pos] + "export type StatusType = '待开始' | '进行中' | '已完成' | '失败' | '待处理';\n\n" + content[status_config_pos:]
    print("Added StatusType export")

# Write modified content
with open('/workspace/projects/src/app/workspace/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done refactoring workspace/page.tsx")
