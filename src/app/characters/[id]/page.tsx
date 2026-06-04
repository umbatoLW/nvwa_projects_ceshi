"use client";
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AIProgressBar } from "@/components/ai-progress-bar";
import { StyleSelector } from "@/components/style-selector";
import { useAIStream } from "@/hooks/useAIStream";
import { VISUAL_STYLES, applyStyleToPrompt } from "@/lib/visual-styles";
import { toast } from 'sonner';
import {
  ArrowLeft,
  Trash2,
  Wand2,
  X,
  RefreshCw,
  Loader2,
  Save,
  Sparkles,
  Edit3,
  Download,
  Smile,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
// P2: SkyReels 表情动作知识库集成
import { EXPRESSION_LIBRARY, getExpression, recommendExpression } from "@/lib/skyreels-knowledge";

interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality: string;
  tags: string[];
  views: string[];
  expressions: string[];
  status: string;
  consistencyAnchor?: string;
  forbiddenFeatures?: string;
}

function mapCharacter(api: Character | null) {
  if (!api) return null;
  return {
    id: api.id,
    name: api.name,
    avatar: api.avatar || "",
    // 不显示无意义的"未知"标签，只显示有数据的属性
    gender: "",  // 数据库无此字段，不显示
    age: "",     // 数据库无此字段，不显示
    occupation: api.tags[0] || "",  // 只显示有值的
    description: api.description,
    personality: api.personality || api.tags[0] || 'neutral',
    traits: api.tags.map((tag: string, i: number) => ({
      label: tag,
      color: ["bg-primary/20 text-primary", "bg-[#22C55E]/20 text-[#22C55E]", "bg-[#F59E0B]/20 text-[#F59E0B]", "bg-[#33CCCC]/20 text-[#33CCCC]", "bg-muted text-muted-foreground"][i % 5],
    })),
    views: api.views?.length ? api.views : [],
    expressions: api.expressions?.length ? api.expressions : [],
    anchors: api.consistencyAnchor ? api.consistencyAnchor.split("、").filter(Boolean) : [],
    forbidden: api.forbiddenFeatures ? api.forbiddenFeatures.split("、").filter(Boolean) : [],
  };
}

type MappedCharacter = NonNullable<ReturnType<typeof mapCharacter>>;

const EXPRESSION_LABELS = ["开心", "悲伤", "愤怒", "惊讶"];

export default function CharacterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [character, setCharacter] = useState<MappedCharacter | null>(null);
  const [loading, setLoading] = useState(true);

  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedPersonality, setEditedPersonality] = useState("");
  const [editedTags, setEditedTags] = useState("");

  // View generation
  const [isGeneratingViews, setIsGeneratingViews] = useState(false);
  const [showViewPrompt, setShowViewPrompt] = useState(false);
  const [viewPrompt, setViewPrompt] = useState("");
  const [useAvatarReference, setUseAvatarReference] = useState(true); // 是否参考头像生图

  // Expression generation - 使用 Set 支持同时生成多个表情
  const [generatingExprIndexes, setGeneratingExprIndexes] = useState<Set<number>>(new Set());

  // Image load error tracking
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  // Delete confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if URL is a valid image URL (not just a placeholder string like "中性")
  const isValidImageUrl = useCallback((url: string | undefined | null): boolean => {
    if (!url || !url.trim()) return false;
    // Check if it starts with http/https or is a data URL
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
  }, []);

  const handleImageError = useCallback((key: string) => {
    setFailedImages(prev => new Set(prev).add(key));
  }, []);

  // Download function
  const handleDownload = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("下载失败");
    }
  }, []);

  // Delete character function
  const handleDeleteCharacter = useCallback(async () => {
    if (!character) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/characters/${character.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('角色已删除');
        router.push('/characters');
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [character, router]);

  // Sync generated image to assets library
  const syncToAssets = useCallback(async (
    url: string,
    name: string,
    type: 'avatar' | 'views' | 'expression'
  ) => {
    try {
      const categoryMap: Record<string, string> = {
        avatar: '角色头像',
        views: '角色三视图',
        expression: '角色表情',
      };
      await apiFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type: 'image',
          category: categoryMap[type] || '角色',
          url,
          characterId: id,
          prompt: '',
          model: 'ai-generated',
        }),
      });
    } catch {
      // Silently fail - asset sync is optional
      console.warn('同步资产库失败');
    }
  }, [id]);

  // Avatar generation
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  // SSE streams
  const avatarStream = useAIStream();
  const viewsStream = useAIStream();
  const expressionStream = useAIStream();

  // Visual style
  const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0].id);

  // Anchor & Forbidden input values
  const [anchorText, setAnchorText] = useState("");
  const [forbiddenText, setForbiddenText] = useState("");

  // P2: 表情动作库展开状态
  const [showExpressionLibrary, setShowExpressionLibrary] = useState(false);
  const [selectedExpressionKey, setSelectedExpressionKey] = useState<string | null>(null);

  // P-Show-1: 表演指令面板
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [performanceCommand, setPerformanceCommand] = useState("");
  const [selectedPerfExpression, setSelectedPerfExpression] = useState<string>("");
  const [selectedPerfAction, setSelectedPerfAction] = useState<string>("");
  const [selectedPerfScene, setSelectedPerfScene] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/characters/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const mapped = mapCharacter(d.data);
        setCharacter(mapped);
        if (mapped) {
          setEditedName(mapped.name);
          setEditedDescription(mapped.description);
          setEditedPersonality("");
          setEditedTags("");
          setAnchorText(mapped.anchors.join("、"));
          setForbiddenText(mapped.forbidden.join("、"));
          // 默认提示词仅填充角色描述
          setViewPrompt(mapped.description || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSaveEdit = async () => {
    if (!character) return;
    // 输入验证
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      toast.error("角色名称不能为空");
      return;
    }
    if (trimmedName.length > 50) {
      toast.error("角色名称不能超过50个字符");
      return;
    }
    const trimmedDescription = editedDescription.trim();
    if (trimmedDescription.length > 2000) {
      toast.error("角色描述不能超过2000个字符");
      return;
    }
    try {
      const res = await apiFetch(`/api/characters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription,
          personality: editedPersonality.trim() || character.description,
          tags: editedTags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setCharacter(mapCharacter(d.data));
        setIsEditing(false);
        setAnchorText("");
        setForbiddenText("");
        toast.success("保存成功");
      }
    } catch {
      toast.error("保存失败");
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/api/characters/${id}`, { method: "DELETE" });
      router.push("/characters");
    } catch {
      toast.error("删除失败");
    }
  };

  const handleGenerateAvatar = async () => {
    if (!character) return;
    setIsGeneratingAvatar(true);
    try {
      const basePrompt = `专业人物肖像摄影，${character.description || ""}，高清画质，正面特写，面部清晰，背景简洁干净，柔和布光，专业影棚拍摄`;
      const prompt = applyStyleToPrompt(basePrompt, selectedStyle);
      const d = await avatarStream.run("/api/ai/generate-character-image", {
        prompt,
        style: selectedStyle,
        size: "1K",
      });
      if (d && Array.isArray((d as Record<string, unknown>).imageUrls) && ((d as Record<string, unknown>).imageUrls as unknown[]).length > 0) {
        const avatarUrl = ((d as Record<string, unknown>).imageUrls as unknown[])[0] as string;
        await apiFetch(`/api/characters/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: avatarUrl }),
        });
        setCharacter((prev) => prev ? { ...prev, avatar: avatarUrl } : prev);
        syncToAssets(avatarUrl, `${character.name}-头像`, 'avatar');
        toast.success("头像生成成功");
      } else {
        toast.error("头像生成失败");
      }
    } catch {
      toast.error("头像生成失败");
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleGenerateViews = async () => {
    if (!character) return;
    setIsGeneratingViews(true);
    try {
      const styledPrompt = applyStyleToPrompt(viewPrompt || "", selectedStyle);
      const d = await viewsStream.run("/api/ai/generate-character-views", {
        prompt: styledPrompt,
        image: useAvatarReference ? character.avatar : undefined,
        style: selectedStyle,
        size: "2K",
      });
      if (d && Array.isArray((d as Record<string, unknown>).views) && ((d as Record<string, unknown>).views as unknown[]).length > 0) {
        const newViews = [((d as Record<string, unknown>).views as unknown[])[0] as string];
        await apiFetch(`/api/characters/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ views: newViews }),
        });
        setCharacter((prev) => prev ? { ...prev, views: newViews } : prev);
        if (newViews[0]) {
          syncToAssets(newViews[0], `${character.name}-三视图`, 'views');
        }
        toast.success("三视图生成成功");
      } else {
        toast.error("生成失败");
      }
    } catch {
      toast.error("生成失败");
    } finally {
      setIsGeneratingViews(false);
    }
  };

  const handleGenerateExpression = async (index: number) => {
    if (!character) return;
    const label = EXPRESSION_LABELS[index];
    
    // 添加当前索引到生成中集合
    setGeneratingExprIndexes(prev => new Set(prev).add(index));
    
    try {
      const refImage = character.avatar?.trim() || character.views?.[0]?.trim() || undefined;
      const basePrompt = `相同的角色，${label}表情，${character.description || ""}，保持面部特征和服装造型完全一致，纯白色背景，干净白底，无任何背景元素，专业人物摄影，高清画质`;
      const prompt = applyStyleToPrompt(basePrompt, selectedStyle);
      const d = await expressionStream.run("/api/ai/generate-character-image", {
        prompt,
        image: refImage,
        style: selectedStyle,
        size: "1K",
      });
      if (d && Array.isArray((d as Record<string, unknown>).imageUrls) && ((d as Record<string, unknown>).imageUrls as unknown[]).length > 0) {
        const imageUrl = ((d as Record<string, unknown>).imageUrls as unknown[])[0] as string;
        
        // 使用函数式更新获取最新的 character 状态
        setCharacter((prev) => {
          if (!prev) return prev;
          const newExpressions = [...prev.expressions];
          while (newExpressions.length <= index) {
            newExpressions.push("");
          }
          newExpressions[index] = imageUrl;
          return { ...prev, expressions: newExpressions };
        });
        
        // 保存到数据库
        await apiFetch(`/api/characters/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expressions: { index, url: imageUrl } }),
        });
        
        syncToAssets(imageUrl, `${character.name}-${label}表情`, 'expression');
        toast.success(`${label}表情生成成功`);
      } else {
        toast.error("生成失败");
      }
    } catch {
      toast.error("生成失败");
    } finally {
      // 从生成中集合移除当前索引
      setGeneratingExprIndexes(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[#1A1A1A] rounded w-1/3" />
            <div className="h-64 bg-[#1A1A1A] rounded" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!character) {
    return (
      <AppShell>
        <div className="p-6">
          <Button variant="ghost" onClick={() => router.push("/characters")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回角色库
          </Button>
          <p className="text-muted-foreground mt-4">角色不存在</p>
        </div>
      </AppShell>
    );
  }

  const hasView = isValidImageUrl(character.views[0]) && !failedImages.has('view-0');

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.push("/characters")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回角色库
          </Button>
          <Button
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除角色
          </Button>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 space-y-3">
            <div className="rounded-xl border border-[#333] overflow-hidden bg-[#141414] relative group" style={{ aspectRatio: "3/4" }}>
              {character.avatar ? (
                <>
                  <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDownload(character.avatar!, `${character.name}-头像.png`)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    下载
                  </Button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#888]">
                  <span className="text-sm">暂无头像</span>
                </div>
              )}
            </div>
            <div>
              <Button
                className="w-full"
                onClick={handleGenerateAvatar}
                disabled={isGeneratingAvatar}
              >
                {isGeneratingAvatar ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
                {isGeneratingAvatar ? "生成中..." : (character.avatar ? "重新生成头像" : "生成头像")}
              </Button>
              <AIProgressBar stream={avatarStream} />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{character.name}</h1>
              <div className="flex gap-2 flex-wrap">
                {/* 只显示有值的属性标签 */}
                {character.occupation && (
                  <Badge variant="outline" className="border-[#333] text-[#888]">{character.occupation}</Badge>
                )}
              </div>
            </div>
            
            {/* 人物信息编辑区 - 替代弹框 */}
            <div className="p-4 rounded-xl bg-[#141414] border border-[#333] space-y-4">
              <h3 className="text-sm font-medium text-[#888] mb-2">人物信息编辑</h3>
              
              {/* 角色名称 */}
              <div>
                <label className="text-xs text-[#888] block mb-1">角色名称</label>
                <Input 
                  value={editedName} 
                  onChange={(e) => setEditedName(e.target.value)} 
                  className="bg-[#0A0A0A] border-[#333] text-white" 
                />
              </div>
              
              {/* 角色描述 */}
              <div>
                <label className="text-xs text-[#888] block mb-1">角色描述（用于AI生图）</label>
                <Textarea 
                  value={editedDescription} 
                  onChange={(e) => setEditedDescription(e.target.value)} 
                  className="bg-[#0A0A0A] border-[#333] text-white min-h-[80px]" 
                  placeholder="描述角色的外貌、服装、气质等特征..."
                />
              </div>
              
              {/* 标签 */}
              <div>
                <label className="text-xs text-[#888] block mb-1">标签（逗号分隔）</label>
                <Input 
                  value={editedTags} 
                  onChange={(e) => setEditedTags(e.target.value)} 
                  className="bg-[#0A0A0A] border-[#333] text-white" 
                  placeholder="主角, 热血, 勇敢..."
                />
              </div>
              
              {/* 保存按钮 */}
              <Button className="w-full" onClick={handleSaveEdit}>
                <Save className="w-4 h-4 mr-1" />保存修改
              </Button>
            </div>
            
            <div className="pt-2">
              <StyleSelector value={selectedStyle} onChange={setSelectedStyle} />
            </div>
          </div>
        </div>

        {/* Three Views - Single Image */}
        <div className="rounded-xl bg-[#141414] border border-[#333] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">角色三视图</h2>
            <div>
              <Button size="sm" onClick={handleGenerateViews} disabled={isGeneratingViews}>
                {isGeneratingViews ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
                {isGeneratingViews ? "生成中..." : hasView ? "重新生成" : "生成三视图"}
              </Button>
              <AIProgressBar stream={viewsStream} />
            </div>
          </div>

          {/* Prompt Editor */}
          {showViewPrompt && (
            <div className="mb-4 p-3 rounded-lg bg-[#1A1A1A] border border-[#333]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#888]">提示词（可编辑）</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowViewPrompt(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <Textarea
                value={viewPrompt}
                onChange={(e) => setViewPrompt(e.target.value)}
                className="bg-[#0A0A0A] border-[#333] text-white text-sm min-h-[60px]"
                placeholder="描述角色特征，如：年轻女性，长发，穿着白色连衣裙..."
              />
              {/* 参考头像开关 */}
              <div className="flex items-center justify-between mt-3 mb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useAvatarReference}
                    onChange={(e) => setUseAvatarReference(e.target.checked)}
                    className="w-4 h-4 rounded border-[#333] bg-[#0A0A0A] text-[#0ABAB5] focus:ring-[#0ABAB5]/30"
                  />
                  <span className="text-xs text-[#888]">参考头像生图</span>
                </label>
                <span className="text-xs text-[#666]">
                  {useAvatarReference ? "将参考头像风格" : "仅使用提示词生成"}
                </span>
              </div>
              <p className="text-xs text-[#666] mt-1">输入角色描述即可，系统会自动补充三视图模板</p>
            </div>
          )}

          {!showViewPrompt && (
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="sm" className="text-xs text-[#888]" onClick={() => setShowViewPrompt(true)}>
                <Edit3 className="w-3 h-3 mr-1" />
                编辑提示词
              </Button>
              <span className="text-xs text-[#666]">
                {useAvatarReference ? "📋 参考头像" : "✨ 纯提示词"}
              </span>
            </div>
          )}

          {isValidImageUrl(character.views[0]) && !failedImages.has('view-0') ? (
            <div className="rounded-xl overflow-hidden border border-[#333] bg-[#0A0A0A] relative group" style={{ aspectRatio: "21/9" }}>
              <img
                src={character.views[0]}
                alt="角色三视图"
                className="w-full h-full object-contain"
                onError={() => handleImageError('view-0')}
              />
              {/* 下载按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDownload(character.views[0], `${character.name}-三视图.png`)}
              >
                <Download className="w-4 h-4 mr-1" />
                下载
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center border border-dashed border-[#333] rounded-xl overflow-hidden relative" style={{ aspectRatio: "21/9" }}>
              {/* 骨架屏渐变背景动画 */}
              <div className="absolute inset-0 skeleton-gradient" />
              {/* 中心内容 */}
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#333]">
                  <Wand2 className="w-8 h-8 text-[#0ABAB5] opacity-60" />
                </div>
                <p className="text-sm text-[#888]">点击右上角按钮生成三视图</p>
              </div>
            </div>
          )}
        </div>

        {/* Expression Variations */}
        <div className="rounded-xl bg-[#141414] border border-[#333] p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">表情变化</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {EXPRESSION_LABELS.map((label, index) => {
              const imgUrl = character.expressions[index];
              const isGenerating = generatingExprIndexes.has(index);
              const imageKey = `expr-${index}`;
              const hasError = failedImages.has(imageKey);
              const showSkeleton = !isValidImageUrl(imgUrl) || hasError;
              return (
                <div key={label} className="rounded-xl overflow-hidden border border-[#333] bg-[#0A0A0A]">
                  <div className="relative" style={{ aspectRatio: "1/1" }}>
                    {showSkeleton ? (
                      <div className="w-full h-full relative overflow-hidden">
                        {/* 骨架屏渐变背景动画 */}
                        <div className="absolute inset-0 skeleton-gradient" />
                        {/* 中心内容 - 不显示旋转图标 */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xs text-[#666]">待生成</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full relative group">
                        <img
                          src={imgUrl}
                          alt={label}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(imageKey)}
                        />
                        {/* 下载按钮 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2 text-xs"
                          onClick={() => handleDownload(imgUrl, `${character.name}-${label}.png`)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          下载
                        </Button>
                      </div>
                    )}
                    {isGenerating && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-between">
                    <span className="text-xs text-white">{label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary"
                      onClick={() => handleGenerateExpression(index)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? "生成中" : <><RefreshCw className="w-3 h-3 mr-1" />{showSkeleton ? "生成" : "重新生成"}</>}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* P2: SkyReels 表情动作库 */}
        <div className="rounded-xl bg-[#141414] border border-[#333] p-6 mb-6">
          <button
            onClick={() => setShowExpressionLibrary(!showExpressionLibrary)}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Smile className="w-5 h-5 text-[#0ABAB5]" />
              SkyReels 表情动作库
              <Badge variant="secondary" className="text-xs bg-[#0ABAB5]/20 text-[#0ABAB5]">33种表情</Badge>
            </h2>
            {showExpressionLibrary ? (
              <ChevronDown className="w-5 h-5 text-[#888]" />
            ) : (
              <ChevronRight className="w-5 h-5 text-[#888]" />
            )}
          </button>
          <p className="text-xs text-[#888] mb-4">
            基于 SkyReels 开源项目的标准表情分类，为 AI 表演生成提供标准化指令
          </p>

          {showExpressionLibrary && (
            <div className="space-y-4">
              {/* 表情分类标签 */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Object.entries(EXPRESSION_LIBRARY).map(([key, expr]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedExpressionKey(selectedExpressionKey === key ? null : key)}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      selectedExpressionKey === key
                        ? 'bg-[#0ABAB5]/20 border border-[#0ABAB5]/50 text-[#0ABAB5]'
                        : 'bg-[#1A1A1A] border border-[#333] text-[#ccc] hover:border-[#555]'
                    }`}
                  >
                    <div className="font-medium">{expr.name}</div>
                    <div className="text-xs text-[#888] mt-0.5">
                      强度: {Array.isArray(expr.intensity) ? expr.intensity.join(',') : expr.intensity}
                    </div>
                  </button>
                ))}
              </div>

              {/* 选中表情详情 */}
              {selectedExpressionKey && (
                <div className="mt-4 p-4 bg-[#0A0A0A] rounded-lg border border-[#333]">
                  {(() => {
                    const expr = getExpression(selectedExpressionKey);
                    if (!expr) return null;
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[#0ABAB5]" />
                          <h3 className="text-white font-medium">{expr.name}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-[#888]">触发场景：</span>
                            <span className="text-[#ccc]">{expr.triggers.join('、')}</span>
                          </div>
                          <div>
                            <span className="text-[#888]">对白风格：</span>
                            <span className="text-[#ccc]">{expr.dialogueStyle}</span>
                          </div>
                          {'compoundOf' in expr && expr.compoundOf && (
                            <div>
                              <span className="text-[#888]">复合表情：</span>
                              <span className="text-[#ccc]">{(expr as unknown as Record<string, string[]>).compoundOf.join(' + ')}</span>
                            </div>
                          )}
                        </div>
                        {/* 推荐用于当前角色 */}
                        {character && (
                          <div className="pt-2 border-t border-[#333]">
                            <p className="text-xs text-[#888] mb-2">基于角色性格推荐的使用场景：</p>
                            <div className="flex flex-wrap gap-2">
                              {recommendExpression(character.personality || 'neutral').map((rec, i) => (
                                <Badge key={i} variant="secondary" className="text-xs bg-[#0ABAB5]/10 text-[#0ABAB5]">
                                  {rec}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* P-Show-1: 表演指令面板 */}
        <div className="space-y-2">
          <button
            onClick={() => setShowPerformancePanel(!showPerformancePanel)}
            className="flex items-center justify-between w-full text-left"
            aria-expanded={showPerformancePanel}
            aria-label="切换表演指令面板"
          >
            <span className="text-sm font-medium text-white">表演指令</span>
            <span className="text-xs text-[#888] mr-2">
              {showPerformancePanel ? "收起" : "展开"}
            </span>
            <ChevronDown className={`w-4 h-4 text-[#888] transition-transform ${showPerformancePanel ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {showPerformancePanel && (
            <div className="bg-[#0A0A0A] rounded-lg border border-[#333] p-4 space-y-3">
              <div className="text-xs text-[#888] mb-2">选择一个表情和动作，生成角色表演指令</div>
              {/* 表情选择 */}
              <div className="grid grid-cols-4 gap-1">
                {["neutral", "happy", "sad", "angry", "surprised", "fearful", "disgusted", "contempt"].map((expr) => {
                  const info = getExpression(expr);
                  return (
                    <button
                      key={expr}
                      onClick={() => setSelectedPerfExpression(expr)}
                      className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                        selectedPerfExpression === expr
                          ? "bg-[#0ABAB5]/20 border-[#0ABAB5] text-[#0ABAB5]"
                          : "bg-[#141414] border-[#333] text-[#888] hover:border-[#555]"
                      }`}
                    >
                      {info?.name || expr}
                    </button>
                  );
                })}
              </div>
              {/* 动作选择 */}
              <div className="grid grid-cols-3 gap-1">
                {["standing", "walking", "running", "sitting", "gesturing", "turning"].map((action) => (
                  <button
                    key={action}
                    onClick={() => setSelectedPerfAction(action)}
                    className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                      selectedPerfAction === action
                        ? "bg-[#0ABAB5]/20 border-[#0ABAB5] text-[#0ABAB5]"
                        : "bg-[#141414] border-[#333] text-[#888] hover:border-[#555]"
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
              {/* 场景选择 */}
              <div className="grid grid-cols-2 gap-1">
                {["室内对话", "室外行走", "战斗场景", "情感爆发"].map((scene) => (
                  <button
                    key={scene}
                    onClick={() => setSelectedPerfScene(scene)}
                    className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                      selectedPerfScene === scene
                        ? "bg-[#0ABAB5]/20 border-[#0ABAB5] text-[#0ABAB5]"
                        : "bg-[#141414] border-[#333] text-[#888] hover:border-[#555]"
                    }`}
                  >
                    {scene}
                  </button>
                ))}
              </div>
              {/* 生成按钮 */}
              <Button
                size="sm"
                className="w-full bg-[#0ABAB5] hover:bg-[#0ABAB5]/80 text-black"
                disabled={!selectedPerfExpression}
                onClick={() => {
                  const expr = getExpression(selectedPerfExpression);
                  const cmd = `${character.name}，${expr?.name || selectedPerfExpression}表情，${selectedPerfAction || "站立"}动作，${selectedPerfScene || "室内对话"}场景`;
                  setPerformanceCommand(cmd);
                }}
              >
                <Wand2 className="w-3 h-3 mr-1" />
                生成表演指令
              </Button>
              {/* 提示词预览 */}
              {performanceCommand && (
                <div className="bg-[#141414] rounded p-2 text-xs text-[#0ABAB5] font-mono border border-[#0ABAB5]/30">
                  {performanceCommand}
                </div>
              )}
            </div>
          )}
        </div>

      {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] rounded-xl border border-[#333] p-6 w-full max-w-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">编辑角色</h3>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-[#888] block mb-1">角色名称</label>
                  <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="bg-[#0A0A0A] border-[#333] text-white" />
                </div>
                <div>
                  <label className="text-sm text-[#888] block mb-1">角色描述</label>
                  <Textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="bg-[#0A0A0A] border-[#333] text-white min-h-[80px]" />
                </div>
                <div>
                  <label className="text-sm text-[#888] block mb-1">性格特点</label>
                  <Input value={editedPersonality} onChange={(e) => setEditedPersonality(e.target.value)} className="bg-[#0A0A0A] border-[#333] text-white" placeholder="开朗、善良、坚韧..." />
                </div>
                <div>
                  <label className="text-sm text-[#888] block mb-1">标签（逗号分隔）</label>
                  <Input value={editedTags} onChange={(e) => setEditedTags(e.target.value)} className="bg-[#0A0A0A] border-[#333] text-white" placeholder="主角, 反派, 配角..." />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleSaveEdit}>
                  <Save className="w-4 h-4 mr-1" />保存修改
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>取消</Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] rounded-xl border border-[#333] p-6 w-full max-w-md space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">确认删除角色</h3>
                <p className="text-sm text-[#888] mt-2">
                  此操作将永久删除该角色的所有数据，包括头像、三视图、表情图等，且无法恢复。确定要删除吗？
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  onClick={handleDeleteCharacter}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />删除中...</>
                  ) : (
                    "确认删除"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
