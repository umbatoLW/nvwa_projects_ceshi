'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppShell } from '@/components/app-sidebar';
import { DropdownSelect, DropdownOption } from '@/components/dropdown-select';
import { IMAGE_MODELS, getImageModelConfig, ImageModelConfig, ImageSizeMode, getValidSize, ASPECT_RATIOS, RESOLUTION_TIERS } from '@/lib/model-config';
import { getAuthHeaders } from '@/lib/auth-context';
import { usePersistedStates, PERSISTENCE_KEYS } from '@/hooks/usePersistedState';
import {
  Wand2,
  Download,
  Trash2,
  X,
  Clock,
  Loader2,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';

// 模型支持的尺寸映射表（根据万相API文档）
// size参数可以是：1K, 2K 或具体的分辨率如 2048*2048
const MODEL_SIZES: Record<string, Record<string, { size: string; label: string }>> = {
  // wan2.7 模型（高分辨率，2K默认）
  'wan2.7-image-pro': {
    '1:1': { size: '2048*2048', label: '1:1 (2048×2048)' },
    '16:9': { size: '2048*1152', label: '16:9 (2048×1152)' },
    '9:16': { size: '1152*2048', label: '9:16 (1152×2048)' },
    '4:3': { size: '2048*1536', label: '4:3 (2048×1536)' },
    '3:4': { size: '1536*2048', label: '3:4 (1536×2048)' },
  },
  'wan2.7-image': {
    '1:1': { size: '2048*2048', label: '1:1 (2048×2048)' },
    '16:9': { size: '2048*1152', label: '16:9 (2048×1152)' },
    '9:16': { size: '1152*2048', label: '9:16 (1152×2048)' },
    '4:3': { size: '2048*1536', label: '4:3 (2048×1536)' },
    '3:4': { size: '1536*2048', label: '3:4 (1536×2048)' },
  },
  // wan2.6 模型
  'wan2.6-image': {
    '1:1': { size: '1280*1280', label: '1:1 (1280×1280)' },
    '16:9': { size: '1280*720', label: '16:9 (1280×720)' },
    '9:16': { size: '720*1280', label: '9:16 (720×1280)' },
    '4:3': { size: '1280*960', label: '4:3 (1280×960)' },
    '3:4': { size: '960*1280', label: '3:4 (960×1280)' },
    '3:2': { size: '1200*800', label: '3:2 (1200×800)' },
    '2:3': { size: '800*1200', label: '2:3 (800×1200)' },
  },
  // wanx2.1 模型
  'wanx2.1-t2i-turbo': {
    '1:1': { size: '1024*1024', label: '1:1 (1024×1024)' },
    '16:9': { size: '1280*720', label: '16:9 (1280×720)' },
    '9:16': { size: '720*1280', label: '9:16 (720×1280)' },
    '4:3': { size: '1024*768', label: '4:3 (1024×768)' },
    '3:4': { size: '768*1024', label: '3:4 (768×1024)' },
  },
  'wanx2.1-t2i-plus': {
    '1:1': { size: '1024*1024', label: '1:1 (1024×1024)' },
    '16:9': { size: '1280*720', label: '16:9 (1280×720)' },
    '9:16': { size: '720*1280', label: '9:16 (720×1280)' },
    '4:3': { size: '1024*768', label: '4:3 (1024×768)' },
    '3:4': { size: '768*1024', label: '3:4 (768×1024)' },
  },
  // qwen-image 模型
  'qwen-image-2.0-pro': {
    '1:1': { size: '1024*1024', label: '1:1 (1024×1024)' },
    '16:9': { size: '1024*768', label: '16:9 (1024×768)' },
    '9:16': { size: '768*1024', label: '9:16 (768×1024)' },
    '4:3': { size: '1024*768', label: '4:3 (1024×768)' },
    '3:4': { size: '768*1024', label: '3:4 (768×1024)' },
  },
  'qwen-image-2.0': {
    '1:1': { size: '1024*1024', label: '1:1 (1024×1024)' },
    '16:9': { size: '1024*768', label: '16:9 (1024×768)' },
    '9:16': { size: '768*1024', label: '9:16 (768×1024)' },
    '4:3': { size: '1024*768', label: '4:3 (1024×768)' },
    '3:4': { size: '768*1024', label: '3:4 (768×1024)' },
  },
  // 即梦 Seedream 3.0 模型
  'seedream-3.0-t2i': {
    '1:1': { size: '1024*1024', label: '1:1 (1024×1024)' },
    '16:9': { size: '1280*720', label: '16:9 (1280×720)' },
    '9:16': { size: '720*1280', label: '9:16 (720×1280)' },
    '4:3': { size: '1024*768', label: '4:3 (1024×768)' },
    '3:4': { size: '768*1024', label: '3:4 (768×1024)' },
  },
  // 即梦 Seedream 4.6 模型 (2K分辨率)
  'seedream-4.6-t2i': {
    '1:1': { size: '2048*2048', label: '1:1 (2048×2048)' },
    '16:9': { size: '2560*1440', label: '16:9 (2560×1440)' },
    '9:16': { size: '1440*2560', label: '9:16 (1440×2560)' },
    '4:3': { size: '2304*1728', label: '4:3 (2304×1728)' },
    '3:4': { size: '1728*2304', label: '3:4 (1728×2304)' },
    '3:2': { size: '2496*1664', label: '3:2 (2496×1664)' },
    '2:3': { size: '1664*2496', label: '2:3 (1664×2496)' },
    '21:9': { size: '3024*1296', label: '21:9 (3024×1296)' },
    '9:21': { size: '1296*3024', label: '9:21 (1296×3024)' },
  },
};

// 获取当前模型支持的尺寸
function getModelSize(model: string, ratio: string): string {
  const modelSizes = MODEL_SIZES[model];
  if (modelSizes && modelSizes[ratio]) {
    return modelSizes[ratio].size;
  }
  // 默认返回 1280*1280 (1:1)
  return '1280*1280';
}

// 历史记录项类型
interface HistoryItem {
  id: string;
  prompt: string;
  model: string;
  size: string;
  ratio: string;
  tab: 'text' | 'reference';
  imageUrls: string[];
  createdAt: string;
}

// 生成结果项（保存生成时的ratio）
interface GeneratedImage {
  url: string;
  ratio: string;
}

// 生成唯一的ID
function generateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

// localStorage key for persisting polling state
const STORAGE_KEY_POLLING = 'nvwa-image-polling-state';

// localStorage key for history
const STORAGE_KEY_HISTORY = 'nvwa-image-history';

export default function ImageCreatePage() {
  // 尺寸模式类型
  type SizeModeType = 'resolution' | 'aspectRatio';
  
  // 参考图片类型
  interface ReferenceImage {
    url: string;
    preview: string;
    file?: File;
  }

  // 持久化状态（用户输入的提示词和参数）
  const [persistedState, setPersistedState, clearPersistedState] = usePersistedStates(
    PERSISTENCE_KEYS.IMAGE_CREATE,
    {
      tab: 'text' as 'text' | 'reference',
      prompt: '',
      currentModel: IMAGE_MODELS[0]?.id || 'wanx2.1-t2i-turbo',
      sizeMode: 'aspectRatio' as SizeModeType,
      resolutionTier: '2K',
      currentRatio: '16:9',
      currentCount: 1,
    }
  );

  // 从持久化状态中解构
  const tab = persistedState.tab;
  const prompt = persistedState.prompt;
  const currentModel = persistedState.currentModel;
  const sizeMode = persistedState.sizeMode as SizeModeType;
  const resolutionTier = persistedState.resolutionTier;
  const currentRatio = persistedState.currentRatio;
  const currentCount = persistedState.currentCount;

  // 更新持久化状态的辅助函数
  const updatePersistedState = (updates: Partial<typeof persistedState>) => {
    setPersistedState(updates);
  };

  // 非持久化状态
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]); // 多图上传（0-9张）
  
  // 预览框比例：仅在点击"生图"按钮时更新，中途切换比例不影响现有预览框
  const [previewRatio, setPreviewRatio] = useState<string>('16:9');
  const [previewCount, setPreviewCount] = useState<number>(1);
  
  // 修改：保存生成时的ratio
  const [currentResult, setCurrentResult] = useState<GeneratedImage[]>([]);
  const [currentPollingId, setCurrentPollingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  
  // @图片引用状态
  const [showImageMention, setShowImageMention] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // 角色一致性开关
  const [characterConsistency, setCharacterConsistency] = useState(false);
  
  // 获取当前模型配置
  const modelConfig = useMemo(() => getImageModelConfig(currentModel), [currentModel]);
  
  // 是否有参考图片
  const hasReferenceImages = referenceImages.length > 0;
  
  // 当前尺寸（根据尺寸模式计算）
  const currentSize = useMemo(() => {
    if (!modelConfig) return '1024*1024';
    return getValidSize(currentModel, sizeMode, currentRatio, hasReferenceImages) || '1024*1024';
  }, [modelConfig, sizeMode, currentRatio, hasReferenceImages, currentModel]);

  // 获取分辨率选项
  const getResolutionOptions = (config: ImageModelConfig | null, hasImages: boolean): DropdownOption[] => {
    if (!config || !('resolutionTiers' in config)) return [];
    const tiers = hasImages && 'resolutionTiersWithImage' in config && config.resolutionTiersWithImage 
      ? config.resolutionTiersWithImage 
      : config.resolutionTiers;
    if (!tiers) return [];
    return tiers.map((tier: string) => ({
      value: tier,
      label: tier,
      description: tier === '1K' ? '1024×1024' : tier === '2K' ? '2048×2048' : '4096×4096'
    }));
  };

  // 获取比例选项
  const getRatioOptions = (config: ImageModelConfig | null): DropdownOption[] => {
    if (!config || !('aspectRatios' in config) || !config.aspectRatios) return [];
    return config.aspectRatios.map((ratio: string) => ({
      value: ratio,
      label: ratio,
      description: undefined
    }));
  };

  // 根据模型和尺寸模式获取有效的尺寸选项
  const validResolutions = useMemo(() => {
    if (!modelConfig) return [];
    const hasImages = referenceImages.length > 0;
    return hasImages ? modelConfig.resolutionTiersWithImage : modelConfig.resolutionTiers;
  }, [modelConfig, referenceImages.length]);
  
  const validRatios = useMemo(() => {
    return modelConfig?.aspectRatios || ['1:1', '16:9', '9:16', '4:3', '3:4'];
  }, [modelConfig]);
  
  // 加载和错误状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 历史记录（数据库持久化 + localStorage缓存）
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [previewHistoryItem, setPreviewHistoryItem] = useState<HistoryItem | null>(null);
  const [previewHistoryIndex, setPreviewHistoryIndex] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  
  // 从数据库加载历史记录
  const loadHistoryFromDB = useCallback(async () => {
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch('/api/assets?category=image', {
        headers: authHeaders,
      });
      
      // 检查响应状态
      if (!response.ok) {
        console.warn('加载历史记录失败: HTTP', response.status);
        setHistoryLoaded(true);
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 将数据库记录转换为历史记录格式
        const dbHistory: HistoryItem[] = result.data.map((asset: {
          id: string;
          name: string;
          url: string;
          prompt?: string;
          model?: string;
          metadata?: { ratio?: string; size?: string; tab?: string; imageUrls?: string[] };
          createdAt: string;
        }) => ({
          id: asset.id,
          prompt: asset.prompt || asset.name || '',
          model: asset.model || 'unknown',
          size: asset.metadata?.size || '1K',
          ratio: asset.metadata?.ratio || '16:9',
          tab: (asset.metadata?.tab as 'text' | 'reference') || 'text',
          imageUrls: asset.metadata?.imageUrls || (asset.url ? [asset.url] : []),
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
  
  // 保存历史记录到数据库（带去重检查）
  const saveHistory = useCallback(async (newItem: HistoryItem) => {
    // 检查是否已存在相同的记录（基于图片URL）
    try {
      const authHeaders = getAuthHeaders();
      
      // 先检查数据库中是否已存在相同URL的记录
      const checkResponse = await fetch('/api/assets?category=image', {
        headers: authHeaders,
      });
      const checkResult = await checkResponse.json();
      
      if (checkResult.success && checkResult.data) {
        // 获取所有已存在的图片URL
        const existingUrls = new Set<string>();
        checkResult.data.forEach((asset: { url?: string; metadata?: { imageUrls?: string[] } }) => {
          if (asset.metadata?.imageUrls) {
            asset.metadata.imageUrls.forEach((url: string) => existingUrls.add(url));
          } else if (asset.url) {
            existingUrls.add(asset.url);
          }
        });
        
        // 如果所有图片都已存在，跳过保存
        const allExist = newItem.imageUrls.every(url => existingUrls.has(url));
        if (allExist) {
          return;
        }
      }
      
      // 更新本地状态和localStorage
      setHistory(prev => {
        const updated = [newItem, ...prev].slice(0, 30); // 减少到30条，避免存储过大
        
        try {
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
        } catch {
          // localStorage满了，清理旧数据后重试
          try {
            // 只保留最新10条
            const trimmed = updated.slice(0, 10);
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
            return trimmed;
          } catch {
            // 完全无法存储，清空历史
            localStorage.removeItem(STORAGE_KEY_HISTORY);
          }
        }
        return updated;
      });
      
      // 异步保存到数据库
      for (let i = 0; i < newItem.imageUrls.length; i++) {
        const url = newItem.imageUrls[i];
        await fetch('/api/assets', {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newItem.prompt.slice(0, 100) || '生成的图片',
            type: 'image',
            category: 'image',
            url: url,
            prompt: newItem.prompt,
            model: newItem.model,
            metadata: {
              ratio: newItem.ratio,
              size: newItem.size,
              tab: newItem.tab,
              imageUrls: newItem.imageUrls,
              imageIndex: i + 1,
              totalImages: newItem.imageUrls.length,
            },
          }),
        });
      }
    } catch (err) {
      console.error('保存历史记录到数据库失败:', err);
      // 即使保存失败，也要更新本地状态
      setHistory(prev => {
        const updated = [newItem, ...prev].slice(0, 50);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  // 校验图片尺寸（宽高240-8000px，比例1:8~8:1）
  const validateImageDimensions = useCallback((img: HTMLImageElement): boolean => {
    const { width, height } = img;
    // 宽高范围 [240, 8000]
    if (width < 240 || width > 8000 || height < 240 || height > 8000) {
      return false;
    }
    // 比例范围 [1:8, 8:1]
    const ratio = width / height;
    if (ratio < 0.125 || ratio > 8) {
      return false;
    }
    return true;
  }, []);

  // 处理图片上传
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    const newImages: ReferenceImage[] = [];
    let processedCount = 0;
    const totalToProcess = Math.min(files.length, 9 - referenceImages.length);

    Array.from(files).slice(0, 9 - referenceImages.length).forEach(file => {
      // 校验格式
      if (!validFormats.includes(file.type)) {
        alert(`不支持的格式: ${file.name}，支持 JPG/PNG/WEBP/BMP`);
        processedCount++;
        return;
      }
      // 校验大小
      if (file.size > maxSize) {
        alert(`文件过大: ${file.name}，最大支持 20MB`);
        processedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        
        // 校验图片尺寸
        const img = new Image();
        img.onload = () => {
          if (!validateImageDimensions(img)) {
            alert(`图片尺寸不符合要求: ${file.name}，宽高需在 240-8000px，比例 1:8 ~ 8:1`);
            processedCount++;
            if (processedCount === totalToProcess && newImages.length > 0) {
              setReferenceImages(prev => [...prev, ...newImages]);
            }
            return;
          }
          
          newImages.push({ url, preview: url, file });
          processedCount++;
          
          if (processedCount === totalToProcess && newImages.length > 0) {
            setReferenceImages(prev => [...prev, ...newImages]);
          }
        };
        img.onerror = () => {
          alert(`无法读取图片: ${file.name}`);
          processedCount++;
          if (processedCount === totalToProcess && newImages.length > 0) {
            setReferenceImages(prev => [...prev, ...newImages]);
          }
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    });

    // 清空input
    e.target.value = '';
  }, [referenceImages.length, validateImageDimensions]);

  // 删除单张参考图
  const removeReferenceImage = useCallback((index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 清空所有参考图
  const clearReferenceImages = useCallback(() => {
    setReferenceImages([]);
  }, []);

  // 处理拖拽上传
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp'];
    const maxSize = 20 * 1024 * 1024;

    const newImages: ReferenceImage[] = [];
    let processedCount = 0;
    const totalToProcess = Math.min(files.length, 9 - referenceImages.length);

    Array.from(files).slice(0, 9 - referenceImages.length).forEach(file => {
      if (!validFormats.includes(file.type)) {
        alert(`不支持的格式: ${file.name}`);
        processedCount++;
        return;
      }
      if (file.size > maxSize) {
        alert(`文件过大: ${file.name}`);
        processedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        
        // 校验图片尺寸
        const img = new Image();
        img.onload = () => {
          if (!validateImageDimensions(img)) {
            alert(`图片尺寸不符合要求: ${file.name}`);
            processedCount++;
            if (processedCount === totalToProcess && newImages.length > 0) {
              setReferenceImages(prev => [...prev, ...newImages]);
            }
            return;
          }
          
          newImages.push({ url, preview: url, file });
          processedCount++;
          
          if (processedCount === totalToProcess && newImages.length > 0) {
            setReferenceImages(prev => [...prev, ...newImages]);
          }
        };
        img.onerror = () => {
          processedCount++;
          if (processedCount === totalToProcess && newImages.length > 0) {
            setReferenceImages(prev => [...prev, ...newImages]);
          }
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    });
  }, [referenceImages.length, validateImageDimensions]);
  
  // @图片引用处理
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // 检测是否输入了@
    const lastAtIndex = value.lastIndexOf('@', cursorPos - 1);
    if (lastAtIndex !== -1 && tab === 'reference' && referenceImages.length > 0) {
      // 检查@后面是否有空格（如果有空格说明@引用已结束）
      const textAfterAt = value.slice(lastAtIndex + 1, cursorPos);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowImageMention(true);
        setMentionStartIndex(lastAtIndex);
      } else {
        setShowImageMention(false);
      }
    } else {
      setShowImageMention(false);
    }
    
    updatePersistedState({ prompt: value });
  }, [tab, referenceImages.length]);
  
  // 选择@图片引用
  const handleMentionSelect = useCallback((imageIndex: number) => {
    if (mentionStartIndex === -1) return;
    
    const beforeMention = prompt.slice(0, mentionStartIndex);
    const afterCursor = prompt.slice(promptInputRef.current?.selectionStart || mentionStartIndex + 1);
    
    // 插入 @图片N 格式
    const mentionText = `@图片${imageIndex + 1} `;
    const newPrompt = beforeMention + mentionText + afterCursor;
    
    updatePersistedState({ prompt: newPrompt });
    setShowImageMention(false);
    
    // 设置光标位置
    setTimeout(() => {
      if (promptInputRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length;
        promptInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        promptInputRef.current.focus();
      }
    }, 0);
  }, [prompt, mentionStartIndex]);
  
  // 关闭@选择器
  const closeMentionSelector = useCallback(() => {
    setShowImageMention(false);
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
    
    // 更新前端状态并同步localStorage
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {
        // localStorage写入失败时忽略，不影响删除功能
      }
      return updated;
    });
  }, [getAuthHeaders]);
  
  // 获取图片代理URL - 解决OSS URL默认下载问题
  const getProxyUrl = useCallback((url: string) => {
    // base64 data URL 直接返回，不需要代理
    if (url.startsWith('data:')) {
      return url;
    }
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }, []);

  // 问题6: 下载单张图片 - 优先直接下载，失败则使用代理
  const handleDownload = useCallback(async (url: string, index: number) => {
    const filename = `nvwa-image-${Date.now()}-${index + 1}.png`;
    
    try {
      // 方案1: 直接下载
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch {
      // Direct download failed, try proxy
    }
    
    try {
      // 方案2: 使用代理API下载
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&type=image`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy download failed: ${response.status}`);
      }
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
  
  // 轮询任务结果 - 使用ref避免循环引用
  const pollTaskRef = useRef<((taskId: string, savedPrompt: string, savedModel: string, savedRatio: string, savedN: number) => Promise<void>) | null>(null);
  
  const pollTaskResult = useCallback(async (taskId: string, savedPrompt: string, savedModel: string, savedRatio: string, savedN: number) => {
    try {
      // 检查是否为批量任务（taskId包含逗号）
      const isBatch = taskId.includes(',');
      const taskIds = isBatch ? taskId.split(',') : [taskId];
      
      if (isBatch) {
        // 批量任务：并行查询所有任务
        const authHeaders = getAuthHeaders();
        const results = await Promise.all(
          taskIds.map(id => 
            fetch(`/api/ai/tasks/${id}?model=${encodeURIComponent(savedModel)}`, { headers: authHeaders })
              .then(r => r.json())
          )
        );
        
        // 检查所有任务状态
        const allCompleted = results.every(r => {
          const status = r.data?.status || r.data?.output?.status;
          return status === 'SUCCEEDED' || status === 'succeeded' || status === 'SUCCESS';
        });
        
        const anyFailed = results.some(r => {
          const status = r.data?.status || r.data?.output?.status;
          return status === 'FAILED' || status === 'failed' || status === 'ERROR';
        });
        
        if (anyFailed) {
          setError('部分任务生成失败');
          setCurrentPollingId(null);
          setLoading(false);
          return;
        }
        
        if (allCompleted) {
          // 合并所有图片URL
          const allUrls: string[] = [];
          results.forEach(r => {
            const output = r.data?.output || r.data;
            const urls = output.imageUrls || [];
            allUrls.push(...urls);
          });
          
          if (allUrls.length > 0) {
            const generatedImages: GeneratedImage[] = allUrls.map((url: string) => ({
              url,
              ratio: savedRatio,
            }));
            setCurrentResult(generatedImages);
            setPreviewRatio(savedRatio);
            setPreviewCount(allUrls.length);
            
            // 保存到历史记录
            const size = getModelSize(savedModel, savedRatio);
            const item: HistoryItem = {
              id: generateId(),
              prompt: savedPrompt,
              model: savedModel,
              size: size,
              ratio: savedRatio,
              tab,
              imageUrls: allUrls,
              createdAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            };
            saveHistory(item);
            
            localStorage.setItem(STORAGE_KEY_POLLING, JSON.stringify({
              taskId,
              completed: true,
            }));
          } else {
            setError('未获取到生成的图片');
          }
          setCurrentPollingId(null);
          setLoading(false);
        } else {
          // 继续轮询
          setTimeout(() => pollTaskRef.current?.(taskId, savedPrompt, savedModel, savedRatio, savedN), 3000);
        }
        return;
      }
      
      // 单任务逻辑
      const authHeaders = getAuthHeaders();
      const response = await fetch(`/api/ai/tasks/${taskId}?model=${encodeURIComponent(savedModel)}`, {
        headers: authHeaders,
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        // 兼容多种返回格式：后端返回 data.status 或 data.output.task_status
        const output = data.data.output || data.data;
        const status = data.data.status || output.task_status || output.status;
        
        // 兼容多种状态值：阿里云返回 SUCCEEDED，即梦返回 SUCCESS
        if (status === 'SUCCEEDED' || status === 'succeeded' || status === 'SUCCESS') {
          // 兼容多种返回格式
          const urls = output.imageUrls || 
            (output.urls ? output.urls.map((u: { url?: string }) => u.url || u) : []) ||
            (output.results ? output.results.map((r: { url?: string }) => r.url || r) : []);
          
          if (urls.length > 0) {
            // 问题2: 保存生成时的ratio，确保预览框比例固定
            const generatedImages: GeneratedImage[] = urls.map((url: string) => ({
              url,
              ratio: savedRatio,
            }));
            setCurrentResult(generatedImages);
            // 更新预览框比例和数量（仅在生图时更新）
            setPreviewRatio(savedRatio);
            setPreviewCount(urls.length);
            
            // 保存到历史记录
            const size = getModelSize(savedModel, savedRatio);
            const item: HistoryItem = {
              id: generateId(),
              prompt: savedPrompt,
              model: savedModel,
              size: size,
              ratio: savedRatio,
              tab,
              imageUrls: urls,
              createdAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            };
            saveHistory(item);
            
            // 标记任务完成
            localStorage.setItem(STORAGE_KEY_POLLING, JSON.stringify({
              taskId,
              completed: true,
            }));
          } else {
            setError('未获取到生成的图片');
          }
          setCurrentPollingId(null);
          setLoading(false);
        } else if (status === 'FAILED' || status === 'failed' || status === 'ERROR') {
          const errorMsg = data.data.output?.error?.message || data.data.message || '未知错误';
          console.error('Task failed:', errorMsg);
          setError('生成失败：' + errorMsg);
          setCurrentPollingId(null);
          setLoading(false);
          // 标记任务失败
          localStorage.setItem(STORAGE_KEY_POLLING, JSON.stringify({
            taskId,
            completed: true,
            failed: true,
          }));
        } else {
          // 继续轮询
          setTimeout(() => pollTaskRef.current?.(taskId, savedPrompt, savedModel, savedRatio, savedN), 3000);
        }
      } else {
        // 后端可能返回了错误
        if (data.error) {
          setError(data.error);
          setCurrentPollingId(null);
          setLoading(false);
        } else {
          setTimeout(() => pollTaskRef.current?.(taskId, savedPrompt, savedModel, savedRatio, savedN), 3000);
        }
      }
    } catch (err) {
      console.error('Poll error:', err);
      setError('查询任务状态失败');
      setCurrentPollingId(null);
      setLoading(false);
    }
  }, [tab, saveHistory]);
  
  // 将函数存入ref
  useEffect(() => {
    pollTaskRef.current = pollTaskResult;
  }, [pollTaskResult]);
  
  // 问题7: 恢复跨页面的生图任务状态
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY_POLLING);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.taskId && state.prompt && !state.completed) {
          // 恢复生图任务
          updatePersistedState({
            prompt: state.prompt,
            currentModel: state.model || IMAGE_MODELS[0]?.id || 'wanx2.1-t2i-turbo',
            currentRatio: state.ratio || '16:9',
            currentCount: state.n || 1,
          });
          setCurrentPollingId(state.taskId);
          setLoading(true);
          // 开始轮询
          pollTaskResult(state.taskId, state.prompt, state.model || IMAGE_MODELS[0]?.id || 'wanx2.1-t2i-turbo', state.ratio || '16:9', state.n || 1);
        }
      } catch {
        // 忽略
      }
      // 清除保存的状态
      localStorage.removeItem(STORAGE_KEY_POLLING);
    }
  }, [pollTaskResult]);
  
  // 处理@图片引用：从提示词中提取图片引用并返回处理后的提示词和图片列表
  const processMentionReferences = useCallback((text: string, images: ReferenceImage[]): { processedPrompt: string; referencedImages: ReferenceImage[] } => {
    // 匹配 @图片N 格式
    const mentionRegex = /@图片(\d+)/g;
    const mentionedIndices: number[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const index = parseInt(match[1], 10) - 1; // 转换为0-based索引
      if (index >= 0 && index < images.length) {
        mentionedIndices.push(index);
      }
    }
    
    // 移除@标记
    const processedPrompt = text.replace(mentionRegex, '').replace(/\s+/g, ' ').trim();
    
    // 按引用顺序获取图片
    const referencedImages = mentionedIndices.map(i => images[i]).filter(Boolean);
    
    return { processedPrompt, referencedImages };
  }, []);
  
  // 处理生成
  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    
    // 处理@图片引用
    const { processedPrompt, referencedImages } = processMentionReferences(prompt, referenceImages);

    // 角色一致性指令追加
    const finalPrompt = characterConsistency
      ? `${processedPrompt}. Character must maintain exact same face, hairstyle, clothing, and body proportions across all frames. Same person, same appearance, zero variation.`
      : processedPrompt;
    
    // 确定最终使用的参考图片：
    // 1. 如果有@引用，使用@引用的图片
    // 2. 否则在参考图模式下使用所有上传的图片
    const finalReferenceImages = referencedImages.length > 0 
      ? referencedImages 
      : (tab === 'reference' ? referenceImages : []);
    
    // 根据尺寸模式获取尺寸
    // - 分辨率档位模式：直接使用 1K/2K/4K
    // - 比例模式：根据比例计算像素值
    let size: string;
    if (sizeMode === 'resolution') {
      // 分辨率档位模式：直接传 1K/2K/4K
      size = resolutionTier;
    } else {
      // 比例模式：根据比例计算像素值
      size = getModelSize(currentModel, currentRatio);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      setCurrentResult([]);
      setCurrentPollingId('pending');
      
      // 获取认证头
      const authHeaders = getAuthHeaders();
      if (!authHeaders.Authorization) {
        setError('登录已失效，请重新登录');
        setLoading(false);
        setCurrentPollingId(null);
        return;
      }
      
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          model: currentModel,
          size: size,
          n: currentCount,
          // 参考生图模式：传递处理后的参考图片（支持@引用）
          ...(finalReferenceImages.length > 0 ? { referenceImages: finalReferenceImages } : {}),
        }),
      });
      
      const result = await response.json();
      
      if (response.status === 401) {
        setError('登录已失效，请重新登录');
        setCurrentPollingId(null);
        setLoading(false);
        return;
      }
      
      if (result.success && result.data) {
        // 优先处理同步返回的图片URL（万相2.7同步模式）
        const imageUrls = result.data.imageUrls || result.data.image_urls;
        if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
          // 同步模式：直接显示图片
          const generatedImages: GeneratedImage[] = imageUrls.map((url: string) => ({
            url,
            ratio: currentRatio,
          }));
          setCurrentResult(generatedImages);
          // 更新预览框比例和数量（仅在生图时更新）
          setPreviewRatio(currentRatio);
          setPreviewCount(imageUrls.length);
          setCurrentPollingId(null);
          setLoading(false);
          
          // 保存到历史记录
          const size = getModelSize(currentModel, currentRatio);
          const item: HistoryItem = {
            id: generateId(),
            prompt: finalPrompt,
            model: currentModel,
            size: size,
            ratio: currentRatio,
            tab,
            imageUrls: imageUrls,
            createdAt: new Date().toISOString(),
          };
          saveHistory(item);
          return;
        }
        
        // 异步模式：获取任务ID，开始轮询
        const taskId = result.data.taskId || result.data.task_id;
        const taskIds = result.data.taskIds; // 批量任务ID
        
        if (taskIds && taskIds.length > 0) {
          // 批量任务：存储所有taskId，用逗号分隔
          const combinedTaskId = taskIds.join(',');
          setCurrentPollingId(combinedTaskId);
          localStorage.setItem(STORAGE_KEY_POLLING, JSON.stringify({
            taskId: combinedTaskId,
            prompt: finalPrompt,
            model: currentModel,
            ratio: currentRatio,
            n: currentCount,
            completed: false,
          }));
          pollTaskResult(combinedTaskId, finalPrompt, currentModel, currentRatio, currentCount);
        } else if (taskId) {
          setCurrentPollingId(taskId);
          // 保存生图任务状态到localStorage
          localStorage.setItem(STORAGE_KEY_POLLING, JSON.stringify({
            taskId,
            prompt: finalPrompt,
            model: currentModel,
            ratio: currentRatio,
            n: currentCount,
            completed: false,
          }));
          // 开始轮询，传递当前参数
          pollTaskResult(taskId, finalPrompt, currentModel, currentRatio, currentCount);
        } else {
          setCurrentPollingId(null);
          setLoading(false);
          setError('未获取到生成结果，请重试');
        }
      } else {
        setError(result.error || '生成失败');
        setCurrentPollingId(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('Generate failed:', err);
      setError('生成失败，请检查网络后重试');
      setCurrentPollingId(null);
      setLoading(false);
    }
  };
  
  // 轮询状态
  const isPolling = currentPollingId !== null && currentPollingId !== 'pending';
  const isPending = currentPollingId === 'pending';
  
  // 预览大图
  const handlePreview = (url: string, index: number) => {
    setPreviewUrl(url);
    setPreviewIndex(index);
  };
  
  // 预览历史图片
  const handlePreviewHistory = (item: HistoryItem, index: number) => {
    setPreviewHistoryItem(item);
    setPreviewHistoryIndex(index);
  };
  
  // 历史预览 - 上一张
  const handlePrevHistoryImage = () => {
    if (previewHistoryItem && previewHistoryIndex > 0) {
      setPreviewHistoryIndex(prev => prev - 1);
    }
  };
  
  // 历史预览 - 下一张
  const handleNextHistoryImage = () => {
    if (previewHistoryItem && previewHistoryIndex < previewHistoryItem.imageUrls.length - 1) {
      setPreviewHistoryIndex(prev => prev + 1);
    }
  };
  
  // 当前预览 - 上一张
  const handlePrevImage = useCallback(() => {
    if (previewIndex > 0 && currentResult[previewIndex - 1]) {
      setPreviewIndex(prev => prev - 1);
      setPreviewUrl(currentResult[previewIndex - 1].url);
    }
  }, [previewIndex, currentResult]);
  
  // 当前预览 - 下一张
  const handleNextImage = useCallback(() => {
    if (previewIndex < currentResult.length - 1 && currentResult[previewIndex + 1]) {
      setPreviewIndex(prev => prev + 1);
      setPreviewUrl(currentResult[previewIndex + 1].url);
    }
  }, [previewIndex, currentResult]);
  
  // 键盘左右键切换预览图片（当前预览和历史预览）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 历史预览
      if (previewHistoryItem && previewHistoryItem.imageUrls.length > 1) {
        if (e.key === 'ArrowLeft') {
          handlePrevHistoryImage();
        } else if (e.key === 'ArrowRight') {
          handleNextHistoryImage();
        }
      }
      // 当前预览
      else if (previewUrl && currentResult.length > 1) {
        if (e.key === 'ArrowLeft') {
          handlePrevImage();
        } else if (e.key === 'ArrowRight') {
          handleNextImage();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewHistoryItem, previewHistoryIndex, previewUrl, previewIndex, currentResult.length, handlePrevImage, handleNextImage]);
  
  // 根据当前模型动态生成比例选项
  const ratioOptions: DropdownOption[] = useMemo(() => {
    const modelSizes = MODEL_SIZES[currentModel];
    if (modelSizes) {
      return Object.entries(modelSizes).map(([key, value]) => ({
        value: key,
        label: key,
        description: value.label,
      }));
    }
    // 默认选项（兼容旧模型）
    return [
      { value: '16:9', label: '16:9', description: '横屏视频 1280×720' },
      { value: '9:16', label: '9:16', description: '竖屏短视频 720×1280' },
      { value: '1:1', label: '1:1', description: '方形图片 1024×1024' },
      { value: '4:3', label: '4:3', description: '经典比例 1024×768' },
      { value: '3:4', label: '3:4', description: '竖屏照片 768×1024' },
    ];
  }, [currentModel]);
  
  // 模型切换时自动切换到有效比例
  useEffect(() => {
    const modelSizes = MODEL_SIZES[currentModel];
    if (modelSizes && !modelSizes[currentRatio]) {
      // 当前比例在新模型中不支持，切换到第一个可用比例
      updatePersistedState({ currentRatio: Object.keys(modelSizes)[0] });
    }
  }, [currentModel, currentRatio]);
  
  // 模型选项
  const modelOptions: DropdownOption[] = IMAGE_MODELS.map(m => ({
    value: m.id,
    label: m.name,
    description: (m as { description?: string }).description || '',
  }));
  
  // 手机端参数面板状态
  const [showParams, setShowParams] = useState(false);

  // 计算图片排版 - 统一使用20px间隔，自适应填满空间
  // 支持5种比例(16:9, 9:16, 1:1, 4:3, 3:4) × 4种数量(1,2,3,4) = 20种组合
  const getGridClass = (count: number) => {    
    if (count === 1) {
      return 'flex items-center justify-center'; // 单张居中
    }
    
    if (count === 2) {
      return 'flex flex-row gap-[20px] items-center justify-center'; // 两张并排居中，20px间距
    }
    
    if (count === 3) {
      return 'flex flex-row gap-[20px] items-center justify-center'; // 三张并排居中，20px间距
    }
    
    // 4张：2x2网格，20px间距
    return 'grid grid-cols-2 gap-[20px] place-items-center';
  };

  // 解析ratio值，返回宽高比数值（宽/高）
  // 例如：'9:16' -> 9/16 = 0.5625, '16:9' -> 16/9 = 1.778
  const parseRatio = (ratio: string): number => {
    // 比例格式：'9:16', '16:9', '1:1' 等
    if (ratio.includes(':')) {
      const [w, h] = ratio.split(':').map(Number);
      if (w && h) return w / h;
    }
    // 分辨率格式：'720*1280', '1280*720', '1280*1280' 等
    if (ratio.includes('*')) {
      const [w, h] = ratio.split('*').map(Number);
      if (w && h) return w / h;
    }
    return 1; // 默认方形
  };

  // 将ratio转换为CSS aspectRatio格式（字符串 '宽/高'）
  const getCSSAspectRatio = (ratio: string): string => {
    if (ratio.includes(':')) {
      return ratio.replace(':', '/'); // '9:16' -> '9/16'
    }
    if (ratio.includes('*')) {
      const [w, h] = ratio.split('*').map(Number);
      return `${w}/${h}`;
    }
    return '1/1';
  };

  // 计算图片容器尺寸 - 使用CSS aspectRatio属性强制宽高比
  // 核心原则：横版以宽度为基准，竖版以高度为基准
  const getImageContainerStyle = (count: number, ratio: string): React.CSSProperties => {
    const cssRatio = getCSSAspectRatio(ratio);
    const numRatio = parseRatio(ratio);
    const isVertical = numRatio < 1; // 竖版: 9:16, 3:4 (宽<高)
    
    if (count === 1) {
      if (isVertical) {
        // 竖版单张：以高度为基准，宽度按比例计算
        return {
          height: '85%',
          aspectRatio: cssRatio,
          maxWidth: '90%',
        };
      }
      // 横版/方形单张：使用max尺寸让浏览器自适应
      return {
        maxWidth: '80%',
        maxHeight: '85%',
        aspectRatio: cssRatio,
      };
    }
    
    if (count === 2) {
      return {
        width: 'calc(50% - 10px)',
        aspectRatio: cssRatio,
        maxHeight: 'calc(100vh - 360px)',
      };
    }
    
    if (count === 3) {
      return {
        width: 'calc(33.333% - 13.33px)',
        aspectRatio: cssRatio,
        maxHeight: 'calc(100vh - 360px)',
      };
    }
    
    // 4张：2x2网格
    return {
      width: 'calc(50% - 10px)',
      aspectRatio: cssRatio,
      maxHeight: 'calc((100vh - 380px) / 2)',
    };
  };

  // 图片尺寸 - 在容器内填满，保持比例
  const getImageStyle = (ratio: string): React.CSSProperties => {
    return {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      borderRadius: '8px',
    };
  };

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
        
        {/* 问题1: 左侧参数栏 - 手机端滑出抽屉，桌面端固定显示 */}
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
          <div className="flex p-4 pb-0">
            <button
              onClick={() => updatePersistedState({ tab: 'reference' })}
              className={`flex-1 py-2 text-sm rounded-t-lg transition-colors ${
                tab === 'reference'
                  ? 'bg-[#1A1A1A] text-white font-medium'
                  : 'bg-[#141414] text-[#888888] hover:text-white'
              }`}
            >
              参考生图
            </button>
            <button
              onClick={() => updatePersistedState({ tab: 'text' })}
              className={`flex-1 py-2 text-sm rounded-t-lg transition-colors ${
                tab === 'text'
                  ? 'bg-[#1A1A1A] text-white font-medium'
                  : 'bg-[#141414] text-[#888888] hover:text-white'
              }`}
            >
              文生图片
            </button>
          </div>
          
          {/* 参数区 - 问题3: 调整间距为16-24px */}
          <div className="flex-1 flex flex-col p-4 pt-0">
            {/* 参考图上传区域 - 仅在参考生图Tab下显示 */}
            {tab === 'reference' && (
              <div className="py-3">
                <label className="text-sm text-white font-medium mb-2 block">
                  参考图片 ({referenceImages.length}/9)
                </label>
                {/* 多图上传区域 */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {referenceImages.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-[#333333] group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.preview}
                        alt={`图片${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => removeReferenceImage(index)}
                          className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
                        图片{index + 1}
                      </div>
                    </div>
                  ))}
                  {/* 上传按钮 */}
                  {referenceImages.length < 9 && (
                    <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-[#333333] rounded-lg cursor-pointer hover:border-[#0ABAB5] transition-colors">
                      <Upload className="w-6 h-6 text-[#666666]" />
                      <span className="text-xs text-[#666666] mt-1">上传</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp,image/bmp"
                        className="hidden"
                        multiple
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-[#666666]">
                  支持 JPG/PNG/WEBP/BMP，单张≤20MB，最多9张
                </p>
              </div>
            )}
            
            {/* 问题3: 提示词输入 - 高度减少30px，底部间距20px */}
            <div className="flex flex-col py-3 relative">
              <textarea
                ref={promptInputRef}
                value={prompt}
                onChange={handlePromptChange}
                onBlur={closeMentionSelector}
                placeholder={tab === 'reference' ? "输入描述，例如：保持参考图的风格，生成一张...（输入@可引用图片）" : "输入文字，描述想要生成的内容"}
                className="w-full h-[90px] p-3 bg-[#141414] border border-[#333333] rounded-lg text-white text-sm placeholder:text-[#666666] resize-none focus:outline-none focus:border-[#0ABAB5]"
              />
              {/* @图片选择器 */}
              {showImageMention && referenceImages.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#1A1A1A] border border-[#333333] rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  <div className="p-2 text-xs text-[#666666] border-b border-[#333333]">选择要引用的图片</div>
                  {referenceImages.map((img, index) => (
                    <button
                      key={index}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleMentionSelect(index);
                      }}
                      className="w-full flex items-center gap-2 p-2 hover:bg-[#252525] transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.preview}
                        alt={`图片${index + 1}`}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <span className="text-sm text-white">图片{index + 1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* P-Show-4: 角色一致性开关 */}
            <div className="flex items-center justify-between py-2 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">角色一致性</span>
                <span className="text-xs text-[#666666]">保持多帧角色外观统一</span>
              </div>
              <button
                onClick={() => {
                  const newValue = !characterConsistency;
                  setCharacterConsistency(newValue);
                  const consistencyText = ', character consistency, same face, same outfit';
                  if (newValue && !prompt.includes('character consistency')) {
                    updatePersistedState({ prompt: prompt + consistencyText });
                  } else if (!newValue && prompt.includes('character consistency')) {
                    updatePersistedState({ prompt: prompt.replace(consistencyText, '').trim() });
                  }
                }}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  characterConsistency ? 'bg-[#0ABAB5]' : 'bg-[#333333]'
                }`}
                aria-label={characterConsistency ? '关闭角色一致性' : '开启角色一致性'}
                aria-pressed={characterConsistency}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  characterConsistency ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* 问题4: 删除试用样例按钮 */}

            {/* 问题3: 间距调整为20px（模型选择顶部间距） */}
            {/* 模型选择 */}
            <div className="space-y-2 mt-5">
              <label className="text-sm text-white font-medium">模型</label>
              <DropdownSelect
                options={modelOptions}
                value={currentModel}
                onChange={(val) => updatePersistedState({ currentModel: val })}
                placeholder="选择模型"
                showDescription
              />
            </div>
            
            {/* 尺寸选择 */}
            <div className="space-y-3 mt-5">
              <label className="text-sm text-white font-medium">尺寸</label>
              
              {/* 尺寸模式切换 */}
              {modelConfig && modelConfig.sizeModes.length > 1 && (
                <div className="flex gap-2">
                  {modelConfig.sizeModes.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updatePersistedState({ sizeMode: mode })}
                      className={`flex-1 py-2 px-3 text-xs rounded-lg transition-colors ${
                        sizeMode === mode
                          ? 'bg-[#0ABAB5] text-white'
                          : 'bg-[#1A1A1A] text-[#888888] hover:bg-[#252525] hover:text-white'
                      }`}
                    >
                      {mode === 'resolution' ? '分辨率档位' : '按比例'}
                    </button>
                  ))}
                </div>
              )}
              
              {/* 分辨率档位选择 */}
              {sizeMode === 'resolution' && modelConfig && (
                <DropdownSelect
                  options={getResolutionOptions(modelConfig, hasReferenceImages)}
                  value={resolutionTier}
                  onChange={(val) => updatePersistedState({ resolutionTier: val })}
                  placeholder="选择分辨率"
                  showDescription
                />
              )}
              
              {/* 按比例选择 */}
              {sizeMode === 'aspectRatio' && modelConfig && (
                <DropdownSelect
                  options={getRatioOptions(modelConfig)}
                  value={currentRatio}
                  onChange={(val) => updatePersistedState({ currentRatio: val })}
                  placeholder="选择比例"
                  showDescription
                />
              )}
              
              {/* 当前尺寸预览 */}
              {currentSize && (
                <div className="text-xs text-[#888888]">
                  输出尺寸：{currentSize}
                </div>
              )}
            </div>
            
            {/* 生成数量 */}
            <div className="space-y-2 mt-5">
              <label className="text-sm text-white font-medium">数量</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => updatePersistedState({ currentCount: num })}
                    className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                      currentCount === num
                        ? 'bg-[#0ABAB5] text-white'
                        : 'bg-[#1A1A1A] text-[#888888] hover:bg-[#252525] hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* 创作按钮 - 固定在底部 */}
          <div className="p-4 border-t border-[#333333]">
            <button
              onClick={() => {
                setShowParams(false);
                handleGenerate();
              }}
              disabled={loading || !prompt.trim() || (tab === 'reference' && referenceImages.length === 0)}
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
        
        {/* 右侧内容区 - 固定高度布局 */}
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
            <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <span className="w-4 h-4 shrink-0 flex items-center justify-center">!</span>
              <span>{error}</span>
            </div>
          )}
          
          {/* 生成结果区 - 固定高度区域 */}
          <div className="flex-1 p-4 flex items-center justify-center overflow-hidden min-h-0">
            <div className="w-full h-full flex items-center justify-center">
              {isPending ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0ABAB5] mx-auto mb-2" />
                  <p className="text-sm text-[#888888]">准备生成...</p>
                </div>
              ) : isPolling ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0ABAB5] mx-auto mb-2" />
                  <p className="text-sm text-[#888888]">生成中，请稍候...</p>
                  <p className="text-xs text-[#666666] mt-1">任务ID: {currentPollingId?.slice(0, 8)}...</p>
                </div>
              ) : currentResult.length > 0 ? (
                /* 图片排版布局 - 智能网格居中展示，使用previewRatio保持比例 */
                <div className={`w-full h-full ${getGridClass(previewCount)}`}>
                  {currentResult.slice(0, previewCount).map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-center"
                      style={getImageContainerStyle(previewCount, previewRatio)}
                    >
                      {/* 图片预览容器 - 智能缩放 */}
                      <div
                        className="relative bg-[#141414] rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-lg hover:shadow-[#0ABAB5]/20 h-full w-full flex items-center justify-center"
                        onClick={() => handlePreview(item.url, index)}
                      >
                        <img
                          src={getProxyUrl(item.url)}
                          alt={`生成图片 ${index + 1}`}
                          style={getImageStyle(previewRatio)}
                        />
                        {/* 悬停遮罩 */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <ZoomIn className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-[#666666]">
                  <Wand2 className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-base mb-1">输入提示词开始创作</p>
                  <p className="text-xs">例如：一只可爱的橘猫在阳光下打盹</p>
                </div>
              )}
            </div>
          </div>
          
          {/* 问题5: 历史记录区 - 位置上移，与"尺寸比例"控件顶部对齐 */}
          <div className="border-t border-[#333333] p-4 mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#666666]" />
              <span className="text-sm text-[#888888]">历史记录</span>
              {history.length > 0 && (
                <span className="text-xs text-[#666666]">({history.length})</span>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-[#666666] text-center py-4">暂无历史记录</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 group"
                  >
                    {/* 历史图片缩略图 */}
                    <div
                      className="relative w-20 h-20 bg-[#141414] rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => handlePreviewHistory(item, 0)}
                    >
                      {item.imageUrls[0] ? (
                        <img
                          src={item.imageUrls[0]}
                          alt={item.prompt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-[#666666]" />
                        </div>
                      )}
                      {/* 多张图片标记 */}
                      {item.imageUrls.length > 1 && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-[#0ABAB5] rounded text-[10px] text-white font-medium">
                          {item.imageUrls.length}张
                        </div>
                      )}
                      {/* 删除按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(item.id);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                    <div className="mt-1">
                      <p className="text-[10px] text-[#888888] truncate w-20">
                        {item.tab === 'text' ? '文生图' : '参考图'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 预览弹窗 - 支持多张图片左右切换，全屏显示原图 */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setPreviewUrl(null)}
        >
          {/* 关闭按钮 */}
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* 左箭头 - 多张图片时显示 */}
          {currentResult.length > 1 && previewIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIndex(prev => prev - 1);
                if (currentResult[previewIndex - 1]) {
                  setPreviewUrl(currentResult[previewIndex - 1].url);
                }
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          {/* 右箭头 - 多张图片时显示 */}
          {currentResult.length > 1 && previewIndex < currentResult.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIndex(prev => prev + 1);
                if (currentResult[previewIndex + 1]) {
                  setPreviewUrl(currentResult[previewIndex + 1].url);
                }
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          
          {/* 图片容器 - 接近全屏显示 */}
          <div className="w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={getProxyUrl(previewUrl)}
              alt={`预览图片 ${previewIndex + 1}`}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
            />
          </div>
          
          {/* 底部操作栏 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(previewUrl, previewIndex);
              }}
              className="px-6 py-2 bg-[#0ABAB5] hover:bg-[#099d98] text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载原图
            </button>
            <span className="text-xs text-[#888888]">
              当前图片 {previewIndex + 1} / {currentResult.length}
            </span>
          </div>
        </div>
      )}
      
      {/* 历史记录预览弹窗 - 支持多张图片左右切换，全屏显示 */}
      {previewHistoryItem && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => {
            setPreviewHistoryItem(null);
            setPreviewHistoryIndex(0);
          }}
        >
          {/* 关闭按钮 */}
          <button
            onClick={() => {
              setPreviewHistoryItem(null);
              setPreviewHistoryIndex(0);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* 左箭头 - 多张图片时显示 */}
          {previewHistoryItem.imageUrls.length > 1 && previewHistoryIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevHistoryImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          {/* 右箭头 - 多张图片时显示 */}
          {previewHistoryItem.imageUrls.length > 1 && previewHistoryIndex < previewHistoryItem.imageUrls.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextHistoryImage();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          
          {/* 图片容器 - 全屏显示 */}
          <div className="w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={getProxyUrl(previewHistoryItem.imageUrls[previewHistoryIndex])}
              alt="历史图片预览"
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
            />
          </div>
          
          {/* 底部操作栏 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (previewHistoryItem.imageUrls[previewHistoryIndex]) {
                  handleDownload(previewHistoryItem.imageUrls[previewHistoryIndex], previewHistoryIndex);
                }
              }}
              className="px-6 py-2 bg-[#0ABAB5] hover:bg-[#099d98] text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载原图
            </button>
            {previewHistoryItem.imageUrls.length > 1 && (
              <span className="text-xs text-[#888888]">
                {previewHistoryIndex + 1} / {previewHistoryItem.imageUrls.length}
              </span>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
