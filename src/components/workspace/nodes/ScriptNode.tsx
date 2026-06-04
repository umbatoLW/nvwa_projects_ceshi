'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ScriptNodeData {
  status: 'pending' | 'running' | 'completed' | 'error';
  title?: string;
  progress?: number;
  episodeCount?: number;
  errorMessage?: string;
  [key: string]: unknown;
}

const statusConfig = {
  pending: { color: 'border-gray-600 bg-gray-900/80', icon: null, label: '待生成' },
  running: { color: 'border-cyan-500 bg-cyan-950/50', icon: Loader2, label: '生成中' },
  completed: { color: 'border-green-500 bg-green-950/50', icon: CheckCircle2, label: '已完成' },
  error: { color: 'border-red-500 bg-red-950/50', icon: AlertCircle, label: '失败' },
} as const;

export const ScriptNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ScriptNodeData;
  const status = nodeData.status || 'pending';
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={`rounded-lg border-2 p-4 w-64 shadow-lg backdrop-blur-sm transition-all ${
        selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black' : ''
      } ${config.color}`}
    >
      <Handle type="target" position={Position.Left} id="script-in" className="!bg-cyan-500" />

      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-gray-300" />
        <span className="font-bold text-sm text-white">剧本</span>
        <Badge
          variant={status === 'error' ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {config.label}
        </Badge>
      </div>

      <div className="text-sm text-gray-300 truncate mb-1">{nodeData.title || '未命名剧本'}</div>

      {nodeData.episodeCount !== undefined && (
        <div className="text-xs text-gray-500 mb-2">{nodeData.episodeCount} 集</div>
      )}

      {status === 'running' && nodeData.progress !== undefined && (
        <Progress value={nodeData.progress} className="h-1.5 bg-gray-700" />
      )}

      {status === 'error' && nodeData.errorMessage && (
        <div className="text-xs text-red-400 mt-1 truncate">{nodeData.errorMessage}</div>
      )}

      <Handle type="source" position={Position.Right} id="script-out" className="!bg-cyan-500" />
    </div>
  );
});

ScriptNode.displayName = 'ScriptNode';
