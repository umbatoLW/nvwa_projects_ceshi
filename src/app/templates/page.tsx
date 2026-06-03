'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Play, Users, BookOpen, Sparkles, Heart, Search, Crown, Sun, X } from 'lucide-react';
import { scriptTemplates, styleCategories, type ScriptTemplate } from '@/lib/templates-data';
import { AppShell } from '@/components/app-sidebar';

// 内部组件 - 使用 useSearchParams
function TemplatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedStyle, setSelectedStyle] = useState<string>('urban-sweet');
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplate | null>(null);

  useEffect(() => {
    const style = searchParams.get('style');
    if (style && styleCategories.some(c => c.key === style)) {
      setSelectedStyle(style);
    }
  }, [searchParams]);

  const currentCategory = styleCategories.find(c => c.key === selectedStyle);
  const filteredTemplates = scriptTemplates.filter(t => t.style === selectedStyle);

  const handleUseTemplate = async (template: ScriptTemplate) => {
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          content: template.description,
          template_data: {
            style: template.style,
            tags: template.tags,
            characters: template.characters,
            outline: template.outline,
          },
        }),
      });

      if (!res.ok) throw new Error('创建失败');

      const data = await res.json();
      if (data.success && data.data?.id) {
        router.push(`/scripts/${data.data.id}`);
      }
    } catch (error) {
      console.error('使用模板失败:', error);
    }
  };

  const getStyleIcon = (key: string) => {
    switch (key) {
      case 'urban-sweet': return <Heart className="w-4 h-4" />;
      case 'suspense': return <Search className="w-4 h-4" />;
      case 'ancient': return <Crown className="w-4 h-4" />;
      case 'revenge': return <Sparkles className="w-4 h-4" />;
      case 'inspiration': return <Sun className="w-4 h-4" />;
      default: return <Heart className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col lg:flex-row">
      {/* 移动端顶部导航 */}
      <div className="lg:hidden flex items-center gap-3 p-4 border-b border-white/10 bg-[#0F0F0F]">
        <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-bold text-white flex-1">剧本模板库</h1>
      </div>

      {/* 移动端风格选择器下拉 */}
      <div className="lg:hidden p-4 border-b border-white/10 bg-[#0F0F0F]">
        <select
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-[#1A1A1A] text-white text-sm border border-white/10"
        >
          {styleCategories.map((cat) => (
            <option key={cat.key} value={cat.key}>
              {cat.label} ({scriptTemplates.filter(t => t.style === cat.key).length})
            </option>
          ))}
        </select>
      </div>

      {/* 左侧风格导航 - 桌面端 */}
      <div className="hidden lg:flex w-64 border-r border-white/10 bg-[#0F0F0F] flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回仪表盘</span>
          </Link>
          <h1 className="text-xl font-bold text-white">剧本模板库</h1>
          <p className="text-xs text-white/40 mt-1">选择风格开始创作</p>
        </div>

        <div className="flex-1 p-4 space-y-2">
          {styleCategories.map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedStyle(category.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                selectedStyle === category.key
                  ? 'bg-[#7C5CFF] text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {getStyleIcon(category.key)}
              <div className="text-left flex-1">
                <div className="text-sm font-medium">{category.label}</div>
              </div>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                {scriptTemplates.filter(t => t.style === category.key).length}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/40 text-center">
            共 {scriptTemplates.length} 个精选模板
          </div>
        </div>
      </div>

      {/* 右侧模板列表 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题栏 - 桌面端 */}
        <div className="hidden lg:flex h-16 border-b border-white/10 bg-[#0F0F0F] items-center px-6">
          <div className="flex items-center gap-3">
            {currentCategory && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentCategory.color }}
              />
            )}
            <h2 className="text-lg font-semibold text-white">
              {currentCategory?.label || '模板列表'}
            </h2>
            <span className="text-sm text-white/40">
              {filteredTemplates.length} 个模板
            </span>
          </div>
        </div>

        {/* 模板网格 - 响应式 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className="group cursor-pointer"
              >
                {/* 9:16 封面卡片 */}
                <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-[#1A1A1A] border border-white/5 hover:border-[#7C5CFF]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#7C5CFF]/10">
                  {/* 封面图 */}
                  <img
                    src={template.cover}
                    alt={template.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* 底部渐变遮罩 */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

                  {/* 风格标签 */}
                  <div
                    className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: currentCategory?.color }}
                  >
                    {currentCategory?.label}
                  </div>

                  {/* 底部标题 */}
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <h3 className="text-white font-medium text-xs line-clamp-1">
                      {template.title}
                    </h3>
                    <p className="text-white/60 text-[10px] line-clamp-1">
                      {template.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 模板详情弹窗 - 响应式 */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-[900px] max-h-[90vh] lg:max-h-[85vh] bg-[#141414] rounded-2xl border border-white/10 overflow-hidden flex flex-col lg:flex-row">
            {/* 左侧封面 - 移动端隐藏 */}
            <div className="hidden lg:block w-80 flex-shrink-0 bg-[#1A1A1A]">
              <div className="relative aspect-[9/16]">
                <img
                  src={selectedTemplate.cover}
                  alt={selectedTemplate.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-xl font-bold text-white mb-2">{selectedTemplate.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {selectedTemplate.characters.length} 角色
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {selectedTemplate.episodes} 集
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧详情 */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 lg:p-6 border-b border-white/10">
                {/* 移动端显示标题 */}
                <div className="flex items-center gap-3 lg:hidden">
                  <h2 className="text-lg font-bold text-white">{selectedTemplate.title}</h2>
                </div>
                <div className="flex items-center gap-3 flex-1 lg:flex-none">
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: currentCategory?.color }}
                  >
                    {currentCategory?.label}
                  </div>
                  <div className="hidden lg:flex gap-1">
                    {selectedTemplate.tags.map((tag, i) => (
                      <span key={i} className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-white/40 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
                {/* 剧本简介 */}
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#7C5CFF]" />
                    剧本简介
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {selectedTemplate.description}
                  </p>
                </div>

                {/* 角色设定 */}
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#7C5CFF]" />
                    角色设定
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTemplate.characters.map((char, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-white">{char.name}</span>
                          <span className="text-xs text-[#7C5CFF] bg-[#7C5CFF]/10 px-2 py-0.5 rounded">
                            {char.role}
                          </span>
                        </div>
                        <p className="text-xs text-white/50">{char.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 分集大纲 */}
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#7C5CFF]" />
                    分集大纲
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {selectedTemplate.outline.map((ep, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-[#7C5CFF] font-medium bg-[#7C5CFF]/10 px-2 py-0.5 rounded">
                            第{ep.episode}集
                          </span>
                          <span className="text-sm font-medium text-white">{ep.title}</span>
                        </div>
                        <div className="space-y-1.5">
                          {ep.scenes.map((scene, j) => (
                            <div key={j} className="flex items-start gap-2 text-xs">
                              <span className="text-white/40 shrink-0">场景{scene.scene}</span>
                              <span className="text-white/70">{scene.title}</span>
                              <span className="text-white/40">—</span>
                              <span className="text-white/50 flex-1">{scene.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="p-4 lg:p-6 border-t border-white/10 flex items-center justify-between">
                <p className="text-xs text-white/40 hidden sm:block">
                  点击使用后，将基于此模板创建新剧本
                </p>
                <button
                  onClick={() => handleUseTemplate(selectedTemplate)}
                  className="flex items-center gap-2 px-4 lg:px-6 py-2.5 bg-[#7C5CFF] hover:bg-[#6B4FEF] text-white font-medium rounded-lg transition-colors w-full sm:w-auto justify-center"
                >
                  <Play className="w-4 h-4" />
                  使用此模板
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 加载骨架屏
function TemplatesLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="animate-pulse text-white/40">加载中...</div>
    </div>
  );
}

// 主页面组件 - 用 Suspense 包裹
export default function TemplatesPage() {
  return (
    <AppShell>
      <Suspense fallback={<TemplatesLoading />}>
        <TemplatesContent />
      </Suspense>
    </AppShell>
  );
}
