'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Target,
  Users,
  Sparkles,
  Shield,
  RefreshCw,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

// 五维度定义
const DIMENSIONS = [
  {
    key: 'pacing',
    name: '节奏把控',
    description: '是否符合四段式节奏曲线，每集是否有情绪起伏',
    icon: Gauge,
    color: 'text-cyan-400',
    barColor: 'bg-cyan-400',
  },
  {
    key: 'hooks',
    name: '钩子设计',
    description: '每集结尾是否有有效钩子，钩子类型是否多样化',
    icon: Target,
    color: 'text-purple-400',
    barColor: 'bg-purple-400',
  },
  {
    key: 'character',
    name: '人物一致性',
    description: '人物性格是否前后一致，是否有成长弧光',
    icon: Users,
    color: 'text-orange-400',
    barColor: 'bg-orange-400',
  },
  {
    key: 'satisfaction',
    name: '爽感密度',
    description: '是否有足够的打脸/逆袭/复仇等爽感要素',
    icon: Sparkles,
    color: 'text-yellow-400',
    barColor: 'bg-yellow-400',
  },
  {
    key: 'compliance',
    name: '合规性',
    description: '是否遵守内容红线，无违规表述',
    icon: Shield,
    color: 'text-green-400',
    barColor: 'bg-green-400',
  },
];

interface DimensionScore {
  key: string;
  name: string;
  score: number;
  maxScore: number;
  issues?: string[];
  suggestions?: string[];
}

interface ReviewResult {
  overallScore: number;
  dimensions: {
    pacing: { score: number; issues: string[]; suggestions: string[] };
    hooks: { score: number; issues: string[]; suggestions: string[] };
    character: { score: number; issues: string[]; suggestions: string[] };
    satisfaction: { score: number; issues: string[]; suggestions: string[] };
    compliance: { score: number; issues: string[]; suggestions: string[] };
  };
  summary: string;
  topIssues?: string[];
}

interface NormalizedResult {
  totalScore: number;
  maxScore: number;
  dimensions: DimensionScore[];
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  modelVersion?: string;
  scoredAt?: string;
}

interface FiveDimensionScoreCardProps {
  scriptId: string;
  scriptContent: string;
  onReviewComplete?: (result: NormalizedResult) => void;
}

export function FiveDimensionScoreCard({
  scriptId,
  scriptContent,
  onReviewComplete,
}: FiveDimensionScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NormalizedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 计算等级
  const calculateGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 55) return 'D';
    return 'F';
  };

  // 将 API 返回转换为规范化结果
  const normalizeResult = (apiResult: ReviewResult): NormalizedResult => {
    const dimensionMap: Record<string, { name: string; maxScore: number }> = {
      pacing: { name: '节奏把控', maxScore: 20 },
      hooks: { name: '钩子设计', maxScore: 20 },
      character: { name: '人物一致性', maxScore: 20 },
      satisfaction: { name: '爽感密度', maxScore: 20 },
      compliance: { name: '合规性', maxScore: 20 },
    };

    const normalizedDimensions: DimensionScore[] = Object.entries(apiResult.dimensions).map(
      ([key, data]) => ({
        key,
        name: dimensionMap[key]?.name || key,
        score: data.score,
        maxScore: dimensionMap[key]?.maxScore || 20,
        issues: data.issues || [],
        suggestions: data.suggestions || [],
      })
    );

    return {
      totalScore: apiResult.overallScore,
      maxScore: 100,
      dimensions: normalizedDimensions,
      overallGrade: calculateGrade(apiResult.overallScore),
      summary: apiResult.summary || '',
      modelVersion: 'qwen-plus',
      scoredAt: new Date().toISOString(),
    };
  };

  // 执行评分
  const runReview = async () => {
    if (!scriptContent.trim()) {
      setError('请先填写剧本内容');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/review-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptContent, scriptId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.overallScore !== undefined) {
        const normalized = normalizeResult(data);
        setResult(normalized);
        onReviewComplete?.(normalized);
      } else {
        throw new Error(data.error || '评分失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '评分失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 计算分数百分比
  const getScorePercent = (score: number, max: number) =>
    Math.round((score / max) * 100);

  // 获取等级颜色
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-400 bg-green-400/10';
      case 'B':
        return 'text-cyan-400 bg-cyan-400/10';
      case 'C':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'D':
        return 'text-orange-400 bg-orange-400/10';
      case 'F':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <Card className="bg-[#141414] border-[#333]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="w-5 h-5 text-purple-400" />
              五维度质量评分
            </CardTitle>
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={runReview}
            disabled={isLoading || !scriptContent.trim()}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
            ) : null}
            {result ? '重新评分' : '开始评分'}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* 评分结果 */}
          {result ? (
            <>
              {/* 总分和等级 */}
              <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-[#333]">
                <div>
                  <div className="text-sm text-gray-400 mb-1">总分</div>
                  <div className="text-3xl font-bold text-white">
                    {result.totalScore}
                    <span className="text-lg text-gray-500">
                      /{result.maxScore}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">综合评级</div>
                  <Badge
                    className={`text-2xl px-4 py-2 ${getGradeColor(result.overallGrade)}`}
                  >
                    {result.overallGrade}
                  </Badge>
                </div>
              </div>

              {/* 五维度雷达图 */}
              <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#333]">
                <div className="text-sm text-gray-400 mb-2">五维度雷达图</div>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={result.dimensions.map(d => ({
                    subject: d.name,
                    score: d.score,
                    fullMark: d.maxScore,
                  }))}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9AA7C7', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 20]} tick={false} axisLine={false} />
                    <Radar name="评分" dataKey="score" stroke="#7C5CFF" fill="#7C5CFF" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* 评分来源标识 */}
              <div className="flex items-center justify-end gap-2 text-xs text-[#9AA7C7]">
                <Sparkles className="w-3 h-3" />
                <span>{result.modelVersion || 'qwen-plus'}</span>
                <span className="text-[#666]">·</span>
                <span>{result.scoredAt ? new Date(result.scoredAt).toLocaleString() : '刚刚'}</span>
              </div>

              {/* 总体评价 */}
              <p className="text-sm text-gray-300 italic">{result.summary}</p>

              {/* 各维度评分 */}
              <div className="space-y-3">
                {result.dimensions.map((dim) => {
                  const config = DIMENSIONS.find((d) => d.key === dim.key);
                  const percent = getScorePercent(dim.score, dim.maxScore);
                  const hasIssues = dim.issues && dim.issues.length > 0;

                  return (
                    <div
                      key={dim.key}
                      className="p-3 bg-[#1A1A1A] rounded-lg border border-[#333] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {config && (
                            <config.icon
                              className={`w-4 h-4 ${config.color}`}
                            />
                          )}
                          <span className="font-medium">{dim.name}</span>
                          {hasIssues && (
                            <Badge
                              variant="destructive"
                              className="text-xs"
                            >
                              {dim.issues!.length} 个问题
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            {dim.score}
                          </span>
                          <span className="text-sm text-gray-500">
                            /{dim.maxScore}
                          </span>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${config?.barColor || 'bg-gray-400'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* 问题描述 */}
                      {config && (
                        <p className="text-xs text-gray-500">
                          {config.description}
                        </p>
                      )}

                      {/* 问题列表 */}
                      {hasIssues && (
                        <div className="mt-2 space-y-1">
                          {dim.issues!.map((issue, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs text-red-400"
                            >
                              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 改进建议 */}
                      {dim.suggestions && dim.suggestions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {dim.suggestions.map((sug, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs text-cyan-400"
                            >
                              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>{sug}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* 空状态 - 增强版 */
            <div className="text-center py-10">
              <div className="w-20 h-20 rounded-full bg-[#7C5CFF]/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Sparkles className="w-10 h-10 text-[#7C5CFF]" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">剧本质量评分</h3>
              <p className="text-[#9AA7C7] text-sm mb-4 max-w-xs mx-auto">
                从节奏把控、钩子设计、人物塑造、爽感密度、合规安全五个维度深度分析
              </p>
              <Button
                className="bg-gradient-to-r from-[#7C5CFF] to-[#69E7FF] text-white shadow-lg shadow-[#7C5CFF]/20 hover:shadow-[#7C5CFF]/40 transition-all"
                onClick={runReview}
                disabled={isLoading || !scriptContent.trim()}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isLoading ? '分析中...' : '开始评分'}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default FiveDimensionScoreCard;
