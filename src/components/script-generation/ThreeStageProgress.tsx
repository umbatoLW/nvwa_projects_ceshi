'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  PenTool,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cleanAiOutput, safeJsonParse, isScriptJson } from '@/lib/content/content-cleaner';
import { ScriptJsonRenderer } from '@/components/script-views/ScriptJsonRenderer';
import { STAGES } from './progress/config';
import type { StageProgress, ThreeStageProgressProps } from './progress/types';

// 导出类型
export type { StageProgress, ThreeStageProgressProps } from './progress/types';

export function ThreeStageProgress({
  idea,
  onComplete,
  onError,
  stages: controlledStages,
  currentStage: controlledCurrentStage,
  isComplete: controlledIsComplete,
  error: controlledError,
  onRetry,
  onCancel,
}: ThreeStageProgressProps) {
  const isControlled = controlledStages !== undefined;
  const [internalStages, setInternalStages] = useState<StageProgress[]>(
    STAGES.map((s) => ({
      stage: s.id,
      name: s.name,
      progress: 0,
      status: 'pending',
    }))
  );
  const [currentStage, setCurrentStage] = useState(0);
  const currentStageRef = useRef(currentStage);
  const [output, setOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 同步 ref 与 state
  useEffect(() => {
    currentStageRef.current = currentStage;
  }, [currentStage]);

  // 使用受控状态或内部状态
  const stages = isControlled ? controlledStages! : internalStages;
  const activeStage = isControlled ? (controlledCurrentStage || 0) : currentStage;
  const complete = isControlled ? controlledIsComplete : (!isGenerating && currentStage > 3);
  const error = isControlled ? controlledError : null;

  // 解析 SSE 事件
  const parseSSEEvent = useCallback((eventData: string) => {
    try {
      const data = JSON.parse(eventData);

      if (data.type === 'stage') {
        // 阶段切换
        setCurrentStage(data.stage);
        setInternalStages((prev) =>
          prev.map((s) => ({
            ...s,
            status: s.stage < data.stage ? 'completed' : s.stage === data.stage ? 'running' : 'pending',
            progress: s.stage < data.stage ? 100 : s.stage === data.stage ? 0 : 0,
          }))
        );
      } else if (data.type === 'progress') {
        // 进度更新：使用 ref 避免闭包问题
        const stage = currentStageRef.current;
        if (data.progress !== undefined) {
          setInternalStages((prev) =>
            prev.map((s) =>
              s.stage === stage ? { ...s, progress: data.progress } : s
            )
          );
        }
        // 消息更新
        if (data.message) {
          setInternalStages((prev) =>
            prev.map((s) =>
              s.stage === stage ? { ...s, message: data.message } : s
            )
          );
        }
        // 内容累积（实时清洗JSON代码）
        if (data.content) {
          const cleanedContent = cleanAiOutput(data.content);
          setOutput((prev) => prev + cleanedContent);
        }
      } else if (data.type === 'complete') {
        // 生成完成
        setInternalStages((prev) =>
          prev.map((s) => ({
            ...s,
            status: 'completed',
            progress: 100,
          }))
        );
        setIsGenerating(false);
        onComplete?.(data.result);
      } else if (data.type === 'error') {
        // 错误：使用 ref 避免闭包问题
        const stage = currentStageRef.current;
        setInternalStages((prev) =>
          prev.map((s) =>
            s.stage === stage ? { ...s, status: 'error', message: data.message } : s
          )
        );
        setIsGenerating(false);
        onError?.(data.message);
      }
    } catch {
      // 非 JSON 数据，可能是纯文本内容
      setOutput((prev) => prev + eventData);
    }
  }, [onComplete, onError]);

  // 开始生成
  const startGeneration = useCallback(async () => {
    if (!idea?.trim()) return;

    setIsGenerating(true);
    setOutput('');
    setInternalStages(
      STAGES.map((s) => ({
        stage: s.id,
        name: s.name,
        progress: 0,
        status: 'pending',
      }))
    );

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai/generate-full-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 解析 SSE 事件：按双换行分割，保留最后一个不完整的 chunk
        const lines = buffer.split('\n\n');
        // 最后一个元素可能是不完整的，保留到下一次
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            parseSSEEvent(line.slice(6));
          }
        }
      }

      // 处理 buffer 中剩余的数据
      if (buffer.trim()) {
        const finalLines = buffer.split('\n\n');
        for (const line of finalLines) {
          if (line.startsWith('data: ')) {
            parseSSEEvent(line.slice(6));
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 用户取消
        setIsGenerating(false);
      } else {
        onError?.(err instanceof Error ? err.message : '生成失败');
        setIsGenerating(false);
      }
    }
  }, [idea, parseSSEEvent, onError]);

  // 取消生成
  const abortGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
  }, []);

  return (
    <Card className="bg-[#141414] border-[#333]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5 text-[#0ABAB5]" />
            三阶段剧本生成
          </CardTitle>
          {!isControlled && (
            <div className="flex items-center gap-2">
              {isGenerating ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={abortGeneration}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  停止
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={startGeneration}
                  disabled={!idea?.trim()}
                  className="bg-[#0ABAB5] hover:bg-[#0ABAB5]/90"
                >
                  开始生成
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 阶段进度条 - 可访问性：aria-live 区域用于屏幕阅读器 */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {stages.map(s => `${s.name}: ${s.status === 'completed' ? '已完成' : s.status === 'running' ? `进行中 ${s.progress}%` : s.status === 'error' ? '出错' : '待开始'}`).join('，')}
        </div>
        <div className="flex items-center gap-2" role="list" aria-label="生成阶段进度">
          {STAGES.map((stage, index) => {
            const stageState = stages.find((s) => s.stage === stage.id);
            const isLast = index === STAGES.length - 1;
            const statusText = stageState?.status === 'completed' ? '已完成' : stageState?.status === 'running' ? '进行中' : stageState?.status === 'error' ? '出错' : '待开始';

            return (
              <div key={stage.id} className="flex items-center gap-2" role="listitem">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    stageState?.status === 'completed'
                      ? 'bg-green-500/10 text-green-400'
                      : stageState?.status === 'running'
                        ? stage.bgColor
                        : 'bg-gray-500/10 text-gray-500'
                  }`}
                  aria-label={`${stage.name}：${statusText}`}
                >
                  {stageState?.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  ) : stageState?.status === 'running' ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : stageState?.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                  ) : (
                    <stage.icon className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span className="text-sm font-medium">{stage.name}</span>
                </div>
                {!isLast && (
                  <div
                    className={`w-8 h-0.5 ${
                      stageState?.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-gray-700'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 各阶段详情 */}
        <div className="space-y-2">
          {stages.map((stage) => {
            const stageConfig = STAGES.find((s) => s.id === stage.stage);
            const isExpanded = expandedStage === stage.stage;

            return (
              <div
                key={stage.stage}
                className={`rounded-lg border ${
                  stage.status === 'running'
                    ? 'border-[#0ABAB5]/50 bg-[#0ABAB5]/5'
                    : 'border-[#333] bg-[#1A1A1A]'
                }`}
              >
                <button
                  className="w-full px-4 py-3 flex items-center justify-between"
                  onClick={() =>
                    setExpandedStage(isExpanded ? null : stage.stage)
                  }
                  aria-expanded={isExpanded}
                  aria-controls={`stage-details-${stage.stage}`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    )}
                    <span className="font-medium">{stage.name}</span>
                    {stage.message && (
                      <Badge
                        variant={
                          stage.status === 'error' ? 'destructive' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {stage.message}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {stage.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    {stage.status === 'running' && (
                      <Loader2 className="w-4 h-4 animate-spin text-[#0ABAB5]" />
                    )}
                    <span className="text-xs text-gray-400">
                      {stage.progress}%
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2" id={`stage-details-${stage.stage}`}>
                    <Progress
                      value={stage.progress}
                      className="h-1.5 bg-gray-700"
                      aria-label={`${stage.name}进度`}
                    />
                    {stageConfig && (
                      <p className="text-xs text-gray-500">
                        {stageConfig.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 输出预览 - 直接显示，无额外边框 */}
        {output && (
          <div className="mt-4">
            {(() => {
              const cleaned = cleanAiOutput(output);
              const parsed = safeJsonParse(cleaned);
              if (parsed && isScriptJson(parsed)) {
                return (
                  <div className="overflow-auto custom-scrollbar">
                    <ScriptJsonRenderer content={cleaned} />
                  </div>
                );
              }
              return (
                <div className="text-sm text-nvwa-text whitespace-pre-wrap leading-relaxed p-4 bg-muted/30 rounded-lg">
                  {cleaned}
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ThreeStageProgress;
