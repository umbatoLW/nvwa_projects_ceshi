'use client';

import { useState } from 'react';
import { Download, Loader2, Sparkles, ImageIcon, X, Package, Film, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ScriptStoryboard {
  num: number;
  duration: string;
  description: string;
  character: string;
  shot: string;
  camera: string;
  audio: string;
  imgUrl?: string;
  videoUrl?: string;
}

interface StoryboardCardProps {
  sb: ScriptStoryboard;
  onImageGenerated?: (url: string) => void;
  onVideoGenerated?: (url: string) => void;
  onPromptOptimized?: (optimizedPrompt: string) => void;
  index: number;
  scriptId?: string; // 剧本ID，用于持久化
}

// 预览模式类型
type PreviewMode = 'image' | 'video';

export function StoryboardCard({ 
  sb, 
  onImageGenerated,
  onVideoGenerated,
  onPromptOptimized,
  index,
  scriptId
}: StoryboardCardProps) {
  // 组合提示词：描述 + 镜头（如果有）
  const initialPrompt = sb.description + (sb.shot ? `\n镜头：${sb.shot}` : '');
  
  const [optimizing, setOptimizing] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState(initialPrompt);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(sb.imgUrl || null);
  const [imgRatio, setImgRatio] = useState('16:9');
  const [showLightbox, setShowLightbox] = useState(false);
  
  // 新增：任务ID和进度状态
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressText, setProgressText] = useState('');
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  
  // 新增：视频相关状态 - 从sb中加载已保存的视频URL
  const [videoUrl, setVideoUrl] = useState<string | null>(sb.videoUrl || null);
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  
  // 预览切换状态：当图片和视频都存在时，用于切换显示
  const [previewMode, setPreviewMode] = useState<PreviewMode>('image');
  // 提示词预览折叠
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const handleOptimizePrompt = async () => {
    setOptimizing(true);
    try {
      const res = await apiFetch('/api/ai/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: editablePrompt }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const optimizedPrompt = String(data.data);
        setEditablePrompt(optimizedPrompt);
        
        // 自动保存优化后的提示词到数据库
        await saveOptimizedPrompt(optimizedPrompt);
        
        toast.success('提示词优化成功');
      }
    } catch {
      // keep current prompt
    }
    setOptimizing(false);
  };

  // 新增：保存优化提示词函数
  const saveOptimizedPrompt = async (prompt: string) => {
    // 先调用回调更新父组件状态
    if (onPromptOptimized) {
      onPromptOptimized(prompt);
    }
    
    // 同时保存到数据库
    if (!scriptId) {
      console.warn('缺少 scriptId，无法保存优化提示词到数据库');
      return;
    }
    
    try {
      // 获取当前剧本数据
      const getRes = await apiFetch(`/api/scripts/${scriptId}`);
      const scriptData = await getRes.json();
      
      if (!scriptData.success || !scriptData.data) {
        console.warn('获取剧本数据失败');
        return;
      }
      
      const script = scriptData.data;
      if (!script.storyboards || !Array.isArray(script.storyboards)) {
        console.warn('剧本没有分镜数据');
        return;
      }
      
      // 分离描述和镜头信息，避免重复保存
      let descriptionOnly = prompt;
      let shotInfo = '';
      
      // 查找并提取镜头信息
      const shotMatch = prompt.match(/\n?镜头[：:：]\s*(.+?)(?=\n|$)/);
      if (shotMatch) {
        shotInfo = shotMatch[1].trim();
        descriptionOnly = prompt.replace(shotMatch[0], '').trim();
      }
      
      // 更新对应分镜的描述和镜头
      const updatedStoryboards = [...script.storyboards];
      if (updatedStoryboards[index]) {
        updatedStoryboards[index] = {
          ...updatedStoryboards[index],
          description: descriptionOnly,
          // 如果优化后的提示词包含镜头信息，更新shot字段
          ...(shotInfo && { shot: shotInfo }),
        };
      }
      
      // 保存到数据库
      const updateRes = await apiFetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboards: updatedStoryboards,
        }),
      });
      
      const result = await updateRes.json();
      if (!result.success) {
        console.warn('保存优化提示词到数据库失败:', result.error);
      } else {
        console.log('[StoryboardCard] 优化提示词已保存到数据库');
      }
    } catch (err) {
      console.warn('保存优化提示词失败:', err);
    }
  };

  const handleGenerateImage = async () => {
    if (!editablePrompt) return;
    setGeneratingImg(true);
    setProgress(10);
    setProgressText('正在提交任务...');
    
    try {
      console.log('[StoryboardCard] 开始生成分镜图, prompt:', editablePrompt.substring(0, 50));
      const res = await apiFetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: editablePrompt, 
          model: 'wan2.7-image-pro', // 阿里云万相2.7 Pro
          n: 1,
          size: imgRatio === "16:9" ? "1280*720" : imgRatio === "9:16" ? "720*1280" : "1024*1024"
        }),
      });
      const data = await res.json();
      console.log('[StoryboardCard] API返回:', data);
      
      // API返回格式：
      // - 同步模式: { success: true, data: { imageUrls: [...] } }
      // - 异步单任务: { success: true, data: { taskId: "..." } }
      // - 即梦批量任务: { success: true, data: { taskIds: ["..."] } }
      const imageUrls = data?.data?.imageUrls || data?.imageUrls;
      const taskId = data?.data?.taskId || data?.taskId;
      const taskIds = data?.data?.taskIds || data?.taskIds;
      
      console.log('[StoryboardCard] 解析结果:', { imageUrls, taskId, taskIds, success: data?.success });
      
      if (imageUrls && imageUrls.length > 0) {
        // 同步模式：直接获取图片
        const url = imageUrls[0];
        console.log('[StoryboardCard] 同步模式获取图片:', url);
        setImgUrl(url);
        onImageGenerated?.(url);
        setProgress(100);
        setProgressText('生成完成');
        toast.success('分镜图生成成功');
        // 自动保存到数据库
        await handleAutoSave(url);
        setTimeout(() => {
          setGeneratingImg(false);
          setProgress(null);
        }, 1000);
      } else if (taskIds && taskIds.length > 0) {
        // 即梦异步模式：需要轮询查询任务状态（取第一个taskId）
        const firstTaskId = taskIds[0];
        console.log('[StoryboardCard] 即梦异步模式，任务IDs:', taskIds, '使用:', firstTaskId);
        setCurrentTaskId(firstTaskId);
        setProgress(20);
        setProgressText('任务已提交，等待处理...');
        toast.info('图片生成任务已提交，正在处理中...');
        
        // 立即开始轮询（不延迟），传递model参数
        pollImageTask(firstTaskId, 0, 'seedream-4.6-t2i');
      } else if (taskId) {
        // 其他异步模式：需要轮询查询任务状态
        console.log('[StoryboardCard] 其他异步模式，任务ID:', taskId);
        setCurrentTaskId(taskId);
        setProgress(20);
        setProgressText('任务已提交，等待处理...');
        toast.info('图片生成任务已提交，正在处理中...');
        
        // 立即开始轮询（不延迟），传递model参数
        pollImageTask(taskId, 0, 'wan2.7-image-pro');
      } else {
        const errorMsg = data?.error || data?.data?.error || '生图失败，未知响应格式';
        console.error('[StoryboardCard] 生图失败:', errorMsg, data);
        toast.error(errorMsg);
        setGeneratingImg(false);
        setProgress(null);
      }
    } catch (error) {
      console.error('生图错误:', error);
      toast.error('生图失败，请检查网络和API配置');
      setGeneratingImg(false);
      setProgress(null);
    }
  };

  // 新增：图片任务轮询函数
  const pollImageTask = async (taskId: string, attempts: number = 0, model: string = 'wan2.7-image-pro') => {
    const maxAttempts = 60;
    const pollInterval = 3000;
    
    try {
      // 关键：传递model参数，让API知道如何查询任务状态
      const taskRes = await apiFetch(`/api/ai/tasks/${taskId}?model=${encodeURIComponent(model)}`);
      const taskData = await taskRes.json();
      console.log(`[StoryboardCard] 轮询第${attempts + 1}次, 完整响应:`, taskData);
      
      // 兼容多种状态格式（与AI文生图页面一致）
      const output = taskData?.data?.output || taskData?.data || {};
      const status = taskData?.data?.status || output.task_status || output.status;
      console.log(`[StoryboardCard] 解析后状态: ${status}`);
      
      const progressPercent = Math.min(20 + (attempts * 1.5), 90);
      
      if (status === 'SUCCEEDED' || status === 'succeeded' || status === 'SUCCESS' || status === 'DONE' || status === 'done') {
        // 兼容多种URL格式（与AI文生图页面一致）
        let urls: string[] = [];
        
        // 情况1: output.imageUrls
        if (output.imageUrls && Array.isArray(output.imageUrls)) {
          urls = output.imageUrls;
        }
        // 情况2: output.urls
        else if (output.urls && Array.isArray(output.urls)) {
          urls = output.urls.map((u: { url?: string } | string) => 
            typeof u === 'string' ? u : u.url || ''
          ).filter(Boolean);
        }
        // 情况3: output.results
        else if (output.results && Array.isArray(output.results)) {
          urls = output.results.map((r: { url?: string } | string) => 
            typeof r === 'string' ? r : r.url || ''
          ).filter(Boolean);
        }
        // 情况4: taskData.data.imageUrls
        else if (taskData?.data?.imageUrls && Array.isArray(taskData.data.imageUrls)) {
          urls = taskData.data.imageUrls;
        }
        // 情况5: output.url 或 output.imageUrl（单个URL的情况）
        else if (output.url) {
          urls = [output.url];
        }
        else if (output.imageUrl) {
          urls = [output.imageUrl];
        }
        // 情况6: taskData.data.output.url
        else if (taskData?.data?.output?.url) {
          urls = [taskData.data.output.url];
        }
        
        console.log('[StoryboardCard] 解析到的图片URLs:', urls);
        
        if (urls.length > 0) {
          const url = urls[0];
          console.log('[StoryboardCard] 任务完成，获取图片:', url);
          setImgUrl(url);
          onImageGenerated?.(url);
          setProgress(100);
          setProgressText('生成完成');
          toast.success('分镜图生成成功');
          // 自动保存到数据库
          await handleAutoSave(url);
        } else {
          console.error('[StoryboardCard] 任务完成但未获取到图片, output:', output);
          console.error('[StoryboardCard] 完整响应 taskData:', JSON.stringify(taskData, null, 2));
          toast.error('任务完成但未获取到图片');
        }
        setGeneratingImg(false);
        setCurrentTaskId(null);
        setTimeout(() => setProgress(null), 2000);
      } else if (status === 'FAILED' || status === 'failed' || status === 'ERROR') {
        toast.error(taskData?.data?.message || output.message || '图片生成失败');
        setGeneratingImg(false);
        setCurrentTaskId(null);
        setProgress(null);
      } else {
        // 更新进度
        setProgress(Math.round(progressPercent));
        setProgressText(`正在生成... ${Math.round(progressPercent)}%`);
        
        if (attempts < maxAttempts) {
          setTimeout(() => pollImageTask(taskId, attempts + 1, model), pollInterval);
        } else {
          toast.error('图片生成超时，请稍后刷新查看');
          setGeneratingImg(false);
          setCurrentTaskId(null);
          setProgress(null);
        }
      }
    } catch (err) {
      console.error('[StoryboardCard] 轮询出错:', err);
      if (attempts < maxAttempts) {
        setTimeout(() => pollImageTask(taskId, attempts + 1, model), pollInterval);
      } else {
        toast.error('查询任务状态失败');
        setGeneratingImg(false);
        setCurrentTaskId(null);
        setProgress(null);
      }
    }
  };

  // 新增：自动保存图片到资产库
  const handleAutoSave = async (url: string) => {
    try {
      const res = await apiFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image',
          category: 'storyboard',
          name: `分镜${sb.num || index + 1}`,
          url: url,
          prompt: editablePrompt,
          model: 'wan2.7-image-pro',
          metadata: {
            index: index,
            ratio: imgRatio,
          },
        }),
      });
      const result = await res.json();
      if (!result.success) {
        console.warn('自动保存失败:', result.error);
      }
    } catch (err) {
      console.warn('自动保存失败:', err);
    }
  };

  const handleSaveToAssetLibrary = async () => {
    if (!imgUrl) return;
    try {
      const res = await apiFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image',
          name: `分镜${sb.num || index + 1}`,
          url: imgUrl,
          description: editablePrompt,
          tags: ['分镜', '剧本'],
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('已保存到资产库');
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch {
      toast.error('保存到资产库失败');
    }
  };

  const handleGenerateVideo = async () => {
    if (!editablePrompt) return;

    setGeneratingVideo(true);
    setVideoProgress(10);
    
    try {
      // 使用 Seedance 2.0 模型（支持文生视频和图生视频）
      const videoModel = 'seedance2';
      console.log('[StoryboardCard] 开始生成视频, model:', videoModel, 'hasImage:', !!imgUrl);
      
      const res = await apiFetch('/api/ai/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editablePrompt,
          model: videoModel,
          duration: 5,
          aspectRatio: imgRatio,
          firstFrameImage: imgUrl || undefined, // 图生视频时传入图片
        }),
      });
      const data = await res.json();
      console.log('[StoryboardCard] 视频API返回:', data);
      
      if (data.success && data.data?.taskId) {
        setVideoTaskId(data.data.taskId);
        setVideoProgress(20);
        toast.info('视频生成任务已提交，正在处理中...');
        // 立即开始轮询，传递 model 参数
        pollVideoTask(data.data.taskId, videoModel);
      } else {
        toast.error(data.error || '视频生成失败');
        setGeneratingVideo(false);
        setVideoProgress(null);
      }
    } catch (error) {
      console.error('[StoryboardCard] 视频生成错误:', error);
      toast.error('视频生成失败');
      setGeneratingVideo(false);
      setVideoProgress(null);
    }
  };

  // 新增：视频任务轮询函数
  const pollVideoTask = async (taskId: string, model: string = 'seedance2', attempts: number = 0) => {
    const maxAttempts = 60;
    const pollInterval = 5000;
    
    try {
      const taskRes = await apiFetch(`/api/ai/generate-video?taskId=${taskId}&model=${model}`);
      const taskData = await taskRes.json();
      console.log(`[StoryboardCard] 视频轮询第${attempts + 1}次, 状态:`, taskData?.data?.status);
      
      const status = taskData?.data?.status;
      const progressPercent = Math.min(20 + (attempts * 1.3), 90);
      
      if (status === 'SUCCEEDED' || status === 'succeeded' || status === 'completed') {
        const videoUrl = taskData?.data?.videoUrl || taskData?.data?.output?.videoUrl;
        
        if (videoUrl) {
          console.log('[StoryboardCard] 视频生成完成:', videoUrl);
          setVideoUrl(videoUrl);
          setVideoProgress(100);
          toast.success('视频生成成功');
          // 自动保存到数据库
          await saveVideoToAssets(videoUrl);
          // 通知父组件
          onVideoGenerated?.(videoUrl);
        } else {
          toast.error('任务完成但未获取到视频');
        }
        setGeneratingVideo(false);
        setVideoTaskId(null);
        setTimeout(() => setVideoProgress(null), 2000);
      } else if (status === 'FAILED' || status === 'failed') {
        toast.error(taskData?.data?.message || '视频生成失败');
        setGeneratingVideo(false);
        setVideoTaskId(null);
        setVideoProgress(null);
      } else {
        setVideoProgress(Math.round(progressPercent));
        if (attempts < maxAttempts) {
          setTimeout(() => pollVideoTask(taskId, model, attempts + 1), pollInterval);
        } else {
          toast.error('视频生成超时，请稍后刷新查看');
          setGeneratingVideo(false);
          setVideoTaskId(null);
          setVideoProgress(null);
        }
      }
    } catch (err) {
      console.error('[StoryboardCard] 视频轮询出错:', err);
      if (attempts < maxAttempts) {
        setTimeout(() => pollVideoTask(taskId, model, attempts + 1), pollInterval);
      } else {
        toast.error('查询视频任务状态失败');
        setGeneratingVideo(false);
        setVideoTaskId(null);
        setVideoProgress(null);
      }
    }
  };

  // 新增：视频保存函数
  const saveVideoToAssets = async (url: string) => {
    try {
      const res = await apiFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'video',
          category: 'storyboard',
          name: `分镜视频${sb.num || index + 1}`,
          url: url,
          prompt: editablePrompt,
          model: 'seedance2',
          metadata: {
            scriptId: scriptId,
            index: index,
            ratio: imgRatio,
            duration: 5,
          },
        }),
      });
      const result = await res.json();
      if (!result.success) {
        console.warn('视频自动保存失败:', result.error);
      }
    } catch (err) {
      console.warn('视频自动保存失败:', err);
    }
  };

  const handleDownload = async () => {
    if (!imgUrl) return;
    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `分镜_${sb.num || index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('下载成功');
    } catch {
      toast.error('下载失败');
    }
  };

  const handleDownloadVideo = async (videoUrl: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `分镜视频_${sb.num || index + 1}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('视频下载成功');
    } catch {
      toast.error('视频下载失败');
    }
  };

  return (
    <>
      <div className="bg-[#1A1A1A] rounded-xl border border-[#222222] overflow-hidden flex flex-col">
        {/* 顶部信息栏 */}
        <div className="px-4 py-3 border-b border-[#222222] flex items-center justify-between bg-[#141414]/50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#0ABAB5]/20 flex items-center justify-center text-xs font-bold text-[#0ABAB5]">
              {String(sb.num || index + 1).padStart(3, '0')}
            </span>
            <div className="flex flex-col">
              <span className="text-xs text-[#F5F5F5] font-medium">{sb.shot || '中景'}</span>
              <span className="text-[10px] text-[#888888]">{sb.duration || '5s'}</span>
            </div>
          </div>
          {sb.character && (
            <span className="text-xs bg-[#0ABAB5]/10 text-[#0ABAB5] px-2 py-1 rounded-full">
              {sb.character}
            </span>
          )}
        </div>

        {/* 描述区域 */}
        <div className="p-4 flex-1">
          <textarea
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
            className="w-full text-sm text-[#F5F5F5]/90 leading-relaxed bg-[#0A0A0A] border border-[#333333] rounded-lg p-3 min-h-[60px] resize-y focus:outline-none focus:border-[#0ABAB5]/50 transition-colors"
            placeholder="分镜描述..."
          />
          
          {/* 标签 - 修复运镜硬编码，避免显示空值或"固定" */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sb.camera && sb.camera !== '固定' && sb.camera.trim() !== '' && (
              <span className="text-[10px] px-2 py-1 rounded bg-[#222222] text-[#888888]">
                运镜: {sb.camera}
              </span>
            )}
            {sb.audio && sb.audio.trim() !== '' && (
              <span className="text-[10px] px-2 py-1 rounded bg-[#222222] text-[#888888]">
                音效: {sb.audio}
              </span>
            )}
          </div>
        </div>

        {/* 预览区域 - 支持图片/视频切换 */}
        {/* 情况1：都没有 - 显示生成按钮 */}
        {!imgUrl && !videoUrl && (
          <div className="px-4 pb-4">
            {/* 生图和生视频按钮并排 */}
            <div className="flex items-center gap-2 mb-2">
              <Select value={imgRatio} onValueChange={setImgRatio}>
                <SelectTrigger className="text-xs bg-[#0A0A0A] border border-[#333333] text-[#F5F5F5] focus:outline-none focus:border-[#0ABAB5] h-9 w-28">
                  <SelectValue placeholder="比例" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border border-[#333333] text-[#F5F5F5]">
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="9:16">9:16</SelectItem>
                  <SelectItem value="1:1">1:1</SelectItem>
                  <SelectItem value="4:3">4:3</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={handleGenerateImage}
                disabled={generatingImg}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#0ABAB5]/10 text-[#0ABAB5] border border-[#0ABAB5]/20 hover:bg-[#0ABAB5]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {generatingImg ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    生图中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3 h-3" />
                    生图
                  </>
                )}
              </button>
              <button
                onClick={handleGenerateVideo}
                disabled={generatingVideo}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {generatingVideo ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    生视频中...
                  </>
                ) : (
                  <>
                    <Film className="w-3 h-3" />
                    生视频
                  </>
                )}
              </button>
            </div>
            <button
              onClick={handleOptimizePrompt}
              disabled={optimizing}
              className="w-full text-xs px-3 py-1.5 rounded-lg bg-[#222222] text-[#888888] hover:bg-[#0ABAB5]/20 hover:text-[#0ABAB5] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {optimizing ? '优化中...' : '优化提示词'}
            </button>
          </div>
        )}

        {/* 情况2：两者都有 - 显示Tab切换器 */}
        {imgUrl && videoUrl && (
          <div className="px-4 pb-4">
            {/* Tab切换器 */}
            <div className="flex gap-1 mb-3 p-1 bg-[#0A0A0A] rounded-lg">
              <button
                onClick={() => setPreviewMode('image')}
                className={`flex-1 text-xs px-3 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  previewMode === 'image'
                    ? 'bg-[#0ABAB5]/20 text-[#0ABAB5] border border-[#0ABAB5]/30'
                    : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#222222]'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                图片
              </button>
              <button
                onClick={() => setPreviewMode('video')}
                className={`flex-1 text-xs px-3 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  previewMode === 'video'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#222222]'
                }`}
              >
                <Film className="w-3 h-3" />
                视频
              </button>
            </div>

            {/* 根据选择的Tab显示对应内容 */}
            {previewMode === 'image' ? (
              <>
                {/* 图片预览 */}
                <div 
                  className="relative rounded-lg overflow-hidden border border-[#333333] bg-[#0A0A0A] cursor-pointer group"
                  onClick={() => setShowLightbox(true)}
                >
                  <div className="aspect-video bg-[#141414] flex items-center justify-center">
                    <img 
                      src={imgUrl} 
                      alt={`分镜 ${sb.num || index + 1}`} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="text-white text-sm">点击查看大图</span>
                  </div>
                </div>
                {/* 图片操作按钮 */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#222222] text-[#F5F5F5] hover:bg-[#333333] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    下载图片
                  </button>
                  <button
                    onClick={handleGenerateImage}
                    disabled={generatingImg}
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#0ABAB5]/10 text-[#0ABAB5] border border-[#0ABAB5]/20 hover:bg-[#0ABAB5]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {generatingImg ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3 h-3" />
                        重新生图
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={handleOptimizePrompt}
                  disabled={optimizing}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-[#222222] text-[#888888] hover:bg-[#0ABAB5]/20 hover:text-[#0ABAB5] transition-colors disabled:opacity-50 flex items-center justify-center gap-1 mt-2"
                >
                  <Sparkles className="w-3 h-3" />
                  {optimizing ? '优化中...' : '优化提示词'}
                </button>
                {/* 提示词预览折叠 */}
                <button
                  onClick={() => setShowPromptPreview(!showPromptPreview)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg bg-[#1A1A1A] text-[#888888] hover:text-white transition-colors flex items-center justify-center gap-1 mt-2"
                >
                  <Eye className="w-3 h-3" />
                  {showPromptPreview ? '隐藏预览' : '提示词预览'}
                </button>
                {showPromptPreview && (
                  <div className="mt-2 p-3 rounded-lg bg-[#0A0A0A] border border-[#333333]">
                    <div className="text-xs text-[#888888] mb-1">当前提示词</div>
                    <div className="text-xs text-[#0ABAB5] font-mono leading-relaxed whitespace-pre-wrap">
                      {editablePrompt || '暂无提示词'}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* 视频预览 */}
                <div className="relative rounded-lg overflow-hidden border border-[#333333] bg-[#0A0A0A]">
                  <div className="aspect-video bg-[#141414] flex items-center justify-center">
                    <video 
                      src={videoUrl} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                {/* 视频操作按钮 */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleDownloadVideo(videoUrl)}
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#222222] text-[#F5F5F5] hover:bg-[#333333] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    下载视频
                  </button>
                  <button
                    onClick={handleGenerateVideo}
                    disabled={generatingVideo}
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {generatingVideo ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Film className="w-3 h-3" />
                        重新生视频
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={handleOptimizePrompt}
                  disabled={optimizing}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-[#222222] text-[#888888] hover:bg-[#0ABAB5]/20 hover:text-[#0ABAB5] transition-colors disabled:opacity-50 flex items-center justify-center gap-1 mt-2"
                >
                  <Sparkles className="w-3 h-3" />
                  {optimizing ? '优化中...' : '优化提示词'}
                </button>
              </>
            )}
          </div>
        )}

        {/* 情况3：只有图片 */}
        {imgUrl && !videoUrl && (
          <div className="px-4 pb-4">
            <div 
              className="relative rounded-lg overflow-hidden border border-[#333333] bg-[#0A0A0A] cursor-pointer group"
              onClick={() => setShowLightbox(true)}
            >
              <div className="aspect-video bg-[#141414] flex items-center justify-center">
                <img 
                  src={imgUrl} 
                  alt={`分镜 ${sb.num || index + 1}`} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="text-white text-sm">点击查看大图</span>
              </div>
            </div>
            {/* 操作按钮 */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#222222] text-[#F5F5F5] hover:bg-[#333333] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  下载
                </button>
                <button
                  onClick={handleGenerateVideo}
                  disabled={generatingVideo}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {generatingVideo ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      生视频中...
                    </>
                  ) : (
                    <>
                      <Film className="w-3 h-3" />
                      生视频
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOptimizePrompt}
                  disabled={optimizing}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#222222] text-[#888888] hover:bg-[#0ABAB5]/20 hover:text-[#0ABAB5] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {optimizing ? '优化中...' : '优化提示词'}
                </button>
                <button
                  onClick={handleGenerateImage}
                  disabled={generatingImg}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#0ABAB5]/10 text-[#0ABAB5] border border-[#0ABAB5]/20 hover:bg-[#0ABAB5]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {generatingImg ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3 h-3" />
                      重新生图
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 情况4：只有视频 */}
        {!imgUrl && videoUrl && (
          <div className="px-4 pb-4">
            <div className="relative rounded-lg overflow-hidden border border-[#333333] bg-[#0A0A0A]">
              <div className="aspect-video bg-[#141414] flex items-center justify-center">
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleDownloadVideo(videoUrl)}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#222222] text-[#F5F5F5] hover:bg-[#333333] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                下载视频
              </button>
              <button
                onClick={handleGenerateVideo}
                disabled={generatingVideo}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {generatingVideo ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Film className="w-3 h-3" />
                    重新生视频
                  </>
                )}
              </button>
              <button
                onClick={handleGenerateImage}
                disabled={generatingImg}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#0ABAB5]/10 text-[#0ABAB5] border border-[#0ABAB5]/20 hover:bg-[#0ABAB5]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {generatingImg ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    生图中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3 h-3" />
                    生图
                  </>
                )}
              </button>
            </div>
            <button
              onClick={handleOptimizePrompt}
              disabled={optimizing}
              className="w-full text-xs px-3 py-2 rounded-lg bg-[#222222] text-[#888888] hover:bg-[#0ABAB5]/20 hover:text-[#0ABAB5] transition-colors disabled:opacity-50 flex items-center justify-center gap-1 mt-2"
            >
              <Sparkles className="w-3 h-3" />
              {optimizing ? '优化中...' : '优化提示词'}
            </button>
          </div>
        )}
        
        {/* 进度条显示 */}
        {(progress || videoProgress) && (
          <div className="px-4 pb-4">
            <div className="w-full bg-[#222222] rounded-full h-1">
              <div 
                className="bg-[#0ABAB5] h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress || videoProgress}%` }}
              />
            </div>
            <p className="text-xs text-[#888888] mt-1 text-center">
              {progressText || `生成中... ${progress || videoProgress}%`}
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && imgUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
          onClick={() => setShowLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setShowLightbox(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={imgUrl} 
            alt={`分镜 ${sb.num || index + 1}`} 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-[#0ABAB5] text-black font-medium flex items-center gap-2 hover:bg-[#0ABAB5]/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            下载原图
          </button>
        </div>
      )}
    </>
  );
}
