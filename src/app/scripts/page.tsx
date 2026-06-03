'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { AppShell } from '@/components/app-sidebar';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Grid3X3,
  List,
  FileText,
  Trash2,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';

interface Script {
  id: string;
  title: string;
  genre: string;
  status: string;
  content: string;
  scenes: number;
  characters: number;
  updatedAt: string;
  words?: number;
  time?: string;
  coverImage?: string | null;
}

const genreOptions = ['全部', '都市甜宠', '玄幻修仙', '悬疑探案', '复仇爽剧', '古风穿越'];
const statusOptions = ['全部', '草稿', '审核中', '已完成'];

const statusColors: Record<string, string> = {
  草稿: 'bg-[#888888]/20 text-[#888888]',
  审核中: 'bg-[#F59E0B]/20 text-[#F59E0B]',
  已完成: 'bg-[#22C55E]/20 text-[#22C55E]',
};

// 状态映射：API返回值 -> 中文显示
const statusMapping: Record<string, string> = {
  'draft': '草稿',
  'completed': '已完成',
  'reviewing': '审核中',
  '审核中': '审核中',
  '草稿': '草稿',
  '已完成': '已完成',
};

export default function ScriptsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('全部');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isCreatingRef = useRef(false);

  const loadScripts = () => {
    setLoading(true);
    apiFetch('/api/scripts')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const mapped = res.data.map((s: Script) => ({
            ...s,
            words: s.content?.length || 0,
            time: new Date(s.updatedAt).toLocaleDateString('zh-CN'),
          }));
          setScripts(mapped);
        }
      })
      .catch(() => setScripts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadScripts();

    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new' && !isCreatingRef.current) {
      isCreatingRef.current = true; // 标记正在创建，防止重复
      
      // 清除 URL 参数，防止刷新时重复创建
      window.history.replaceState({}, '', '/scripts');
      
      apiFetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '未命名剧本',
          genre: '未分类',
          synopsis: '',
          content: '',
          scenes: 0,
          characters: 0,
          status: 'draft',
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data?.id) {
            router.push(`/scripts/${res.data.id}`);
          } else {
            isCreatingRef.current = false; // 失败时重置标记
          }
        })
        .catch(() => {
          isCreatingRef.current = false; // 出错时重置标记
        });
    }
  }, [router]);

  const filtered = scripts.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = s.title.toLowerCase().includes(q) || (s.genre && s.genre.toLowerCase().includes(q));
    const matchGenre = genreFilter === '全部' || s.genre === genreFilter;
    // 修复状态筛选：使用状态映射
    const normalizedStatus = statusMapping[s.status] || s.status;
    const matchStatus = statusFilter === '全部' || normalizedStatus === statusFilter;
    return matchSearch && matchGenre && matchStatus;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const deleteOne = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!confirm('确定要删除这个剧本吗？')) return;
    try {
      const res = await apiFetch(`/api/scripts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        setScripts((prev) => prev.filter((s) => s.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个剧本吗？`)) return;
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await apiFetch(`/api/scripts/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) successCount++;
      } catch {
        // ignore single failure
      }
    }
    toast.success(`成功删除 ${successCount} 个剧本`);
    setSelectedIds(new Set());
    loadScripts();
  };

  const isAllSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#F5F5F5]">剧本库</h1>
          <button
            onClick={async () => {
              try {
                const res = await apiFetch('/api/scripts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: '未命名剧本',
                    genre: '未分类',
                    synopsis: '',
                    content: '',
                    scenes: 0,
                    characters: 0,
                    status: 'draft',
                  }),
                });
                const result = await res.json();
                if (result.success && result.data?.id) {
                  router.push(`/scripts/${result.data.id}`);
                }
              } catch (error) {
                toast.error('创建失败: ' + (error instanceof Error ? error.message : String(error)));
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0ABAB5] text-black text-sm font-medium hover:shadow-[0_0_12px_rgba(10,186,181,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" />
            新建剧本
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
            <input
              type="text"
              placeholder="搜索剧本..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
            />
          </div>
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
          >
            {genreOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]' : 'text-[#888888] hover:bg-[#1A1A1A]'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]' : 'text-[#888888] hover:bg-[#1A1A1A]'}`}
            >
              <List className="w-4 h-4" />
            </button>
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

        {/* Grid View */}
        {!loading && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((script) => (
              <div
                key={script.id}
                className="group bg-[#141414] border border-[#333333]/30 rounded-xl overflow-hidden hover:border-[#0ABAB5]/50 transition-colors relative"
              >
                <Link href={`/scripts/${script.id}`} className="block">
                  <div className="h-28 bg-[#1A1A1A] flex items-center justify-center overflow-hidden">
                    {script.coverImage ? (
                      <img 
                        src={script.coverImage} 
                        alt={script.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-10 h-10 text-[#333333] group-hover:text-[#0ABAB5]/40 transition-colors" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#0ABAB5]/10 text-[#0ABAB5]">{script.genre}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[statusMapping[script.status] || script.status] || 'bg-[#888888]/20 text-[#888888]'}`}>{statusMapping[script.status] || script.status}</span>
                    </div>
                    <h3 className="text-sm font-medium text-[#F5F5F5] truncate">{script.title}</h3>
                    <p className="text-xs text-[#888888] mt-1">{script.scenes} 场 / {(script.words || 0).toLocaleString()} 字</p>
                    <p className="text-xs text-[#888888] mt-0.5">{script.time || ''}</p>
                  </div>
                </Link>
                {/* Selection + Actions */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleSelect(script.id); }}
                    className={`p-1.5 rounded-lg transition-colors ${selectedIds.has(script.id) ? 'bg-[#0ABAB5]/20 text-[#0ABAB5]' : 'bg-black/50 text-[#888888] hover:text-[#F5F5F5]'}`}
                  >
                    {selectedIds.has(script.id) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  onClick={(e) => deleteOne(script.id, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-[#888888] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && (
          <div className="bg-[#141414] border border-[#333333]/30 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333333]/30 text-[#888888]">
                  <th className="text-left px-4 py-3 font-medium w-10">
                    <button onClick={isAllSelected ? deselectAll : selectAll} className="text-[#888888] hover:text-[#0ABAB5] transition-colors">
                      {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">剧本名称</th>
                  <th className="text-left px-4 py-3 font-medium">类型</th>
                  <th className="text-left px-4 py-3 font-medium">状态</th>
                  <th className="text-left px-4 py-3 font-medium">字数</th>
                  <th className="text-left px-4 py-3 font-medium">场数</th>
                  <th className="text-left px-4 py-3 font-medium">更新时间</th>
                  <th className="text-left px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((script) => (
                  <tr key={script.id} className="border-b border-[#333333]/20 hover:bg-[#1A1A1A]/50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(script.id)}
                        className={`transition-colors ${selectedIds.has(script.id) ? 'text-[#0ABAB5]' : 'text-[#888888] hover:text-[#F5F5F5]'}`}
                      >
                        {selectedIds.has(script.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/scripts/${script.id}`} className="text-[#F5F5F5] hover:text-[#0ABAB5] transition-colors">
                        {script.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#0ABAB5]/10 text-[#0ABAB5]">{script.genre}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[statusMapping[script.status] || script.status] || 'bg-[#888888]/20 text-[#888888]'}`}>{statusMapping[script.status] || script.status}</span>
                    </td>
                    <td className="px-4 py-3 text-[#888888]">{(script.words || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#888888]">{script.scenes}</td>
                    <td className="px-4 py-3 text-[#888888]">{script.time}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteOne(script.id)}
                        className="text-[#888888] hover:text-[#EF4444] transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 暂时移除假分页，保留刷新列表功能 */}
        <div className="flex items-center justify-center mt-4">
          <button
            onClick={() => loadScripts()}
            className="text-sm text-[#0ABAB5] hover:underline"
          >
            刷新列表
          </button>
        </div>
      </div>
    </AppShell>
  );
}
