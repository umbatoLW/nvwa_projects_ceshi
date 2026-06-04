/**
 * Workflow 操作 Hook
 * 从 workspace/page.tsx 提取的工作流操作逻辑
 */

import { useCallback, useRef } from "react";
import { Node, Edge, addEdge, Connection } from "@xyflow/react";
import dagre from "dagre";
import { getNextNodeId, useConnectingState } from "./useWorkspaceState";

// ============================================
// 类型定义
// ============================================

export interface WorkflowOperations {
  addNode: (type: string, position?: { x: number; y: number }) => Node;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => Node | null;
  connectNodes: (connection: Connection) => Edge | null;
  deleteEdge: (edgeId: string) => void;
  autoLayout: () => { nodes: Node[]; edges: Edge[] };
}

// ============================================
// 自动布局
// ============================================

export function useAutoLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    direction?: "TB" | "LR" | "BT" | "RL";
    nodeWidth?: number;
    nodeHeight?: number;
  } = {}
) {
  const { direction = "LR", nodeWidth = 200, nodeHeight = 100 } = options;

  const layout = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === "LR" || direction === "RL";
    dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // 添加节点
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    // 添加边
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // 计算布局
    dagre.layout(dagreGraph);

    // 更新节点位置
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  }, [nodes, edges, direction, nodeWidth, nodeHeight]);

  return layout;
}

// ============================================
// 节点操作
// ============================================

export function useNodeOperations(
  nodes: Node[],
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void,
  canOperate: () => boolean
) {
  const addNode = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      if (!canOperate()) {
        throw new Error("操作被阻止");
      }

      const id = getNextNodeId();
      const newNode: Node = {
        id,
        type,
        position: position ?? { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
        data: { label: `${type}节点`, status: "idle" },
      };

      setNodes((prev) => [...prev, newNode]);
      return newNode;
    },
    [setNodes, canOperate]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!canOperate()) return;
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    },
    [setNodes, canOperate]
  );

  const duplicateNode = useCallback(
    (nodeId: string): Node | null => {
      if (!canOperate()) return null;

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const newId = getNextNodeId();
      const newNode: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        data: { ...node.data },
      };

      setNodes((prev) => [...prev, newNode]);
      return newNode;
    },
    [nodes, setNodes, canOperate]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<Node["data"]>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );
    },
    [setNodes]
  );

  return { addNode, deleteNode, duplicateNode, updateNodeData };
}

// ============================================
// 边操作
// ============================================

export function useEdgeOperations(
  edges: Edge[],
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void,
  canOperate: () => boolean
) {
  const { isConnecting, startConnecting, endConnecting } = useConnectingState();

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      startConnecting();
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#555555", strokeWidth: 1.5 },
          },
          eds
        )
      );
      setTimeout(() => endConnecting(), 100);
    },
    [setEdges, startConnecting, endConnecting]
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      if (!canOperate()) return;
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    },
    [setEdges, canOperate]
  );

  const deleteEdgesByNode = useCallback(
    (nodeId: string) => {
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setEdges]
  );

  return { onConnect, deleteEdge, deleteEdgesByNode, isConnecting };
}

// ============================================
// 工作流持久化
// ============================================

export interface SavedWorkflow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
}

export function useWorkflowPersistence(workflowId: string) {
  const lastSavedRef = useRef<SavedWorkflow | null>(null);
  const isDirtyRef = useRef(false);

  const save = useCallback(
    async (nodes: Node[], edges: Edge[], name?: string): Promise<SavedWorkflow> => {
      const now = Date.now();
      const workflow: SavedWorkflow = {
        id: workflowId,
        name: name ?? `工作流 ${now}`,
        nodes,
        edges,
        createdAt: lastSavedRef.current?.createdAt ?? now,
        updatedAt: now,
      };

      // 这里可以添加实际的持久化逻辑（如 API 调用）
      // const response = await fetch('/api/workflows', { ... });

      lastSavedRef.current = workflow;
      isDirtyRef.current = false;

      return workflow;
    },
    [workflowId]
  );

  const load = useCallback(async (): Promise<SavedWorkflow | null> => {
    // 这里可以添加实际的加载逻辑
    // const response = await fetch(`/api/workflows/${workflowId}`);
    return lastSavedRef.current;
  }, [workflowId]);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
  }, []);

  return {
    save,
    load,
    markDirty,
    isDirty: () => isDirtyRef.current,
    lastSaved: () => lastSavedRef.current,
  };
}

// ============================================
// 导出
// ============================================

export type { Node, Edge, Connection };
