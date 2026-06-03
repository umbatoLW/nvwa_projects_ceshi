'use client';

import { useState, useEffect } from 'react';

import { apiFetch } from '@/lib/api-client';
import { AppShell } from '@/components/app-sidebar';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Upload,
  Grid3X3,
  List,
  ImageIcon,
  Video,
  Music,
  FileText,
  X,
  Trash2,
  CheckSquare,
  Square,
  Eye,
  Copy,
  Calendar,
  Play,
  Download,
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  createdAt: string; // 原始日期字符串
  createdAtDisplay: string; // 显示用的格式化日期
  usage: number;
  coverUrl?: string; // 视频封面图
  metadata?: {
    coverUrl?: string;
    videoUrl?: string;
    duration?: number;
    ratio?: string;
    [key: string]: unknown;
  };
}

const typeOptions = ['全部资产', '图片资产', '视频资产'];
const typeIcons: Record<string, typeof ImageIcon> = {
  图片资产: ImageIcon,
  视频资产: Video,
};

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 获取日期分组键（YYYY-MM-DD）
function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

// 格式化日期显示
function formatDateDisplay(dateKey: string): string {
  const date = new Date(dateKey);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (dateOnly.getTime() === todayOnly.getTime()) {
    return '今天';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return '昨天';
  } else {
    // 显示中文日期格式
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
  }
}

export default function AssetsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部资产');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  const loadAssets = () => {
    setLoading(true);
    apiFetch('/api/assets')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setAssets(
            res.data.map((a: Asset) => ({
              ...a,
              size: a.size || 0,
              type: a.type || '图片',
              usage: a.usage || 0,
              createdAtDisplay: new Date(a.createdAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }),
              // 从 metadata 中提取 coverUrl
              coverUrl: a.metadata?.coverUrl || undefined,
            }))
          );
        }
      })
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = a.name.toLowerCase().includes(q);
    const typeMap: Record<string, string> = {
      '全部资产': '',
      '图片资产': '图片',
      '视频资产': '视频',
    };
    const targetType = typeMap[typeFilter];
    const matchType = !targetType || a.type === targetType;
    return matchSearch && matchType;
  });

  // 按日期分组
  const groupedAssets = filtered.reduce((groups, asset) => {
    const dateKey = getDateKey(asset.createdAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(asset);
    return groups;
  }, {} as Record<string, Asset[]>);

  // 按日期降序排序
  const sortedDateKeys = Object.keys(groupedAssets).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const deleteOne = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!confirm('确定要删除这个资产吗？')) return;
    try {
      const res = await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        setAssets((prev) => prev.filter((a) => a.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (err) {
      toast.error('删除失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个资产吗？`)) return;
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) successCount++;
      } catch {
        // ignore single failure
      }
    }
    toast.success(`成功删除 ${successCount} 个资产`);
    setSelectedIds(new Set());
    loadAssets();
  };

  const isAllSelected = filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id));

  const openPreview = (asset: Asset) => {
    setPreviewAsset(asset);
  };

  const copyAssetUrl = async (asset: Asset, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!asset.url) {
      toast.error('资产链接无效');
      return;
    }
    try {
      await navigator.clipboard.writeText(asset.url);
      toast.success(`已复制「${asset.name}」链接到剪贴板，可在工作区中使用`);
    } catch {
      toast.error('复制失败');
    }
  };

  const handleDownload = async (asset: Asset, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!asset.url) {
      toast.error('资产链接无效');
      return;
    }
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      // 使用 asset.id 作为默认文件名，避免 Date.now() 的 lint 警告
      link.download = asset.name || `asset-${asset.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success(`已开始下载「${asset.name}」`);
    } catch {
      toast.error('下载失败');
    }
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#F5F5F5]">资产库</h1>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0ABAB5] text-black text-sm font-medium hover:shadow-[0_0_12px_rgba(10,186,181,0.3)] transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            上传资产
            <input type="file" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append('file', file);
              try {
                const res = await apiFetch('/api/assets', {
                  method: 'POST',
                  body: formData,
                });
                const data = await res.json();
                if (data.success) {
                  toast.success('上传成功');
                  loadAssets();
                } else {
                  toast.error(data.error || '上传失败');
                }
              } catch (err) {
                toast.error('上传失败: ' + (err instanceof Error ? err.message : String(err)));
              }
            }} />
          </label>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
            <input
              type="text"
              placeholder="搜索资产..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px] bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:ring-[#0ABAB5]/30">
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-[#333333] text-[#F5F5F5]">
              {typeOptions.map((o) => (
                <SelectItem key={o} value={o} className="focus:bg-[#0ABAB5]/10 focus:text-[#0ABAB5]">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]' : 'text-[#888888] hover:bg-[#1A1A1A]'}`}><Grid3X3 className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]' : 'text-[#888888] hover:bg-[#1A1A1A]'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Batch Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#0ABAB5]/10 border border-[#0ABAB5]/20">
            <span className="text-sm text-[#0ABAB5]">已选择 {selectedIds.size} 项</span>
            <button
              onClick={deleteSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF4444]/20 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              批量删除
            </button>
            <button
              onClick={deselectAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] text-[#888888] text-xs font-medium hover:text-[#F5F5F5] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              取消选择
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0ABAB5]/30 border-t-[#0ABAB5] rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[#888888]">
            <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
            <p>暂无资产</p>
          </div>
        )}

        {/* Grid View - 按日期分组 */}
        {!loading && viewMode === 'grid' && sortedDateKeys.map((dateKey) => {
          const dateAssets = groupedAssets[dateKey];
          return (
            <div key={dateKey} className="space-y-4">
              {/* 日期标题 */}
              <div className="flex items-center gap-3 sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-sm py-2">
                <Calendar className="w-4 h-4 text-[#0ABAB5]" />
                <h2 className="text-sm font-medium text-[#F5F5F5]">{formatDateDisplay(dateKey)}</h2>
                <span className="text-xs text-[#888888]">({dateAssets.length} 个资产)</span>
                <div className="flex-1 h-px bg-[#333333]/50" />
              </div>
              
              {/* 该日期下的资产网格 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4">
                {dateAssets.map((asset) => {
                  const Icon = typeIcons[asset.type] || FileText;
                  const isImage = asset.type === '图片';
                  const isVideo = asset.type === '视频';
                  // 视频预览图：优先使用 coverUrl，否则显示视频图标
                  const videoPoster = asset.coverUrl;
                  return (
                    <div key={asset.id} className="group bg-[#141414] border border-[#333333]/30 rounded-xl overflow-hidden hover:border-[#0ABAB5]/50 transition-colors relative">
                      {/* Preview Area */}
                      <div className="relative bg-[#1A1A1A] flex items-center justify-center overflow-hidden aspect-[3/4]">
                        {isImage && asset.url ? (
                          <button
                            onClick={() => openPreview(asset)}
                            className="w-full h-full flex items-center justify-center"
                          >
                            <img
                              src={asset.url}
                              alt={asset.name}
                              className="w-full h-full object-cover object-center"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.className = 'flex items-center justify-center w-full h-full';
                                fallback.innerHTML = '<svg class="w-10 h-10 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                (e.target as HTMLImageElement).parentElement?.appendChild(fallback);
                              }}
                            />
                          </button>
                        ) : isVideo ? (
                          <button
                            onClick={() => openPreview(asset)}
                            className="w-full h-full flex items-center justify-center relative overflow-hidden"
                          >
                            {/* 使用 video 元素显示视频第一帧作为预览 */}
                            <video
                              src={asset.url}
                              className="w-full h-full object-cover object-center"
                              muted
                              playsInline
                              preload="metadata"
                              onError={(e) => {
                                // 视频加载失败时显示图标占位
                                const target = e.target as HTMLVideoElement;
                                target.style.display = 'none';
                              }}
                            />
                            {/* 视频播放图标 */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Play className="w-5 h-5 text-white ml-0.5" />
                              </div>
                            </div>
                          </button>
                        ) : (
                          <Icon className="w-10 h-10 text-[#333333]" />
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); openPreview(asset); }}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            预览
                          </button>
                          <button
                            onClick={(e) => handleDownload(asset, e)}
                            className="px-3 py-1.5 rounded-lg bg-[#0ABAB5] text-black text-xs font-medium hover:bg-[#0ABAB5]/90 transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            下载
                          </button>
                        </div>
                        {/* Selection checkbox */}
                        <div className="absolute top-2 left-2 z-20">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(asset.id); }}
                            className={`p-1.5 rounded-lg transition-colors ${selectedIds.has(asset.id) ? 'bg-[#0ABAB5]/20 text-[#0ABAB5]' : 'bg-black/50 text-[#888888] hover:text-[#F5F5F5]'}`}
                          >
                            {selectedIds.has(asset.id) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {/* Delete button */}
                        <button
                          onClick={(e) => deleteOne(asset.id, e)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-[#888888] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[#0ABAB5]/10 text-[#0ABAB5]">{asset.type}</span>
                          {asset.metadata?.ratio && (
                            <span className="text-xs text-[#888888]">{asset.metadata.ratio}</span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-[#F5F5F5] truncate">{asset.name}</h3>
                        <span className="text-xs text-[#888888]">{asset.createdAtDisplay}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* List View - 按日期分组 */}
        {!loading && viewMode === 'list' && sortedDateKeys.map((dateKey) => {
          const dateAssets = groupedAssets[dateKey];
          return (
            <div key={dateKey} className="space-y-3">
              {/* 日期标题 */}
              <div className="flex items-center gap-3 sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-sm py-2">
                <Calendar className="w-4 h-4 text-[#0ABAB5]" />
                <h2 className="text-sm font-medium text-[#F5F5F5]">{formatDateDisplay(dateKey)}</h2>
                <span className="text-xs text-[#888888]">({dateAssets.length} 个资产)</span>
                <div className="flex-1 h-px bg-[#333333]/50" />
              </div>
              
              {/* 该日期下的资产列表 */}
              <div className="bg-[#141414] border border-[#333333]/30 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#333333]/30 text-[#888888]">
                      <th className="text-left px-4 py-3 font-medium w-10">
                        <button onClick={isAllSelected ? deselectAll : selectAll} className="text-[#888888] hover:text-[#0ABAB5] transition-colors">
                          {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 font-medium">名称</th>
                      <th className="text-left px-4 py-3 font-medium">类型</th>
                      <th className="text-left px-4 py-3 font-medium">大小</th>
                      <th className="text-left px-4 py-3 font-medium">时间</th>
                      <th className="text-left px-4 py-3 font-medium w-20">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateAssets.map((asset) => {
                      const Icon = typeIcons[asset.type] || FileText;
                      return (
                        <tr key={asset.id} className="border-b border-[#333333]/20 hover:bg-[#1A1A1A]/50 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleSelect(asset.id)}
                              className={`transition-colors ${selectedIds.has(asset.id) ? 'text-[#0ABAB5]' : 'text-[#888888] hover:text-[#F5F5F5]'}`}
                            >
                              {selectedIds.has(asset.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => openPreview(asset)} className="flex items-center gap-2 text-[#F5F5F5] hover:text-[#0ABAB5] transition-colors text-left">
                              <Icon className="w-4 h-4 text-[#888888]" />
                              {asset.name}
                            </button>
                          </td>
                          <td className="px-4 py-3"><span className="text-xs px-1.5 py-0.5 rounded bg-[#0ABAB5]/10 text-[#0ABAB5]">{asset.type}</span></td>
                          <td className="px-4 py-3 text-[#888888]">{formatSize(asset.size)}</td>
                          <td className="px-4 py-3 text-[#888888]">{new Date(asset.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openPreview(asset)} className="p-1.5 rounded-lg text-[#888888] hover:text-[#0ABAB5] transition-colors" title="预览"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDownload(asset)} className="p-1.5 rounded-lg text-[#888888] hover:text-[#0ABAB5] transition-colors" title="下载"><Download className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Preview Modal - 全屏展示 */}
        {previewAsset && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setPreviewAsset(null)}
          >
            {/* 关闭按钮 - 右上角 */}
            <button 
              onClick={() => setPreviewAsset(null)} 
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* 预览内容 - 全屏 */}
            <div
              className="w-full h-full flex items-center justify-center p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {previewAsset.type === '图片' && previewAsset.url ? (
                <img
                  src={previewAsset.url}
                  alt={previewAsset.name}
                  className="w-full h-full object-contain"
                />
              ) : previewAsset.type === '视频' && previewAsset.url ? (
                <video 
                  src={previewAsset.url} 
                  controls 
                  autoPlay
                  poster={previewAsset.coverUrl}
                  className="w-full h-full max-w-[95vw] max-h-[85vh] object-contain" 
                />
              ) : previewAsset.type === '音频' && previewAsset.url ? (
                <div className="flex flex-col items-center gap-4">
                  <Music className="w-24 h-24 text-[#0ABAB5]" />
                  <audio src={previewAsset.url} controls autoPlay className="w-80" />
                </div>
              ) : (
                <div className="text-center text-[#888888]">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>该文件类型暂不支持预览</p>
                </div>
              )}
            </div>
            
            {/* 底部信息栏 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs px-2 py-1 rounded bg-[#0ABAB5]/20 text-[#0ABAB5]">{previewAsset.type}</span>
                  <span className="text-white font-medium">{previewAsset.name}</span>
                  <span className="text-white/50 text-sm">{formatSize(previewAsset.size)}</span>
                </div>
                <button
                  onClick={() => handleDownload(previewAsset)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0ABAB5] text-black text-sm font-medium hover:bg-[#0ABAB5]/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
