'use client';

import type { Node } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface PropertyPanelProps {
  selectedNode: Node | null;
  onDeleteNode: (nodeId: string) => void;
}

export function PropertyPanel({ selectedNode, onDeleteNode }: PropertyPanelProps) {
  if (!selectedNode) {
    return (
      <Card className="w-72 h-full bg-gray-900/90 border-gray-700">
        <CardContent className="pt-6 text-center text-gray-500">选择一个节点查看属性</CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-72 h-full bg-gray-900/90 border-gray-700 overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-sm text-white">节点属性</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-gray-400">ID</label>
          <div className="text-sm text-gray-300 font-mono">{selectedNode.id}</div>
        </div>
        <div>
          <label className="text-xs text-gray-400">类型</label>
          <div className="text-sm text-gray-300">{selectedNode.type || 'default'}</div>
        </div>
        <div>
          <label className="text-xs text-gray-400">位置</label>
          <div className="text-sm text-gray-300">
            X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          删除节点
        </Button>
      </CardContent>
    </Card>
  );
}
