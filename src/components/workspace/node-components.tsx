"use client";

import React, { useState, useEffect, useMemo, createContext, useContext } from "react";
import { Handle, Position, useReactFlow, type NodeProps, NodeResizeControl, ResizeControlVariant } from "@xyflow/react";
import {
  Trash2,
  Play,
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Video as VideoIcon,
  ImagePlus,
  Images,
  GripHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { StatusType } from "@/app/workspace/page";

/* ─── Workflow Actions Context ─── */
interface WorkflowActions {
  onExecuteNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  isRunningAll?: boolean;
}

export const WorkflowActionsContext = createContext<WorkflowActions>({});

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status?: StatusType }) {
  if (status === "已完成")
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        已完成
      </span>
    );
  if (status === "进行中")
    return (
      <span className="flex items-center gap-1 text-xs text-[#0ABAB5]">
        <Loader2 className="w-3 h-3 animate-spin" />
        进行中
      </span>
    );
  if (status === "失败")
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="w-3 h-3" />
        失败
      </span>
    );
  if (status === "待开始")
    return (
      <span className="flex items-center gap-1 text-xs text-[#888888]">
        <Clock className="w-3 h-3" />
        待开始
      </span>
    );
  return null;
}

/* ─── Status Border Color ─── */
function getStatusBorder(status?: StatusType) {
  if (status === "进行中") return "border-[#0ABAB5] shadow-[0_0_12px_rgba(10,186,181,0.25)]";
  if (status === "已完成") return "border-emerald-500/60";
  if (status === "失败") return "border-red-500/60";
  return "border-[#333333]";
}

/* ─── Common Node Wrapper ─── */
function NodeWrapper({
  children,
  nodeId,
  label,
  status,
  handles = true,
}: {
  children: React.ReactNode;
  nodeId: string;
  label: string;
  status?: StatusType;
  handles?: boolean;
}) {
  const actions = useContext(WorkflowActionsContext);
  const { updateNodeData } = useReactFlow();

  return (
    <div
      className={`relative w-full h-full rounded-xl overflow-hidden bg-[#141414] border ${getStatusBorder(
        status
      )} transition-all duration-300`}
      style={{ minWidth: 200, minHeight: 120 }}
    >
      {handles && <Handle type="target" position={Position.Left} className="!bg-[#555555] !w-2.5 !h-2.5" />}
      {handles && <Handle type="source" position={Position.Right} className="!bg-[#555555] !w-2.5 !h-2.5" />}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#222222] bg-[#1A1A1A] shrink-0">
        <span className="text-xs font-medium text-[#F5F5F5] truncate">{label}</span>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={status} />
          {actions.onExecuteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onExecuteNode!(nodeId);
              }}
              disabled={actions.isRunningAll || status === "进行中"}
              className="p-1 rounded hover:bg-[#0ABAB5]/20 disabled:opacity-30 transition-colors"
              title="执行节点"
            >
              <Play className="w-3 h-3 text-[#0ABAB5]" />
            </button>
          )}
          {actions.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onDeleteNode!(nodeId);
              }}
              className="p-1 rounded hover:bg-red-500/20 transition-colors"
              title="删除节点"
            >
              <Trash2 className="w-3 h-3 text-[#888888] hover:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2" style={{ height: `calc(100% - 36px)` }}>
        {children}
      </div>

      <NodeResizeControl
        minWidth={200}
        minHeight={120}
        position="bottom-right"
        variant={ResizeControlVariant.Handle}
        style={{
          width: 20,
          height: 20,
          background: 'rgba(10, 186, 181, 0.15)',
          borderTopLeftRadius: 6,
          borderLeft: '1px solid rgba(10, 186, 181, 0.35)',
          borderTop: '1px solid rgba(10, 186, 181, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'se-resize',
        }}
        onResizeEnd={(_, params) => {
          updateNodeData(nodeId, { width: params.width, height: params.height });
        }}
      >
        <GripHorizontal className="w-3 h-3 text-[#0ABAB5] rotate-45 pointer-events-none" />
      </NodeResizeControl>
    </div>
  );
}

/* ─── Input Node ─── */
export function InputNode(props: NodeProps) {
  const { id, data } = props;
  const { updateNodeData } = useReactFlow();
  const label = (data?.label as string) || "输入";
  const description = (data?.description as string) || "";
  const status = (data?.status as StatusType) || "待处理";
  const result = data?.result;
  const images = data?.imageData as string[] | string | undefined;

  const setDesc = (val: string) => updateNodeData(id, { description: val });

  if (label === "素材上传") {
    const list = Array.isArray(images) ? images : images ? [images] : [];
    return (
      <NodeWrapper nodeId={id} label={label} status={status}>
        <div className="space-y-2 h-full">
          <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#333333] hover:border-[#0ABAB5] cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-[#888888]" />
            <span className="text-xs text-[#888888]">上传素材</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const url = ev.target?.result as string;
                    const current = Array.isArray(data?.imageData)
                      ? (data?.imageData as string[])
                      : data?.imageData
                      ? [data?.imageData as string]
                      : [];
                    updateNodeData(id, { imageData: [...current, url] });
                  };
                  reader.readAsDataURL(file);
                });
              }}
            />
          </label>
          {list.length > 0 && (
            <div className="grid grid-cols-2 gap-1">
              {list.map((img, i) => (
                <img key={i} src={img} alt="" className="w-full h-16 object-cover rounded-md" />
              ))}
            </div>
          )}
        </div>
      </NodeWrapper>
    );
  } else if (label === "角色导入") {
    const characterName = (data?.characterName as string) || "";
    const characterDesc = (data?.characterDesc as string) || "";
    const characterImage = (data?.characterImage as string) || "";
    return (
      <NodeWrapper nodeId={id} label={label} status={status}>
        <div className="space-y-2">
          <input
            type="text"
            value={characterName}
            onChange={(e) => updateNodeData(id, { characterName: e.target.value })}
            placeholder="角色名称"
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#0ABAB5]/50"
          />
          <textarea
            value={characterDesc}
            onChange={(e) => updateNodeData(id, { characterDesc: e.target.value })}
            placeholder="角色描述（外貌、性格等）"
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#F5F5F5] placeholder:text-[#555555] resize-none outline-none focus:border-[#0ABAB5]/50"
            style={{ height: 60 }}
          />
          <label className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border border-dashed border-[#333333] hover:border-[#0ABAB5] cursor-pointer transition-colors">
            <Upload className="w-3 h-3 text-[#888888]" />
            <span className="text-xs text-[#888888]">上传参考图</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    updateNodeData(id, { characterImage: ev.target?.result as string });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
          {characterImage && (
            <img src={characterImage} alt="角色参考图" className="w-full h-16 object-cover rounded-md" />
          )}
        </div>
      </NodeWrapper>
    );
  }

  return (
    <NodeWrapper nodeId={id} label={label} status={status}>
      <textarea
        value={description}
        onChange={(e) => setDesc(e.target.value)}
        placeholder={`输入${label}内容...`}
        className="w-full h-full bg-transparent text-xs text-[#F5F5F5] placeholder:text-[#555555] resize-none outline-none leading-relaxed"
        style={{ minHeight: 60 }}
      />
    </NodeWrapper>
  );
}

/* ─── Process Node ─── */
export function ProcessNode(props: NodeProps) {
  const { id, data } = props;
  const { updateNodeData } = useReactFlow();
  const label = (data?.label as string) || "处理";
  const description = (data?.description as string) || "";
  const status = (data?.status as StatusType) || "待处理";
  const result = data?.result;

  const resultText =
    typeof result === "string"
      ? result
      : result && typeof result === "object" && "content" in result
      ? String((result as Record<string, unknown>).content)
      : description || label;

  const setDesc = (val: string) => updateNodeData(id, { description: val });

  if (label === "分镜拆分") {
    const scenes =
      result && typeof result === "object" && Array.isArray((result as Record<string, unknown>).scenes)
        ? ((result as Record<string, unknown>).scenes as Array<Record<string, unknown>>)
        : [];

    const downloadCsv = () => {
      if (scenes.length === 0) return;
      const headers = "镜号,场景描述,画面内容,台词,时长\n";
      const rows = scenes
        .map(
          (s, i) =>
            `${i + 1},"${String(s.description || "").replace(/"/g, '""')}","${String(
              s.visual || ""
            ).replace(/"/g, '""')}","${String(s.dialogue || "").replace(/"/g, '""')}",${s.duration || "3s"}`
        )
        .join("\n");
      const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `分镜表_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("分镜表已下载");
    };

    return (
      <NodeWrapper nodeId={id} label={label} status={status}>
        <div className="space-y-2 h-full">
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="输入剧本内容用于分镜拆分..."
            className="w-full bg-transparent text-xs text-[#F5F5F5] placeholder:text-[#555555] resize-none outline-none border border-[#222222] rounded-md p-2"
            style={{ height: 60 }}
          />
          {scenes.length > 0 && (
            <>
              <div className="text-[10px] text-[#888888] font-medium">共 {scenes.length} 个场景</div>
              <div className="overflow-auto border border-[#222222] rounded-md" style={{ maxHeight: 120 }}>
                <table className="w-full text-[10px]">
                  <thead className="bg-[#1A1A1A] text-[#888888] sticky top-0">
                    <tr>
                      <th className="px-1.5 py-1 text-left">#</th>
                      <th className="px-1.5 py-1 text-left">场景</th>
                      <th className="px-1.5 py-1 text-left">台词</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenes.map((s, i) => (
                      <tr key={i} className="border-t border-[#222222]">
                        <td className="px-1.5 py-1 text-[#0ABAB5]">{i + 1}</td>
                        <td className="px-1.5 py-1 text-[#CCCCCC] truncate max-w-[80px]">{String(s.description || "")}</td>
                        <td className="px-1.5 py-1 text-[#888888] truncate max-w-[60px]">{String(s.dialogue || "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={downloadCsv}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#0ABAB5]/10 border border-[#0ABAB5]/30 text-[#0ABAB5] text-xs hover:bg-[#0ABAB5]/20 transition-colors"
              >
                <Download className="w-3 h-3" />
                下载分镜表
              </button>
            </>
          )}
        </div>
      </NodeWrapper>
    );
  }

  return (
    <NodeWrapper nodeId={id} label={label} status={status}>
      <div className="space-y-2 h-full flex flex-col">
        <textarea
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={`输入${label}相关描述...`}
          className="w-full bg-transparent text-xs text-[#F5F5F5] placeholder:text-[#555555] resize-none outline-none border border-[#222222] rounded-md p-2"
          style={{ height: 50 }}
        />
        {resultText && (
          <div className="flex-1 overflow-auto border border-[#222222] rounded-md p-2 bg-[#0D0D0D]">
            <pre className="text-[11px] text-[#CCCCCC] whitespace-pre-wrap leading-relaxed font-mono">{resultText}</pre>
          </div>
        )}
      </div>
    </NodeWrapper>
  );
}

/* ─── Text2Image Node ─── */
export function Text2ImageNode(props: NodeProps) {
  const { id, data } = props;
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const label = (data?.label as string) || "文生图";
  const status = (data?.status as StatusType) || "待处理";
  const ratio = (data?.ratio as string) || "16:9";
  const result = data?.result;

  const generated = useMemo(() => {
    if (result && typeof result === "object" && Array.isArray((result as Record<string, unknown>).generated)) {
      return (result as Record<string, unknown>).generated as Array<{ imageUrl?: string; error?: string }>;
    }
    return [] as Array<{ imageUrl?: string; error?: string }>;
  }, [result]);

  const upstreamScenes = useMemo(() => {
    const edges = getEdges();
    const nodes = getNodes();
    const edge = edges.find((e) => e.target === id);
    if (!edge) return [];
    const upstream = nodes.find((n) => n.id === edge.source);
    const r = upstream?.data?.result;
    if (r && typeof r === "object" && Array.isArray((r as Record<string, unknown>).scenes)) {
      return (r as Record<string, unknown>).scenes as Array<Record<string, unknown>>;
    }
    return [];
  }, [getEdges, getNodes, id]);

  const scenes = upstreamScenes;

  const handleRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNodeData(id, { ratio: e.target.value });
  };

  const generateOne = async (index: number) => {
    const scene = scenes[index];
    const prompt = String(scene?.description || scene?.visual || "");
    if (!prompt) {
      toast.error("缺少提示词");
      return;
    }
    const currentGenerated = [...generated];
    currentGenerated[index] = { ...currentGenerated[index], error: undefined };
    updateNodeData(id, { status: `进行中 (${index + 1}/${scenes.length})`, result: { ...((result || {}) as object), generated: currentGenerated } });
    try {
      const res = await apiFetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ratio, n: 1 }),
      });
      const d = await res.json();
      const nextGenerated = [...currentGenerated];
      if (d.imageUrls && d.imageUrls.length > 0) {
        nextGenerated[index] = { imageUrl: d.imageUrls[0] };
      } else {
        nextGenerated[index] = { error: d.error || "生成失败" };
      }
      const allDone = scenes.every((_, i) => nextGenerated[i]?.imageUrl);
      const finalStatus = allDone ? "已完成" : "待处理";
      updateNodeData(id, { status: finalStatus, result: { ...((result || {}) as object), generated: nextGenerated, imageUrl: nextGenerated[0]?.imageUrl } });
    } catch (error) {
      const nextGenerated = [...currentGenerated];
      nextGenerated[index] = { error: error instanceof Error ? error.message : "生成失败" };
      updateNodeData(id, { status: "失败", result: { ...((result || {}) as object), generated: nextGenerated } });
    }
  };

  const handleBatchGenerate = async () => {
    if (scenes.length === 0) {
      toast.error("未检测到上游分镜数据");
      return;
    }
    for (let i = 0; i < scenes.length; i++) {
      if (generated[i]?.imageUrl) continue;
      await generateOne(i);
    }
  };

  const imageUrl =
    result && typeof result === "object" && "imageUrl" in result
      ? String((result as Record<string, unknown>).imageUrl)
      : undefined;

  // Fallback single-image mode when no upstream scenes
  if (scenes.length === 0) {
    return (
      <NodeWrapper nodeId={id} label={label} status={status}>
        <div className="space-y-2 h-full flex flex-col">
          <div className="flex items-center gap-2">
            <select value={ratio} onChange={handleRatioChange} className="bg-[#1A1A1A] border border-[#333333] rounded px-1.5 py-0.5 text-[10px] text-[#CCCCCC] outline-none">
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
              <option value="4:3">4:3</option>
            </select>
          </div>
          {imageUrl ? (
            <div className="flex-1 min-h-0 rounded-md overflow-hidden border border-[#222222]">
              <img src={imageUrl} alt="生成结果" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-dashed border-[#333333] rounded-md">
              <ImageIcon className="w-8 h-8 text-[#333333]" />
            </div>
          )}
        </div>
      </NodeWrapper>
    );
  }

  return (
    <NodeWrapper nodeId={id} label={label} status={status}>
      <div className="h-full flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <select value={ratio} onChange={handleRatioChange} className="bg-[#1A1A1A] border border-[#333333] rounded px-1.5 py-0.5 text-[10px] text-[#CCCCCC] outline-none">
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
          </select>
          <button
            onClick={handleBatchGenerate}
            disabled={status.startsWith("进行中")}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0ABAB5]/10 border border-[#0ABAB5]/30 text-[#0ABAB5] text-[10px] hover:bg-[#0ABAB5]/20 disabled:opacity-50 transition-colors"
          >
            <Images className="w-3 h-3" />
            批量生成
          </button>
        </div>
        <div className="flex-1 overflow-auto space-y-2">
          {scenes.map((scene, i) => {
            const g = generated[i];
            const promptText = String(scene?.description || scene?.visual || "");
            return (
              <div key={i} className="border border-[#222222] rounded-md p-2 flex flex-col gap-1.5">
                <div className="text-[10px] text-[#888888] line-clamp-2">{i + 1}. {promptText}</div>
                {g?.imageUrl ? (
                  <div className="rounded-md overflow-hidden border border-[#222222] h-20">
                    <img src={g.imageUrl} alt={`场景${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ) : g?.error ? (
                  <div className="text-[10px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {g.error}
                  </div>
                ) : (
                  <button
                    onClick={() => generateOne(i)}
                    disabled={status.startsWith("进行中")}
                    className="flex items-center justify-center gap-1 py-1 rounded-md border border-dashed border-[#333333] text-[#888888] text-[10px] hover:border-[#0ABAB5]/50 hover:text-[#0ABAB5] disabled:opacity-50 transition-colors"
                  >
                    <ImagePlus className="w-3 h-3" />
                    生成
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </NodeWrapper>
  );
}

/* ─── Text2Video Node ─── */
export function Text2VideoNode(props: NodeProps) {
  const { id, data } = props;
  const { updateNodeData } = useReactFlow();
  const label = (data?.label as string) || "文生视频";
  const status = (data?.status as StatusType) || "待处理";
  const ratio = (data?.ratio as string) || "16:9";
  const result = data?.result;

  const videoUrl =
    result && typeof result === "object" && "videoUrl" in result
      ? String((result as Record<string, unknown>).videoUrl)
      : undefined;

  const imageUrl =
    result && typeof result === "object" && "imageUrl" in result
      ? String((result as Record<string, unknown>).imageUrl)
      : undefined;

  const handleRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNodeData(id, { ratio: e.target.value });
  };

  return (
    <NodeWrapper nodeId={id} label={label} status={status}>
      <div className="space-y-2 h-full flex flex-col">
        <select value={ratio} onChange={handleRatioChange} className="self-start bg-[#1A1A1A] border border-[#333333] rounded px-1.5 py-0.5 text-[10px] text-[#CCCCCC] outline-none">
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="1:1">1:1</option>
          <option value="4:3">4:3</option>
        </select>
        {videoUrl ? (
          <video src={videoUrl} controls className="w-full flex-1 rounded-md border border-[#222222]" />
        ) : imageUrl ? (
          <div className="flex-1 min-h-0 rounded-md overflow-hidden border border-[#222222]">
            <img src={imageUrl} alt="参考图" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border border-dashed border-[#333333] rounded-md">
            <VideoIcon className="w-8 h-8 text-[#333333]" />
          </div>
        )}
      </div>
    </NodeWrapper>
  );
}

/* ─── Image2Video Node ─── */
export function Image2VideoNode(props: NodeProps) {
  const { id, data } = props;
  const { updateNodeData } = useReactFlow();
  const label = (data?.label as string) || "图生视频";
  const status = (data?.status as StatusType) || "待处理";
  const ratio = (data?.ratio as string) || "16:9";
  const result = data?.result;

  const videoUrl =
    result && typeof result === "object" && "videoUrl" in result
      ? String((result as Record<string, unknown>).videoUrl)
      : undefined;

  const imageUrl =
    result && typeof result === "object" && "imageUrl" in result
      ? String((result as Record<string, unknown>).imageUrl)
      : undefined;

  const handleRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNodeData(id, { ratio: e.target.value });
  };

  return (
    <NodeWrapper nodeId={id} label={label} status={status}>
      <div className="space-y-2 h-full flex flex-col">
        <select value={ratio} onChange={handleRatioChange} className="self-start bg-[#1A1A1A] border border-[#333333] rounded px-1.5 py-0.5 text-[10px] text-[#CCCCCC] outline-none">
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="1:1">1:1</option>
          <option value="4:3">4:3</option>
        </select>
        {videoUrl ? (
          <video src={videoUrl} controls className="w-full flex-1 rounded-md border border-[#222222]" />
        ) : imageUrl ? (
          <div className="flex-1 min-h-0 rounded-md overflow-hidden border border-[#222222]">
            <img src={imageUrl} alt="参考图" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border border-dashed border-[#333333] rounded-md">
            <VideoIcon className="w-8 h-8 text-[#333333]" />
          </div>
        )}
      </div>
    </NodeWrapper>
  );
}

/* ─── CharacterViews Node ─── */
export function CharacterViewsNode(props: NodeProps) {
  const { id, data } = props;
  const label = (data?.label as string) || "角色三视图";
  const status = (data?.status as StatusType) || "待处理";
  const result = data?.result;

  const views =
    result && typeof result === "object" && Array.isArray((result as Record<string, unknown>).views)
      ? ((result as Record<string, unknown>).views as string[])
      : [];

  const imageUrl =
    result && typeof result === "object" && "imageUrl" in result
      ? String((result as Record<string, unknown>).imageUrl)
      : undefined;

  return (
    <NodeWrapper nodeId={id} label={label} status={status}>
      <div className="space-y-2 h-full flex flex-col">
        {views.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 flex-1 min-h-0">
            {views.map((img, i) => (
              <div key={i} className="rounded-md overflow-hidden border border-[#222222]">
                <img src={img} alt={`视图${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : imageUrl ? (
          <div className="flex-1 min-h-0 rounded-md overflow-hidden border border-[#222222]">
            <img src={imageUrl} alt="角色图" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border border-dashed border-[#333333] rounded-md">
            <ImageIcon className="w-8 h-8 text-[#333333]" />
          </div>
        )}
      </div>
    </NodeWrapper>
  );
}

/* ─── Output Node ─── */
export function OutputNode(props: NodeProps) {
  const { id, data } = props;
  const label = (data?.label as string) || "输出";
  const status = (data?.status as StatusType) || "待处理";
  const result = data?.result;

  const resultText =
    typeof result === "string"
      ? result
      : result && typeof result === "object" && "content" in result
      ? String((result as Record<string, unknown>).content)
      : undefined;

  const imageUrl =
    result && typeof result === "object" && "imageUrl" in result
      ? String((result as Record<string, unknown>).imageUrl)
      : undefined;

  const videoUrl =
    result && typeof result === "object" && "videoUrl" in result
      ? String((result as Record<string, unknown>).videoUrl)
      : undefined;

  const downloadResult = () => {
    if (!resultText) return;
    const blob = new Blob([resultText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已下载");
  };

  return (
    <NodeWrapper nodeId={id} label={label} status={status}>
      <div className="space-y-2 h-full flex flex-col">
        {videoUrl ? (
          <video src={videoUrl} controls className="w-full flex-1 rounded-md border border-[#222222]" />
        ) : imageUrl ? (
          <div className="flex-1 min-h-0 rounded-md overflow-hidden border border-[#222222]">
            <img src={imageUrl} alt="输出结果" className="w-full h-full object-contain" />
          </div>
        ) : resultText ? (
          <div className="flex-1 overflow-auto border border-[#222222] rounded-md p-2 bg-[#0D0D0D]">
            <pre className="text-[11px] text-[#CCCCCC] whitespace-pre-wrap leading-relaxed font-mono">{resultText}</pre>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#555555] text-xs">暂无输出</div>
        )}
        {resultText && (
          <button
            onClick={downloadResult}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#0ABAB5]/10 border border-[#0ABAB5]/30 text-[#0ABAB5] text-xs hover:bg-[#0ABAB5]/20 transition-colors self-start"
          >
            <Download className="w-3 h-3" />
            下载
          </button>
        )}
      </div>
    </NodeWrapper>
  );
}
