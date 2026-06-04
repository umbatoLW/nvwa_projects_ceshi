/**
 * Workspace 状态管理 Hook
 * 从 workspace/page.tsx 提取的状态管理逻辑
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { useNodesState, useEdgesState } from "@xyflow/react";

// ============================================
// 类型定义
// ============================================

export interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

export interface UseWorkspaceStateOptions {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  maxHistorySize?: number;
}

// ============================================
// 节点 ID 生成器
// ============================================

let globalNodeIdCounter = 1;

export function resetNodeIdCounter() {
  globalNodeIdCounter = 1;
}

export function getNextNodeId() {
  return `node-${globalNodeIdCounter++}`;
}

// ============================================
// 连接状态 Hook
// ============================================

export function useConnectingState() {
  const isConnecting = useRef(false);

  const startConnecting = useCallback(() => {
    isConnecting.current = true;
  }, []);

  const endConnecting = useCallback(() => {
    isConnecting.current = false;
  }, []);

  return {
    isConnecting,
    startConnecting,
    endConnecting,
    canOperate: () => !isConnecting.current,
  };
}

// ============================================
// 历史记录 Hook（撤销/重做）
// ============================================

export function useHistory<T>(initialState: T, maxSize = 50) {
  const [state, setState] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const pointerRef = useRef(0);

  const pushState = useCallback(
    (newState: T) => {
      // 移除当前位置之后的历史
      historyRef.current = historyRef.current.slice(0, pointerRef.current + 1);
      // 添加新状态
      historyRef.current.push(newState);
      // 限制历史大小
      if (historyRef.current.length > maxSize) {
        historyRef.current.shift();
      } else {
        pointerRef.current++;
      }
      setState(newState);
    },
    [maxSize]
  );

  const undo = useCallback(() => {
    if (pointerRef.current > 0) {
      pointerRef.current--;
      setState(historyRef.current[pointerRef.current]);
      return true;
    }
    return false;
  }, []);

  const redo = useCallback(() => {
    if (pointerRef.current < historyRef.current.length - 1) {
      pointerRef.current++;
      setState(historyRef.current[pointerRef.current]);
      return true;
    }
    return false;
  }, []);

  const canUndo = () => pointerRef.current > 0;
  const canRedo = () => pointerRef.current < historyRef.current.length - 1;

  return { state, setState: pushState, undo, redo, canUndo, canRedo };
}

// ============================================
// 节点/边状态 Hook
// ============================================

export function useWorkspaceNodes(initialNodes: Node[]) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { isConnecting, startConnecting, endConnecting, canOperate } = useConnectingState();

  // 历史记录
  const historyRef = useRef<HistoryState[]>([]);
  const historyPointerRef = useRef(-1);
  const isRestoringRef = useRef(false);

  // 保存历史
  const saveHistory = useCallback(() => {
    if (isRestoringRef.current) return;

    const state = { nodes, edges };
    // 移除当前位置之后的历史
    historyRef.current = historyRef.current.slice(0, historyPointerRef.current + 1);
    // 添加新状态
    historyRef.current.push(state);
    historyPointerRef.current++;

    // 限制历史大小
    if (historyRef.current.length > 100) {
      historyRef.current.shift();
      historyPointerRef.current--;
    }
  }, [nodes, edges]);

  // 监听变化，自动保存历史
  useEffect(() => {
    if (!isRestoringRef.current) {
      saveHistory();
    }
  }, [nodes, edges, saveHistory]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (!canOperate() || historyPointerRef.current <= 0) return false;

    isRestoringRef.current = true;
    historyPointerRef.current--;
    const state = historyRef.current[historyPointerRef.current];
    setNodes(state.nodes);
    setEdges(state.edges);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
    return true;
  }, [canOperate, setNodes, setEdges]);

  // 重做
  const handleRedo = useCallback(() => {
    if (!canOperate() || historyPointerRef.current >= historyRef.current.length - 1) return false;

    isRestoringRef.current = true;
    historyPointerRef.current++;
    const state = historyRef.current[historyPointerRef.current];
    setNodes(state.nodes);
    setEdges(state.edges);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
    return true;
  }, [canOperate, setNodes, setEdges]);

  // 初始化历史
  useEffect(() => {
    if (historyPointerRef.current === -1) {
      historyRef.current = [{ nodes: initialNodes, edges: [] }];
      historyPointerRef.current = 0;
    }
  }, [initialNodes]);

  return {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    isConnecting,
    startConnecting,
    endConnecting,
    canOperate,
    handleUndo,
    handleRedo,
    canUndo: () => historyPointerRef.current > 0,
    canRedo: () => historyPointerRef.current < historyRef.current.length - 1,
  };
}

// ============================================
// 执行状态 Hook
// ============================================

export type ExecutionStatus = "idle" | "running" | "success" | "error";

export interface NodeExecutionState {
  nodeId: string;
  status: ExecutionStatus;
  output?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export function useExecutionState() {
  const [states, setStates] = useState<Map<string, NodeExecutionState>>(new Map());

  const setNodeStatus = useCallback(
    (nodeId: string, status: ExecutionStatus, data?: { output?: unknown; error?: string }) => {
      setStates((prev) => {
        const next = new Map(prev);
        const current = next.get(nodeId);
        next.set(nodeId, {
          nodeId,
          status,
          startTime: current?.startTime ?? (status === "running" ? Date.now() : undefined),
          endTime: status === "success" || status === "error" ? Date.now() : undefined,
          output: data?.output ?? current?.output,
          error: data?.error,
        });
        return next;
      });
    },
    []
  );

  const getNodeStatus = useCallback(
    (nodeId: string): ExecutionStatus => {
      return states.get(nodeId)?.status ?? "idle";
    },
    [states]
  );

  const resetAll = useCallback(() => {
    setStates(new Map());
  }, []);

  return {
    states,
    setNodeStatus,
    getNodeStatus,
    resetAll,
  };
}

// ============================================
// 导出
// ============================================

export type { Node, Edge };
