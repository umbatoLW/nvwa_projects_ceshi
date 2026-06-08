"use client";
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { cleanAiOutput, safeJsonParse, isScriptJson, formatScriptJsonToText } from '@/lib/content/content-cleaner';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIStream } from "@/hooks/useAIStream";
import { StoryboardCard, ScriptStoryboard } from "@/components/StoryboardCard";
import { ScriptChatPanel } from "@/components/script-chat/ScriptChatPanel";
// P2-8 前端适配组件
import {
  ThreeStageProgress,
  ScoreView,
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
} from "@/components/script-views";
// AI 工具箱
import { AiToolbox } from "@/components/script-layout";
import {
  ArrowLeft,
  Download,
  Trash2,
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
  BarChart3,
  AlertTriangle,
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

type ViewType = "chat" | "create" | "script" | "storyboard" | "roles" | "costumes" | "scenes" | "props" | "optimize" | "score"; 

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
  const getInitialView = (): ViewType => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['script', 'storyboard', 'characters', 'costumes', 'scenes', 'props', 'chat', 'create', 'optimize', 'score'].includes(viewParam)) {
      return viewParam as ViewType;
    }
    return 'script';
  };
  const [activeView, setActiveViewState] = useState<ViewType>(getInitialView);
  
  // 包装 setActiveView，同步更新 URL 参数
  const setActiveView = (view: ViewType) => {
    setActiveViewState(view);
    // 更新 URL 参数，保持视图状态
    const currentView = searchParams.get('view');
    if (currentView !== view) {
      const newUrl = view === 'script' 
        ? `/scripts/${id}` 
        : `/scripts/${id}?view=${view}`;
      router.replace(newUrl, { scroll: false });
    }
  };
  
  // 当视图切换到 chat 或 create 时，记住最后的 AI 创作子视图
  useEffect(() => {
    if (activeView === 'chat' || activeView === 'create') {
      setAiCreateSubView(activeView);
    }
  }, [activeView]);
  
  const [showDelete, setShowDelete] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [editSynopsis, setEditSynopsis] = useState("");
  const [editContent, setEditContent] = useState("");
  const [aiGeneratedContent, setAiGeneratedContent] = useState("");
  const [contentVersion, setContentVersion] = useState<'manual' | 'ai'>('manual');
  
  // 续写状态
  const [generatedEpisodes, setGeneratedEpisodes] = useState(0); // 已生成集数
  const [totalEpisodes, setTotalEpisodes] = useState(0); // 目标集数
  const [episodesPerWrite, setEpisodesPerWrite] = useState(3); // 每次续写集数（建议1-5，最多10）
  const [cachedOutline, setCachedOutline] = useState<unknown>(null); // 缓存大纲
  const [cachedCoreDialogue, setCachedCoreDialogue] = useState<unknown>(null); // 缓存核心对话
  // 创作模式状态（影响每集字数）
  const [creativeMode, setCreativeMode] = useState<'short' | 'medium' | 'long'>('short'); // 默认短剧
  // AI创作模块子视图状态（记住用户最后在 AI对话/创意生成 哪个界面）
  const [aiCreateSubView, setAiCreateSubView] = useState<'chat' | 'create'>('chat');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // 跟踪未保存的更改
  const initialContentRef = useRef<{title: string; synopsis: string; content: string} | null>(null); // 保存初始内容用于比较
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
    // 两套系统独立，统计只基于 editContent
    const currentContent = editContent;
    if (!currentContent) return { wordCount: 0, sceneCount: 0 };
    const wordCount = currentContent.replace(/\s/g, '').length;
    // 增强场景匹配：支持多种格式
    // 1. [场景1]、【场景1】、场景1、场景：xxx、第1场
    // 2. 内景/外景、INT./EXT.
    // 3. 数字-数字格式：1-1、1-2、2-1（集数-场景数，独立一行）
    const sceneMatches = currentContent.match(/(?:\[|【|（)?场景[\s：:]*[\d一二三四五六七八九十]*\s*(?:】|\]|）)?|第[\d一二三四五六七八九十]+场|内景|外景|INT\.?|EXT\.?|^\d+-\d+$/gim);
    // 直接统计所有场景数，不去重（多集可能有相同的场景编号，应分别统计）
    const sceneCount = sceneMatches ? sceneMatches.length : 0;
    return { wordCount, sceneCount };
  }, [editContent]);

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

  // 检测未保存的更改
  useEffect(() => {
    if (!initialContentRef.current) return;
    // 两套系统独立，只检测 editContent 的变化
    const hasChanges = 
      editTitle !== initialContentRef.current.title ||
      editSynopsis !== initialContentRef.current.synopsis ||
      editContent !== initialContentRef.current.content;
    setIsDirty(Boolean(hasChanges));
  }, [editTitle, editSynopsis, editContent]);

  // 页面离开警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '您有未保存的内容，确定要离开吗？';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 浏览器后退拦截
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isDirty) {
        e.preventDefault();
        if (window.confirm('您有未保存的内容，确定要离开吗？')) {
          // 用户确认，允许后退
          window.removeEventListener('popstate', handlePopState);
          router.back();
        } else {
          // 用户取消，推回历史记录保持当前页面
          window.history.pushState(null, '', window.location.href);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, router]);

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
  const [isContinuing, setIsContinuing] = useState(false); // 单独的续写状态
  const [scriptIdea, setScriptIdea] = useState('');
  const [targetEpisodes, setTargetEpisodes] = useState(1);
  const [generatedOutline, setGeneratedOutline] = useState<Record<string, unknown> | null>(null);
  
  // 离开确认对话框状态
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveDialogType, setLeaveDialogType] = useState<'ai' | 'dirty'>('dirty');
  
  // AbortController 用于取消生成请求
  const abortControllerRef = useRef<AbortController | null>(null);
  
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
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`请求失败: ${res.status} ${errorText}`);
      }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptContent: script.content }),
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
          // 恢复 AI 生成的大纲和内容
          if (d.outline) {
            try {
              const parsedOutline = typeof d.outline === 'string' ? JSON.parse(d.outline) : d.outline;
              setGeneratedOutline(parsedOutline);
            } catch {
              // 如果解析失败，尝试作为纯文本使用
              setGeneratedOutline({ rawText: d.outline });
            }
          }
          if (d.aiContent) {
            setAiGeneratedContent(d.aiContent);
          }
          // 初始化原始内容引用，用于检测未保存的更改
          initialContentRef.current = {
            title: d.title,
            synopsis: d.synopsis || "",
            content: d.content || ""
          };
          setIsDirty(false);
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

  // 根据总内容自动分片（优先按集数标记分割）
  const autoSplitContent = useCallback(() => {
    if (!editContent || !script?.episodeCount) return;
    
    const totalEpisodes = script.episodeCount;
    const map: Record<number, string> = {};
    
    // 尝试按集数标记分割（支持多种格式）
    const episodePatterns = [
      // 书名号格式
      /【第\s*(\d+)\s*集】[：:：\s]*(.*)$/gm,     // 【第1集】标题
      /【第\s*(\d+)\s*话】[：:：\s]*(.*)$/gm,     // 【第1话】标题
      /【第\s*(\d+)\s*章】[：:：\s]*(.*)$/gm,     // 【第1章】标题
      // 方括号格式
      /\[第\s*(\d+)\s*集\][：:：\s]*(.*)$/gm,     // [第1集]标题
      /\[EP\s*0*(\d+)\][：:：\s]*(.*)$/gim,       // [EP01]标题
      // 简单格式
      /^第\s*(\d+)\s*集$/gm,                      // 第1集
      /^第\s*(\d+)\s*话$/gm,                      // 第1话
      /^第\s*(\d+)\s*章$/gm,                      // 第1章
      // 带标题格式
      /第\s*(\d+)\s*集[：:：\s]+(.*)$/gm,         // 第1集：标题
      /第\s*(\d+)\s*话[：:：\s]+(.*)$/gm,         // 第1话：标题
      /第\s*(\d+)\s*章[：:：\s]+(.*)$/gm,         // 第1章：标题
      // 英文格式
      /^EPISODE\s*(\d+)[：:：\s]*(.*)$/gim,       // EPISODE 1
      /^Episode\s*(\d+)[：:：\s]*(.*)$/gim,       // Episode 1
      /^EP\s*0*(\d+)[：:：\s]*(.*)$/gim,          // EP01
      /^E\s*(\d+)[：:：\s]*(.*)$/gim,             // E1
      // 数字序号
      /^(\d+)[\.．]\s*(.*)$/gm,                   // 1. 标题
      /^#(\d+)[：:：\s]*(.*)$/gm,                 // #1 标题
    ];
    
    // 首先找到剧本正文起始位置（跳过项目简介、大纲、人物小传等）
    const contentStartPatterns = [
      /【剧本正文】[：:]*\s*/g,
      /【正文】[：:]*\s*/g,
      /剧本正文[：:：]*\s*/g,
      /---\s*正文\s*---\s*/g,
      /===\s*正文\s*===\s*/g,
      /SCRIPT\s*[:：]*\s*/gi,
    ];
    
    let contentStartIndex = 0;
    for (const pattern of contentStartPatterns) {
      const match = pattern.exec(editContent);
      if (match) {
        contentStartIndex = match.index + match[0].length;
        break;
      }
    }
    
    // 跳过正文标记后的空行
    while (contentStartIndex < editContent.length && 
           (editContent[contentStartIndex] === '\n' || editContent[contentStartIndex] === '\r')) {
      contentStartIndex++;
    }
    
    const actualContent = editContent.slice(contentStartIndex);
    
    // 收集所有集数标记
    const episodeMarkers: { episode: number; index: number; title: string }[] = [];
    
    for (const pattern of episodePatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(actualContent)) !== null) {
        const episode = parseInt(match[1], 10);
        // 检查是否已存在该集的标记（避免重复）
        if (!episodeMarkers.some(m => m.episode === episode)) {
          episodeMarkers.push({
            episode,
            index: match.index,
            title: match[2]?.trim() || ''
          });
        }
      }
    }
    
    // 按位置排序
    episodeMarkers.sort((a, b) => a.index - b.index);
    
    console.log('[自动分集] 找到的集数标记:', episodeMarkers.map(m => `第${m.episode}集`));
    
    if (episodeMarkers.length >= 1) {
      // 使用集数标记分割
      for (let i = 0; i < episodeMarkers.length; i++) {
        const current = episodeMarkers[i];
        const next = episodeMarkers[i + 1];
        
        const startIndex = current.index;
        const endIndex = next ? next.index : actualContent.length;
        
        const episodeContent = actualContent.slice(startIndex, endIndex).trim();
        map[current.episode] = episodeContent;
      }
      
      // 如果识别到的集数少于目标集数，用空内容填充剩余集
      for (let i = 1; i <= totalEpisodes; i++) {
        if (!map[i]) {
          map[i] = '';
        }
      }
    } else {
      // 回退：按行数平均分配
      console.log('[自动分集] 未找到集数标记，使用行数平均分配');
      const lines = editContent.split('\n');
      const totalLines = lines.length;
      const linesPerEpisode = Math.ceil(totalLines / totalEpisodes);
      
      for (let i = 0; i < totalEpisodes; i++) {
        const startLine = i * linesPerEpisode;
        const endLine = Math.min((i + 1) * linesPerEpisode, totalLines);
        map[i + 1] = lines.slice(startLine, endLine).join('\n');
      }
    }
    
    setEpisodeContentMap(map);
    console.log('[自动分集] 分割完成，共', Object.keys(map).length, '集');
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
        // 保存成功后重置未保存状态
        initialContentRef.current = {
          title: editTitle,
          synopsis: editSynopsis,
          content: editContent
        };
        setIsDirty(false);
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
        
        // 添加 60 秒超时机制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        try {
          const res = await apiFetch("/api/parse-document", { 
            method: "POST", 
            body: formData,
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "文件解析失败");
          }
          text = data.content;
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
            throw new Error("文档解析超时（60秒），建议将内容复制到 txt 文件后上传");
          }
          throw fetchErr;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "文件读取失败");
      e.target.value = "";
      setIsUploading(false);
      setUploadProgress('');
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
      // 增强场景匹配：支持多种格式，包括数字-数字格式（1-1、1-2等）
      const sceneMatches = text.match(/(?:\[|【|（)?场景[\s：:]*[\d一二三四五六七八九十]*\s*(?:】|\]|）)?|第[\d一二三四五六七八九十]+场|内景|外景|INT\.?|EXT\.?|^\d+-\d+$/gim);
      // 直接统计所有场景数，不去重
      const sceneCount = sceneMatches ? sceneMatches.length : 0;
      const sceneRecognized = sceneMatches && sceneMatches.length > 0;
      
      // 分析集数
      let episodeCount = 0;
      let episodeData: EpisodeInfo[] = [];
      let episodeRecognized = false;
      
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
          
          // 如果不是正则识别且集数>1，显示警告提示（可能不是真正的剧本分集）
          if (analyzeData.method !== 'regex' && episodeCount > 1) {
            setTimeout(() => {
              toast.warning(
                `未检测到有效的集数标记，已自动分为 ${episodeCount} 集。\n\n如需精确分集，请在剧本中添加集数标记：\n• 【第1集】或第1集\n• Episode 1 或 EP01`,
                { duration: 6000 }
              );
            }, 500);
          }
          episodeRecognized = true;
        } else {
          throw new Error('分析结果为空');
        }
      } catch {
        // 识别失败
        episodeRecognized = false;
        episodeCount = 1; // 设置为1集，整个内容显示在编辑框
      }
      
      // 综合提示识别结果
      const issues: string[] = [];
      if (!episodeRecognized) {
        issues.push('剧集分隔标记');
      }
      if (!sceneRecognized) {
        issues.push('场景标记');
      }
      
      if (issues.length > 0) {
        // 有识别失败的情况，弹窗提示
        const issueText = issues.join('、');
        const tips: string[] = [];
        
        if (!episodeRecognized) {
          tips.push('剧集格式建议：\n  • 每集以"第X集"开头\n  • 或使用【第X集】格式\n  • 或使用 EP01、Episode 1');
        }
        if (!sceneRecognized) {
          tips.push('场景格式建议：\n  • [场景1] 或 【场景1】\n  • 1-1、1-2（集数-场景数）\n  • 内景/外景 或 INT./EXT.');
        }
        
        toast.warning(
          `未能识别到${issueText}，已将全部内容显示在编辑框。\n\n${tips.join('\n\n')}`,
          { duration: 8000 }
        );
      }
      
      // 先填充 episodeContentMap，再更新 episodeCount，避免 UI 显示空白
      // 如果识别成功且有多集，立即分片
      if (episodeRecognized && episodeCount > 1) {
        // 同步执行分片逻辑，不使用 setTimeout
        const map: Record<number, string> = {};
        const lines = text.split('\n');
        const totalLines = lines.length;
        const linesPerEpisode = Math.ceil(totalLines / episodeCount);
        
        for (let i = 0; i < episodeCount; i++) {
          const startLine = i * linesPerEpisode;
          const endLine = Math.min((i + 1) * linesPerEpisode, totalLines);
          map[i + 1] = lines.slice(startLine, endLine).join('\n');
        }
        setEpisodeContentMap(map);
        console.log('[上传分片] 立即分片完成，共', Object.keys(map).length, '集');
      } else {
        // 单集情况，清空分片 map
        setEpisodeContentMap({});
      }
      
      // 然后再更新 script 状态（触发 UI 更新）
      setScript((prev) =>
        prev
          ? { ...prev, content: text, wordCount: wordCount, sceneCount: sceneCount || 1, episodeCount: episodeCount }
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
      
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('剧本保存失败');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      e.target.value = "";
    }
  };

  // 根据创作模式计算每集字数
  // 短剧：60-90秒/集 ≈ 400字
  // 中剧：2-3分钟/集 ≈ 1000字
  // 长剧：5-8分钟/集 ≈ 2000字
  const getTargetWordsByMode = (mode: 'short' | 'medium' | 'long'): number => {
    switch (mode) {
      case 'short': return 400;   // 短剧：60-90秒/集
      case 'medium': return 1000; // 中剧：2-3分钟/集
      case 'long': return 2000;   // 长剧：5-8分钟/集
      default: return 400;
    }
  };

  // 取消生成
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGeneratingScript(false);
      setStageProgress(null);
      toast.info('已取消生成');
    }
  };

  // 从创意生成完整剧本
  const handleGenerateFullScript = async (model?: string) => {
    if (!scriptIdea.trim()) {
      toast.error('请输入剧本创意或大纲');
      return;
    }

    setIsGeneratingScript(true);
    setGeneratedOutline(null);
    setAiGeneratedContent('');
    // 不自动设置 contentVersion 为 'ai'
    // 用户需要手动点击"应用到剧本"才会跳转到剧本编辑界面并填充内容

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController();

    // 根据创作模式计算字数
    const targetWords = getTargetWordsByMode(creativeMode);

    try {
      const res = await fetch('/api/ai/generate-full-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: scriptIdea,
          targetEpisodes: targetEpisodes,
          targetWords: targetWords,
          creativeMode: creativeMode,
          genre: script?.genre,
          style: '甜宠',
          model: model || 'deepseek-v4-pro', // 使用用户选择的模型，默认 deepseek-v4-pro
        }),
        signal: abortControllerRef.current.signal, // 添加取消信号
      });

      // 检查响应状态
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[生成错误] 响应失败', { 
          status: res.status, 
          statusText: res.statusText,
          errorText: errorText.slice(0, 500) 
        });
        throw new Error(`请求失败: ${res.status} ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let fullScript = '';
      let buffer = ''; // SSE 缓冲区，处理跨 chunk 的 JSON 截断

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        buffer += text;
        const lines = buffer.split('\n');
        // 保留最后一个不完整的行（可能被截断）
        buffer = lines.pop() || '';

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
              } else if (data.type === 'stage_complete') {
                // 【新增】阶段完成事件：处理大纲完成
                if (data.stage === 2 && data.data) {
                  // 第二阶段（完整大纲）完成，立即显示在大纲编辑框
                  console.log('[生成] 大纲阶段完成', { 
                    hasOutline: !!data.data,
                    title: data.data?.title,
                    genre: data.data?.genre,
                    logline: data.data?.logline?.substring?.(0, 50),
                    episodeCount: data.data?.episodes?.length,
                    mainCharacterCount: data.data?.mainCharacters?.length,
                    villainCount: data.data?.villains?.length,
                    // 打印所有键名，确认数据完整性
                    keys: Object.keys(data.data),
                  });
                  setGeneratedOutline(data.data);
                  setCachedOutline(data.data);
                  // 同时设置进度，让用户知道大纲已完成
                  setStageProgress({
                    stage: 2,
                    name: '完整大纲',
                    output: '大纲生成完成，准备撰写剧集...',
                  });
                } else if (data.stage === 1 && data.data) {
                  // 第一阶段（核心对话）完成，缓存核心对话
                  setCachedCoreDialogue(data.data);
                }
              } else if (data.type === 'validation_warning') {
                // 【新增】大纲一致性检查警告
                console.log('[大纲一致性检查]', data.message, data.issues);
                // 显示提示给用户
                setStageProgress({
                  stage: data.stage || 2,
                  name: '大纲验证',
                  output: data.message || '大纲一致性检查完成',
                  detail: data.issues?.map((issue: { description: string }) => issue.description).join('\n'),
                });
              } else if (data.type === 'progress') {
                // 更新进度状态（包括集数进度）
                if (data.episode) {
                  // 正在撰写第N集
                  setStageProgress({
                    stage: 3,
                    name: '逐集撰写',
                    output: `正在撰写第${data.episode}集...`,
                    detail: data.message,
                  });
                } else if (data.stage === 'outline') {
                  // 大纲生成中
                  setStageProgress({
                    stage: 2,
                    name: '完整大纲',
                    output: data.message || '正在生成完整大纲...',
                  });
                } else if (data.stage === 'dialogue') {
                  // 核心对话生成中
                  setStageProgress({
                    stage: 1,
                    name: '核心对话',
                    output: data.message || '正在生成核心对话...',
                  });
                }
                
                // 流式输出：累积内容并实时显示
                if (data.content) {
                  fullScript += data.content;  // 累积到 fullScript
                  const cleanedPartial = cleanAiOutput(fullScript);
                  if (cleanedPartial && cleanedPartial.length > 0) {
                    setAiGeneratedContent(cleanedPartial);
                  } else {
                    setAiGeneratedContent(fullScript);
                  }
                }
              } else if (data.type === 'episode_complete' && data.script) {
                // episode_complete：格式化显示，不再重复累积（progress 已累积）
                const cleanedPartial = cleanAiOutput(fullScript);
                setAiGeneratedContent(cleanedPartial || fullScript);
                console.log('[生成] 单集完成', { episode: data.episode, contentLength: fullScript.length });
              } else if (data.type === 'complete') {
                // complete 阶段拿到完整数据，一次性清洗和解析
                const rawScript = data.data?.script || fullScript;
                const cleaned = cleanAiOutput(rawScript);
                
                // 【重要】先缓存大纲和核心对话，确保续写功能可用
                if (data.data?.outline) {
                  setCachedOutline(data.data.outline);
                }
                if (data.data?.coreDialogue) {
                  setCachedCoreDialogue(data.data.coreDialogue);
                }
                // 同时更新 generatedOutline（用于显示）
                if (data.data?.outline) {
                  setGeneratedOutline(data.data.outline as Record<string, unknown>);
                }
                
                // 尝试解析 JSON
                const parsed = safeJsonParse(cleaned);
                
                if (parsed && isScriptJson(parsed)) {
                  // 是结构化 JSON → 格式化文本
                  const formattedText = formatScriptJsonToText(parsed as Record<string, unknown>);
                  // 只设置 aiGeneratedContent，不自动填充到 editContent
                  // 用户需要手动点击"应用到剧本"才会跳转并填充
                  setAiGeneratedContent(formattedText);
                } else {
                  // 纯文本 → 只设置 aiGeneratedContent
                  setAiGeneratedContent(cleaned);
                }
                
                // 【修复】移除 data.data?.script 条件，只要有数据就更新
                const newGeneratedEpisodes = data.data?.generatedEpisodes || 0;
                const newTotalEpisodes = data.data?.totalEpisodes || targetEpisodes;
                const newTitle = data.data?.title;
                    
                    const scriptText = parsed && isScriptJson(parsed) 
                      ? formatScriptJsonToText(parsed as Record<string, unknown>)
                      : cleaned;
                    const wordCount = scriptText.replace(/\s/g, '').length;
                    
                    // ✅ 支持带方括号、书名号等括号的场景标记，以及数字-数字格式
                    const sceneMatches = scriptText.match(/(?:\[|【|（)?场景[\s：:]*[\d一二三四五六七八九十]*\s*(?:】|\]|）)?|第[\d一二三四五六七八九十]+场|内景|外景|INT\.?|EXT\.?|^\d+-\d+$/gim);
                    // 直接统计所有场景数，不去重
                    const sceneCount = sceneMatches ? sceneMatches.length : 0;
                    
                    setGeneratedEpisodes(newGeneratedEpisodes);
                    setTotalEpisodes(newTotalEpisodes);
                    setCachedOutline(data.data.outline);
                    setCachedCoreDialogue(data.data.coreDialogue);
                    
                    setScript((prev) => prev ? {
                      ...prev,
                      episodeCount: newGeneratedEpisodes,
                      wordCount: wordCount,
                      sceneCount: sceneCount,
                      title: newTitle || prev.title,
                    } : prev);
                    
                    // 【自动持久化】生成完成后自动保存大纲和剧本输出到数据库
                    // 避免用户切换页面时数据丢失
                    const outlineToSave = data.data?.outline || generatedOutline;
                    const contentToSave = parsed && isScriptJson(parsed) 
                      ? formatScriptJsonToText(parsed as Record<string, unknown>)
                      : cleaned;
                    
                    // 静默保存，不显示成功提示（避免干扰用户）
                    try {
                      await apiFetch(`/api/scripts/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: newTitle || script?.title || editTitle,
                          synopsis: editSynopsis || script?.synopsis || "",
                          content: editContent || script?.content || "",
                          outline: outlineToSave,
                          aiContent: contentToSave,
                        }),
                      });
                      console.log("[自动保存] 剧本大纲和输出已持久化");
                    } catch (saveError) {
                      console.error("[自动保存失败]", saveError);
                      // 不显示错误提示，避免干扰用户
                    }
                setStageProgress({ stage: 3, name: '完成', output: '剧本生成完成' });
                toast.success('剧本生成完成，点击"应用到剧本"继续');
              } else if (data.type === 'error') {
                toast.error(data.message);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
        
        // 【修复】处理 buffer 中剩余的最后一行数据
        // 当流结束时，buffer 可能还包含最后一条完整的 SSE 消息
        if (buffer.trim().startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.trim().slice(6));
            if (data.type === 'complete') {
              // 处理 complete 事件
              const rawScript = data.data?.script || fullScript;
              const cleaned = cleanAiOutput(rawScript);
              
              if (data.data?.outline) {
                setCachedOutline(data.data.outline);
                setGeneratedOutline(data.data.outline as Record<string, unknown>);
              }
              if (data.data?.coreDialogue) {
                setCachedCoreDialogue(data.data.coreDialogue);
              }
              
              const parsed = safeJsonParse(cleaned);
              
              if (parsed && isScriptJson(parsed)) {
                const formattedText = formatScriptJsonToText(parsed as Record<string, unknown>);
                setAiGeneratedContent(formattedText);
              } else {
                setAiGeneratedContent(cleaned);
              }
              
              const newGeneratedEpisodes = data.data?.generatedEpisodes || 0;
              const newTotalEpisodes = data.data?.totalEpisodes || targetEpisodes;
              const newTitle = data.data?.title;
              
              const scriptText = parsed && isScriptJson(parsed) 
                ? formatScriptJsonToText(parsed as Record<string, unknown>)
                : cleaned;
              const wordCount = scriptText.replace(/\s/g, '').length;
              
              const sceneMatches = scriptText.match(/(?:\[|【|（)?场景[\s：:]*[\d一二三四五六七八九十]*\s*(?:】|\]|）)?|第[\d一二三四五六七八九十]+场|内景|外景|INT\.?|EXT\.?|^\d+-\d+$/gim);
              const sceneCount = sceneMatches ? sceneMatches.length : 0;
              
              setGeneratedEpisodes(newGeneratedEpisodes);
              setTotalEpisodes(newTotalEpisodes);
              setCachedOutline(data.data.outline);
              setCachedCoreDialogue(data.data.coreDialogue);
              
              setScript((prev) => prev ? {
                ...prev,
                episodeCount: newGeneratedEpisodes,
                wordCount: wordCount,
                sceneCount: sceneCount,
                title: newTitle || prev.title,
              } : prev);
              
              // 自动持久化
              const outlineToSave = data.data?.outline || generatedOutline;
              const contentToSave = parsed && isScriptJson(parsed) 
                ? formatScriptJsonToText(parsed as Record<string, unknown>)
                : cleaned;
              
              try {
                await apiFetch(`/api/scripts/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: newTitle || script?.title || editTitle,
                    synopsis: editSynopsis || script?.synopsis || "",
                    content: editContent || script?.content || "",
                    outline: outlineToSave,
                    aiContent: contentToSave,
                  }),
                });
              } catch {
                // 静默保存失败
              }
              
              setStageProgress({ stage: 3, name: '完成', output: '剧本生成完成' });
              toast.success('剧本生成完成，点击"应用到剧本"继续');
            }
          } catch {
            // buffer 数据解析失败，忽略
          }
        }
      }
    } catch (error) {
      // 检查是否是用户取消的请求
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('生成已取消');
        toast.info('生成已取消');
      } else {
        console.error('生成失败:', error);
        toast.error('剧本生成失败');
      }
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

  // 续写剧本
  const handleContinueWriting = async (episodesToWrite: number = 3, model?: string) => {
    // 【修复】续写时计算实际要生成的集数
    // 允许用户续写超过原定目标集数
    const newTotalEpisodes = Math.max(totalEpisodes, generatedEpisodes + episodesToWrite);
    const actualEpisodesToWrite = Math.min(episodesToWrite, 10);
    
    // 更新总目标集数
    if (newTotalEpisodes > totalEpisodes) {
      console.log('[续写] 更新目标总集数', { from: totalEpisodes, to: newTotalEpisodes });
      setTotalEpisodes(newTotalEpisodes);
    }
    
    // 【修复】获取大纲，优先使用 cachedOutline，其次 generatedOutline
    const rawOutline = cachedOutline || generatedOutline;
    
    // 【修复】确保大纲是有效字符串
    let outlineToUse: string;
    if (typeof rawOutline === 'string' && rawOutline.trim().length > 0) {
      outlineToUse = rawOutline;
    } else if (rawOutline && typeof rawOutline === 'object') {
      // 可能是结构化大纲，转为 JSON 字符串
      outlineToUse = JSON.stringify(rawOutline);
      console.log('[续写] 大纲从对象转为字符串', { length: outlineToUse.length });
    } else {
      console.error('[续写错误] 没有可用的大纲', { 
        cachedOutline, 
        generatedOutline,
        cachedOutlineType: typeof cachedOutline,
        generatedOutlineType: typeof generatedOutline,
      });
      toast.error('没有可用的大纲，请先点击"生成完整剧本"');
      return;
    }
    
    // 【修复】允许续写更多集，即使已达到原定目标
    // 用户可以随时续写，不受原 totalEpisodes 限制

    setIsContinuing(true);
    toast.info(`开始续写 ${actualEpisodesToWrite} 集...`);
    
    // 【日志】记录续写请求参数
    console.log('[续写开始]', {
      actualEpisodesToWrite,
      generatedEpisodes,
      totalEpisodes,
      hasOutline: true,
      hasCoreDialogue: !!cachedCoreDialogue,
      outlineLength: outlineToUse.length,
      outlinePreview: outlineToUse.slice(0, 100),
    });
    
    try {
      // 【修复】先从实际内容中计算已有集数，作为备用验证
      const actualEpisodeCount = (() => {
        // 匹配分隔线格式：════...【第N集】...
        const separatorMatches = aiGeneratedContent.match(/══════════════════════════════\n【第\d+集】/g);
        if (separatorMatches && separatorMatches.length > 0) {
          return separatorMatches.length;
        }
        // 备用：匹配【第N集】格式
        const simpleMatches = aiGeneratedContent.match(/【第\d+集】/g);
        if (simpleMatches && simpleMatches.length > 0) {
          return simpleMatches.length;
        }
        return generatedEpisodes; // 使用状态值
      })();
      
      // 【日志】对比状态值和实际值
      console.log('[续写] 集数校验', {
        stateGeneratedEpisodes: generatedEpisodes,
        actualEpisodeCount,
        willUse: actualEpisodeCount,
        mismatch: generatedEpisodes !== actualEpisodeCount,
      });
      
      // 解析已有剧本，获取已有集数内容
      // 使用更精确的正则匹配每个集的内容（包括分隔线）
      const episodeRegex = /══════════════════════════════\n【第(\d+)集】[^\n]*\n══════════════════════════════[\s\S]*?(?=══════════════════════════════\n【第\d+集】|$)/g;
      const existingScriptArray: string[] = [];
      let match;
      while ((match = episodeRegex.exec(aiGeneratedContent)) !== null) {
        existingScriptArray.push(match[0]);
      }
      
      // 如果没有匹配到带分隔线的格式，尝试匹配简单的【第X集】格式
      if (existingScriptArray.length === 0) {
        const simpleRegex = /【第\d+集】[^\n]*[\s\S]*?(?=【第\d+集】|$)/g;
        while ((match = simpleRegex.exec(aiGeneratedContent)) !== null) {
          existingScriptArray.push(match[0].trim());
        }
      }
      
      console.log('[续写] 解析已有剧本', { 
        existingCount: existingScriptArray.length,
        firstEpisode: existingScriptArray[0]?.slice(0, 50),
      });

      const requestBody = {
        outline: outlineToUse,
        coreDialogue: cachedCoreDialogue,
        targetEpisodes: newTotalEpisodes, // 使用更新后的总目标集数
        targetWords: getTargetWordsByMode(creativeMode),
        creativeMode: creativeMode,
        // 【修复】使用实际计算的集数，而不是状态值（状态值可能不准确）
        startFromEpisode: actualEpisodeCount + 1,
        existingScript: existingScriptArray,
        episodesToWrite: actualEpisodesToWrite,
        model: model || 'qwen-plus', // 使用用户选择的模型，默认 qwen-plus
      };
      
      console.log('[续写请求体]', {
        outlineLength: outlineToUse.length,
        hasCoreDialogue: !!requestBody.coreDialogue,
        targetEpisodes: requestBody.targetEpisodes,
        startFromEpisode: requestBody.startFromEpisode,
        episodesToWrite: requestBody.episodesToWrite,
        existingScriptLength: requestBody.existingScript?.length,
      });

      const res = await fetch('/api/ai/generate-full-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // 【错误日志】检查响应状态
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[续写错误] 响应失败', { 
          status: res.status, 
          statusText: res.statusText,
          errorText: errorText.slice(0, 500) 
        });
        throw new Error(`请求失败: ${res.status} ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        console.error('[续写错误] 无法获取 reader');
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      let newScript = aiGeneratedContent;
      let buffer = ''; // SSE 缓冲区，处理跨 chunk 的 JSON 截断

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        buffer += text;
        const lines = buffer.split('\n');
        // 保留最后一个不完整的行（可能被截断）
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress' && data.content) {
                // 流式输出：累积内容并实时显示
                newScript += data.content;  // 累积到 newScript
                const cleanedPartial = cleanAiOutput(newScript);
                setAiGeneratedContent(cleanedPartial || newScript);
              }
              
              if (data.type === 'episode_complete' && data.script) {
                // episode_complete：格式化显示，不再重复累积（progress 已累积）
                const cleanedPartial = cleanAiOutput(newScript);
                setAiGeneratedContent(cleanedPartial || newScript);
                console.log('[续写] 单集完成', { episode: data.episode, contentLength: newScript.length });
              }

              if (data.type === 'complete') {
                // 【重要】使用后端返回的完整 script，而不是前端累积的
                const finalScript = data.data?.script || newScript;
                const cleaned = cleanAiOutput(finalScript);
                setAiGeneratedContent(cleaned);
                
                const newGeneratedEpisodes = data.data?.generatedEpisodes || generatedEpisodes;
                const newTotalEpisodes = data.data?.totalEpisodes || totalEpisodes;
                setGeneratedEpisodes(newGeneratedEpisodes);
                // 【修复】确保 totalEpisodes 跟上实际进度
                if (newTotalEpisodes > totalEpisodes || newGeneratedEpisodes > totalEpisodes) {
                  setTotalEpisodes(Math.max(newTotalEpisodes, newGeneratedEpisodes));
                }
                
                // 计算字数和场景数（使用清洗后的内容）
                const wordCount = cleaned.replace(/\s/g, '').length;
                // 增强场景匹配：支持多种格式，包括数字-数字格式（1-1、1-2等）
                const sceneMatches = cleaned.match(/(?:\[|【|（)?场景[\s：:]*[\d一二三四五六七八九十]*\s*(?:】|\]|）)?|第[\d一二三四五六七八九十]+场|内景|外景|INT\.?|EXT\.?|^\d+-\d+$/gim);
                // 直接统计所有场景数，不去重
                const sceneCount = sceneMatches ? sceneMatches.length : 0;
                
                // 更新 script 状态
                setScript(prev => prev ? {
                  ...prev,
                  wordCount: wordCount,
                  sceneCount: sceneCount,
                  episodeCount: newGeneratedEpisodes,
                } : prev);
                
                // 自动保存
                try {
                  await apiFetch(`/api/scripts/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: script?.title,
                      content: cleaned, // 使用清洗后的内容
                      episodeCount: newGeneratedEpisodes,
                      wordCount: wordCount,
                      sceneCount: sceneCount,
                      genre: script?.genre,
                      status: 'draft',
                    }),
                  });
                  console.log('[续写完成]', { newGeneratedEpisodes, totalEpisodes: Math.max(totalEpisodes, newGeneratedEpisodes), wordCount });
                  toast.success(`续写完成，已生成 ${newGeneratedEpisodes}/${Math.max(totalEpisodes, newGeneratedEpisodes)} 集`);
                } catch (saveError) {
                  console.error('[续写错误] 保存失败:', saveError);
                  toast.error('保存失败，请手动保存');
                }
              }
            } catch (parseError) {
              // 【错误日志】记录 JSON 解析错误
              console.error('[续写错误] SSE 数据解析失败', { 
                line: line.slice(0, 100),
                error: parseError 
              });
            }
          }
        }
      }
      
      // 【日志】SSE 流结束
      console.log('[续写结束] SSE 流已完成');
    } catch (error) {
      console.error('[续写错误] 请求或处理失败:', error);
      toast.error(error instanceof Error ? error.message : '续写失败');
    } finally {
      setIsContinuing(false);
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
                // 实时清洗流式输出中的JSON代码
                const cleanedContent = cleanAiOutput(data.content);
                setStreamingText(prev => prev + cleanedContent);
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
    已完成: "bg-nvwa-success",
    审核中: "bg-nvwa-warning",
    草稿: "bg-nvwa-text-secondary",
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-[1400px] mx-auto p-6 space-y-6">
            {/* 顶部骨架 */}
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-8 w-1/3 bg-nvwa-surface rounded animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-nvwa-surface rounded animate-pulse" />
                  <div className="h-5 w-24 bg-nvwa-surface rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-20 bg-nvwa-surface rounded-lg animate-pulse" />
                <div className="h-9 w-20 bg-nvwa-surface rounded-lg animate-pulse" />
              </div>
            </div>
            {/* Tab骨架 */}
            <div className="flex gap-6 border-b border-nvwa-border/50">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 w-20 bg-nvwa-surface rounded-t animate-pulse" />
              ))}
            </div>
            {/* 内容骨架 */}
            <div className="space-y-4">
              <div className="h-4 w-full bg-nvwa-surface rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-nvwa-surface rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-nvwa-surface rounded animate-pulse" />
              <div className="h-32 w-full bg-nvwa-surface rounded animate-pulse" />
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
              onClick={() => {
                // 检测是否有 AI 生成的内容（大纲或剧本）
                const hasAIContent = aiGeneratedContent || generatedOutline;
                
                if (hasAIContent || isDirty) {
                  setShowLeaveDialog(true);
                } else {
                  router.push("/scripts");
                }
              }}
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
                <Button size="sm" onClick={handleSave} disabled={isSaving} className={`gap-1.5 ${isDirty ? 'ring-2 ring-yellow-500/50' : ''}`}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  保存{isDirty ? '*' : ''}
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
        <div className="md:hidden border-b border-border bg-nvwa-bg overflow-x-auto">
          <div className="flex items-center gap-1 px-2 py-2">
            <button
              onClick={() => setActiveView("script")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "script" ? "bg-nvwa-primary/20 text-nvwa-primary" : "bg-nvwa-surface text-nvwa-text-secondary"}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>剧本</span>
            </button>
            <button
              onClick={() => setActiveView("storyboard")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "storyboard" ? "bg-nvwa-primary/20 text-nvwa-primary" : "bg-nvwa-surface text-nvwa-text-secondary"}`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>分镜</span>
            </button>
            <button
              onClick={() => setActiveView("roles")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "roles" ? "bg-nvwa-primary/20 text-nvwa-primary" : "bg-nvwa-surface text-nvwa-text-secondary"}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>角色</span>
            </button>
            <button
              onClick={() => setActiveView("costumes")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "costumes" ? "bg-nvwa-primary/20 text-nvwa-primary" : "bg-nvwa-surface text-nvwa-text-secondary"}`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>服装</span>
            </button>
            <button
              onClick={() => setActiveView("scenes")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "scenes" ? "bg-nvwa-primary/20 text-nvwa-primary" : "bg-nvwa-surface text-nvwa-text-secondary"}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>场景</span>
            </button>
            <button
              onClick={() => setActiveView("props")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "props" ? "bg-nvwa-primary/20 text-nvwa-primary" : "bg-nvwa-surface text-nvwa-text-secondary"}`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>道具</span>
            </button>
            <button
              onClick={() => setActiveView("optimize")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "optimize" ? "bg-nvwa-primary/20 text-nvwa-primary" : "bg-nvwa-surface text-nvwa-text-secondary"}`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>优化</span>
            </button>
            <button
              onClick={() => setActiveView("score")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${activeView === "score" ? "bg-nvwa-primary/20 text-nvwa-primary" : "bg-nvwa-surface text-nvwa-text-secondary"}`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>评分</span>
            </button>
            {/* More button */}
            <button
              onClick={() => setShowMobilePanel(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-nvwa-surface text-nvwa-text-secondary"
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
          <div className={`w-80 border-r border-border flex flex-col bg-nvwa-bg transition-transform duration-300 h-full overflow-hidden
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
                  className={`inline-block w-2 h-2 rounded-full ${statusColor[script.status] || "bg-nvwa-text-secondary"}`}
                />
                <Badge variant="secondary" className="text-xs bg-nvwa-surface text-nvwa-text-secondary border-none">
                  {script.status}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-nvwa-surface text-nvwa-text-secondary border-none">
                  {script.type}
                </Badge>
              </div>
              <input
                className="w-full bg-nvwa-surface border border-[#333] rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-nvwa-primary"
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
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-nvwa-primary/20 text-nvwa-primary rounded hover:bg-nvwa-primary/30 transition-colors disabled:opacity-50"
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
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-nvwa-surface text-foreground rounded hover:bg-[#222] transition-colors disabled:opacity-50"
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
                  <div className="w-full h-32 bg-nvwa-surface border border-dashed border-[#333] rounded-lg flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">点击上方按钮生成或上传封面</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span>字数: {liveStats.wordCount || 0}</span>
                <span>场景: {liveStats.sceneCount || 0}</span>
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
                      onClick={() => { setActiveView(aiCreateSubView); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${(activeView === "chat" || activeView === "create") ? "bg-nvwa-primary/20 text-nvwa-primary ring-1 ring-nvwa-primary/30" : "bg-nvwa-surface hover:bg-[#222] text-foreground"}`}
                    >
                      <Sparkles className="w-4 h-4 text-nvwa-primary" />
                      <span>AI创作</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("script"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "script" ? "bg-nvwa-primary/20 text-nvwa-primary ring-1 ring-nvwa-primary/30" : "bg-nvwa-surface hover:bg-[#222] text-foreground"}`}
                    >
                      <FileText className="w-4 h-4 text-nvwa-primary" />
                      <span>剧本编辑</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("storyboard"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "storyboard" ? "bg-nvwa-primary/20 text-nvwa-primary ring-1 ring-nvwa-primary/30" : "bg-nvwa-surface hover:bg-[#222] text-foreground"}`}
                    >
                      <Film className="w-4 h-4 text-nvwa-primary" />
                      <span>生成分镜</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("roles"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "roles" ? "bg-nvwa-primary/20 text-nvwa-primary ring-1 ring-nvwa-primary/30" : "bg-nvwa-surface hover:bg-[#222] text-foreground"}`}
                    >
                      <Users className="w-4 h-4 text-nvwa-primary" />
                      <span>提取角色</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("costumes"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "costumes" ? "bg-nvwa-primary/20 text-nvwa-primary ring-1 ring-nvwa-primary/30" : "bg-nvwa-surface hover:bg-[#222] text-foreground"}`}
                    >
                      <Shirt className="w-4 h-4 text-nvwa-primary" />
                      <span>提取服装</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("scenes"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "scenes" ? "bg-nvwa-primary/20 text-nvwa-primary ring-1 ring-nvwa-primary/30" : "bg-nvwa-surface hover:bg-[#222] text-foreground"}`}
                    >
                      <MapPin className="w-4 h-4 text-nvwa-primary" />
                      <span>提取场景</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("props"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "props" ? "bg-nvwa-primary/20 text-nvwa-primary ring-1 ring-nvwa-primary/30" : "bg-nvwa-surface hover:bg-[#222] text-foreground"}`}
                    >
                      <Package className="w-4 h-4 text-nvwa-primary" />
                      <span>提取道具</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("optimize"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "optimize" ? "bg-nvwa-primary/20 text-nvwa-primary ring-1 ring-nvwa-primary/30" : "bg-nvwa-surface hover:bg-[#222] text-foreground"}`}
                    >
                      <Wand2 className="w-4 h-4 text-nvwa-primary" />
                      <span>AI优化</span>
                    </button>
                    <button
                      onClick={() => { setActiveView("score"); setShowMobilePanel(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "score" ? "bg-nvwa-primary/20 text-nvwa-primary ring-1 ring-nvwa-primary/30" : "bg-nvwa-surface hover:bg-[#222] text-foreground"}`}
                    >
                      <BarChart3 className="w-4 h-4 text-nvwa-primary" />
                      <span>多维评分</span>
                    </button>
                  </div>
                </div>


              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Dynamic Content Container */}
          <div className="flex-1 flex flex-col min-w-0 bg-background overflow-auto">
            {/* AI创作视图 - 包含 AI对话 和 创意生成 两个子模式 */}
            {(activeView === "chat" || activeView === "create") && (
              <ScriptChatPanel 
                scriptId={id}
                existingScriptContent={editContent} // 传递已有剧本内容，用于创意生成界面参考
                onApplyToScript={async (content) => {
                  // "应用到剧本"：将创意生成的剧本输出应用到剧本编辑界面的编辑框
                  // 检查剧本编辑框是否已有内容
                  const existingContent = editContent;
                  const hasExistingContent = existingContent && existingContent.trim().length > 0;
                  
                  let finalContent = content;
                  
                  if (hasExistingContent) {
                    // 显示对话框让用户选择
                    const userChoice = window.confirm(
                      '剧本编辑框已有内容。\n\n点击"确定"覆盖现有内容\n点击"取消"追加到现有内容后面'
                    );
                    
                    if (userChoice) {
                      // 覆盖
                      finalContent = content;
                    } else {
                      // 追加
                      finalContent = `${existingContent}\n\n${content}`;
                    }
                  }
                  
                  // 应用到剧本编辑界面的编辑框（editContent），而不是 aiGeneratedContent
                  setEditContent(finalContent);
                  
                  // 自动识别集数
                  const episodeMatches = finalContent.match(/【第(\d+)集】/g);
                  const detectedEpisodeCount = episodeMatches 
                    ? Math.max(...episodeMatches.map(m => parseInt(m.match(/\d+/)?.[0] || '0', 10)))
                    : Math.max(1, Math.ceil(finalContent.length / 15000));
                  
                  // 【修复】始终更新集数为实际检测到的集数（不管增加还是减少）
                  // 同时更新 wordCount 和 sceneCount
                  setScript(prev => prev ? { 
                    ...prev, 
                    episodeCount: detectedEpisodeCount,
                    wordCount: finalContent.length,
                    sceneCount: (finalContent.match(/场景|第[一二三四五六七八九十\d]+场|内景|外景|INT\.?|EXT\.?/gi) || []).length
                  } : prev);
                  
                  // 【修复】根据集数标记拆分内容到 episodeContentMap
                  // 这样可以正确显示每集内容，同时清理旧的集数
                  if (detectedEpisodeCount > 1 && episodeMatches) {
                    // 按【第N集】标记拆分内容
                    const newEpisodeMap: Record<number, string> = {};
                    const parts = finalContent.split(/【第\d+集】[^\n]*\n?/);
                    const episodeTitles = finalContent.match(/【第\d+集】[^\n]*/g) || [];
                    
                    for (let i = 0; i < detectedEpisodeCount; i++) {
                      const epNum = i + 1;
                      const content = parts[i + 1]?.trim() || '';
                      newEpisodeMap[epNum] = content;
                    }
                    setEpisodeContentMap(newEpisodeMap);
                  } else {
                    // 单集或无集数标记，清空 episodeContentMap
                    setEpisodeContentMap({});
                  }
                  
                  // 切换到剧本编辑视图
                  setActiveView("script");
                  
                  // 自动保存AI生成内容
                  try {
                    await apiFetch(`/api/scripts/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: script?.title,
                        content: finalContent,
                        episodeCount: detectedEpisodeCount, // 使用实际检测到的集数
                        genre: script?.genre,
                        status: 'draft',
                      }),
                    });
                    toast.success(hasExistingContent && !window.confirm 
                      ? `已追加到剧本，当前共 ${detectedEpisodeCount} 集` 
                      : `已应用到AI版本并自动保存，共 ${detectedEpisodeCount} 集`);
                  } catch {
                    toast.success("已应用到AI版本，请手动保存");
                  }
                }}
                scriptIdea={scriptIdea}
                setScriptIdea={setScriptIdea}
                targetEpisodes={targetEpisodes}
                setTargetEpisodes={setTargetEpisodes}
                creativeMode={creativeMode}
                setCreativeMode={setCreativeMode}
                onGenerateFullScript={handleGenerateFullScript}
                isGeneratingScript={isGeneratingScript}
                isContinuing={isContinuing}
                onCancelGeneration={handleCancelGeneration}
                stageProgress={stageProgress ? { currentStage: stageProgress.stage, isComplete: stageProgress.stage >= 3 } : null}
                stageProgressDetail={stageProgress}
                generatedOutline={generatedOutline}
                setGeneratedOutline={(outline) => setGeneratedOutline(outline as Record<string, unknown> | null)}
                aiGeneratedContent={aiGeneratedContent}
                setAiGeneratedContent={setAiGeneratedContent}
                generatedEpisodes={generatedEpisodes}
                totalEpisodes={totalEpisodes}
                onContinueWriting={handleContinueWriting}
                episodesPerWrite={episodesPerWrite}
                setEpisodesPerWrite={setEpisodesPerWrite}
                onModeChange={(mode) => {
                  // 同步模式切换到 activeView，更新 URL
                  if (mode === 'chat') {
                    setActiveView('chat');
                  } else if (mode === 'generate') {
                    setActiveView('create');
                  }
                }}
                initialMode={activeView === 'create' ? 'generate' : 'chat'}
                onClearAll={() => {
                  // 清空创意生成相关内容
                  setAiGeneratedContent('');
                  setGeneratedEpisodes(0);
                  setTotalEpisodes(0);
                  setCachedOutline(null);
                  setCachedCoreDialogue(null);
                  setStageProgress(null);
                  toast.success('已清空所有内容');
                }}
              />
            )}
            {activeView === "script" && (
              <>
                {/* 简介编辑框 */}
                <div className="mb-4 bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-ui text-muted-foreground">
                      剧本简介
                    </h3>
                    <button
                      onClick={handleExtractOutline}
                      disabled={isExtractingOutline || !editContent.trim()}
                      className="text-xs text-nvwa-primary hover:underline disabled:opacity-50"
                    >
                      {isExtractingOutline ? '提炼中...' : '提炼大纲'}
                    </button>
                  </div>
                  <textarea
                    className="outline-content w-full bg-nvwa-surface border border-[#333] rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-nvwa-primary resize-none"
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
                episodeContentMap={episodeContentMap}
                setEpisodeContentMap={setEpisodeContentMap}
                activeEpisode={activeEpisode}
                setActiveEpisode={setActiveEpisode}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                analyzeProgress={analyzeProgress}
                onFileUpload={handleFileUpload}
                onApplyToStoryboard={(episodeContent) => {
                  // 将当前剧集内容应用到分镜
                  if (!episodeContent?.trim()) {
                    toast.error("当前剧集内容为空");
                    return;
                  }
                  // 更新editContent为当前剧集内容，然后触发分镜拆分
                  setEditContent(episodeContent);
                  // 切换到分镜视图
                  setActiveView("storyboard");
                  // 触发分镜拆分
                  setTimeout(() => {
                    handleSplitScenes();
                  }, 100);
                }}
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
                  // "应用到剧本"：将优化后的内容应用到剧本编辑界面的编辑框
                  setEditContent(content);
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

            {activeView === "score" && (
              <ScoreView
                scriptId={id}
                scriptContent={editContent}
                onReviewComplete={(result) => {
                  console.log('评分完成:', result);
                }}
              />
            )}
          </div>
        </div>

        {/* Leave Confirmation Dialog */}
        {showLeaveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-muted border border-[#333] rounded-2xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">未保存的内容</h3>
                  <p className="text-sm text-muted-foreground">您有未保存的内容，请选择操作</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-6">
                <Button
                  className="w-full bg-[#0ABAB5] hover:bg-[#0ABAB5]/80 text-white"
                  onClick={async () => {
                    try {
                      // 直接保存当前内容，两套系统独立
                      const title = editTitle || script?.title || "未命名剧本";
                      const synopsis = editSynopsis || script?.synopsis || "";
                      const contentToSave = editContent;
                      
                      await apiFetch(`/api/scripts/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title,
                          synopsis,
                          content: contentToSave,
                          outline: generatedOutline,
                          aiContent: aiGeneratedContent,
                        }),
                      });
                      
                      setIsDirty(false);
                      setShowLeaveDialog(false);
                      toast.success("草稿已保存");
                      router.push("/scripts");
                    } catch (error) {
                      console.error("[保存草稿失败]", error);
                      toast.error("保存失败，请重试");
                    }
                  }}
                >
                  保存并离开
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-[#333] hover:bg-muted/80"
                  onClick={() => {
                    setShowLeaveDialog(false);
                    router.push("/scripts");
                  }}
                >
                  不保存离开
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowLeaveDialog(false)}
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-muted border border-[#333] rounded-2xl p-6 w-full max-w-sm mx-4">
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
                  className="flex-1 border-[#333] hover:bg-nvwa-surface"
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

        {/* AI 工具箱 - 右下角浮动小球 */}
        <AiToolbox />
      </main>
    </AppShell>
  );
}
