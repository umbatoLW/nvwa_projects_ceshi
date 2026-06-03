'use client';

import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-sidebar';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Grid3X3,
  List,
  User,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  ScanEye,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';

interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  tags: string[];
  status: string;
  desc?: string;
  role?: string;
  gender?: string;
  age?: number;
}

const genderOptions = ['全部', '男', '女'];
const ageOptions = ['全部', '少年', '青年', '中年', '老年'];
const roleOptions = ['全部', '主角', '配角', '反派', 'NPC'];

const roleColors: Record<string, string> = {
  主角: 'bg-[#0ABAB5]/20 text-[#0ABAB5]',
  配角: 'bg-[#0ABAB5]/20 text-[#0ABAB5]',
  反派: 'bg-[#EF4444]/20 text-[#EF4444]',
  NPC: 'bg-[#888888]/20 text-[#888888]',
};

export default function CharactersPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('全部');
  const [ageFilter, setAgeFilter] = useState('全部');
  const [roleFilter, setRoleFilter] = useState('全部');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadCharacters = () => {
    apiFetch('/api/characters')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const mapped = res.data.map((c: Character) => ({
            ...c,
            desc: c.description || c.personality || '暂无描述',
            role: c.tags?.[0] || '未分类',
            gender: c.personality?.includes('女') ? '女' : c.personality?.includes('男') ? '男' : '未知',
            age: c.personality?.match(/(\d+)/)?.[1] ? Number(c.personality.match(/(\d+)/)?.[1]) : undefined,
          }));
          setCharacters(mapped);
        }
      })
      .catch(() => setCharacters([]));
  };

  useEffect(() => {
    loadCharacters();

    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      apiFetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '未命名角色',
          description: '',
          personality: '',
          tags: [],
          views: ['正面', '侧面', '背面'],
          expressions: ['中性'],
          status: 'active',
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data?.id) {
            router.push(`/characters/${res.data.id}`);
          }
        });
    }
  }, [router]);

  const filtered = characters.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || (c.personality && c.personality.toLowerCase().includes(q));
    return matchSearch;
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
    setSelectedIds(new Set(filtered.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const deleteOne = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!confirm('确定要删除这个角色吗？')) return;
    try {
      const res = await apiFetch(`/api/characters/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        setCharacters((prev) => prev.filter((c) => c.id !== id));
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
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个角色吗？`)) return;
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await apiFetch(`/api/characters/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) successCount++;
      } catch {
        // ignore single failure
      }
    }
    toast.success(`成功删除 ${successCount} 个角色`);
    setSelectedIds(new Set());
    loadCharacters();
  };

  const isAllSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#F5F5F5]">角色库</h1>
          <button
            onClick={async () => {
              try {
                const res = await apiFetch('/api/characters', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: '未命名角色',
                    description: '',
                    personality: '',
                    tags: [],
                    views: ['正面', '侧面', '背面'],
                    expressions: ['中性'],
                    status: 'active',
                  }),
                });
                const result = await res.json();
                if (result.success && result.data?.id) {
                  router.push(`/characters/${result.data.id}`);
                }
              } catch (e) {
                toast.error('创建失败: ' + (e instanceof Error ? e.message : String(e)));
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0ABAB5] text-black text-sm font-medium hover:shadow-[0_0_12px_rgba(10,186,181,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" />
            新建角色
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
            <input
              type="text"
              placeholder="搜索角色..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
            />
          </div>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30">
            {genderOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
          <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30">
            {ageOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30">
            {roleOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]' : 'text-[#888888] hover:bg-[#1A1A1A]'}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]' : 'text-[#888888] hover:bg-[#1A1A1A]'}`}>
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

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((char) => (
              <div
                key={char.id}
                className="group bg-[#141414] border border-[#333333]/30 rounded-xl p-4 hover:border-[#0ABAB5]/50 transition-colors relative"
              >
                <Link href={`/characters/${char.id}`} className="block">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-[#888888]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-[#F5F5F5] truncate">{char.name}</h3>
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-0.5 ${roleColors[char.role || 'NPC']}`}>{char.role || 'NPC'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#888888] line-clamp-2">{char.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {char.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#888888]">{tag}</span>
                    ))}
                  </div>
                </Link>
                {/* Selection checkbox */}
                <div className="absolute top-2 left-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleSelect(char.id); }}
                    className={`p-1.5 rounded-lg transition-colors ${selectedIds.has(char.id) ? 'bg-[#0ABAB5]/20 text-[#0ABAB5]' : 'bg-black/50 text-[#888888] hover:text-[#F5F5F5]'}`}
                  >
                    {selectedIds.has(char.id) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); router.push(`/characters/${char.id}`); }}
                    className="p-1.5 rounded-lg bg-black/50 text-[#888888] hover:text-[#0ABAB5] transition-colors"
                    title="编辑"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); router.push(`/characters/${char.id}`); }}
                    className="p-1.5 rounded-lg bg-black/50 text-[#888888] hover:text-[#0ABAB5] transition-colors"
                    title="查看详情"
                  >
                    <ScanEye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => deleteOne(char.id, e)}
                    className="p-1.5 rounded-lg bg-black/50 text-[#888888] hover:text-[#EF4444] transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-[#141414] border border-[#333333]/30 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333333]/30 text-[#888888]">
                  <th className="text-left px-4 py-3 font-medium w-10">
                    <button onClick={isAllSelected ? deselectAll : selectAll} className="text-[#888888] hover:text-[#0ABAB5] transition-colors">
                      {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">角色</th>
                  <th className="text-left px-4 py-3 font-medium">定位</th>
                  <th className="text-left px-4 py-3 font-medium">性别</th>
                  <th className="text-left px-4 py-3 font-medium">年龄</th>
                  <th className="text-left px-4 py-3 font-medium">描述</th>
                  <th className="text-left px-4 py-3 font-medium w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((char) => (
                  <tr key={char.id} className="border-b border-[#333333]/20 hover:bg-[#1A1A1A]/50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(char.id)}
                        className={`transition-colors ${selectedIds.has(char.id) ? 'text-[#0ABAB5]' : 'text-[#888888] hover:text-[#F5F5F5]'}`}
                      >
                        {selectedIds.has(char.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/characters/${char.id}`} className="flex items-center gap-2 text-[#F5F5F5] hover:text-[#0ABAB5] transition-colors">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                          <User className="w-4 h-4 text-[#888888]" />
                        </div>
                        {char.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[char.role || 'NPC']}`}>{char.role || 'NPC'}</span></td>
                    <td className="px-4 py-3 text-[#888888]">{char.gender}</td>
                    <td className="px-4 py-3 text-[#888888]">{char.age}岁</td>
                    <td className="px-4 py-3 text-[#888888] max-w-xs truncate">{char.desc}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/characters/${char.id}`)}
                          className="p-1.5 rounded-lg text-[#888888] hover:text-[#0ABAB5] transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => router.push(`/characters/${char.id}`)}
                          className="p-1.5 rounded-lg text-[#888888] hover:text-[#0ABAB5] transition-colors"
                          title="查看"
                        >
                          <ScanEye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteOne(char.id)}
                          className="p-1.5 rounded-lg text-[#888888] hover:text-[#EF4444] transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center gap-1">
          <button className="p-2 rounded-lg text-[#888888] hover:bg-[#1A1A1A] hover:text-[#F5F5F5] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          {[1, 2].map((p) => (
            <button key={p} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === 1 ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]' : 'text-[#888888] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]'}`}>{p}</button>
          ))}
          <button className="p-2 rounded-lg text-[#888888] hover:bg-[#1A1A1A] hover:text-[#F5F5F5] transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </AppShell>
  );
}
