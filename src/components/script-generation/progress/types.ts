/**
 * 三阶段进度类型定义
 */

export interface StageProgress {
  stage: number;
  name: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

export interface StageConfig {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface ThreeStageProgressProps {
  // 自主模式：传入 idea，组件自己调用 API
  idea?: string;
  onComplete?: (result: unknown) => void;
  onError?: (error: string) => void;
  // 受控模式：外部控制进度状态
  stages?: StageProgress[];
  currentStage?: number;
  isComplete?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
}
