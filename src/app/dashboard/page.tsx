'use client';

import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Film,
  Image,
  Plus,
  Workflow,
  Users,
  ArrowUpRight,
  Bell,
  Star,
  Loader2,
} from 'lucide-react';
import { AppShell } from '@/components/app-sidebar';

interface DashboardStats {
  scripts: { total: number; today: number; change: string };
  storyboards: { total: number; today: number; change: string };
  assets: { total: number; today: number; change: string };
}

interface RecentProject {
  id: string;
  title: string;
  type: string;
  updated: string;
  genre: string;
}

const quickActions = [
  { label: '新建剧本', href: '/scripts?action=new', icon: Plus, primary: true },
  { label: '创建工作流', href: '/workspace?action=new', icon: Workflow, primary: false },
  { label: '生成角色', href: '/characters?action=new', icon: Users, primary: false },
];

const announcements = [
  { title: '系统更新 v2.1.0', tag: '更新', tagColor: 'bg-[#0ABAB5]/20 text-[#0ABAB5]' },
  { title: '限时活动：生成角色领积分', tag: '活动', tagColor: 'bg-[#F59E0B]/20 text-[#F59E0B]' },
  { title: 'AI模型服务已恢复', tag: '公告', tagColor: 'bg-[#22C55E]/20 text-[#22C55E]' },
];

const templates = [
  { title: '都市甜宠', desc: '霸道总裁与小白兔', icon: Star, style: 'urban-sweet' },
  { title: '悬疑推理', desc: '层层反转，烧脑剧情', icon: Bell, style: 'suspense' },
  { title: '古风穿越', desc: '一朝穿越，权谋天下', icon: Star, style: 'ancient' },
  { title: '复仇爽剧', desc: '逆袭归来，手撕渣男', icon: Bell, style: 'revenge' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    scripts: { total: 0, today: 0, change: '0' },
    storyboards: { total: 0, today: 0, change: '0' },
    assets: { total: 0, today: 0, change: '0' },
  });
  const [activityData, setActivityData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [activityLabels, setActivityLabels] = useState<string[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取仪表盘统计数据
    apiFetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setStats(res.data.stats);
          setActivityData(res.data.activity.data);
          setActivityLabels(res.data.activity.labels || []);
          // 处理最近项目
          const mapped = (res.data.recentProjects || []).map((p: { id: string; title: string; type: string; updated: string; genre: string }) => ({
            id: p.id,
            title: p.title,
            type: p.type,
            updated: new Date(p.updated).toLocaleDateString('zh-CN'),
            genre: p.genre,
          }));
          setRecentProjects(mapped);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch dashboard stats:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxTrend = Math.max(...activityData, 1);

  const statsConfig = [
    { label: '今日剧本', value: stats.scripts.today, total: stats.scripts.total, change: stats.scripts.change, icon: FileText },
    { label: '今日分镜', value: stats.storyboards.today, total: stats.storyboards.total, change: stats.storyboards.change, icon: Film },
    { label: '生成素材', value: stats.assets.today, total: stats.assets.total, change: stats.assets.change, icon: Image },
  ];

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">你好，创作者</h1>
          <p className="text-sm text-[#888888] mt-1">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
            &nbsp;&middot;&nbsp;今日创作活力满满
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statsConfig.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-[#141414] border border-[#333333]/30 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-[#F5F5F5]">{loading ? '...' : stat.value}</p>
                    <p className="text-sm text-[#888888] mt-1">{stat.label}</p>
                    <p className="text-xs text-[#666666]">共 {stat.total} 个</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="w-10 h-10 rounded-lg bg-[#0ABAB5]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#0ABAB5]" />
                    </div>
                    <span className={`text-xs font-medium ${(() => { const v = parseInt(stat.change); return v > 0 ? 'text-[#22C55E]' : v === 0 ? 'text-[#888888]' : 'text-[#EF4444]'; })()}`}>
                      {parseInt(stat.change) === 0 ? '-' : stat.change}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  action.primary
                    ? 'bg-[#0ABAB5] text-black hover:shadow-[0_0_20px_rgba(10,186,181,0.3)] hover:scale-[1.02]'
                    : 'bg-[#1A1A1A] text-[#F5F5F5] border border-[#333333]/30 hover:bg-[#222222]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </Link>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between h-7">
              <h2 className="text-lg font-semibold text-[#F5F5F5]">最近项目</h2>
              <Link href="/scripts" className="text-sm text-[#0ABAB5] hover:underline flex items-center gap-1">
                查看全部 <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/scripts/${project.id}`}
                    className="block bg-[#141414] border border-[#333333]/30 rounded-xl p-4 hover:border-[#0ABAB5]/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#888888] group-hover:text-[#0ABAB5] transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#F5F5F5]">{project.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[#0ABAB5]/10 text-[#0ABAB5]">
                              {project.genre}
                            </span>
                            <span className="text-xs text-[#888888]">{project.updated}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="bg-[#141414] border border-[#333333]/30 rounded-xl p-8 text-center">
                  <p className="text-[#888888]">暂无项目，点击上方&ldquo;新建剧本&rdquo;开始创作</p>
                </div>
              )}
            </div>

            {/* Trend Chart */}
            <div className="bg-[#141414] border border-[#333333]/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#F5F5F5] mb-4">近7天创作活跃度</h3>
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0ABAB5]" />
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-3 h-40">
                    {activityData.map((value, index) => {
                      const height = maxTrend > 0 ? (value / maxTrend) * 100 : 0;
                      const isToday = index === activityData.length - 1;
                      const hasValue = value > 0;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center h-full">
                          {/* 数字直接显示在柱状图上方 */}
                          <div className="h-6 flex items-end justify-center">
                            <span className={`text-xs font-medium ${hasValue ? (isToday ? 'text-[#0ABAB5]' : 'text-[#F5F5F5]') : 'text-[#555555]'}`}>
                              {value}
                            </span>
                          </div>
                          {/* 柱状图区域 */}
                          <div className="flex-1 w-full flex items-end justify-center py-1">
                            <div
                              className={`w-full max-w-[40px] rounded-t-md transition-all relative overflow-hidden ${
                                isToday 
                                  ? 'bg-gradient-to-t from-[#0ABAB5]/80 to-[#0ABAB5]' 
                                  : hasValue 
                                    ? 'bg-gradient-to-t from-[#3A3A3A] to-[#4A4A4A]' 
                                    : 'bg-[#2A2A2A]'
                              }`}
                              style={{ height: `${Math.max(height, 5)}%`, minHeight: hasValue ? '8px' : '4px' }}
                            >
                              {/* 今日高亮边框 */}
                              {isToday && hasValue && (
                                <div className="absolute inset-0 border border-[#0ABAB5]/30 rounded-t-md" />
                              )}
                            </div>
                          </div>
                          {/* 日期标签 */}
                          <div className="h-5 flex items-center justify-center">
                            <span className={`text-xs ${isToday ? 'text-[#0ABAB5] font-medium' : 'text-[#888888]'}`}>
                              {activityLabels[index] || ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* 底部统计 */}
                  <div className="mt-4 pt-3 border-t border-[#333333]/30 flex items-center justify-between">
                    <span className="text-xs text-[#888888]">本周累计创作</span>
                    <span className="text-sm font-medium text-[#F5F5F5]">{activityData.reduce((a, b) => a + b, 0)} 次</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* 占位区域 - 与左侧标题行对齐 */}
            <div className="h-7" />

            {/* Announcements */}
            <div className="bg-[#141414] border border-[#333333]/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#F5F5F5] mb-3">系统公告</h3>
              <div className="space-y-2.5">
                {announcements.map((item) => (
                  <div key={item.title} className="flex items-start gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${item.tagColor}`}>{item.tag}</span>
                    <p className="text-sm text-[#F5F5F5] leading-snug">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="bg-[#141414] border border-[#333333]/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#F5F5F5] mb-3">推荐模板</h3>
              <div className="space-y-2">
                {templates.map((tmpl) => {
                  const Icon = tmpl.icon;
                  return (
                    <Link
                      key={tmpl.title}
                      href={`/templates?style=${tmpl.style}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#0ABAB5]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#F5F5F5]">{tmpl.title}</p>
                        <p className="text-xs text-[#888888]">{tmpl.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
