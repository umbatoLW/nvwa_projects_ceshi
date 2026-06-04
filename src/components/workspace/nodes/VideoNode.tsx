'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Video, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VideoNodeData {
  status: 'pending' | 'running' | 'completed' | 'error';
  prompt?: string;
  videoUrl?: string;
  duration?: number;
  errorMessage?: string;
  [key: string]: unknown;
}

const statusConfig = {
  pending: { color: 'border-gray-600 bg-gray-900/80', label: '待生成' },
  running: { color: 'border-orange-500 bg-orange-950/50', label: '生成中' },
  completed: { color: 'border-green-500 bg-green-950/50', label: '已完成' },
  error: { color: 'border-red-500 bg-red-950/50', label: '失败' },
} as const;

export const VideoNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as VideoNodeData;
  const status = nodeData.status || 'pending';
  const config = statusConfig[status];

  return (
    <div
      className={`rounded-lg border-2 p-4 w-56 shadow-lg backdrop-blur-sm transition-all ${
        selected ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-black' : ''
      } ${config.color}`}
    >
      <Handle type="target" position={Position.Left} id="video-in" className="!bg-orange-500" />

      <div className="flex items-center gap-2 mb-2">
        <Video className="w-5 h-5 text-gray-300" />
        <span className="font-bold text-sm text-white">图生视频</span>
        <Badge variant="secondary" className="text-xs">
          {config.label}
        </Badge>
      </div>

      {nodeData.duration && <div className="text-xs text-gray-400 mb-2">{nodeData.duration}秒</div>}

      {status === 'running' && (
        <div className="flex items-center gap-2 text-xs text-orange-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          生成中...
        </div>
      )}

      {status === 'error' && nodeData.errorMessage && (
        <div className="text-xs text-red-400 truncate">{nodeData.errorMessage}</div>
      )}

      <Handle type="source" position={Position.Right} id="video-out" className="!bg-orange-500" />
    </div>
  );
});

VideoNode.displayName = 'VideoNode';
