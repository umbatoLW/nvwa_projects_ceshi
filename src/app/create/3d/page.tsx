"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Wand2, Download, Trash2, Sparkles, ImageIcon, Layers, X, Loader2, Upload, Plus } from "lucide-react";
import { AppShell } from "@/components/app-sidebar";
import { DropdownSelect } from "@/components/dropdown-select";
import { Model3DViewer } from "@/components/model-3d-viewer";
import { 
  MODEL_3D, 
  DEFAULT_3D_MODEL, 
  THREE_D_TEXTURE_QUALITY_OPTIONS,
  THREE_D_GEOMETRY_QUALITY_OPTIONS
} from "@/lib/model-config";
import { getAuthHeaders } from "@/lib/auth-context";

const HISTORY_KEY = "nvwa_3d_history";

// 使用时间戳+随机数生成唯一ID
function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type ThreeDMode = "text2model" | "image2model" | "multiview";

interface HistoryItem {
  id: string;
  prompt: string;
  model: string;
  textureQuality: string;
  geometryQuality?: string;
  texture: boolean;
  pbr: boolean;
  mode: ThreeDMode;
  modelUrl: string;
  previewImage?: string;
  createdAt: string;
}

export default function ThreeDGenerationPage() {
  const [mode, setMode] = useState<ThreeDMode>("text2model");
  const [model, setModel] = useState(DEFAULT_3D_MODEL);
  const [prompt, setPrompt] = useState("");
  const [textureQuality, setTextureQuality] = useState("standard");
  const [geometryQuality, setGeometryQuality] = useState("standard");
  const [texture, setTexture] = useState(true);
  const [pbr, setPbr] = useState(true);
  const [images, setImages] = useState<string[]>([]); // 存储base64图片
  const [generating, setGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<string | null>(null);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从数据库加载历史记录
  const loadHistoryFromDB = async () => {
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch('/api/assets?category=3d', {
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
          metadata?: { mode?: string; textureQuality?: string; geometryQuality?: string; texture?: boolean; pbr?: boolean; modelUrl?: string; previewImage?: string };
          createdAt: string;
        }) => ({
          id: asset.id,
          prompt: asset.prompt || asset.name || '',
          model: asset.model || 'unknown',
          textureQuality: asset.metadata?.textureQuality || 'standard',
          geometryQuality: asset.metadata?.geometryQuality,
          texture: asset.metadata?.texture ?? true,
          pbr: asset.metadata?.pbr ?? true,
          mode: (asset.metadata?.mode as ThreeDMode) || 'text2model',
          modelUrl: asset.metadata?.modelUrl || asset.url,
          previewImage: asset.metadata?.previewImage,
          createdAt: asset.createdAt || new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        }));
        setHistory(dbHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(dbHistory));
      }
    } catch (err) {
      console.error('加载历史记录失败:', err);
      // 尝试从localStorage加载
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) setHistory(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
    setHistoryLoaded(true);
  };

  // 加载历史
  useEffect(() => {
    loadHistoryFromDB();
  }, []);

  const persistHistory = async (items: HistoryItem[]) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    setHistory(items);
  };

  // 保存历史记录到数据库（带去重检查）
  const saveHistory = useCallback(async (newItem: HistoryItem) => {
    // 先更新本地状态和localStorage（带去重检查）
    setHistory(prev => {
      // 检查是否已存在相同URL的历史记录，避免重复
      const exists = prev.some(item => item.modelUrl === newItem.modelUrl);
      if (exists) {
        return prev;
      }
      const updated = [newItem, ...prev].slice(0, 50);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
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
          name: newItem.prompt.slice(0, 100) || '生成的3D模型',
          type: 'model',
          category: '3d',
          url: newItem.modelUrl || '',
          prompt: newItem.prompt,
          model: newItem.model,
          metadata: {
            mode: newItem.mode,
            textureQuality: newItem.textureQuality,
            geometryQuality: newItem.geometryQuality,
            texture: newItem.texture,
            pbr: newItem.pbr,
            modelUrl: newItem.modelUrl,
            previewImage: newItem.previewImage,
          },
        }),
      });
    } catch (err) {
      console.error('保存历史记录到数据库失败:', err);
    }
  }, []);

  // 处理图片上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxImages = mode === "image2model" ? 1 : 4;
    const remaining = maxImages - images.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setError("请上传图片文件");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("图片大小不能超过10MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setImages((prev) => {
            if (prev.length >= maxImages) return prev;
            return [...prev, base64];
          });
          setError("");
        }
      };
      reader.readAsDataURL(file);
    });

    // 重置input以便可以重复上传相同文件
    e.target.value = "";
  };

  // 触发文件选择
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // 删除已上传的图片
  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // 清空所有图片
  const handleClearImages = () => {
    setImages([]);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && mode === "text2model") {
      setError("请输入3D模型描述");
      return;
    }
    if (images.length === 0 && mode !== "text2model") {
      setError("请上传参考图片");
      return;
    }
    if (mode === "multiview" && images.length < 2) {
      setError("多视角模式需要至少2张图片");
      return;
    }
    
    setError("");
    setGenerating(true);
    setStatusMessage("正在创建任务...");

    try {
      const auth = getAuthHeaders();
      const payload = {
        mode,
        prompt: prompt.trim(),
        images: mode !== "text2model" ? images : undefined,
        model,
        textureQuality,
        geometryQuality: model === "Tripo/Tripo-H3.1" ? geometryQuality : undefined,
        texture,
        pbr,
      };

      setStatusMessage("正在生成3D模型，预计需要1-3分钟...");

      const response = await fetch("/api/ai/generate-3d", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "生成失败");
        setGenerating(false);
        setStatusMessage("");
        return;
      }

      const modelUrl = result.data?.modelUrl;
      const previewImage = result.data?.previewImage;

      if (modelUrl) {
        setCurrentResult(modelUrl);
        setCurrentPreview(previewImage || modelUrl);
        
        const item: HistoryItem = {
          id: generateId(),
          prompt: prompt.trim(),
          model,
          textureQuality,
          geometryQuality,
          texture,
          pbr,
          mode,
          modelUrl,
          previewImage,
          createdAt: new Date().toLocaleString("zh-CN"),
        };
        saveHistory(item);
      } else {
        setError("未获取到生成结果");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误，请稍后重试");
    } finally {
      setGenerating(false);
      setStatusMessage("");
    }
  };

  const handleDeleteHistory = async (id: string) => {
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
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
  };

  const handleClearHistory = () => {
    if (confirm("确定要清空所有历史记录吗？")) {
      persistHistory([]);
    }
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `model-${Date.now()}.glb`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // 如果blob下载失败，尝试直接打开链接
      window.open(url, "_blank");
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setModel(item.model);
    setTextureQuality(item.textureQuality || "standard");
    setGeometryQuality(item.geometryQuality || "standard");
    setTexture(item.texture);
    setPbr(item.pbr);
    setMode(item.mode);
    setCurrentResult(item.modelUrl);
    setCurrentPreview(item.previewImage || item.modelUrl);
    setError("");
  };

  // 切换模式时清空图片
  const handleModeChange = (newMode: ThreeDMode) => {
    setMode(newMode);
    setImages([]);
    setError("");
  };

  // 获取当前模型信息
  const currentModelInfo = MODEL_3D.find(m => m.id === model);
  const supportsGeometryQuality = currentModelInfo?.geometryQualities && currentModelInfo.geometryQualities.length > 0;
  
  // 图片数量限制
  const maxImages = mode === "image2model" ? 1 : 4;
  const imageRequirement = mode === "image2model" ? "上传1张参考图" : "上传2-4张不同角度的图片";

  return (
    <AppShell>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={mode === "multiview"}
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <div className="h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row">
        {/* 手机端遮罩层 */}
        {showParams && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setShowParams(false)}
          />
        )}
        
        {/* 左侧控制面板 */}
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
          
          {/* 模式切换 */}
          <div className="flex border-b border-[#333333]">
            <button
              onClick={() => handleModeChange("text2model")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === "text2model"
                  ? "text-[#0ABAB5] border-b-2 border-[#0ABAB5] bg-[#0ABAB5]/5"
                  : "text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              文生3D
            </button>
            <button
              onClick={() => handleModeChange("image2model")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === "image2model"
                  ? "text-[#0ABAB5] border-b-2 border-[#0ABAB5] bg-[#0ABAB5]/5"
                  : "text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              图生3D
            </button>
            <button
              onClick={() => handleModeChange("multiview")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === "multiview"
                  ? "text-[#0ABAB5] border-b-2 border-[#0ABAB5] bg-[#0ABAB5]/5"
                  : "text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              <Layers className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              多视角
            </button>
          </div>

          {/* 参数区 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 提示词 */}
            {mode === "text2model" && (
              <div className="space-y-2">
                <label className="text-xs text-[#9CA3AF]">3D模型描述</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要的3D模型，例如：一个未来风格的机器人..."
                  className="w-full h-28 px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-lg text-sm text-[#F5F5F5] placeholder:text-[#666666] resize-none focus:border-[#0ABAB5]/50 outline-none"
                />
              </div>
            )}

            {/* 图片上传区域 */}
            {mode !== "text2model" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#9CA3AF]">{imageRequirement}</label>
                  {images.length > 0 && (
                    <button
                      onClick={handleClearImages}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      清空
                    </button>
                  )}
                </div>
                
                {/* 已上传的图片预览 */}
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, i) => (
                    <div
                      key={`img-${i}-${img.slice(0, 30)}`}
                      className="relative aspect-square rounded-lg overflow-hidden border border-[#333333] bg-[#1A1A1A]"
                    >
                      <img
                        src={img}
                        alt={`图片${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white">
                        图{i + 1}
                      </div>
                    </div>
                  ))}
                  
                  {/* 上传按钮 */}
                  {images.length < maxImages && (
                    <button
                      onClick={triggerFileUpload}
                      className="aspect-square rounded-lg border-2 border-dashed border-[#333333] bg-[#1A1A1A]/50 hover:border-[#0ABAB5]/50 hover:bg-[#1A1A1A] transition-colors flex flex-col items-center justify-center gap-1 text-[#666666] hover:text-[#9CA3AF]"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-[10px]">上传图片</span>
                    </button>
                  )}
                </div>
                
                {/* 提示词（可选） */}
                <div className="mt-3">
                  <label className="text-xs text-[#9CA3AF]">补充描述（可选）</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="可添加描述优化生成效果..."
                    className="w-full h-16 mt-1 px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-lg text-sm text-[#F5F5F5] placeholder:text-[#666666] resize-none focus:border-[#0ABAB5]/50 outline-none"
                  />
                </div>
              </div>
            )}

            {/* 模型选择 */}
            <DropdownSelect
              label="选择模型"
              value={model}
              options={MODEL_3D.map((m) => ({ value: m.id, label: m.name }))}
              onChange={setModel}
            />

            {/* 贴图质量 */}
            <DropdownSelect
              label="贴图质量"
              value={textureQuality}
              options={THREE_D_TEXTURE_QUALITY_OPTIONS}
              onChange={setTextureQuality}
            />

            {/* 几何精度（仅H3.1支持） */}
            {supportsGeometryQuality && (
              <DropdownSelect
                label="几何精度"
                value={geometryQuality}
                options={THREE_D_GEOMETRY_QUALITY_OPTIONS}
                onChange={setGeometryQuality}
              />
            )}

            {/* 贴图和PBR */}
            <div className="space-y-2">
              <label className="text-xs text-[#9CA3AF]">附加选项</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-[#9CA3AF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={texture}
                    onChange={(e) => setTexture(e.target.checked)}
                    className="w-4 h-4 rounded border-[#333333] bg-[#1A1A1A] accent-[#0ABAB5]"
                  />
                  生成贴图
                </label>
                <label className="flex items-center gap-2 text-sm text-[#9CA3AF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pbr}
                    onChange={(e) => setPbr(e.target.checked)}
                    className="w-4 h-4 rounded border-[#333333] bg-[#1A1A1A] accent-[#0ABAB5]"
                  />
                  PBR材质（物理渲染）
                </label>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-2.5 rounded-lg bg-[#0ABAB5] text-sm font-medium text-[#0A0A0A] hover:bg-[#0ABAB5]/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  开始生成
                </>
              )}
            </button>
          </div>
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 flex flex-col bg-[#0A0A0A] min-w-0 overflow-hidden">
          {/* 手机端参数按钮 */}
          <button
            onClick={() => setShowParams(true)}
            className="lg:hidden m-3 py-2 px-4 bg-[#1A1A1A] hover:bg-[#252525] text-white text-sm rounded-lg flex items-center gap-2 self-start"
          >
            <Wand2 className="w-4 h-4" />
            参数设置
          </button>
          
          {/* 生成结果区 */}
          <div className="flex-1 p-6 flex items-center justify-center overflow-hidden min-h-0">
            <div className="w-full h-full max-h-[calc(100vh-300px)] flex items-center justify-center">
              {generating ? (
                <div className="flex flex-col items-center gap-4 text-[#9CA3AF]">
                  <Loader2 className="w-12 h-12 animate-spin text-[#0ABAB5]" />
                  <p className="text-sm">{statusMessage || "正在生成3D模型..."}</p>
                  <p className="text-xs text-[#666666]">3D模型生成需要1-3分钟，请耐心等待</p>
                </div>
              ) : currentResult ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                  {/* 3D模型查看器 */}
                  <div className="w-full h-full max-h-[calc(100vh-380px)] rounded-xl overflow-hidden border border-[#333333] bg-[#141414]">
                    <Model3DViewer
                      modelUrl={currentResult}
                      previewImage={currentPreview || undefined}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDownload(currentResult)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E1F24] border border-[#333333] text-sm text-[#F5F5F5] hover:border-[#0ABAB5]/50 transition-colors"
                    >
                      <Download className="w-4 h-4" /> 下载模型
                    </button>
                    <button
                      onClick={() => {
                        const item = history.find((h) => h.modelUrl === currentResult);
                        if (item) handleDeleteHistory(item.id);
                        setCurrentResult(null);
                        setCurrentPreview(null);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E1F24] border border-[#333333] text-sm text-[#F5F5F5] hover:border-red-500/50 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> 删除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-[#666666]">
                  <Box className="w-16 h-16 opacity-30" />
                  <p className="text-sm">点击左侧生成3D模型</p>
                </div>
              )}
            </div>
          </div>

          {/* 历史记录 */}
          <div className="h-48 border-t border-[#333333] bg-[#141414]">
            <div className="px-4 py-2 flex items-center justify-between border-b border-[#333333]">
              <span className="text-sm font-medium text-[#F5F5F5]">历史记录</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666666]">{history.length} 条</span>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    清空
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto p-3 flex gap-3">
              {history.length === 0 ? (
                <div className="w-full flex items-center justify-center text-xs text-[#666666] py-8">
                  暂无历史记录
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="shrink-0 w-40 cursor-pointer group"
                    onClick={() => handleLoadHistory(item)}
                  >
                    <div className="w-40 h-24 rounded-lg overflow-hidden border border-[#333333] bg-[#1A1A1A] group-hover:border-[#0ABAB5]/50 transition-colors relative">
                      <img
                        src={item.previewImage || item.modelUrl}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
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
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-xs text-[#9CA3AF] truncate">
                        {item.mode === "text2model" ? "文生3D" : item.mode === "image2model" ? "图生3D" : "多视角"}
                      </p>
                      <p className="text-[10px] text-[#666666] truncate">{item.prompt || "无描述"}</p>
                      <p className="text-[10px] text-[#666666]">{item.createdAt}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
