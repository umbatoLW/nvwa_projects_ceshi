"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Image, Wand2, Download, Trash2, Brush, Languages, Paintbrush, 
  Eraser, Expand, Palette, Crop, X, Upload, Sparkles, Clock
} from "lucide-react";
import { AppShell } from "@/components/app-sidebar";
import { DropdownSelect } from "@/components/dropdown-select";
import { getAuthHeaders } from "@/lib/auth-context";

const HISTORY_KEY = "nvwa_edit_history";

// 使用时间戳+随机数生成唯一ID
function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type EditMode = "edit" | "style" | "background" | "expand" | "erase";

interface HistoryItem {
  id: string;
  prompt: string;
  sourceImage: string;
  sourceImageKey?: string;
  mode: EditMode;
  styleType?: string;
  expandDirection?: string;
  resultImage: string;
  createdAt: string;
}

const MODE_CONFIG: Record<EditMode, { label: string; icon: typeof Brush; description: string }> = {
  edit: { label: "智能编辑", icon: Brush, description: "根据文字描述修改图片内容" },
  style: { label: "风格重绘", icon: Palette, description: "将图片转换为不同艺术风格" },
  background: { label: "背景生成", icon: Crop, description: "生成新的背景环境" },
  expand: { label: "画面扩展", icon: Expand, description: "扩展图片边界，补充画面内容" },
  erase: { label: "智能擦除", icon: Eraser, description: "擦除图片中的特定对象" },
};

const STYLE_OPTIONS = [
  { value: "photography", label: "摄影风格" },
  { value: "portrait", label: "人像写真" },
  { value: "3d_cartoon", label: "3D卡通" },
  { value: "anime", label: "动漫风格" },
  { value: "oil_painting", label: "油画风格" },
  { value: "watercolor", label: "水彩风格" },
  { value: "sketch", label: "素描风格" },
  { value: "cyberpunk", label: "赛博朋克" },
  { value: "pixel", label: "像素风格" },
];

const EXPAND_OPTIONS = [
  { value: "horizontal", label: "水平扩展" },
  { value: "vertical", label: "垂直扩展" },
  { value: "both", label: "四边扩展" },
];

export default function ImageEditPage() {
  const [mode, setMode] = useState<EditMode>("edit");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceImageKey, setSourceImageKey] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [styleType, setStyleType] = useState("photography");
  const [expandDirection, setExpandDirection] = useState("both");
  const [generating, setGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从数据库加载历史记录
  const loadHistoryFromDB = async () => {
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch('/api/assets?category=edit', {
        headers: authHeaders,
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        // 将数据库记录转换为历史记录格式
        const dbHistory: HistoryItem[] = result.data.map((asset: {
          id: string;
          prompt?: string;
          url: string;
          metadata?: { sourceImage?: string; sourceImageKey?: string; mode?: EditMode; styleType?: string; expandDirection?: string };
          createdAt: string;
        }) => ({
          id: asset.id,
          prompt: asset.prompt || '',
          sourceImage: asset.metadata?.sourceImage || '',
          sourceImageKey: asset.metadata?.sourceImageKey,
          mode: (asset.metadata?.mode as EditMode) || 'edit',
          styleType: asset.metadata?.styleType,
          expandDirection: asset.metadata?.expandDirection,
          resultImage: asset.url,
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
      const exists = prev.some(item => item.resultImage === newItem.resultImage);
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
          name: newItem.prompt.slice(0, 100) || '编辑后的图片',
          type: 'image',
          category: 'edit',
          url: newItem.resultImage || '',
          prompt: newItem.prompt,
          metadata: {
            sourceImage: newItem.sourceImage,
            sourceImageKey: newItem.sourceImageKey,
            mode: newItem.mode,
            styleType: newItem.styleType,
            expandDirection: newItem.expandDirection,
          },
        }),
      });
    } catch (err) {
      console.error('保存历史记录到数据库失败:', err);
    }
  }, []);

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("不支持的文件类型，仅支持 JPG/PNG/WebP/GIF");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("文件大小不能超过 10MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      
      if (result.success && result.data?.url) {
        setSourceImage(result.data.url);
        setSourceImageKey(result.data.key);
        setCurrentResult(null);
        
        // 获取原图尺寸
        const img = new window.Image();
        img.onload = () => {
          setOriginalSize({ width: img.naturalWidth, height: img.naturalHeight });
          console.log(`[Image Upload] Original size: ${img.naturalWidth}x${img.naturalHeight}`);
        };
        img.src = result.data.url;
      } else {
        setError(result.error || "上传失败");
      }
    } catch (err) {
      setError("上传失败，请重试");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }, []);

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // 生成编辑
  const handleGenerate = async () => {
    if (!sourceImage) {
      setError("请先上传图片");
      return;
    }
    if (!prompt.trim() && mode !== "style") {
      setError("请输入编辑描述");
      return;
    }
    
    setError("");
    setGenerating(true);

    try {
      const auth = getAuthHeaders();
      
      let finalPrompt = prompt.trim();
      
      if (mode === "style") {
        const styleMap: Record<string, string> = {
          photography: "转换为真实摄影风格",
          portrait: "转换为人像写真风格",
          "3d_cartoon": "转换为3D卡通风格",
          anime: "转换为动漫风格",
          oil_painting: "转换为油画风格",
          watercolor: "转换为水彩风格",
          sketch: "转换为素描风格",
          cyberpunk: "转换为赛博朋克风格",
          pixel: "转换为像素风格",
        };
        finalPrompt = styleMap[styleType] || `转换为${styleType}风格`;
        if (prompt.trim()) {
          finalPrompt += `，${prompt.trim()}`;
        }
      } else if (mode === "background") {
        finalPrompt = `将背景替换为：${prompt.trim()}`;
      } else if (mode === "erase") {
        finalPrompt = `擦除图片中的：${prompt.trim()}，并自然补全背景`;
      } else if (mode === "expand") {
        const dirMap: Record<string, string> = {
          horizontal: "水平方向扩展画面",
          vertical: "垂直方向扩展画面",
          both: "向四周扩展画面",
        };
        finalPrompt = `${dirMap[expandDirection]}，自然补充画面内容`;
        if (prompt.trim()) {
          finalPrompt += `，${prompt.trim()}`;
        }
      }

      // 构建请求参数 - 使用新的 wanx2.1-imageedit API
      // 注意：新API会保持原图宽高比，短边固定为1536像素
      const payload = {
        mode,  // 编辑模式：smart-edit, style-transfer, background, expand, inpaint
        imageUrl: sourceImage,
        prompt: finalPrompt,
        n: 1,
      };

      console.log("[Edit Image] Request:", payload);

      const response = await fetch("/api/ai/edit-image", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("[Edit Image] Response:", result);
      
      if (!result.success) {
        setError(result.error || "编辑失败");
        return;
      }

      const images = result.data?.images;
      if (images && images.length > 0) {
        const imageUrl = images[0];
        setCurrentResult(imageUrl);
        const item: HistoryItem = {
          id: generateId(),
          prompt: prompt.trim(),
          sourceImage,
          sourceImageKey: sourceImageKey || undefined,
          mode,
          styleType: mode === "style" ? styleType : undefined,
          expandDirection: mode === "expand" ? expandDirection : undefined,
          resultImage: imageUrl,
          createdAt: new Date().toLocaleString("zh-CN"),
        };
        saveHistory(item);
      } else {
        setError("未获取到编辑结果");
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // 下载图片
  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `edited-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  // 删除历史
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
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
  }, [history]);

  // 清空所有历史
  const handleClearAllHistory = useCallback(() => {
    if (confirm("确定要清空所有历史记录吗？")) {
      persistHistory([]);
    }
  }, []);

  // 加载历史记录
  const handleLoadHistory = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setSourceImage(item.sourceImage);
    setSourceImageKey(item.sourceImageKey || null);
    setMode(item.mode);
    if (item.styleType) setStyleType(item.styleType);
    if (item.expandDirection) setExpandDirection(item.expandDirection);
    setCurrentResult(item.resultImage);
    setError("");
  };

  // 清除图片
  const handleClearImage = () => {
    setSourceImage(null);
    setSourceImageKey(null);
    setCurrentResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <AppShell>
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
          <div className="p-3 border-b border-[#333333]">
            <div className="text-xs text-[#9CA3AF] mb-2">选择编辑模式</div>
            {/* 上3下2两行布局 */}
            <div className="flex flex-col gap-2">
              {/* 第一行：3个按钮 */}
              <div className="flex gap-2">
                {(["edit", "style", "background"] as EditMode[]).map((key) => {
                  const config = MODE_CONFIG[key];
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setMode(key)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg text-xs transition-colors ${
                        mode === key
                          ? "bg-[#0ABAB5]/20 text-[#0ABAB5] border border-[#0ABAB5]/40"
                          : "text-[#888888] hover:text-white hover:bg-[#1A1A1A] border border-transparent"
                      }`}
                      title={config.description}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* 第二行：2个按钮（居中，宽度与第一行一致） */}
              <div className="flex justify-center gap-2">
                {(["expand", "erase"] as EditMode[]).map((key) => {
                  const config = MODE_CONFIG[key];
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setMode(key)}
                      className={`flex-1 max-w-[calc(33.333%-5.33px)] flex flex-col items-center gap-1.5 py-2.5 rounded-lg text-xs transition-colors ${
                        mode === key
                          ? "bg-[#0ABAB5]/20 text-[#0ABAB5] border border-[#0ABAB5]/40"
                          : "text-[#888888] hover:text-white hover:bg-[#1A1A1A] border border-transparent"
                      }`}
                      title={config.description}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 参数区 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 图片上传区域 */}
            <div className="space-y-2">
              <label className="text-xs text-[#9CA3AF]">源图片</label>
              {sourceImage ? (
                <div className="relative group">
                  <div 
                    className="w-full aspect-video rounded-lg overflow-hidden border border-[#333333] bg-[#1A1A1A] cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <img
                      src={sourceImage}
                      alt="源图片"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    onClick={handleClearImage}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
                    title="移除图片"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-[#666666] mt-1 text-center">点击图片可更换</p>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragOver 
                      ? "border-[#0ABAB5] bg-[#0ABAB5]/10" 
                      : "border-[#333333] bg-[#1A1A1A] hover:border-[#0ABAB5]/50"
                  }`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-[#0ABAB5] border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-[#9CA3AF]">上传中...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-[#666666] mb-2" />
                      <p className="text-xs text-[#9CA3AF]">点击或拖拽上传</p>
                      <p className="text-[10px] text-[#555555] mt-1">JPG/PNG/WebP/GIF，≤10MB</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 模式说明 */}
            <div className="p-3 rounded-lg bg-[#1A1A1A] border border-[#333333]">
              <p className="text-xs text-[#9CA3AF]">{MODE_CONFIG[mode].description}</p>
            </div>

            {/* 提示词 */}
            <div className="space-y-2">
              <label className="text-xs text-[#9CA3AF]">
                {mode === "edit" ? "编辑描述" : mode === "background" ? "背景描述" : mode === "erase" ? "擦除对象描述" : mode === "style" ? "补充描述（可选）" : mode === "expand" ? "补充描述（可选）" : "描述"}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === "edit" 
                    ? "描述你想要的修改效果，例如：把天空改成晚霞..." 
                    : mode === "background"
                    ? "描述想要的背景环境，例如：森林中的小屋..."
                    : mode === "erase"
                    ? "描述要擦除的对象，例如：图片右下角的路人..."
                    : mode === "style"
                    ? "可选：补充额外的风格细节描述..."
                    : mode === "expand"
                    ? "可选：描述扩展区域应包含的内容..."
                    : ""
                }
                className="w-full h-24 px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-lg text-sm text-[#F5F5F5] placeholder:text-[#666666] resize-none focus:border-[#0ABAB5]/50 outline-none"
              />
            </div>

            {/* 风格选择 */}
            {mode === "style" && (
              <DropdownSelect
                label="目标风格"
                value={styleType}
                options={STYLE_OPTIONS}
                onChange={setStyleType}
              />
            )}

            {/* 扩展方向 */}
            {mode === "expand" && (
              <DropdownSelect
                label="扩展方向"
                value={expandDirection}
                options={EXPAND_OPTIONS}
                onChange={setExpandDirection}
              />
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || !sourceImage}
              className="w-full py-3 rounded-lg bg-[#0ABAB5] text-sm font-medium text-[#0A0A0A] hover:bg-[#0ABAB5]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  开始编辑
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
                  <div className="w-12 h-12 border-2 border-[#0ABAB5] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">正在编辑图片...</p>
                  <p className="text-xs text-[#666666]">这可能需要几秒钟</p>
                </div>
              ) : currentResult ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div 
                    className="relative rounded-xl overflow-hidden border border-[#333333] bg-[#141414] flex items-center justify-center"
                    style={{
                      maxWidth: '80%',
                      width: originalSize && originalSize.width > originalSize.height ? '80%' : 'auto',
                      maxHeight: 'calc(100vh - 400px)',
                      aspectRatio: originalSize ? `${originalSize.width}/${originalSize.height}` : undefined,
                    }}
                  >
                    <img
                      src={currentResult}
                      alt="编辑结果"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDownload(currentResult)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0ABAB5] text-sm text-[#0A0A0A] font-medium hover:bg-[#0ABAB5]/90 transition-colors"
                    >
                      <Download className="w-4 h-4" /> 下载原图
                    </button>
                    <button
                      onClick={() => setCurrentResult(null)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E1F24] border border-[#333333] text-sm text-[#F5F5F5] hover:border-[#0ABAB5]/50 transition-colors"
                    >
                      <X className="w-4 h-4" /> 关闭
                    </button>
                  </div>
                </div>
              ) : sourceImage ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div 
                    className="relative rounded-xl overflow-hidden border border-[#333333] bg-[#141414] flex items-center justify-center"
                    style={{
                      maxWidth: '80%',
                      width: originalSize && originalSize.width > originalSize.height ? '80%' : 'auto',
                      maxHeight: 'calc(100vh - 400px)',
                      aspectRatio: originalSize ? `${originalSize.width}/${originalSize.height}` : undefined,
                    }}
                  >
                    <img
                      src={sourceImage}
                      alt="源图片"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={handleClearImage}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#666666]">点击左侧&ldquo;开始编辑&rdquo;处理此图片</p>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full max-w-md aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragOver 
                      ? "border-[#0ABAB5] bg-[#0ABAB5]/10" 
                      : "border-[#333333] bg-[#141414] hover:border-[#0ABAB5]/50"
                  }`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-2 border-[#0ABAB5] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[#9CA3AF]">上传中...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-[#666666] mb-3" />
                      <p className="text-sm text-[#9CA3AF] mb-1">点击或拖拽上传图片</p>
                      <p className="text-xs text-[#666666]">支持 JPG、PNG、WebP、GIF，最大 10MB</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* 历史记录区 - 与文生图模块样式统一 */}
          <div className="border-t border-[#333333] p-4 mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#666666]" />
              <span className="text-sm text-[#888888]">历史记录</span>
              {history.length > 0 && (
                <span className="text-xs text-[#666666]">({history.length})</span>
              )}
              {history.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="ml-auto text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  清空
                </button>
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
                    {/* 历史图片缩略图 - 与文生图统一：w-20 h-20 */}
                    <div
                      className="relative w-20 h-20 bg-[#141414] rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => handleLoadHistory(item)}
                    >
                      <img
                        src={item.resultImage}
                        alt={item.prompt}
                        className="w-full h-full object-cover"
                      />
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
                        {MODE_CONFIG[item.mode]?.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
