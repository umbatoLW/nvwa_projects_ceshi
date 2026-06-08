'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Target,
  Users,
  Sparkles,
  Shield,
  RefreshCw,
  Zap,
  ChevronRight,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

// 五维度定义 - 统一品牌色系
const DIMENSIONS = [
  {
    key: 'pacing',
    name: '节奏把控',
    description: '是否符合四段式节奏曲线，每集是否有情绪起伏',
    icon: Gauge,
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/20 to-purple-600/20',
    textColor: 'text-violet-400',
  },
  {
    key: 'hooks',
    name: '钩子设计',
    description: '每集结尾是否有有效钩子，钩子类型是否多样化',
    icon: Target,
    gradient: 'from-purple-500 to-fuchsia-600',
    bgGradient: 'from-purple-500/20 to-fuchsia-600/20',
    textColor: 'text-purple-400',
  },
  {
    key: 'character',
    name: '人物一致性',
    description: '人物性格是否前后一致，是否有成长弧光',
    icon: Users,
    gradient: 'from-fuchsia-500 to-pink-600',
    bgGradient: 'from-fuchsia-500/20 to-pink-600/20',
    textColor: 'text-fuchsia-400',
  },
  {
    key: 'satisfaction',
    name: '爽感密度',
    description: '是否有足够的打脸/逆袭/复仇等爽感要素',
    icon: Sparkles,
    gradient: 'from-cyan-500 to-teal-600',
    bgGradient: 'from-cyan-500/20 to-teal-600/20',
    textColor: 'text-cyan-400',
  },
  {
    key: 'compliance',
    name: '合规性',
    description: '是否遵守内容红线，无违规表述',
    icon: Shield,
    gradient: 'from-teal-500 to-emerald-600',
    bgGradient: 'from-teal-500/20 to-emerald-600/20',
    textColor: 'text-teal-400',
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

interface ScoreViewProps {
  scriptId: string;
  scriptContent: string;
  onReviewComplete?: (result: NormalizedResult) => void;
}

export function ScoreView({
  scriptId,
  scriptContent,
  onReviewComplete,
}: ScoreViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NormalizedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  // 动画效果
  const [showResult, setShowResult] = useState(false);
  
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => setShowResult(true), 100);
      return () => clearTimeout(timer);
    }
  }, [result]);

  // 计算等级
  const calculateGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 55) return 'D';
    return 'F';
  };

  // 获取等级样式
  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A':
        return {
          gradient: 'from-green-400 to-emerald-500',
          glow: 'shadow-green-500/50',
          bg: 'bg-green-500/10',
        };
      case 'B':
        return {
          gradient: 'from-cyan-400 to-blue-500',
          glow: 'shadow-cyan-500/50',
          bg: 'bg-cyan-500/10',
        };
      case 'C':
        return {
          gradient: 'from-yellow-400 to-orange-500',
          glow: 'shadow-yellow-500/50',
          bg: 'bg-yellow-500/10',
        };
      case 'D':
        return {
          gradient: 'from-orange-400 to-red-500',
          glow: 'shadow-orange-500/50',
          bg: 'bg-orange-500/10',
        };
      case 'F':
        return {
          gradient: 'from-red-400 to-rose-500',
          glow: 'shadow-red-500/50',
          bg: 'bg-red-500/10',
        };
      default:
        return {
          gradient: 'from-gray-400 to-gray-500',
          glow: 'shadow-gray-500/50',
          bg: 'bg-gray-500/10',
        };
    }
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
    setShowResult(false);

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

  // 空状态 - 全屏设计
  if (!result && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0A0A0A] via-[#0F0F1A] to-[#0A0A0A]">
        {/* 背景光效 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-2xl w-full text-center">
          {/* 标题 */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white/60">AI 智能评分引擎</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent mb-4">
              剧本多维质量评分
            </h1>
            <p className="text-lg text-white/50 max-w-md mx-auto">
              从五大维度深度解析剧本质量，生成专业评估报告
            </p>
          </div>

          {/* 五维度展示 */}
          <div className="grid grid-cols-5 gap-3 mb-10">
            {DIMENSIONS.map((dim, index) => (
              <div
                key={dim.key}
                className="group relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${dim.bgGradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm group-hover:border-white/20 transition-all duration-300">
                  <dim.icon className={`w-6 h-6 mx-auto mb-2 ${dim.textColor}`} />
                  <span className="text-xs text-white/60">{dim.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* 开始按钮 */}
          <Button
            size="lg"
            className="relative px-8 py-6 text-lg font-medium bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white rounded-2xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 group overflow-hidden"
            onClick={runReview}
            disabled={!scriptContent.trim()}
          >
            <span className="relative z-10 flex items-center gap-3">
              <Zap className="w-5 h-5" />
              开始评分分析
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </Button>

          {!scriptContent.trim() && (
            <p className="mt-4 text-sm text-white/30">
              请先在剧本编辑区输入内容
            </p>
          )}
        </div>
      </div>
    );
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#0A0A0A] via-[#0F0F1A] to-[#0A0A0A]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
            <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute inset-20 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>

        <div className="relative text-center">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
            <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 animate-pulse" />
            <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">正在分析剧本</h2>
          <p className="text-white/50">AI 正在从五个维度深度评估...</p>
          <div className="flex items-center justify-center gap-2 mt-6">
            {DIMENSIONS.map((dim, i) => (
              <div
                key={dim.key}
                className={`w-2 h-2 rounded-full bg-gradient-to-r ${dim.gradient} animate-pulse`}
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 结果展示 - 全屏视觉冲击
  const gradeStyle = getGradeStyle(result?.overallGrade || 'F');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0F0F1A] to-[#0A0A0A] overflow-auto">
      {/* 背景光效 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b ${gradeStyle.gradient} opacity-10 blur-3xl`} />
      </div>

      <div className={`relative max-w-6xl mx-auto p-6 md:p-10 transition-all duration-700 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${gradeStyle.gradient}`}>
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-medium text-white">质量评估报告</span>
          </div>
          <Button
            variant="outline"
            className="border-white/20 text-white/60 hover:text-white hover:bg-white/5"
            onClick={runReview}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            重新评分
          </Button>
        </div>

        {/* 主分数展示 - Hero区域 */}
        <div className="relative mb-10 p-8 md:p-12 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl overflow-hidden">
          {/* 装饰光效 */}
          <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradeStyle.gradient} opacity-20 blur-3xl`} />
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            {/* 左侧：总分 */}
            <div className="text-center md:text-left">
              <div className="text-sm text-white/40 mb-2 uppercase tracking-wider">综合评分</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-7xl md:text-8xl font-black bg-gradient-to-r ${gradeStyle.gradient} bg-clip-text text-transparent`}>
                  {result?.totalScore}
                </span>
                <span className="text-2xl text-white/30">/{result?.maxScore}</span>
              </div>
            </div>

            {/* 中间：等级徽章 */}
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${gradeStyle.gradient} rounded-full blur-2xl opacity-50`} />
              <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full ${gradeStyle.bg} border-2 border-white/20 flex items-center justify-center`}>
                <span className={`text-5xl md:text-6xl font-black bg-gradient-to-r ${gradeStyle.gradient} bg-clip-text text-transparent`}>
                  {result?.overallGrade}
                </span>
              </div>
            </div>

            {/* 右侧：雷达图 */}
            <div className="w-64 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={result?.dimensions.map(d => ({
                  subject: d.name,
                  score: d.score,
                  fullMark: d.maxScore,
                })) || []}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 20]} tick={false} axisLine={false} />
                  <Radar 
                    name="评分" 
                    dataKey="score" 
                    stroke="url(#radarGradient)" 
                    fill="url(#radarGradientFill)" 
                    fillOpacity={0.5} 
                  />
                  <defs>
                    <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7C5CFF" />
                      <stop offset="100%" stopColor="#69E7FF" />
                    </linearGradient>
                    <linearGradient id="radarGradientFill" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7C5CFF" />
                      <stop offset="100%" stopColor="#69E7FF" />
                    </linearGradient>
                  </defs>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 总体评价 */}
          <div className="relative mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/70 italic text-center">"{result?.summary}"</p>
          </div>
        </div>

        {/* 五维度详情 - 大卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {result?.dimensions.map((dim, index) => {
            const config = DIMENSIONS.find(d => d.key === dim.key);
            const percent = getScorePercent(dim.score, dim.maxScore);
            const isSelected = selectedDimension === dim.key;
            const hasIssues = dim.issues && dim.issues.length > 0;

            return (
              <div
                key={dim.key}
                className={`relative group p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? `bg-gradient-to-br ${config?.bgGradient} border-white/20`
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
                onClick={() => setSelectedDimension(isSelected ? null : dim.key)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* 背景光效 */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config?.bgGradient} rounded-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10`} />
                
                {/* 头部 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${config?.gradient}`}>
                      {config && <config.icon className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{dim.name}</h3>
                      {hasIssues && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          {dim.issues!.length} 个问题
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-3xl font-bold ${config?.textColor}`}>
                      {dim.score}
                    </span>
                    <span className="text-lg text-white/30">/{dim.maxScore}</span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${config?.gradient} transition-all duration-1000`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* 描述 */}
                <p className="text-xs text-white/40 mb-3">{config?.description}</p>

                {/* 展开详情 */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* 问题列表 */}
                    {hasIssues && (
                      <div className="space-y-2">
                        <div className="text-xs text-red-400/80 font-medium">发现问题</div>
                        {dim.issues!.map((issue, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-red-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 优点分析 */}
                    {dim.suggestions && dim.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-violet-400/80 font-medium">优点分析</div>
                        {dim.suggestions.map((sug, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-violet-400">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{sug}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 点击提示 */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-50 transition-opacity">
                  <ChevronRight className={`w-4 h-4 text-white/50 ${isSelected ? 'rotate-90' : ''}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-center gap-4 text-xs text-white/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            <span>{result?.modelVersion || 'qwen-plus'}</span>
          </div>
          <span>·</span>
          <span>{result?.scoredAt ? new Date(result.scoredAt).toLocaleString() : '刚刚'}</span>
        </div>
      </div>
    </div>
  );
}

export default ScoreView;
