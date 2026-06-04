"use client";
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIStream } from "@/hooks/useAIStream";
import { StoryboardCard, ScriptStoryboard } from "@/components/StoryboardCard";
import { ScriptChatPanel } from "@/components/script-chat/ScriptChatPanel";
// P2-8 前端适配组件
import {
  ThreeStageProgress,
  FiveDimensionScoreCard,
  ScriptContentRenderer,
} from "@/components/script-generation";
// 拆分后的子组件
import {
  ScriptEditor,
  StoryboardView,
  RolesView,
  OptimizeView,
  CostumesView,
  ScenesView,
  PropsView,
  RedlineView,
} from "@/components/script-views";
import {
  ArrowLeft,
  Download,
  Trash2,
  ShieldAlert,
  Wand2,
  Users,
  FileText,
  Film,
  Save,
  Upload,
  Loader2,
  Sparkles,
  Shirt,
  MapPin,
  Package,
  X,
  ChevronDown,
  Layers,
  Copy,
  Pencil,
  RefreshCw,
  Zap,
  ImageIcon,
} from "lucide-react";

interface ScriptScene {
  num: number;
  title: string;
  location: string;
  time: string;
  content: string;
}

interface ScriptRole {
  name: string;
  tag: string;
  description: string;
  lines: number;
  appearance: string;
  costume: string;
  feature: string;
}

interface ScriptDetail {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  wordCount: string | number;
  sceneCount: number;
  episodeCount: number; // 集数
  tags: string[];
  synopsis: string;
  content: string;
  genre?: string; // 类型
  coverImage?: string; // 封面图
  scenes: ScriptScene[];
  storyboards: ScriptStoryboard[];
  roles: ScriptRole[];
  costumes?: Record<string, unknown>;
  props?: Record<string, unknown>;
  extractedScenes?: Record<string, unknown>;
}

type ViewType = "chat" | "script" | "storyboard" | "roles" | "costumes" | "scenes" | "props" | "optimize" | "redline"; 

// === 提取项接口 ===
interface ExtractedItem {
  name: string;
  character?: string;
  style?: string;
  details?: string;
  description?: string;
  imagePrompt?: string;
}

// === 编辑项接口 ===
interface EditingItem {
  type: 'costume' | 'scene' | 'prop';
  episode: number;
  index: number;
  data: ExtractedItem | StreamingItem;
}

// === 流式项接口 ===
interface StreamingItem {
  name?: string;
  character?: string;
  style?: string;
  details?: string;
  description?: string;
  imagePrompt?: string;
  content?: string;
  status?: 'pending' | 'streaming' | 'completed';
}

interface EpisodeInfo {
  episode: number;
  title: string;
  synopsis: string;
}

export default function ScriptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  
  // 从 URL 参数读取视图状态，刷新后保持当前视图
  const [activeView, setActiveView] = useState<ViewType>("script");
  const [showDelete, setShowDelete] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [editSynopsis, setEditSynopsis] = useState("");
  const [editContent, setEditContent] = useState("");
  const [aiGeneratedContent, setAiGeneratedContent] = useState("");
  const [contentVersion, setContentVersion] = useState<'manual' | 'ai'>('manual');
  const [isSaving, setIsSaving] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [isExtractingOutline, setIsExtractingOutline] = useState(false);
  const [isExtractingCostumes, setIsExtractingCostumes] = useState(false);
  const [isExtractingScenes, setIsExtractingScenes] = useState(false);
  const [isExtractingProps, setIsExtractingProps] = useState(false);
  
  // 集数内容分片状态
  const [episodeContentMap, setEpisodeContentMap] = useState<Record<number, string>>({});
  const [activeEpisode, setActiveEpisode] = useState<number>(1);
  
  // AI优化相关状态
  const [optimizingMode, setOptimizingMode] = useState<'polish' | 'character' | 'visual' | 'rhythm'>('polish');
  const [optimizedStreamText, setOptimizedStreamText] = useState('');
  const [isOptimizingStream, setIsOptimizingStream] = useState(false);
  
  // 编辑数据块状态
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  
  // 按集数存储提取结果
  const [costumeByEpisode, setCostumeByEpisode] = useState<Record<number, ExtractedItem[]>>({});
  const [sceneByEpisode, setSceneByEpisode] = useState<Record<number, ExtractedItem[]>>({});
  const [propsByEpisode, setPropsByEpisode] = useState<Record<number, ExtractedItem[]>>({});
  
  // 当前选中的集数详情
  const [selectedEpisodeDetail, setSelectedEpisodeDetail] = useState<{type: 'costume' | 'scene' | 'prop' | null, episode: number | null}>({type: null, episode: null});
  const [isLoadingEpisodeDetail, setIsLoadingEpisodeDetail] = useState(false);
  
  // 流式生成状态
  const [streamingItems, setStreamingItems] = useState<StreamingItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  
  // 集数卡片显示状态（用于服装/场景/道具）
  const [showCostumeEpisodes, setShowCostumeEpisodes] = useState(false);
  const [showSceneEpisodes, setShowSceneEpisodes] = useState(false);
  const [showPropEpisodes, setShowPropEpisodes] = useState(false);
  const [costumeEpisodes, setCostumeEpisodes] = useState<number[]>([]);
  
  // 实时统计信息（基于当前编辑内容）
  const liveStats = useMemo(() => {
    const currentContent = contentVersion === 'ai' && aiGeneratedContent ? aiGeneratedContent : editContent;
    if (!currentContent) return { wordCount: 0, sceneCount: 0 };
    const wordCount = currentContent.replace(/\s/g, '').length;
    const sceneMatches = currentContent.match(/场景|第[一二三四五六七八九十\d]+场|内景|外景|INT\.?|EXT\.?/gi);
    const sceneCount = sceneMatches ? new Set(sceneMatches).size : 0;
    return { wordCount, sceneCount };
  }, [editContent, aiGeneratedContent, contentVersion]);

  // 从 URL 参数初始化视图状态（支持分享链接）
  useEffect(() => {
    const viewFromUrl = searchParams.get('view') as ViewType;
    if (viewFromUrl && ['script', 'storyboard', 'roles', 'optimize', 'costumes', 'scenes', 'props', 'redline', 'chat'].includes(viewFromUrl)) {
      setActiveView(viewFromUrl);
    }
  }, [searchParams]);

  // 监听视图变化，更新 URL 参数（刷新后保持当前视图）
  useEffect(() => {
    const newUrl = `${window.location.pathname}?view=${activeView}`;
    router.replace(newUrl, { scroll: false });
  }, [activeView, router]);

  // 当 activeView 切换时，自动检查已有数据并显示
  useEffect(() => {
    if (activeView === 'costumes' && Object.keys(costumeByEpisode).length > 0) {
      const epList = Object.keys(costumeByEpisode).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
      if (epList.length > 0) {
        setCostumeEpisodes(epList);
        setShowCostumeEpisodes(true);
      }
    } else if (activeView === 'scenes' && Object.keys(sceneByEpisode).length > 0) {
      const epList = Object.keys(sceneByEpisode).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
      if (epList.length > 0) {
        setSceneEpisodes(epList);
        setShowSceneEpisodes(true);
      }
    } else if (activeView === 'props' && Object.keys(propsByEpisode).length > 0) {
      const epList = Object.keys(propsByEpisode).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
      if (epList.length > 0) {
        setPropEpisodes(epList);
        setShowPropEpisodes(true);
      }
    }
  }, [activeView, costumeByEpisode, sceneByEpisode, propsByEpisode]);
  // 全局分析锁 - 防止并发分析
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<string>('');
  
  // 上传文件状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
  // 剧本生成状态
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptIdea, setScriptIdea] = useState('');
  const [targetEpisodes, setTargetEpisodes] = useState(24);
  const [generatedOutline, setGeneratedOutline] = useState<Record<string, unknown> | null>(null);
  
  // P2-8: 三阶段进度状态
  const [generationStage, setGenerationStage] = useState<{ id: number; name: string; status: string }>({ id: 1, name: '核心对话生成', status: 'waiting' });
  const [stageOutputs, setStageOutputs] = useState<Record<number, string>>({});
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [generationResult, setGenerationResult] = useState<unknown | null>(null);
  
  // 用于传递给 ScriptEditor 的三阶段进度状态
  const [stageProgress, setStageProgress] = useState<{ stage: number; name: string; output: string; detail?: string } | null>(null);
  const stageProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 批量提取状态
  const [isBatchExtracting, setIsBatchExtracting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number; currentEpisode: number; currentType: string } | null>(null);
  
  // 封面图生成状态
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  // 生成封面图
  const handleGenerateCover = async () => {
    if (!script) return;
    setIsGeneratingCover(true);
    try {
      const res = await apiFetch('/api/ai/generate-script-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: script.title || '未命名剧本',
          genre: script.genre,
          description: script.synopsis || editContent?.slice(0, 500),
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        // 更新剧本封面
        await apiFetch(`/api/scripts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverImage: data.imageUrl }),
        });
        setScript(prev => prev ? { ...prev, coverImage: data.imageUrl } : prev);
        toast.success('封面图生成成功');
      } else {
        toast.error(data.error || '封面图生成失败');
      }
    } catch (err) {
      console.error('生成封面图失败:', err);
      toast.error('封面图生成失败');
    } finally {
      setIsGeneratingCover(false);
    }
  };
  
  // 上传封面图
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 检查文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("不支持的图片格式，仅支持 jpg、png、webp、gif");
      return;
    }
    
    // 检查文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片大小不能超过5MB");
      return;
    }
    
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (data.success && data.data?.url) {
        // 更新剧本封面
        await apiFetch(`/api/scripts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverImage: data.data.url }),
        });
        setScript(prev => prev ? { ...prev, coverImage: data.data.url } : prev);
        toast.success('封面图上传成功');
      } else {
        toast.error(data.error || '封面图上传失败');
      }
    } catch (err) {
      console.error('上传封面图失败:', err);
      toast.error('封面图上传失败');
    } finally {
      setIsUploadingCover(false);
      // 重置 input
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };
  
  // 批量提取所有集数的数据
  const handleBatchExtract = async (type: 'costume' | 'scene' | 'prop') => {
    if (!editContent || !script?.episodeCount) {
      toast.error('请先上传剧本并确认集数');
      return;
    }
    
    setIsBatchExtracting(true);
    setBatchProgress({ completed: 0, total: script.episodeCount, currentEpisode: 0, currentType: type });
    
    try {
      // 构建集数信息
      const episodeList = Array.from({ length: script.episodeCount }, (_, i) => ({
        episode: i + 1,
        title: `第${i + 1}集`,
        startLine: Math.floor(i * editContent.split('\n').length / script.episodeCount),
        endLine: Math.floor((i + 1) * editContent.split('\n').length / script.episodeCount),
      }));
      
      const res = await fetch('/api/ai/batch-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptContent: editContent,
          episodes: episodeList,
          extractTypes: [type],
          maxParallel: 3,
        }),
      });
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应');
      
      const decoder = new TextDecoder();
      const results: Record<number, unknown[]> = {};
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                results[data.episode] = data.items;
                setBatchProgress({
                  completed: data.completed,
                  total: data.total,
                  currentEpisode: data.episode,
                  currentType: data.extractType,
                });
                
                // 实时更新UI
                if (type === 'costume') {
                  setCostumeByEpisode(prev => ({ ...prev, [data.episode]: data.items }));
                } else if (type === 'scene') {
                  setSceneByEpisode(prev => ({ ...prev, [data.episode]: data.items }));
                } else {
                  setPropsByEpisode(prev => ({ ...prev, [data.episode]: data.items }));
                }
              } else if (data.type === 'complete') {
                toast.success(`批量提取完成，共处理 ${data.stats.totalEpisodes} 集`);
              } else if (data.type === 'error') {
                console.error(`第${data.episode}集提取失败:`, data.error);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
      
      // 保存到数据库
      const updateData: Record<string, unknown> = {};
      if (type === 'costume') {
        updateData.costumes = results;
      } else if (type === 'scene') {
        updateData.extractedScenes = results;
      } else {
        updateData.props = results;
      }
      
      await apiFetch(`/api/scripts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      
      toast.success('数据已保存');
      
    } catch (error) {
      console.error('批量提取失败:', error);
      toast.error('批量提取失败');
    } finally {
      setIsBatchExtracting(false);
      setBatchProgress(null);
    }
  };
  
  // 重新分集 - 清空数据并重新分析
  const handleReAnalyzeEpisodes = async (type: 'costume' | 'scene' | 'prop') => {
    if (!confirm('重新分集将清空当前所有已提取的数据，确定继续吗？')) {
      return;
    }
    
    setIsAnalyzing(true);
    setAnalyzeProgress('正在清空旧数据...');
    
    try {
      // 清空对应类型的数据
      if (type === 'costume') {
        setCostumeByEpisode({});
        setCostumeEpisodes([]);
        setShowCostumeEpisodes(false);
      } else if (type === 'scene') {
        setSceneByEpisode({});
        setSceneEpisodes([]);
        setShowSceneEpisodes(false);
      } else {
        setPropsByEpisode({});
        setPropEpisodes([]);
        setShowPropEpisodes(false);
      }
      
      // 清空全局集数数据，强制重新分析
      setEpisodes([]);
      
      // 清空数据库中的数据
      const updateData: Record<string, unknown> = {};
      if (type === 'costume') {
        updateData.costumes = {};
      } else if (type === 'scene') {
        updateData.extractedScenes = {};
      } else {
        updateData.props = {};
      }
      
      await apiFetch(`/api/scripts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      
      // 重新触发分析
      setAnalyzeProgress('正在重新分析剧本集数...');
      
      if (!script) {
        toast.error('剧本数据未加载');
        return;
      }
      
      const res = await apiFetch('/api/ai/analyze-episodes', {
        method: 'POST',
        body: JSON.stringify({ scriptId: id, content: script.content }),
      });
      
      const data = await res.json();
      const newEpisodes = data.episodes || [];
      
      if (newEpisodes.length > 0) {
        const episodeList = newEpisodes.map((e: { episode: number }) => e.episode);
        const episodeDataList = newEpisodes;
        
        setEpisodes(episodeDataList);
        
        if (type === 'costume') {
          setCostumeEpisodes(episodeList);
          setShowCostumeEpisodes(true);
        } else if (type === 'scene') {
          setSceneEpisodes(episodeList);
          setShowSceneEpisodes(true);
        } else {
          setPropEpisodes(episodeList);
          setShowPropEpisodes(true);
        }
        
        toast.success(`重新分集完成，共 ${newEpisodes.length} 集`);
      } else {
        toast.error('分析失败，未识别到集数');
      }
    } catch (error) {
      console.error('重新分集失败:', error);
      toast.error('重新分集失败');
    } finally {
      setIsAnalyzing(false);
      setAnalyzeProgress('');
    }
  };

  const [sceneEpisodes, setSceneEpisodes] = useState<number[]>([]);
  const [propEpisodes, setPropEpisodes] = useState<number[]>([]);
  
  const [storyboardImages, setStoryboardImages] = useState<Record<number, string>>({});
  const [storyboardVideos, setStoryboardVideos] = useState<Record<number, string>>({});
  const [generatingImageFor, setGeneratingImageFor] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  
  // 获取或分析集数（带锁机制，避免并发）
  const getOrAnalyzeEpisodes = async (): Promise<number[]> => {
    // 如果已有 episodeCount（用户已确认的集数），直接使用
    if (script?.episodeCount && script.episodeCount > 0) {
      const episodeList = Array.from({ length: script.episodeCount }, (_, i) => i + 1);
      const episodeInfos = episodeList.map(ep => ({ episode: ep, title: `第${ep}集`, synopsis: '' }));
      setEpisodes(episodeInfos);
      return episodeList;
    }
    
    // 如果已经有集数数据，直接返回
    if (episodes.length > 0) {
      return episodes.map(e => e.episode);
    }
    
    // 如果正在分析，等待
    if (isAnalyzing) {
      // 等待分析完成，最多等待30秒
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (episodes.length > 0) {
          return episodes.map(e => e.episode);
        }
        if (!isAnalyzing) {
          break;
        }
      }
      return [];
    }
    
    // 开始分析
    setIsAnalyzing(true);
    setAnalyzeProgress('正在分析剧本结构...');
    try {
      const res = await apiFetch('/api/ai/analyze-episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptContent: editContent }),
      });
      const data = await res.json();
      if (data.success && data.episodes && data.episodes.length > 0) {
        setEpisodes(data.episodes);
        const methodText = data.method === 'regex' ? '正则识别' : 
                          data.method === 'batch_ai' ? `AI分批分析(${data.batchCount}批)` : 
                          data.method === 'estimated' ? '字数估算' : 'AI分析';
        setAnalyzeProgress(`分析完成: ${data.episodes.length}集 (${methodText})`);
        setTimeout(() => setAnalyzeProgress(''), 3000);
        return data.episodes.map((e: EpisodeInfo) => e.episode);
      }
      setAnalyzeProgress('分析完成: 1集');
      setTimeout(() => setAnalyzeProgress(''), 3000);
      return [1];
    } catch {
      setAnalyzeProgress('分析失败，使用默认1集');
      setTimeout(() => setAnalyzeProgress(''), 3000);
      return [1];
    } finally {
      setIsAnalyzing(false);
    }
  };
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [isAnalyzingEpisodes, setIsAnalyzingEpisodes] = useState(false);
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);
  const [generatingEpisode, setGeneratingEpisode] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const splitStream = useAIStream();

  // 清理定时器
  useEffect(() => {
    return () => {
      if (stageProgressTimerRef.current) {
        clearTimeout(stageProgressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/scripts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const d = data.data;
          const parsedScenes = d.content
            ? d.content
                .split(/\n\s*\n/)
                .filter((s: string) => s.trim())
                .map((s: string, i: number) => ({
                  num: i + 1,
                  title: `场景 ${i + 1}`,
                  location: "未指定",
                  time: "未指定",
                  content: s.trim(),
                }))
            : [];
          const dbStoryboards: ScriptStoryboard[] = Array.isArray(d.storyboards) ? d.storyboards : [];
          const dbRoles: ScriptRole[] = Array.isArray(d.roles) ? d.roles : [];
          setScript({
            id: d.id,
            title: d.title,
            type: d.genre,
            status: d.status === "draft" ? "草稿" : d.status === "completed" ? "已完成" : d.status,
            createdAt: new Date(d.createdAt).toLocaleDateString("zh-CN"),
            wordCount: d.content?.length || 0,
            sceneCount: parsedScenes.length,
            episodeCount: d.episodeCount || 0,
            tags: [d.genre, d.status].filter(Boolean),
            synopsis: d.synopsis || "",
            content: d.content || "",
            scenes: parsedScenes,
            storyboards: dbStoryboards,
            roles: dbRoles,
            coverImage: d.coverImage || undefined,
          });
          setEditTitle(d.title);
          setEditSynopsis(d.synopsis || "");
          setEditContent(d.content || "");
          // 恢复服装、道具、场景数据
          if (d.costumes && Object.keys(d.costumes).length > 0) {
            setCostumeByEpisode(d.costumes);
            // 恢复 costumeEpisodes 状态，显示已有数据的集数
            const costumeEpList = Object.keys(d.costumes).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
            if (costumeEpList.length > 0) {
              setCostumeEpisodes(costumeEpList);
            }
          }
          if (d.props && Object.keys(d.props).length > 0) {
            setPropsByEpisode(d.props);
            const propsEpList = Object.keys(d.props).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
            if (propsEpList.length > 0) {
              setPropEpisodes(propsEpList);
            }
          }
          if (d.extractedScenes && Object.keys(d.extractedScenes).length > 0) {
            setSceneByEpisode(d.extractedScenes);
            const sceneEpList = Object.keys(d.extractedScenes).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
            if (sceneEpList.length > 0) {
              setSceneEpisodes(sceneEpList);
            }
          }
        }
      })
      .catch(() => toast.error("加载剧本失败"))
      .finally(() => setLoading(false));
  }, [id]);

  // 根据总内容自动分片
  const autoSplitContent = useCallback(() => {
    if (!editContent || !script?.episodeCount) return;
    
    const totalEpisodes = script.episodeCount;
    const lines = editContent.split('\n');
    const totalLines = lines.length;
    const linesPerEpisode = Math.ceil(totalLines / totalEpisodes);
    
    const map: Record<number, string> = {};
    for (let i = 0; i < totalEpisodes; i++) {
      const startLine = i * linesPerEpisode;
      const endLine = Math.min((i + 1) * linesPerEpisode, totalLines);
      map[i + 1] = lines.slice(startLine, endLine).join('\n');
    }
    setEpisodeContentMap(map);
  }, [editContent, script?.episodeCount]);

  // 内容变化时自动重新分片
  useEffect(() => {
    if (editContent && script?.episodeCount && script.episodeCount > 0) {
      autoSplitContent();
    }
  }, [editContent, script?.episodeCount, autoSplitContent]);

  // 单集内容更新
  const handleEpisodeContentChange = (episode: number, content: string) => {
    setEpisodeContentMap(prev => {
      const updatedMap = { ...prev, [episode]: content };
      const allContent = Object.entries(updatedMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, c]) => c)
        .join('\n\n');
      // 在 setEpisodeContentMap 的回调中同步更新 editContent
      setEditContent(allContent);
      return updatedMap;
    });
  };

  const handleSave = async () => {
    if (!script) return;
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/scripts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          synopsis: editSynopsis,
          content: editContent,
          genre: script.type,
          status: script.status === "已完成" ? "completed" : "draft",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const parsedScenes = editContent
          ? editContent
              .split(/\n\s*\n/)
              .filter((s) => s.trim())
              .map((s, i) => ({
                num: i + 1,
                title: `场景 ${i + 1}`,
                location: "未指定",
                time: "未指定",
                content: s.trim(),
              }))
          : [];
        setScript((prev) =>
          prev
            ? {
                ...prev,
                title: editTitle,
                synopsis: editSynopsis,
                content: editContent,
                wordCount: String(editContent.length),
                sceneCount: parsedScenes.length,
                scenes: parsedScenes,
              }
            : null
        );
        toast.success("保存成功");
      } else {
        toast.error(data.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress('正在读取文件...');
    
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowed = ["txt", "md", "docx", "pdf"];
    if (!allowed.includes(ext)) {
      toast.error("目前仅支持 .txt / .md / .docx / .pdf 格式文件");
      e.target.value = "";
      setIsUploading(false);
      return;
    }
    
    let text = "";
    try {
      if (ext === "txt" || ext === "md") {
        text = await file.text();
      } else {
        setUploadProgress('正在解析文档...');
        const formData = new FormData();
        formData.append("file", file);
        const res = await apiFetch("/api/parse-document", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "文件解析失败");
        }
        text = data.content;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "文件读取失败");
      e.target.value = "";
      setIsUploading(false);
      return;
    }
    
    setEditContent(text);
    setUploadProgress('正在分析剧本集数...');
    
    // Auto-save uploaded content
    try {
      await apiFetch(`/api/scripts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      
      // Auto-analyze stats
      const wordCount = text.replace(/\s/g, "").length;
      const sceneMatches = text.match(/场景|第[一二三四五六七八九十\d]+场|内景|外景|INT\.?|EXT\.?/gi);
      const sceneCount = sceneMatches ? new Set(sceneMatches).size : Math.max(1, Math.ceil(text.length / 2000));
      
      // 分析集数
      let episodeCount = 0;
      let episodeData: EpisodeInfo[] = [];
      
      try {
        const analyzeRes = await apiFetch('/api/ai/analyze-episodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptContent: text }),
        });
        const analyzeData = await analyzeRes.json();
        if (analyzeData.success && analyzeData.episodes && analyzeData.episodes.length > 0) {
          episodeCount = analyzeData.episodes.length;
          episodeData = analyzeData.episodes;
          setEpisodes(episodeData);
          const methodText = analyzeData.method === 'regex' ? '正则识别' : 
                            analyzeData.method === 'ai_batch' ? `AI分批分析(${analyzeData.batchCount || 1}批)` : 
                            analyzeData.method === 'estimated' ? '字数估算' : 'AI分析';
          toast.success(`剧本上传成功，已识别 ${episodeCount} 集 (${methodText})`);
        } else {
          throw new Error('分析结果为空');
        }
      } catch {
        // 分析失败时使用字数估算
        episodeCount = Math.max(1, Math.ceil(wordCount / 15000));
        toast.warning(`AI分析失败，已按字数估算 ${episodeCount} 集`);
      }
      
      setScript((prev) =>
        prev
          ? { ...prev, content: text, wordCount: wordCount, sceneCount: sceneCount, episodeCount: episodeCount }
          : prev
      );
      
      // Also update stats on backend
      try {
        await apiFetch(`/api/scripts/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, wordCount, sceneCount, episodeCount }),
        });
      } catch {
        /* ignore backend stats update failure */
      }
      
      // 上传成功后自动分片
      if (episodeCount > 1) {
        setTimeout(() => {
          autoSplitContent();
        }, 100);
      }
      
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('剧本保存失败');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      e.target.value = "";
    }
  };

  // 从创意生成完整剧本
  const handleGenerateFullScript = async () => {
    if (!scriptIdea.trim()) {
      toast.error('请输入剧本创意或大纲');
      return;
    }

    setIsGeneratingScript(true);
    setGeneratedOutline(null);
    setAiGeneratedContent('');
    setContentVersion('ai');

    try {
      const res = await fetch('/api/ai/generate-full-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: scriptIdea,
          targetEpisodes: targetEpisodes,
          genre: script?.genre,
          style: '甜宠',
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let fullScript = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'stage') {
                // 三阶段进度：更新当前阶段
                setStageProgress({
                  stage: data.stage as number,
                  name: data.name || `阶段 ${data.stage}`,
                  output: data.output || '',
                  detail: data.detail,
                });
              } else if (data.type === 'progress') {
                if (data.content) {
                  fullScript += data.content;
                  setAiGeneratedContent(fullScript);
                }
                if (data.message) {
                  setAnalyzeProgress(data.message);
                }
                if (data.stage === 'outline_complete' && data.data) {
                  setGeneratedOutline(data.data);
                }
              } else if (data.type === 'complete') {
                if (data.data?.script) {
                  setAiGeneratedContent(data.data.script);
                  const newEpisodeCount = data.data.generatedEpisodes;
                  const newTitle = data.data.title;
                  setScript((prev) => prev ? {
                    ...prev,
                    episodeCount: newEpisodeCount,
                    title: newTitle || prev.title,
                  } : prev);
                  
                  // 自动保存到数据库
                  try {
                    await apiFetch(`/api/scripts/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: newTitle || script?.title,
                        content: data.data.script,
                        episodeCount: newEpisodeCount,
                        genre: script?.genre,
                        status: 'draft',
                      }),
                    });
                    toast.success('剧本已自动保存');
                  } catch (saveError) {
                    console.error('自动保存失败:', saveError);
                    toast.error('剧本保存失败，请手动保存');
                  }
                }
                // 三阶段进度：标记所有阶段完成（stage=3 表示第三阶段已完成）
                setStageProgress({ stage: 3, name: '完成', output: '剧本生成完成' });
                toast.success('剧本生成完成');
              } else if (data.type === 'error') {
                toast.error(data.message);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('生成失败:', error);
      toast.error('剧本生成失败');
    } finally {
      setIsGeneratingScript(false);
      setAnalyzeProgress('');
      // 三阶段进度：3秒后重置进度显示
      if (stageProgressTimerRef.current) {
        clearTimeout(stageProgressTimerRef.current);
      }
      stageProgressTimerRef.current = setTimeout(() => {
        setStageProgress(null);
        stageProgressTimerRef.current = null;
      }, 3000);
    }
  };



  // 分析剧本集数结构
  const handleAnalyzeEpisodes = async () => {
    if (!script?.content?.trim()) { 
      toast.error("剧本内容为空"); 
      return; 
    }
    setIsAnalyzingEpisodes(true);
    try {
      const res = await apiFetch('/api/ai/analyze-episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptContent: script.content }),
      });
      const data = await res.json();
      if (data.success && data.episodes) {
        setEpisodes(data.episodes);
        setSelectedEpisodes(data.episodes.map((e: EpisodeInfo) => e.episode));
        setShowEpisodeSelector(true);
        toast.success(`分析完成，发现 ${data.episodes.length} 集`);
      } else {
        toast.error(data.error || '集数分析失败');
      }
    } catch {
      toast.error('集数分析失败');
    }
    setIsAnalyzingEpisodes(false);
  };

  // 切换选择集数
  const toggleEpisodeSelection = (episode: number) => {
    setSelectedEpisodes(prev => 
      prev.includes(episode) 
        ? prev.filter(e => e !== episode)
        : [...prev, episode]
    );
  };

  // 选择/取消选择全部
  const toggleSelectAll = () => {
    if (selectedEpisodes.length === episodes.length) {
      setSelectedEpisodes([]);
    } else {
      setSelectedEpisodes(episodes.map(e => e.episode));
    }
  };

  // 按选中集数生成分镜
  const handleGenerateBySelectedEpisodes = async () => {
    if (selectedEpisodes.length === 0) {
      toast.error('请至少选择一集');
      return;
    }
    if (!script?.content?.trim()) {
      toast.error('剧本内容为空');
      return;
    }
    setShowEpisodeSelector(false);
    setIsSplitting(true);
    setActiveView('storyboard');
    
    try {
      // 计算总字数估算
      const totalChars = script.content.length;
      const avgCharsPerEpisode = totalChars / episodes.length;
      
      // 逐集生成分镜
      let allScenes: ScriptStoryboard[] = [];
      
      for (const episodeNum of selectedEpisodes.sort((a, b) => a - b)) {
        const episode = episodes.find(e => e.episode === episodeNum);
        if (!episode) continue;
        
        setGeneratingEpisode(episodeNum);
        toast.info(`正在生成第 ${episodeNum} 集...`);
        
        // 估算本集内容范围
        const episodeStart = Math.floor((episodeNum - 1) * avgCharsPerEpisode);
        const episodeEnd = Math.floor(episodeNum * avgCharsPerEpisode);
        const episodeContent = script.content.slice(episodeStart, episodeEnd);
        
        try {
          const result = await splitStream.run("/api/ai/split-scenes", {
            scriptContent: episodeContent,
            episodeNum: episodeNum,
          });
          const data = result as Record<string, unknown>;
          
          let scenes: ScriptStoryboard[] = [];
          if (Array.isArray(data.scenes)) {
            scenes = (data.scenes as Record<string, string>[]).map((s, i) => ({
              num: allScenes.length + i + 1,
              duration: s.duration || s.time || "5s",
              description: `[第${episodeNum}集] ${s.description || s.scene || s.content || ''}`,
              character: s.character || s.characters || "",
              shot: s.shot || s.type || "中景",
              camera: s.camera || s.movement || "固定",
              audio: s.audio || s.sound || "",
            }));
          } else if (data.content) {
            let raw = data.content;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch (err) {
	              console.error("JSON解析失败:", err);
	              // 如果解析失败，尝试清理后重试
	              try {
	                raw = JSON.parse((data.content as string).replace(/[\x00-\x1F\x7F]/g, ''));
	              } catch {
	                // 如果还是失败，使用原始字符串
	                raw = data.content;
	              }
	            }
            }
            if (Array.isArray(raw)) {
              scenes = (raw as Record<string, string>[]).map((s, i) => ({
                num: allScenes.length + i + 1,
                duration: s.duration || s.time || "5s",
                description: `[第${episodeNum}集] ${s.description || s.scene || s.content || ''}`,
                character: s.character || s.characters || "",
                shot: s.shot || s.type || "中景",
                camera: s.camera || s.movement || "固定",
                audio: s.audio || s.sound || "",
              }));
            }
          }
          
          allScenes = [...allScenes, ...scenes];
        } catch (e) {
          console.error(`第 ${episodeNum} 集生成分镜失败:`, e);
          toast.error(`第 ${episodeNum} 集生成分镜失败`);
        }
      }
      
      setScript((prev) => (prev ? { ...prev, storyboards: allScenes } : null));
      try {
        await apiFetch(`/api/scripts/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyboards: allScenes }),
        });
      } catch {
        toast.error("分镜数据保存到数据库失败");
      }
      
      if (allScenes.length > 0) {
        toast.success(`成功生成 ${allScenes.length} 个分镜（${selectedEpisodes.length} 集）`);
      } else {
        toast.error("所有集数生成分镜均失败");
      }
    } catch {
      toast.error("分镜生成失败");
    } finally {
      setIsSplitting(false);
      setGeneratingEpisode(null);
    }
  };

  const handleSplitScenes = async () => {
    if (!script?.content?.trim()) { 
      toast.error("剧本内容为空，请先在剧本编辑区输入内容");
      setActiveView("storyboard");
      return; 
    }
    // 内容较短时直接生成
    if (script.content.length < 5000) {
      setIsSplitting(true);
      setActiveView("storyboard");
      setShowEpisodeSelector(false);
      try {
        const result = await splitStream.run("/api/ai/split-scenes", {
          scriptContent: script.content,
        });
        const data = result as Record<string, unknown>;
        
        // 调试日志
        console.log("[handleSplitScenes] split-scenes 返回结果:", result);
        
        let scenes: ScriptStoryboard[] = [];
        
        // 尝试从 data.scenes 获取
        if (Array.isArray(data.scenes)) {
          scenes = (data.scenes as Record<string, string>[]).map((s, i) => ({
            num: i + 1,
            duration: s.duration || s.time || "5s",
            description: s.description || s.scene || s.content || "",
            character: s.character || s.characters || "",
            shot: s.shot || s.type || "中景",
            camera: s.camera || s.movement || "固定",
            audio: s.audio || s.sound || "",
          }));
          console.log("[handleSplitScenes] 从 data.scenes 解析到", scenes.length, "个分镜");
        }
        
        // 如果 scenes 为空，尝试从 data.content 获取
        if (scenes.length === 0 && data.content) {
          console.log("[handleSplitScenes] data.scenes 为空，尝试从 data.content 解析");
          let raw = data.content;
          if (typeof raw === 'string') {
            try { 
              raw = JSON.parse(raw); 
              console.log("[handleSplitScenes] JSON.parse 成功");
            } catch (err) {
              console.error("[handleSplitScenes] JSON解析失败:", err);
              // 尝试提取数组
              const arrayMatch = (raw as string).match(/\[[\s\S]*\]/);
              if (arrayMatch) {
                try {
                  raw = JSON.parse(arrayMatch[0]);
                  console.log("[handleSplitScenes] 从字符串中提取数组成功");
                } catch {
                  console.error("[handleSplitScenes] 数组提取失败");
                }
              }
            }
          }
          if (Array.isArray(raw)) {
            scenes = (raw as Record<string, string>[]).map((s, i) => ({
              num: i + 1,
              duration: s.duration || s.time || "5s",
              description: s.description || s.scene || s.content || "",
              character: s.character || s.characters || "",
              shot: s.shot || s.type || "中景",
              camera: s.camera || s.movement || "固定",
              audio: s.audio || s.sound || "",
            }));
            console.log("[handleSplitScenes] 从 data.content 解析到", scenes.length, "个分镜");
          }
        }
        
        console.log("[handleSplitScenes] 最终解析的分镜数据:", scenes);
        
        setScript((prev) => (prev ? { ...prev, storyboards: scenes } : null));
        try {
          await apiFetch(`/api/scripts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storyboards: scenes }),
          });
        } catch {
          toast.error("分镜数据保存到数据库失败");
        }
        if (scenes.length > 0) {
          toast.success(`成功拆分出 ${scenes.length} 个分镜`);
        } else {
          toast.error("分镜拆分结果为空，请尝试重新生成");
        }
      } catch (err) {
        console.error("[handleSplitScenes] 分镜拆分错误:", err);
        toast.error("分镜拆分失败");
      } finally {
        setIsSplitting(false);
      }
    } else {
      // 内容较长，先分析集数
      handleAnalyzeEpisodes();
    }
  };

  const handleExtractRoles = async () => {
    if (!script?.content?.trim()) { 
      toast.error("剧本内容为空，请先在剧本编辑区输入内容");
      setActiveView("roles");
      return; 
    }
    setIsExtracting(true);
    setActiveView("roles");
    try {
      // 使用普通fetch请求，不使用流式
      const response = await apiFetch("/api/ai/extract-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: script.content,
          scriptId: id 
        }),
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.roles)) {
        const roles: ScriptRole[] = (data.roles as Record<string, string | number>[]).map((r, i) => ({
          name: String(r.name || r.姓名 || `角色${i + 1}`),
          tag: String(r.role || r.tag || r.角色 || "配角"),
          description: String(r.description || r.personality || r.性格 || ""),
          lines: 0,
          appearance: String(r.appearance || r.外貌 || ""),
          costume: String(r.costume || r.服装 || ""),
          feature: String(r.feature || r.relationships || r.关系 || ""),
        }));
        setScript((prev) => (prev ? { ...prev, roles } : null));
        try {
          await apiFetch(`/api/scripts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roles }),
          });
        } catch {
          toast.error("角色数据保存到数据库失败");
        }
        if (roles.length > 0) {
          toast.success(`成功提取 ${roles.length} 个角色`);
        } else {
          toast.error("角色提取结果为空");
        }
      } else {
        toast.error(data.error || "角色提取失败");
      }
    } catch (err) {
      console.error("角色提取错误:", err);
      toast.error("角色提取失败");
    } finally {
      setIsExtracting(false);
    }
  };

  // 将角色应用到角色库
  const handleApplyRolesToLibrary = async (roles: ScriptRole[]) => {
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const role of roles) {
        try {
          // 创建角色到角色库
          const response = await apiFetch("/api/characters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: role.name,
              tag: role.tag,
              description: role.description,
              appearance: role.description, // 使用 description 作为 appearance
              costume: role.costume,
              feature: role.feature,
              script_id: id,
            }),
          });
          const data = await response.json();
          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`已将 ${successCount} 个角色添加到角色库`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} 个角色添加失败`);
      }
    } catch (err) {
      console.error("添加到角色库失败:", err);
      toast.error("添加到角色库失败");
    }
  };

  const handleOptimize = async () => {
    const content = editContent;
    if (!content) { toast.error("剧本内容为空"); return; }
    setIsOptimizing(true);
    try {
      const res = await apiFetch("/api/ai/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content.slice(0, 2000) }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        
          setEditContent(String(data.data));
        toast.success("已优化剧本内容");
      }
    } catch {
      toast.error("优化失败");
    } finally {
      setIsOptimizing(false);
    }
  };

  // 流式优化函数
  const handleStreamOptimize = async () => {
    if (!editContent.trim()) {
      toast.error('请先输入剧本内容');
      return;
    }

    setIsOptimizingStream(true);
    setOptimizedStreamText('');

    try {
      const res = await fetch('/api/ai/optimize-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          mode: optimizingMode,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'text') {
                fullText += data.content;
                setOptimizedStreamText(fullText);
              } else if (data.type === 'complete') {
                toast.success('优化完成');
              } else if (data.type === 'error') {
                toast.error(data.message);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('优化失败:', error);
      toast.error('优化失败');
    } finally {
      setIsOptimizingStream(false);
    }
  };

  const handleComplianceCheck = async () => {
    const content = editContent;
    if (!content) { toast.error("剧本内容为空"); return; }
    setIsChecking(true);
    setCheckResult(null);
    try {
      const res = await apiFetch("/api/ai/execute-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeType: "complianceCheck", inputs: { content } }),
      });
      const data = await res.json();
      if (data.success) {
        setCheckResult(String(data.data || "检测完成"));
      } else {
        toast.error(data.error || "检测失败");
      }
    } catch {
      toast.error("检测失败");
    } finally {
      setIsChecking(false);
    }
  };

  const handleExtractOutline = async () => {
    if (!editContent) { toast.error("剧本内容为空"); return; }
    setIsExtractingOutline(true);
    try {
      const res = await apiFetch("/api/ai/execute-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeType: "outlineExtract", inputs: { script: editContent } }),
      });
      const data = await res.json();
      if (data.success) {
        const outline = String(data.data || "");
        setEditSynopsis(outline);
        setScript((prev) => (prev ? { ...prev, synopsis: outline } : null));
        try {
          await apiFetch(`/api/scripts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ synopsis: outline }),
          });
        } catch {
          toast.error("大纲保存到数据库失败");
        }
        toast.success("大纲提炼完成");
      } else {
        toast.error(data.error || "提炼失败");
      }
    } catch {
      toast.error("提炼失败");
    } finally {
      setIsExtractingOutline(false);
    }
  };

  // 提取服装 - 按集数分割（优先使用已确认的集数）
  const handleExtractCostumes = async () => {
    if (!editContent) { toast.error("剧本内容为空"); return; }
    setIsExtractingCostumes(true);
    
    try {
      // 首先检查是否已有保存的服装数据
      if (Object.keys(costumeByEpisode).length > 0) {
        // 有已有数据，直接显示
        const existingEpisodes = Object.keys(costumeByEpisode).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
        setCostumeEpisodes(existingEpisodes);
        setShowCostumeEpisodes(true);
        toast.success(`已有 ${existingEpisodes.length} 集服装数据，点击集数卡片查看详情`);
        setIsExtractingCostumes(false);
        return;
      }
      
      // 如果已有 episodeCount，直接使用
      if (script?.episodeCount && script.episodeCount > 0) {
        const episodeList = Array.from({ length: script.episodeCount }, (_, i) => i + 1);
        setCostumeEpisodes(episodeList);
        setShowCostumeEpisodes(true);
        toast.success(`已按 ${script.episodeCount} 集生成模块，点击集数卡片查看服装详情`);
        setIsExtractingCostumes(false);
        return;
      }
      
      // 使用统一的分析函数（带锁机制，避免并发重复请求）
      if (isAnalyzing) {
        toast.info("正在分析剧本集数，请稍候...");
        return;
      }
      
      const episodeList = await getOrAnalyzeEpisodes();
      if (episodeList.length > 0) {
        setCostumeEpisodes(episodeList);
        setShowCostumeEpisodes(true);
        toast.success(`已识别 ${episodeList.length} 集，点击集数卡片查看服装详情`);
      }
    } catch {
      toast.error("分析集数失败");
    } finally {
      setIsExtractingCostumes(false);
    }
  };

  // 提取场景 - 优先使用已确认的集数
  const handleExtractScenes = async () => {
    if (!editContent) { toast.error("剧本内容为空"); return; }
    setIsExtractingScenes(true);
    
    try {
      // 首先检查是否已有保存的场景数据
      if (Object.keys(sceneByEpisode).length > 0) {
        const existingEpisodes = Object.keys(sceneByEpisode).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
        setSceneEpisodes(existingEpisodes);
        setShowSceneEpisodes(true);
        toast.success(`已有 ${existingEpisodes.length} 集场景数据，点击集数卡片查看详情`);
        setIsExtractingScenes(false);
        return;
      }
      
      // 如果已有 episodeCount，直接使用
      if (script?.episodeCount && script.episodeCount > 0) {
        const episodeList = Array.from({ length: script.episodeCount }, (_, i) => i + 1);
        setSceneEpisodes(episodeList);
        setShowSceneEpisodes(true);
        toast.success(`已按 ${script.episodeCount} 集生成模块，点击集数卡片查看场景详情`);
        setIsExtractingScenes(false);
        return;
      }
      
      // 使用统一的分析函数（带锁机制，避免并发重复请求）
      if (isAnalyzing) {
        toast.info("正在分析剧本集数，请稍候...");
        return;
      }
      
      const episodeList = await getOrAnalyzeEpisodes();
      if (episodeList.length > 0) {
        setSceneEpisodes(episodeList);
        setShowSceneEpisodes(true);
        toast.success(`已识别 ${episodeList.length} 集，点击集数卡片查看场景详情`);
      }
    } catch {
      toast.error("分析集数失败");
    } finally {
      setIsExtractingScenes(false);
    }
  };

  // 提取道具 - 优先使用已确认的集数
  const handleExtractProps = async () => {
    if (!editContent) { toast.error("剧本内容为空"); return; }
    setIsExtractingProps(true);
    
    try {
      // 首先检查是否已有保存的道具数据
      if (Object.keys(propsByEpisode).length > 0) {
        const existingEpisodes = Object.keys(propsByEpisode).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
        setPropEpisodes(existingEpisodes);
        setShowPropEpisodes(true);
        toast.success(`已有 ${existingEpisodes.length} 集道具数据，点击集数卡片查看详情`);
        setIsExtractingProps(false);
        return;
      }
      
      // 如果已有 episodeCount，直接使用
      if (script?.episodeCount && script.episodeCount > 0) {
        const episodeList = Array.from({ length: script.episodeCount }, (_, i) => i + 1);
        setPropEpisodes(episodeList);
        setShowPropEpisodes(true);
        toast.success(`已按 ${script.episodeCount} 集生成模块，点击集数卡片查看道具详情`);
        setIsExtractingProps(false);
        return;
      }
      
      // 使用统一的分析函数（带锁机制，避免并发重复请求）
      if (isAnalyzing) {
        toast.info("正在分析剧本集数，请稍候...");
        return;
      }
      
      const episodeList = await getOrAnalyzeEpisodes();
      if (episodeList.length > 0) {
        setPropEpisodes(episodeList);
        setShowPropEpisodes(true);
        toast.success(`已识别 ${episodeList.length} 集，点击集数卡片查看道具详情`);
      }
    } catch {
      toast.error("分析集数失败");
    } finally {
      setIsExtractingProps(false);
    }
  };
  
  // 获取单集详情 - 如果有已保存数据则直接显示，否则流式生成
  const handleGetEpisodeDetail = async (type: 'costume' | 'scene' | 'prop', episode: number, forceRegenerate = false) => {
    setSelectedEpisodeDetail({ type, episode });
    setStreamingItems([]);
    setStreamingText("");
    
    // 检查是否已有保存的数据
    const existingData = type === 'costume' 
      ? costumeByEpisode[episode] 
      : type === 'scene' 
        ? sceneByEpisode[episode] 
        : propsByEpisode[episode];
    
    // 如果有数据且不强制重新生成，直接显示
    if (existingData && existingData.length > 0 && !forceRegenerate) {
      setIsStreaming(false);
      return;
    }
    
    // 否则流式生成
    setIsStreaming(true);
    
    try {
      // 使用流式API
      const res = await fetch("/api/ai/extract-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          scriptContent: editContent,
          episode,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "delta") {
                setStreamingText(prev => prev + data.content);
              } else if (data.type === "complete" && data.items) {
                // 流式添加每个项目
                for (const item of data.items) {
                  setStreamingItems(prev => [...prev, item]);
                }
                
                // 同时更新到对应的状态，并获取更新后的值用于保存
                let updatedCostumes: Record<number, unknown[]> | null = null;
                let updatedScenes: Record<number, unknown[]> | null = null;
                let updatedProps: Record<number, unknown[]> | null = null;
                
                if (type === 'costume') {
                  setCostumeByEpisode(prev => {
                    const newVal = { ...prev, [episode]: data.items };
                    updatedCostumes = newVal;
                    return newVal;
                  });
                } else if (type === 'scene') {
                  setSceneByEpisode(prev => {
                    const newVal = { ...prev, [episode]: data.items };
                    updatedScenes = newVal;
                    return newVal;
                  });
                } else {
                  setPropsByEpisode(prev => {
                    const newVal = { ...prev, [episode]: data.items };
                    updatedProps = newVal;
                    return newVal;
                  });
                }
                
                // 保存到数据库（使用完整的数据对象）
                // 注意：需要等待state更新完成后再保存
                setTimeout(async () => {
                  try {
                    const savePayload: Record<string, unknown> = {};
                    if (type === 'costume' && updatedCostumes) {
                      savePayload.costumes = updatedCostumes;
                    } else if (type === 'scene' && updatedScenes) {
                      savePayload.extractedScenes = updatedScenes;
                    } else if (type === 'prop' && updatedProps) {
                      savePayload.props = updatedProps;
                    }
                    
                    if (Object.keys(savePayload).length > 0) {
                      await apiFetch(`/api/scripts/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(savePayload),
                      });
                    }
                  } catch {
                    console.error("保存到数据库失败");
                  }
                }, 100);
              } else if (data.type === "error") {
                toast.error(data.error || "提取失败");
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch {
      toast.error("获取详情失败");
    } finally {
      setIsStreaming(false);
      setIsLoadingEpisodeDetail(false);
    }
  };
  
  // 删除单个服装/场景/道具数据
  const handleDeleteItem = async (type: 'costume' | 'scene' | 'prop', episode: number, index: number) => {
    const updateAndSave = async (newData: Record<number, ExtractedItem[]>) => {
      if (type === 'costume') {
        setCostumeByEpisode(newData);
      } else if (type === 'scene') {
        setSceneByEpisode(newData);
      } else {
        setPropsByEpisode(newData);
      }
      
      // 保存到数据库
      const savePayload: Record<string, unknown> = {};
      if (type === 'costume') {
        savePayload.costumes = newData;
      } else if (type === 'scene') {
        savePayload.extractedScenes = newData;
      } else {
        savePayload.props = newData;
      }
      
      await apiFetch(`/api/scripts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayload),
      });
    };
    
    const currentData = type === 'costume' 
      ? costumeByEpisode[episode] 
      : type === 'scene' 
        ? sceneByEpisode[episode] 
        : propsByEpisode[episode];
    
    if (!currentData) return;
    
    const newData = [...currentData];
    newData.splice(index, 1);
    
    const updatedRecord = {
      ...(type === 'costume' ? costumeByEpisode : type === 'scene' ? sceneByEpisode : propsByEpisode),
      [episode]: newData
    };
    
    await updateAndSave(updatedRecord);
    toast.success("已删除");
  };
  
  // 应用到资产库
  const handleApplyToAssetLibrary = async (item: ExtractedItem, type: 'costume' | 'scene' | 'prop') => {
    try {
      // 创建资产记录
      const assetData = {
        name: item.name,
        type: type,
        description: item.description || item.details || '',
        script_id: id,
        metadata: {
          character: item.character,
          style: item.style,
          source: 'script_extraction'
        }
      };
      
      const response = await apiFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      
      if (response.ok) {
        toast.success(`${item.name} 已添加到资产库`);
      } else {
        throw new Error('添加失败');
      }
    } catch (error) {
      console.error('Apply to asset library error:', error);
      toast.error('添加到资产库失败');
    }
  };
  
  // 保存编辑的数据
  const handleSaveEdit = async (type: 'costume' | 'scene' | 'prop', episode: number, index: number, updatedData: ExtractedItem | StreamingItem) => {
    const currentData = type === 'costume' 
      ? costumeByEpisode[episode] 
      : type === 'scene' 
        ? sceneByEpisode[episode] 
        : propsByEpisode[episode];
    
    if (!currentData) return;
    
    const newData = [...currentData];
    newData[index] = updatedData as ExtractedItem;
    
    const updatedRecord = {
      ...(type === 'costume' ? costumeByEpisode : type === 'scene' ? sceneByEpisode : propsByEpisode),
      [episode]: newData
    };
    
    if (type === 'costume') {
      setCostumeByEpisode(updatedRecord);
    } else if (type === 'scene') {
      setSceneByEpisode(updatedRecord);
    } else {
      setPropsByEpisode(updatedRecord);
    }
    
    // 保存到数据库
    const savePayload: Record<string, unknown> = {};
    if (type === 'costume') {
      savePayload.costumes = updatedRecord;
    } else if (type === 'scene') {
      savePayload.extractedScenes = updatedRecord;
    } else {
      savePayload.props = updatedRecord;
    }
    
    await apiFetch(`/api/scripts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savePayload),
    });
    
    setEditingItem(null);
    toast.success("已保存");
  };
  
  // 重新生成单集数据
  const handleRegenerateEpisode = async (type: 'costume' | 'scene' | 'prop', episode: number) => {
    await handleGetEpisodeDetail(type, episode, true);
  };

  // 返回服装/场景/道具的主列表
  // 从服装/场景/道具详情返回到分集卡片界面
  const handleBackToEpisodeList = (type: 'costume' | 'scene' | 'prop') => {
    // 只清除选中的集数详情，保持分集卡片显示
    setSelectedEpisodeDetail({ type: null, episode: null });
    setStreamingItems([]);
    setStreamingText("");
    
    // 确保分集卡片显示
    if (type === 'costume') {
      setShowCostumeEpisodes(true);
    } else if (type === 'scene') {
      setShowSceneEpisodes(true);
    } else {
      setShowPropEpisodes(true);
    }
  };

  const handleOptimizeStoryboardPrompt = async (index: number) => {
    const board = script?.storyboards[index];
    if (!board) return;
    try {
      const res = await apiFetch("/api/ai/execute-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: "storyInput",
          content: `请将以下分镜描述优化为AI绘画提示词（英文，包含风格、光影、构图、细节等关键词）：\n\n${board.description}`,
        }),
      });
      const data = await res.json();
      if (data.success && script) {
        const optimized = String(data.data || "");
        const updated = [...script.storyboards];
        updated[index] = { ...updated[index], description: optimized, shot: updated[index].shot };
        setScript({ ...script, storyboards: updated });
        // 保存到数据库
        try {
          await apiFetch(`/api/scripts/${script.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storyboards: updated }),
          });
          toast.success("提示词已优化并保存");
        } catch {
          console.error("保存优化后的提示词失败");
        }
      }
    } catch {
      toast.error("优化失败");
    }
  };

  const handleGenerateStoryboardImage = async (index: number, ratio: string = "16:9") => {
    const board = script?.storyboards[index];
    if (!board) return;
    setGeneratingImageFor(index);
    try {
      const res = await apiFetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: board.description, ratio, n: 1 }),
      });
      const data = await res.json();
      // 兼容两种响应格式: data.imageUrls 或 data.data.imageUrls
      const imageUrls = data?.imageUrls || data?.data?.imageUrls || [];
      if (imageUrls.length > 0) {
        setStoryboardImages((prev) => ({ ...prev, [index]: imageUrls[0] }));
        // 保存到数据库
        if (script) {
          const updated = [...script.storyboards];
          updated[index] = { ...updated[index], imgUrl: imageUrls[0] };
          setScript({ ...script, storyboards: updated });
          await apiFetch(`/api/scripts/${script.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storyboards: updated }),
          });
        }
      } else {
        toast.error(data.error || data?.data?.error || "生图失败");
      }
    } catch {
      toast.error("生图失败");
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleExportTxt = () => {
    if (!script) return;
    const text = `标题：${script.title}\n类型：${script.type}\n状态：${script.status}\n简介：${script.synopsis}\n\n${script.content}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${script.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导出分镜Excel
  const handleExportStoryboardExcel = async () => {
    if (!script?.storyboards?.length) {
      toast.error("没有分镜数据可导出");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      
      // 准备Excel数据
      const excelData = script.storyboards.map((sb, index) => ({
        "分镜号": sb.num || index + 1,
        "时长": sb.duration || "",
        "画面描述": sb.description || "",
        "角色": sb.character || "",
        "景别": sb.shot || "",
        "运镜": sb.camera || "",
        "音效/对白": sb.audio || "",
      }));

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // 设置列宽
      ws["!cols"] = [
        { wch: 8 },   // 分镜号
        { wch: 10 },  // 时长
        { wch: 40 },  // 画面描述
        { wch: 15 },  // 角色
        { wch: 10 },  // 景别
        { wch: 10 },  // 运镜
        { wch: 30 },  // 音效/对白
      ];

      XLSX.utils.book_append_sheet(wb, ws, "分镜脚本");

      // 导出文件
      XLSX.writeFile(wb, `${script.title}_分镜脚本.xlsx`);
      toast.success("导出成功");
    } catch (error) {
      console.error("导出Excel失败:", error);
      toast.error("导出Excel失败");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await apiFetch(`/api/scripts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/scripts");
      } else {
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("删除失败，请重试");
    }
  };

  const statusColor: Record<string, string> = {
    已完成: "bg-[#22C55E]",
    审核中: "bg-[#F59E0B]",
    草稿: "bg-[#888888]",
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-[1400px] mx-auto p-6 space-y-6">
            {/* 顶部骨架 */}
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-8 w-1/3 bg-[#1A1A1A] rounded animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-[#1A1A1A] rounded animate-pulse" />
                  <div className="h-5 w-24 bg-[#1A1A1A] rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-20 bg-[#1A1A1A] rounded-lg animate-pulse" />
                <div className="h-9 w-20 bg-[#1A1A1A] rounded-lg animate-pulse" />
              </div>
            </div>
            {/* Tab骨架 */}
            <div className="flex gap-6 border-b border-[#333333]/50">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 w-20 bg-[#1A1A1A] rounded-t animate-pulse" />
              ))}
            </div>
            {/* 内容骨架 */}
            <div className="space-y-4">
              <div className="h-4 w-full bg-[#1A1A1A] rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-[#1A1A1A] rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-[#1A1A1A] rounded animate-pulse" />
              <div className="h-32 w-full bg-[#1A1A1A] rounded animate-pulse" />
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  if (!script) {
    return (
      <AppShell>
        <main className="flex-1 min-w-0 flex items-center justify-center flex-col gap-4">
          <div className="text-muted-foreground">剧本不存在或加载失败</div>
          <button
            onClick={() => router.push("/scripts")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            返回剧本库
          </button>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/scripts")}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>剧本库</span>
              <span>/</span>
              <span className="text-foreground font-medium">{script.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  保存
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportTxt} className="gap-1.5">
                  <Download className="w-4 h-4" />
                  导出TXT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                  className="gap-1.5 text-red-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              </>
          </div>
        </div>

        {/* Mobile View Tabs - Only visible on mobile */}
        <div className="md:hidden border-b border-border bg-[#0A0A0A] overflow-x-auto">
          <div className="flex items-center gap-1 px-2 py-2">
            <button
              onClick={() => setActiveView("script")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "script" ? "bg-[#0ABAB5]/20 text-[#0ABAB5]" : "bg-[#1A1A1A] text-[#888888]"}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>剧本</span>
            </button>
            <button
              onClick={() => setActiveView("storyboard")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "storyboard" ? "bg-[#0ABAB5]/20 text-[#0ABAB5]" : "bg-[#1A1A1A] text-[#888888]"}`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>分镜</span>
            </button>
            <button
              onClick={() => setActiveView("roles")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "roles" ? "bg-[#0ABAB5]/20 text-[#0ABAB5]" : "bg-[#1A1A1A] text-[#888888]"}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>角色</span>
            </button>
            <button
              onClick={() => setActiveView("costumes")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "costumes" ? "bg-[#0ABAB5]/20 text-[#0ABAB5]" : "bg-[#1A1A1A] text-[#888888]"}`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>服装</span>
            </button>
            <button
              onClick={() => setActiveView("scenes")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "scenes" ? "bg-[#0ABAB5]/20 text-[#0ABAB5]" : "bg-[#1A1A1A] text-[#888888]"}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>场景</span>
            </button>
            <button
              onClick={() => setActiveView("props")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "props" ? "bg-[#0ABAB5]/20 text-[#0ABAB5]" : "bg-[#1A1A1A] text-[#888888]"}`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>道具</span>
            </button>
            <button
              onClick={() => setActiveView("optimize")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "optimize" ? "bg-[#0ABAB5]/20 text-[#0ABAB5]" : "bg-[#1A1A1A] text-[#888888]"}`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>优化</span>
            </button>
            <button
              onClick={() => setActiveView("redline")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "redline" ? "bg-red-400/20 text-red-400" : "bg-[#1A1A1A] text-[#888888]"}`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>审查</span>
            </button>
            {/* More button */}
            <button
              onClick={() => setShowMobilePanel(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-[#1A1A1A] text-[#888888]"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>更多</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 relative">
          {/* Mobile Overlay */}
          {showMobilePanel && (
            <div 
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowMobilePanel(false)}
            />
          )}
          
          {/* Left Panel - Script Info & Actions */}
          <div className={`w-80 border-r border-border flex flex-col bg-[#0A0A0A] transition-transform duration-300 h-full overflow-hidden
            fixed md:relative inset-y-0 left-0 z-50 md:z-auto
            ${showMobilePanel ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          >
            {/* Mobile close button */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
              <span className="text-sm font-medium text-foreground">剧本信息</span>
              <button
                onClick={() => setShowMobilePanel(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${statusColor[script.status] || "bg-[#888888]"}`}
                />
                <Badge variant="secondary" className="text-xs bg-[#1A1A1A] text-[#888888] border-none">
                  {script.status}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-[#1A1A1A] text-[#888888] border-none">
                  {script.type}
                </Badge>
              </div>
              <input
                className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#0ABAB5]"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="剧本标题"
              />
              {/* 封面图 */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">封面图</span>
                  <div className="flex items-center gap-2">
                    {/* AI生成按钮 */}
                    <button
                      onClick={handleGenerateCover}
                      disabled={isGeneratingCover}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-[#0ABAB5]/20 text-[#0ABAB5] rounded hover:bg-[#0ABAB5]/30 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingCover ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>生成中...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3 h-3" />
                          <span>AI生成</span>
                        </>
                      )}
                    </button>
                    {/* 上传按钮 */}
                    <input
                      type="file"
                      ref={coverInputRef}
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-[#1A1A1A] text-foreground rounded hover:bg-[#222] transition-colors disabled:opacity-50"
                    >
                      {isUploadingCover ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>上传中...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>上传</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {script?.coverImage ? (
                  <div className="relative group">
                    <img
                      src={script.coverImage}
                      alt="封面图"
                      className="w-full h-32 object-cover rounded-lg border border-[#333]"
                    />
                    <button
                      onClick={() => setScript(prev => prev ? { ...prev, coverImage: '' } : prev)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-32 bg-[#1A1A1A] border border-dashed border-[#333] rounded-lg flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">点击上方按钮生成或上传封面</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span>字数: {liveStats.wordCount || 0}</span>
                <span>场景: {liveStats.sceneCount || 0}</span>
                <div className="flex items-center gap-1">
                  <span>集数:</span>
                  <input
                    type="number"
                    min="1"
                    className="w-16 bg-[#1A1A1A] border border-[#333] rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:border-[#0ABAB5] text-center"
                    value={script.episodeCount || 0}
                    onChange={(e) => {
                      const newCount = parseInt(e.target.value) || 0;
                      setScript(prev => prev ? { ...prev, episodeCount: newCount } : prev);
                    }}
                    onBlur={async () => {
                      // 保存到数据库
                      try {
                        await apiFetch(`/api/scripts/${id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ episodeCount: script?.episodeCount || 0 }),
                        });
                        toast.success('集数已保存');
                        // 更新提取面板的集数模块
                        if (script?.episodeCount && script.episodeCount > 0) {
                          const newEpisodes = Array.from({ length: script.episodeCount }, (_, i) => ({
                            episode: i + 1,
                            title: `第${i + 1}集`,
                            synopsis: ''
                          }));
                          setEpisodes(newEpisodes);
                        }
                      } catch {
                        toast.error('保存集数失败');
                      }
                    }}
                  />
                  <span className="text-muted-foreground">集</span>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 space-y-4">
                {/* AI Actions */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    功能视图
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setActiveView("chat"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "chat" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <Sparkles className="w-4 h-4 text-[#0ABAB5]" />
                      <span>AI对话</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("script"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "script" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <FileText className="w-4 h-4 text-[#0ABAB5]" />
                      <span>剧本编辑</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("storyboard"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "storyboard" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <Film className="w-4 h-4 text-[#0ABAB5]" />
                      <span>生成分镜</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("roles"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "roles" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <Users className="w-4 h-4 text-[#0ABAB5]" />
                      <span>提取角色</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("costumes"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "costumes" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <Shirt className="w-4 h-4 text-[#0ABAB5]" />
                      <span>提取服装</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("scenes"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "scenes" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <MapPin className="w-4 h-4 text-[#0ABAB5]" />
                      <span>提取场景</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("props"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "props" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <Package className="w-4 h-4 text-[#0ABAB5]" />
                      <span>提取道具</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("optimize"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "optimize" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <Wand2 className="w-4 h-4 text-[#0ABAB5]" />
                      <span>AI优化</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("redline"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "redline" ? "bg-red-400/20 text-red-400 ring-1 ring-red-400/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      <span>内容审查</span>
                    </button>
                  </div>
                </div>


              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Dynamic Content Container */}
          <div className="flex-1 flex flex-col min-w-0 bg-background overflow-auto">
            {/* AI对话视图 */}
            {activeView === "chat" && (
              <ScriptChatPanel 
                scriptId={id}
                onApplyToScript={async (content) => {
                  setAiGeneratedContent(content);
                  setContentVersion('ai');
                  setActiveView("script");
                  // 自动保存AI生成内容
                  try {
                    await apiFetch(`/api/scripts/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: script?.title,
                        content: content,
                        episodeCount: script?.episodeCount,
                        genre: script?.genre,
                        status: 'draft',
                      }),
                    });
                    toast.success("已应用到AI版本并自动保存");
                  } catch {
                    toast.success("已应用到AI版本，请手动保存");
                  }
                }}
                scriptIdea={scriptIdea}
                setScriptIdea={setScriptIdea}
                targetEpisodes={targetEpisodes}
                setTargetEpisodes={setTargetEpisodes}
                onGenerateFullScript={handleGenerateFullScript}
                isGeneratingScript={isGeneratingScript}
                stageProgress={stageProgress ? { currentStage: stageProgress.stage, isComplete: stageProgress.stage >= 3 } : null}
              />
            )}
            {activeView === "script" && (
              <>
                {/* 简介编辑框 */}
                <div className="mb-4 bg-[#141414] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-ui text-muted-foreground">
                      剧本简介
                    </h3>
                    <button
                      onClick={handleExtractOutline}
                      disabled={isExtractingOutline || !editContent.trim()}
                      className="text-xs text-[#0ABAB5] hover:underline disabled:opacity-50"
                    >
                      {isExtractingOutline ? '提炼中...' : '提炼大纲'}
                    </button>
                  </div>
                  <textarea
                    className="outline-content w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-[#0ABAB5] resize-none"
                    rows={3}
                    value={editSynopsis}
                    onChange={(e) => setEditSynopsis(e.target.value)}
                    placeholder="输入剧本简介，或点击提炼大纲自动分析..."
                  />
                </div>
                <ScriptEditor
                script={script}
                editContent={editContent}
                setEditContent={setEditContent}
                aiGeneratedContent={aiGeneratedContent}
                contentVersion={contentVersion}
                setContentVersion={setContentVersion}
                episodeContentMap={episodeContentMap}
                setEpisodeContentMap={setEpisodeContentMap}
                activeEpisode={activeEpisode}
                setActiveEpisode={setActiveEpisode}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                analyzeProgress={analyzeProgress}
                isGeneratingScript={isGeneratingScript}
                scriptIdea={scriptIdea}
                setScriptIdea={setScriptIdea}
                targetEpisodes={targetEpisodes}
                setTargetEpisodes={setTargetEpisodes}
                generatedOutline={generatedOutline}
                onFileUpload={handleFileUpload}
                onGenerateFullScript={handleGenerateFullScript}
                stageProgress={stageProgress}
              />
              </>
            )}

            {activeView === "storyboard" && (
              <StoryboardView
                storyboards={script?.storyboards || []}
                storyboardImages={storyboardImages}
                storyboardVideos={storyboardVideos}
                scriptId={params.id as string}
                episodes={episodes}
                episodeCount={script?.episodeCount || 0}
                isSplitting={isSplitting}
                isAnalyzingEpisodes={isAnalyzingEpisodes}
                generatingEpisode={generatingEpisode}
                showEpisodeSelector={showEpisodeSelector}
                selectedEpisodes={selectedEpisodes}
                content={editContent}
                onSplitScenes={handleSplitScenes}
                onExportExcel={handleExportStoryboardExcel}
                onImageGenerated={(index, url) => {
                  // 更新storyboardImages状态
                  setStoryboardImages(prev => ({ ...prev, [index]: url }));
                  // 更新script对象中的分镜图
                  setScript(prev => {
                    if (!prev) return prev;
                    const newStoryboards = [...(prev.storyboards || [])];
                    if (newStoryboards[index]) {
                      newStoryboards[index] = { ...newStoryboards[index], imgUrl: url };
                    }
                    return { ...prev, storyboards: newStoryboards };
                  });
                  // 保存到数据库
                  apiFetch(`/api/scripts/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      storyboards: script?.storyboards?.map((sb, i) => 
                        i === index ? { ...sb, imgUrl: url } : sb
                      )
                    }),
                  }).catch(() => {});
                }}
                onVideoGenerated={(index, url) => {
                  // 更新storyboardVideos状态
                  setStoryboardVideos(prev => ({ ...prev, [index]: url }));
                  // 更新script对象中的分镜视频
                  setScript(prev => {
                    if (!prev) return prev;
                    const newStoryboards = [...(prev.storyboards || [])];
                    if (newStoryboards[index]) {
                      newStoryboards[index] = { ...newStoryboards[index], videoUrl: url };
                    }
                    return { ...prev, storyboards: newStoryboards };
                  });
                  // 保存到数据库
                  apiFetch(`/api/scripts/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      storyboards: script?.storyboards?.map((sb, i) => 
                        i === index ? { ...sb, videoUrl: url } : sb
                      )
                    }),
                  }).catch(() => {});
                }}
                onPromptOptimized={(index, optimizedPrompt) => {
                  // 分离描述和镜头信息，避免重复保存
                  let descriptionOnly = optimizedPrompt;
                  let shotInfo = '';
                  
                  // 查找并提取镜头信息
                  const shotMatch = optimizedPrompt.match(/\n?镜头[：:：]\s*(.+?)(?=\n|$)/);
                  if (shotMatch) {
                    shotInfo = shotMatch[1].trim();
                    descriptionOnly = optimizedPrompt.replace(shotMatch[0], '').trim();
                  }
                  
                  // 更新script对象中的分镜提示词
                  setScript(prev => {
                    if (!prev) return prev;
                    const newStoryboards = [...(prev.storyboards || [])];
                    if (newStoryboards[index]) {
                      newStoryboards[index] = { 
                        ...newStoryboards[index], 
                        description: descriptionOnly,
                        ...(shotInfo && { shot: shotInfo }),
                      };
                    }
                    return { ...prev, storyboards: newStoryboards };
                  });
                  // 保存到数据库
                  apiFetch(`/api/scripts/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      storyboards: script?.storyboards?.map((sb, i) => 
                        i === index ? { 
                          ...sb, 
                          description: descriptionOnly,
                          ...(shotInfo && { shot: shotInfo }),
                        } : sb
                      )
                    }),
                  }).catch(() => {});
                }}
                onSetShowEpisodeSelector={setShowEpisodeSelector}
                onToggleEpisodeSelection={toggleEpisodeSelection}
                onToggleSelectAll={toggleSelectAll}
                onGenerateBySelectedEpisodes={handleGenerateBySelectedEpisodes}
                onSetActiveView={(view) => setActiveView(view as ViewType)}
              />
            )}

            {activeView === "roles" && (
              <RolesView
                roles={script.roles || []}
                isExtracting={isExtracting}
                onExtractRoles={handleExtractRoles}
                onApplyToLibrary={handleApplyRolesToLibrary}
              />
            )}

            {activeView === "costumes" && (
              <CostumesView
                selectedEpisodeDetail={selectedEpisodeDetail}
                costumeByEpisode={costumeByEpisode}
                costumeEpisodes={costumeEpisodes}
                showCostumeEpisodes={showCostumeEpisodes}
                isStreaming={isStreaming}
                streamingText={streamingText}
                streamingItems={streamingItems}
                isAnalyzing={isAnalyzing}
                analyzeProgress={analyzeProgress}
                isBatchExtracting={isBatchExtracting}
                batchProgress={batchProgress}
                script={script}
                isExtractingCostumes={isExtractingCostumes}
                onBackToEpisodeList={handleBackToEpisodeList}
                onRegenerateEpisode={handleRegenerateEpisode}
                onCopyPrompt={(text: string) => navigator.clipboard.writeText(text)}
                onEditItem={setEditingItem}
                onDeleteItem={handleDeleteItem}
                onReAnalyzeEpisodes={handleReAnalyzeEpisodes}
                onBatchExtract={handleBatchExtract}
                onGetEpisodeDetail={handleGetEpisodeDetail}
                onExtractCostumes={handleExtractCostumes}
                onApplyToAssetLibrary={(item) => handleApplyToAssetLibrary(item, 'costume')}
              />
            )}

            {activeView === "scenes" && (
              <ScenesView
                selectedEpisodeDetail={selectedEpisodeDetail}
                sceneByEpisode={sceneByEpisode}
                sceneEpisodes={sceneEpisodes}
                showSceneEpisodes={showSceneEpisodes}
                isStreaming={isStreaming}
                streamingText={streamingText}
                streamingItems={streamingItems}
                isAnalyzing={isAnalyzing}
                analyzeProgress={analyzeProgress}
                isBatchExtracting={isBatchExtracting}
                batchProgress={batchProgress}
                script={script}
                isExtractingScenes={isExtractingScenes}
                onBackToEpisodeList={handleBackToEpisodeList}
                onRegenerateEpisode={handleRegenerateEpisode}
                onCopyPrompt={(text: string) => navigator.clipboard.writeText(text)}
                onEditItem={setEditingItem}
                onDeleteItem={handleDeleteItem}
                onReAnalyzeEpisodes={handleReAnalyzeEpisodes}
                onBatchExtract={handleBatchExtract}
                onGetEpisodeDetail={handleGetEpisodeDetail}
                onExtractScenes={handleExtractScenes}
                onApplyToAssetLibrary={(item) => handleApplyToAssetLibrary(item, 'scene')}
              />
            )}

            {activeView === "props" && (
              <PropsView
                selectedEpisodeDetail={selectedEpisodeDetail}
                propsByEpisode={propsByEpisode}
                propEpisodes={propEpisodes}
                showPropEpisodes={showPropEpisodes}
                isStreaming={isStreaming}
                streamingText={streamingText}
                streamingItems={streamingItems}
                isAnalyzing={isAnalyzing}
                analyzeProgress={analyzeProgress}
                isBatchExtracting={isBatchExtracting}
                batchProgress={batchProgress}
                script={script}
                isExtractingProps={isExtractingProps}
                onBackToEpisodeList={handleBackToEpisodeList}
                onRegenerateEpisode={handleRegenerateEpisode}
                onCopyPrompt={(text: string) => navigator.clipboard.writeText(text)}
                onEditItem={setEditingItem}
                onDeleteItem={handleDeleteItem}
                onReAnalyzeEpisodes={handleReAnalyzeEpisodes}
                onBatchExtract={handleBatchExtract}
                onGetEpisodeDetail={handleGetEpisodeDetail}
                onExtractProps={handleExtractProps}
                onApplyToAssetLibrary={(item) => handleApplyToAssetLibrary(item, 'prop')}
              />
            )}

            {activeView === "optimize" && (
              <OptimizeView
                editContent={editContent}
                optimizedStreamText={optimizedStreamText}
                isOptimizingStream={isOptimizingStream}
                optimizingMode={optimizingMode}
                onOptimize={handleStreamOptimize}
                onModeChange={setOptimizingMode}
                onApplyToScript={async (content) => {
                  setAiGeneratedContent(content);
                  setContentVersion('ai');
                  // 自动保存优化后的内容
                  try {
                    await apiFetch(`/api/scripts/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: script?.title,
                        content: content,
                        episodeCount: script?.episodeCount,
                        genre: script?.genre,
                        status: 'draft',
                      }),
                    });
                    toast.success('已生成AI版本并自动保存');
                  } catch {
                    toast.success('已生成AI版本，请手动保存');
                  }
                }}
                onOptimizedTextChange={setOptimizedStreamText}
              />
            )}

            {activeView === "redline" && (
              <RedlineView
                checkResult={checkResult}
                isChecking={isChecking}
                onCheck={handleComplianceCheck}
              />
            )}
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#141414] border border-[#333] rounded-2xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">确认删除</h3>
                  <p className="text-sm text-muted-foreground">
                    删除后无法恢复，是否继续？
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-[#333] hover:bg-[#1A1A1A]"
                  onClick={() => setShowDelete(false)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleDelete}
                >
                  确认删除
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
