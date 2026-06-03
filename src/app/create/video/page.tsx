'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell } from '@/components/app-sidebar';
import { DropdownSelect, DropdownOption } from '@/components/dropdown-select';
import { Slider } from '@/components/ui/slider';
import { VIDEO_MODELS, getModelsByMode } from '@/lib/model-config';
import { getAuthHeaders } from '@/lib/auth-context';
import { usePersistedStates, PERSISTENCE_KEYS } from '@/hooks/usePersistedState';
import {
  Wand2,
  Download,
  Trash2,
  X,
  Clock,
  Loader2,
  Play,
  Video as VideoIcon,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// 生成唯一的ID
function generateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

// 从视频中提取第一帧作为封面图
async function extractVideoFrame(videoUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    
    video.onloadeddata = () => {
      // 跳转到第一帧
      video.currentTime = 0;
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const coverUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(coverUrl);
        } else {
          resolve(null);
        }
      } catch (e) {
        console.error('Failed to extract frame:', e);
        resolve(null);
      }
    };
    
    video.onerror = () => {
      console.error('Failed to load video for frame extraction');
      resolve(null);
    };
    
    // 设置超时
    setTimeout(() => resolve(null), 10000);
    
    video.src = videoUrl;
  });
}

// localStorage key for history
const STORAGE_KEY_HISTORY = 'nvwa-video-history';

// 历史记录项类型
interface HistoryItem {
  id: string;
  prompt: string;
  model: string;
  mode: 'text2video' | 'image2video' | 'firstlast2video';
  duration: number;
  ratio?: string;
  resolution: string;
  videoUrl?: string;
  coverUrl?: string;
  createdAt: string;
}

// 模式Tab配置
const MODE_TABS = [
  { id: 'text2video', label: '文生视频' },
  { id: 'image2video', label: '图生视频' },
  { id: 'firstlast2video', label: '首尾帧生视频' },
] as const;

type VideoMode = typeof MODE_TABS[number]['id'];

// 获取模型支持的时长选项
function getDurationOptions(model: string): DropdownOption[] {
  const modelConfig = VIDEO_MODELS.find(m => m.id === model);
  if (!modelConfig) return [{ value: '5', label: '5秒' }];
  
  const durations = modelConfig.durations || [5];
  return durations.map(d => ({ value: d.toString(), label: `${d}秒` }));
}

// 获取模型支持的比例选项
function getRatioOptions(model: string, mode: VideoMode): DropdownOption[] {
  const modelConfig = VIDEO_MODELS.find(m => m.id === model);
  
  // 图生视频模式通常没有ratio参数
  if (mode === 'image2video' && modelConfig?.supportsI2V) {
    return [{ value: 'auto', label: '跟随素材' }];
  }
  
  const ratios = modelConfig?.ratios || ['16:9'];
  const ratioLabels: Record<string, string> = {
    '16:9': '横屏 16:9',
    '9:16': '竖屏 9:16',
    '1:1': '方形 1:1',
    '4:3': '经典 4:3',
    '3:4': '竖屏 3:4',
    '4:5': '竖屏 4:5',
    '5:4': '横屏 5:4',
  };
  
  return ratios.map(r => ({ value: r, label: ratioLabels[r] || r }));
}

// 获取模型支持的分辨率选项
function getResolutionOptions(model: string): DropdownOption[] {
  const modelConfig = VIDEO_MODELS.find(m => m.id === model);
  const resolutions = modelConfig?.resolutions || ['720P'];
  return resolutions.map(r => ({ value: r, label: r }));
}

// 获取模型支持的时长范围
function getDurationRange(model: string): { min: number; max: number; step: number } {
  const modelConfig = VIDEO_MODELS.find(m => m.id === model);
  if (!modelConfig || !modelConfig.durations || modelConfig.durations.length === 0) {
    return { min: 5, max: 5, step: 1 };
  }
  
  const durations = modelConfig.durations;
  return {
    min: Math.min(...durations),
    max: Math.max(...durations),
    step: durations.length > 1 ? durations[1] - durations[0] : 1
  };
}

export default function VideoCreatePage() {
  // 持久化状态（用户输入的提示词和参数）
  const [persistedState, setPersistedState] = usePersistedStates(
    PERSISTENCE_KEYS.VIDEO_CREATE,
    {
      mode: 'text2video' as VideoMode,
      currentModel: '',
      prompt: '',
      duration: 5,
      ratio: '16:9',
      resolution: '720P',
    }
  );

  // 从持久化状态中解构
  const mode = persistedState.mode as VideoMode;
  const currentModel = persistedState.currentModel;
  const prompt = persistedState.prompt;
  const duration = persistedState.duration;
  const ratio = persistedState.ratio;
  const resolution = persistedState.resolution;

  // 更新持久化状态的辅助函数
  const updatePersistedState = (updates: Partial<typeof persistedState>) => {
    setPersistedState(updates);
  };
  
  // 图片状态（不持久化，因为是临时上传的）
  const [firstFrameImage, setFirstFrameImage] = useState<string | null>(null);
  const [lastFrameImage, setLastFrameImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  // 生成状态（不持久化）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);
  
  // 历史记录（数据库持久化 + localStorage缓存）
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [previewHistoryItem, setPreviewHistoryItem] = useState<HistoryItem | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  
  // 手机端参数面板
  const [showParams, setShowParams] = useState(false);

  // 初始化模型
  useEffect(() => {
    const models = getModelsByMode(mode);
    if (models.length > 0 && !models.find(m => m.id === currentModel)) {
      updatePersistedState({ currentModel: models[0].id });
    }
  }, [mode, currentModel]);

  // 从数据库加载历史记录
  const loadHistoryFromDB = useCallback(async () => {
    try {
      const authHeaders = getAuthHeaders();
      // 只加载 AI 文生视频的历史记录，排除分镜视频 (category: storyboard)
      const response = await fetch('/api/assets?type=video&category=video', {
        headers: authHeaders,
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        // 将数据库记录转换为历史记录格式
        const dbHistory: HistoryItem[] = result.data.map((asset: {
          id: string;
          name: string;
          url: string;
          prompt?: string;
          model?: string;
          metadata?: { mode?: string; duration?: number; ratio?: string; resolution?: string; videoUrl?: string; coverUrl?: string };
          createdAt: string;
        }) => ({
          id: asset.id,
          prompt: asset.prompt || asset.name || '',
          model: asset.model || 'unknown',
          mode: (asset.metadata?.mode as 'text2video' | 'image2video' | 'firstlast2video') || 'text2video',
          duration: asset.metadata?.duration || 5,
          ratio: asset.metadata?.ratio,
          resolution: asset.metadata?.resolution || '720P',
          videoUrl: asset.metadata?.videoUrl || asset.url,
          coverUrl: asset.metadata?.coverUrl,
          createdAt: asset.createdAt || new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        }));
        setHistory(dbHistory);
        // 同时缓存到localStorage
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(dbHistory));
      }
    } catch (err) {
      console.error('加载历史记录失败:', err);
      // 尝试从localStorage加载
      try {
        const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (saved) {
          setHistory(JSON.parse(saved));
        }
      } catch {
        // 忽略
      }
    }
    setHistoryLoaded(true);
  }, []);
  
  // 加载历史记录
  useEffect(() => {
    loadHistoryFromDB();
  }, [loadHistoryFromDB]);

  // 切换模式时重置图片和参数
  useEffect(() => {
    setFirstFrameImage(null);
    setLastFrameImage(null);
    setReferenceImage(null);
    setError(null);
    
    // 更新参数默认值
    const models = getModelsByMode(mode);
    if (models.length > 0) {
      const modelConfig = models[0];
      const updates: Partial<typeof persistedState> = { currentModel: modelConfig.id };
      if (modelConfig.durations && modelConfig.durations.length > 0) {
        updates.duration = modelConfig.durations[0];
      }
      if (modelConfig.ratios && modelConfig.ratios.length > 0) {
        updates.ratio = modelConfig.ratios[0];
      }
      if (modelConfig.resolutions && modelConfig.resolutions.length > 0) {
        updates.resolution = modelConfig.resolutions[0];
      }
      updatePersistedState(updates);
    }
  }, [mode]);

  // 保存历史记录到数据库（带去重检查）
  const saveHistory = useCallback(async (newItem: HistoryItem) => {
    // 先更新本地状态和localStorage（带去重检查）
    setHistory(prev => {
      // 检查是否已存在相同URL的历史记录，避免重复
      const exists = prev.some(item => item.videoUrl === newItem.videoUrl);
      if (exists) {
        return prev;
      }
      const updated = [newItem, ...prev].slice(0, 30);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      return updated;
    });
    
    // 异步保存到数据库
    try {
      const authHeaders = getAuthHeaders();
      await fetch('/api/assets', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newItem.prompt.slice(0, 100) || '生成的视频',
          type: 'video',
          category: 'video',
          url: newItem.videoUrl || '',
          prompt: newItem.prompt,
          model: newItem.model,
          metadata: {
            mode: newItem.mode,
            duration: newItem.duration,
            ratio: newItem.ratio,
            resolution: newItem.resolution,
            videoUrl: newItem.videoUrl,
            coverUrl: newItem.coverUrl,
          },
        }),
      });
    } catch (err) {
      console.error('保存历史记录到数据库失败:', err);
    }
  }, []);

  // 删除历史记录
  const handleDeleteHistory = useCallback(async (id: string) => {
    try {
      // 从数据库删除
      const response = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        console.error('删除数据库记录失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
    
    // 更新前端状态
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      return updated;
    });
  }, [getAuthHeaders]);

  // 清空历史
  const handleClearHistory = useCallback(() => {
    if (confirm('确定要清空所有历史记录吗？')) {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    }
  }, []);

  // 图片上传处理
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'first' | 'last' | 'reference') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过10MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === 'first') {
        setFirstFrameImage(base64);
      } else if (type === 'last') {
        setLastFrameImage(base64);
      } else {
        setReferenceImage(base64);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // 轮询任务结果
  const pollTaskRef = useRef<((taskId: string) => Promise<void>) | null>(null);

  const pollTaskResult = useCallback(async (taskId: string) => {
    try {
      const authHeaders = getAuthHeaders();
      // 传递 model 参数，让后端知道使用哪种查询方式
      const response = await fetch(`/api/ai/generate-video?taskId=${taskId}&model=${currentModel}`, {
        headers: authHeaders,
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        const status = data.data.status;
        
        if (status === 'SUCCEEDED' || status === 'succeeded' || status === 'completed' || status === 'COMPLETED') {
          const videoUrl = data.data.videoUrl || data.data.output?.videoUrl;
          let coverUrl = data.data.coverUrl || data.data.output?.coverUrl;
          
          if (videoUrl) {
            setCurrentVideoUrl(videoUrl);
            
            // 如果API没有返回封面图，从视频中提取第一帧
            if (!coverUrl) {
              const extractedCover = await extractVideoFrame(videoUrl);
              if (extractedCover) {
                coverUrl = extractedCover;
              } else if (mode !== 'text2video' && firstFrameImage) {
                // 对于图生视频，使用用户上传的首帧图片作为封面
                coverUrl = firstFrameImage;
              }
            }
            
            setCurrentCoverUrl(coverUrl || null);
            
            // 保存到历史记录
            const item: HistoryItem = {
              id: generateId(),
              prompt: prompt.trim(),
              model: currentModel,
              mode,
              duration: duration, // 已经是数字类型
              ratio: mode === 'image2video' ? undefined : ratio,
              resolution,
              videoUrl,
              coverUrl: coverUrl || undefined,
              createdAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            };
            saveHistory(item);
          } else {
            setError('未获取到生成的视频');
          }
          setCurrentTaskId(null);
          setLoading(false);
        } else if (status === 'FAILED' || status === 'failed' || status === 'FAILED' || status === 'error' || status === 'ERROR') {
          setError('生成失败：' + (data.data.message || '未知错误'));
          setCurrentTaskId(null);
          setLoading(false);
        } else {
          // 继续轮询 (RUNNING, PENDING, processing 等状态)
          setTimeout(() => pollTaskRef.current?.(taskId), 5000);
        }
      } else {
        // 返回错误，让用户自主选择是否重试
        const errorMessage = response.status === 404 
          ? '任务查询失败（404），可能是任务已过期或不存在' 
          : (data.error || '查询任务状态失败');
        setError(errorMessage);
        setCurrentTaskId(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('Poll error:', err);
      // 网络错误，返回错误让用户选择
      setError('网络错误，请检查网络连接后重试');
      setCurrentTaskId(null);
      setLoading(false);
    }
  }, [prompt, currentModel, mode, duration, ratio, resolution, saveHistory, firstFrameImage]);

  useEffect(() => {
    pollTaskRef.current = pollTaskResult;
  }, [pollTaskResult]);

  // 开始生成
  const handleGenerate = async () => {
    if (!prompt.trim() && mode === 'text2video') {
      setError('请输入视频描述');
      return;
    }
    
    if (mode === 'image2video' && !firstFrameImage) {
      setError('请上传首帧图片');
      return;
    }
    
    if (mode === 'firstlast2video' && !firstFrameImage) {
      setError('请上传首帧图片');
      return;
    }
    
    setLoading(true);
    setError(null);
    setCurrentVideoUrl(null);
    setCurrentCoverUrl(null);
    
    try {
      const authHeaders = getAuthHeaders();
      
      const body: Record<string, unknown> = {
        model: currentModel,
        prompt: prompt.trim(),
        duration: duration, // 已经是数字类型
        resolution,
      };
      
      if (mode !== 'image2video' && ratio !== 'auto') {
        body.ratio = ratio;
      }
      
      if (mode === 'image2video' && firstFrameImage) {
        body.firstFrameImage = firstFrameImage;
      }
      
      if (mode === 'firstlast2video') {
        if (firstFrameImage) body.firstFrameImage = firstFrameImage;
        if (lastFrameImage) body.lastFrameImage = lastFrameImage;
      }
      
      const response = await fetch('/api/ai/generate-video', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.taskId) {
        setCurrentTaskId(result.data.taskId);
        pollTaskResult(result.data.taskId);
      } else {
        setError(result.error || '创建任务失败');
        setLoading(false);
      }
    } catch (err) {
      console.error('Generate failed:', err);
      setError('生成失败，请检查网络后重试');
      setLoading(false);
    }
  };

  // 下载视频
  const handleDownload = useCallback(async (url: string) => {
    const filename = `nvwa-video-${Date.now()}.mp4`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      alert('下载失败，请稍后重试');
    }
  }, []);

  // 模型选项
  const modelOptions: DropdownOption[] = getModelsByMode(mode).map(m => ({
    value: m.id,
    label: m.name,
    description: m.description || '',
  }));

  // 参数选项
  const durationOptions = getDurationOptions(currentModel);
  const ratioOptions = getRatioOptions(currentModel, mode);
  const resolutionOptions = getResolutionOptions(currentModel);

  return (
    <AppShell>
      <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 56px)' }}>
        {/* 手机端遮罩层 */}
        {showParams && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setShowParams(false)}
          />
        )}
        
        {/* 左侧参数栏 */}
        <div className={`fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto w-[300px] sm:w-[340px] shrink-0 border-r border-[#333333] bg-[#0A0A0A] flex flex-col mx-[5px] my-[5px] rounded-lg transition-transform duration-300 lg:translate-x-0 ${
          showParams ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          {/* 手机端关闭按钮 */}
          <button
            onClick={() => setShowParams(false)}
            className="lg:hidden absolute top-3 right-3 w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#888888] hover:text-white z-10"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* 顶部模式切换 */}
          <div className="flex p-4 pb-0 gap-1">
            {MODE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => updatePersistedState({ mode: tab.id })}
                className={`flex-1 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                  mode === tab.id
                    ? 'bg-[#0ABAB5] text-white font-medium'
                    : 'bg-[#1A1A1A] text-[#888888] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* 参数区 */}
          <div className="flex-1 flex flex-col p-4 pt-2 overflow-y-auto">
            {/* 提示词输入 */}
            <div className="flex flex-col py-3">
              <textarea
                value={prompt}
                onChange={(e) => updatePersistedState({ prompt: e.target.value })}
                placeholder={mode === 'text2video' ? '描述想要生成的视频内容' : '描述视频运动方式（可选）'}
                className="w-full h-[90px] p-3 bg-[#141414] border border-[#333333] rounded-lg text-white text-sm placeholder:text-[#666666] resize-none focus:outline-none focus:border-[#0ABAB5]"
              />
            </div>
            
            {/* 图生视频 - 首帧图片上传 */}
            {(mode === 'image2video' || mode === 'firstlast2video') && (
              <div className="space-y-3 py-3">
                <label className="text-sm text-white font-medium">
                  {mode === 'firstlast2video' ? '首帧图片' : '参考图片'}
                </label>
                <div className="relative">
                  {firstFrameImage ? (
                    <div className="relative group">
                      <img
                        src={firstFrameImage}
                        alt="首帧"
                        className="w-full h-[120px] object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setFirstFrameImage(null)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-[120px] border-2 border-dashed border-[#333333] rounded-lg cursor-pointer hover:border-[#0ABAB5] transition-colors">
                      <Upload className="w-6 h-6 text-[#666666] mb-2" />
                      <span className="text-sm text-[#666666]">点击上传图片</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'first')}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
            
            {/* 首尾帧生视频 - 尾帧图片上传 */}
            {mode === 'firstlast2video' && (
              <div className="space-y-3 py-3">
                <label className="text-sm text-white font-medium">尾帧图片（可选）</label>
                <div className="relative">
                  {lastFrameImage ? (
                    <div className="relative group">
                      <img
                        src={lastFrameImage}
                        alt="尾帧"
                        className="w-full h-[120px] object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setLastFrameImage(null)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-[120px] border-2 border-dashed border-[#333333] rounded-lg cursor-pointer hover:border-[#0ABAB5] transition-colors">
                      <Upload className="w-6 h-6 text-[#666666] mb-2" />
                      <span className="text-sm text-[#666666]">点击上传图片</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'last')}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
            
            {/* 模型选择 */}
            <div className="space-y-2 mt-4">
              <label className="text-sm text-white font-medium">模型</label>
              <DropdownSelect
                options={modelOptions}
                value={currentModel}
                onChange={(val) => updatePersistedState({ currentModel: val })}
                placeholder="选择模型"
                showDescription
              />
            </div>
            
            {/* 时长滑条 */}
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-white font-medium">时长</label>
                <span className="text-sm text-[#0ABAB5] font-medium">{duration} 秒</span>
              </div>
              <div className="px-1">
                <Slider
                  value={[duration]}
                  min={getDurationRange(currentModel).min}
                  max={getDurationRange(currentModel).max}
                  step={getDurationRange(currentModel).step}
                  onValueChange={(value) => updatePersistedState({ duration: value[0] })}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-[#666666]">
                <span>{getDurationRange(currentModel).min}秒</span>
                <span>{getDurationRange(currentModel).max}秒</span>
              </div>
            </div>
            
            {/* 比例选择 - 图生视频隐藏 */}
            {mode !== 'image2video' && ratioOptions.length > 0 && ratioOptions[0].value !== 'auto' && (
              <div className="space-y-2 mt-4">
                <label className="text-sm text-white font-medium">比例</label>
                <DropdownSelect
                  options={ratioOptions}
                  value={ratio}
                  onChange={(val) => updatePersistedState({ ratio: val })}
                  placeholder="选择比例"
                />
              </div>
            )}
            
            {/* 分辨率选择 */}
            <div className="space-y-2 mt-4">
              <label className="text-sm text-white font-medium">分辨率</label>
              <DropdownSelect
                options={resolutionOptions}
                value={resolution}
                onChange={(val) => updatePersistedState({ resolution: val })}
                placeholder="选择分辨率"
              />
            </div>
          </div>
          
          {/* 创作按钮 */}
          <div className="p-4 border-t border-[#333333]">
            <button
              onClick={() => {
                setShowParams(false);
                handleGenerate();
              }}
              disabled={loading}
              className="w-full py-3 bg-[#0ABAB5] hover:bg-[#099d98] disabled:bg-[#333333] disabled:text-[#666666] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  开始创作
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* 右侧内容区 */}
        <div className="flex-1 flex flex-col bg-[#0A0A0A] min-w-0 mr-[5px] my-[5px] rounded-lg overflow-hidden">
          {/* 手机端参数按钮 */}
          <button
            onClick={() => setShowParams(true)}
            className="lg:hidden m-3 mb-0 py-2 px-4 bg-[#1A1A1A] hover:bg-[#252525] text-white text-sm rounded-lg flex items-center gap-2 self-start"
          >
            <Wand2 className="w-4 h-4" />
            参数设置
          </button>
          
          {/* 错误提示 */}
          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* 生成结果区域 */}
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            {loading && currentTaskId ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-[#0ABAB5] animate-spin" />
                <div className="text-center">
                  <p className="text-white text-lg font-medium">正在生成视频...</p>
                  <p className="text-[#888888] text-sm mt-2">预计需要1-5分钟，请耐心等待</p>
                </div>
              </div>
            ) : currentVideoUrl ? (
              <div className="w-full max-w-3xl">
                <div className="relative rounded-lg overflow-hidden bg-[#1A1A1A]">
                  <video
                    src={currentVideoUrl}
                    controls
                    autoPlay
                    className="w-full"
                    style={{ maxHeight: 'calc(100vh - 300px)' }}
                  />
                </div>
                <div className="flex justify-center gap-3 mt-4">
                  <button
                    onClick={() => handleDownload(currentVideoUrl)}
                    className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    下载视频
                  </button>
                  <button
                    onClick={() => {
                      setCurrentVideoUrl(null);
                      setCurrentCoverUrl(null);
                    }}
                    className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-[#888888] rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    清除
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-[#666666]">
                <VideoIcon className="w-16 h-16" />
                <p className="text-lg">输入描述，开始创作视频</p>
              </div>
            )}
          </div>
          
          {/* 历史记录区域 */}
          {history.length > 0 && (
            <div className="border-t border-[#333333] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">历史记录</h3>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-[#888888] hover:text-red-400 transition-colors"
                >
                  清空
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="relative group flex-shrink-0 w-[120px] h-[68px] rounded-lg overflow-hidden bg-[#1A1A1A] cursor-pointer"
                    onClick={() => {
                      if (item.videoUrl) {
                        setPreviewHistoryItem(item);
                      }
                    }}
                  >
                    {item.videoUrl ? (
                      <video
                        src={item.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        playsInline
                      />
                    ) : item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <VideoIcon className="w-8 h-8 text-[#666666]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHistory(item.id);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 历史视频预览弹窗 - 接近全屏显示 */}
        {previewHistoryItem && previewHistoryItem.videoUrl && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <button
              onClick={() => setPreviewHistoryItem(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-[#1A1A1A] hover:bg-[#252525] rounded-full flex items-center justify-center text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-full max-w-[95vw] max-h-[90vh] flex flex-col items-center">
              <video
                src={previewHistoryItem.videoUrl}
                controls
                autoPlay
                className="max-w-full max-h-[75vh] rounded-lg"
              />
              <div className="mt-4 text-center">
                <p className="text-white text-sm">{previewHistoryItem.prompt}</p>
                <div className="flex justify-center gap-3 mt-3">
                  <button
                    onClick={() => handleDownload(previewHistoryItem.videoUrl!)}
                    className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
