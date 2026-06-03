'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-sidebar';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  User,
  KeyRound,
  Bell,
  Shield,
  Monitor,
  Smartphone,
  LogOut,
  Check,
  Loader2,
  Upload,
  Coins,
  ChevronRight,
} from 'lucide-react';

const tabs = [
  { id: 'profile', label: '个人资料', icon: User },
  { id: 'ai', label: 'API key', icon: KeyRound },
  { id: 'notifications', label: '通知设置', icon: Bell },
  { id: 'security', label: '安全设置', icon: Shield },
];

const textModelOptions = [
  { value: 'qwen-plus', label: '通义千问 Plus' },
  { value: 'qwen-max', label: '通义千问 Max' },
  { value: 'deepseek-r1', label: 'DeepSeek R1' },
  { value: 'kimi-k1.5', label: 'Kimi k1.5' },
  { value: 'glm-4', label: '智谱 GLM-4' },
];

const imageModelOptions = [
  { value: 'dall-e-3', label: 'DALL-E 3' },
  { value: 'midjourney-v6', label: 'Midjourney V6' },
  { value: 'stable-diffusion-3', label: 'Stable Diffusion 3' },
  { value: 'cogview-3', label: '智谱 CogView 3' },
];

const videoModelOptions = [
  { value: 'vidu-2', label: 'Vidu 2.0' },
  { value: 'runway-gen3', label: 'Runway Gen-3' },
  { value: 'pika-1.5', label: 'Pika 1.5' },
  { value: 'kling', label: '可灵 AI' },
];

interface Settings {
  profile: {
    nickname: string;
    email: string;
    avatar: string;
    bio: string;
  };
  ai: {
    textModel: string;
    imageModel: string;
    videoModel: string;
    apiKey: string;
  };
  notifications: {
    taskComplete: boolean;
    contentReview: boolean;
    teamCollab: boolean;
    creditChange: boolean;
    productUpdates: boolean;
    emailNotify: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessions: Array<{ id: string; device: string; lastActive: string; current: boolean }>;
  };
}

const defaultSettings: Settings = {
  profile: { nickname: '新用户', email: '', avatar: '', bio: '' },
  ai: { textModel: 'qwen-plus', imageModel: 'dall-e-3', videoModel: 'vidu-2', apiKey: '' },
  notifications: { taskComplete: true, contentReview: true, teamCollab: false, creditChange: true, productUpdates: false, emailNotify: false },
  security: { twoFactorEnabled: false, sessions: [{ id: '1', device: 'MacBook Pro - Chrome', lastActive: '当前在线', current: true }] },
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-[#0ABAB5]' : 'bg-[#333333]'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch('/api/settings');
        const data = await res.json();
        if (data.success && data.data) {
          // 深度合并，确保所有字段都有默认值
          const mergedSettings: Settings = {
            profile: { ...defaultSettings.profile, ...data.data.profile },
            ai: { ...defaultSettings.ai, ...data.data.ai },
            notifications: { ...defaultSettings.notifications, ...data.data.notifications },
            security: { ...defaultSettings.security, ...data.data.security },
          };
          setSettings(mergedSettings);
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // 保存设置
  const saveSettings = useCallback(async (section: keyof Settings, value: Settings[keyof Settings]) => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [section]: value }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('设置已保存');
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, []);

  // 更新设置并保存
  const updateSettings = useCallback((section: keyof Settings, updates: Partial<Settings[keyof Settings]>) => {
    setSettings(prev => {
      const newValue = { ...prev[section], ...updates };
      saveSettings(section, newValue);
      return { ...prev, [section]: newValue };
    });
  }, [saveSettings]);

  // 渲染内容
  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 max-w-lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0ABAB5] flex items-center justify-center text-black text-xl font-bold overflow-hidden">
                {settings.profile.avatar ? (
                  <img src={settings.profile.avatar} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  settings.profile.nickname?.[0] || '新'
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer text-sm text-[#0ABAB5] hover:underline flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  更换头像
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        updateSettings('profile', { avatar: ev.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">昵称</label>
              <input
                type="text"
                value={settings.profile.nickname ?? ''}
                onChange={(e) => setSettings(prev => ({ ...prev, profile: { ...prev.profile, nickname: e.target.value } }))}
                onBlur={() => saveSettings('profile', settings.profile)}
                className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
              />
            </div>
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">邮箱</label>
              <input
                type="email"
                value={settings.profile.email ?? ''}
                onChange={(e) => setSettings(prev => ({ ...prev, profile: { ...prev.profile, email: e.target.value } }))}
                onBlur={() => saveSettings('profile', settings.profile)}
                className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
              />
            </div>
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">个人简介</label>
              <textarea
                rows={3}
                value={settings.profile.bio ?? ''}
                onChange={(e) => setSettings(prev => ({ ...prev, profile: { ...prev.profile, bio: e.target.value } }))}
                onBlur={() => saveSettings('profile', settings.profile)}
                className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30 resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveSettings('profile', settings.profile)}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0ABAB5] text-black text-sm font-medium hover:shadow-[0_0_12px_rgba(10,186,181,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                保存修改
              </button>
            </div>
            {/* 积分查询入口 */}
            <div className="mt-8 pt-6 border-t border-[#333333]/30">
              <div 
                onClick={() => router.push('/credits')}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[#0ABAB5]/10 to-[#0ABAB5]/5 border border-[#0ABAB5]/20 cursor-pointer hover:border-[#0ABAB5]/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0ABAB5] flex items-center justify-center">
                    <Coins className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#F5F5F5]">积分查询</div>
                    <div className="text-xs text-[#888888]">查看余额、充值、交易记录</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#888888] group-hover:text-[#0ABAB5] transition-colors" />
              </div>
            </div>
          </div>
        );
      case 'ai':
        return (
          <div className="space-y-6 max-w-lg">
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">文本生成模型</label>
              <select
                value={settings.ai.textModel}
                onChange={(e) => updateSettings('ai', { textModel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
              >
                {textModelOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">图像生成模型</label>
              <select
                value={settings.ai.imageModel}
                onChange={(e) => updateSettings('ai', { imageModel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
              >
                {imageModelOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">视频生成模型</label>
              <select
                value={settings.ai.videoModel}
                onChange={(e) => updateSettings('ai', { videoModel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30"
              >
                {videoModelOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">API Key</label>
              <div className="p-4 rounded-lg bg-[#1A1A1A] border border-[#333333]/30">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-4 h-4 text-[#0ABAB5]" />
                  <span className="text-sm text-[#F5F5F5]">平台统一管理</span>
                </div>
                <p className="text-xs text-[#888888] mb-3">所有AI功能由平台统一提供API Key支持，您只需充值积分即可使用。</p>
                <button
                  onClick={() => window.location.href = '/credits'}
                  className="px-4 py-2 rounded-lg bg-[#0ABAB5]/20 text-[#0ABAB5] text-sm hover:bg-[#0ABAB5]/30 transition-colors flex items-center gap-2"
                >
                  <span>查看积分余额</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => saveSettings('ai', settings.ai)}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#0ABAB5] text-black text-sm font-medium hover:shadow-[0_0_12px_rgba(10,186,181,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              保存配置
            </button>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-4 max-w-lg">
            {[
              { key: 'taskComplete', label: '任务完成通知', desc: '当工作流节点执行完成时通知' },
              { key: 'contentReview', label: '内容审查提醒', desc: '当内容检测发现敏感信息时提醒' },
              { key: 'teamCollab', label: '团队协作消息', desc: '当团队成员@你或分配任务时通知' },
              { key: 'creditChange', label: '积分变动提醒', desc: '当积分增减时发送通知' },
              { key: 'productUpdates', label: '产品更新公告', desc: '接收新功能和版本更新信息' },
              { key: 'emailNotify', label: '邮件通知', desc: '同时发送邮件到注册邮箱' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-[#333333]/20">
                <div>
                  <p className="text-sm text-[#F5F5F5]">{item.label}</p>
                  <p className="text-xs text-[#888888]">{item.desc}</p>
                </div>
                <Toggle
                  on={settings.notifications[item.key as keyof typeof settings.notifications]}
                  onChange={(v) => updateSettings('notifications', { [item.key]: v })}
                />
              </div>
            ))}
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6 max-w-lg">
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">当前密码</label>
              <input type="password" placeholder="请输入当前密码" className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30" />
            </div>
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">新密码</label>
              <input type="password" placeholder="请输入新密码" className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30" />
            </div>
            <div>
              <label className="text-xs text-[#888888] block mb-1.5">确认新密码</label>
              <input type="password" placeholder="请再次输入新密码" className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/30" />
            </div>
            <div className="flex items-center justify-between py-3 border-y border-[#333333]/20">
              <div>
                <p className="text-sm text-[#F5F5F5]">双因素认证</p>
                <p className="text-xs text-[#888888]">使用 Authenticator 应用增强账户安全</p>
              </div>
              <Toggle
                on={settings.security.twoFactorEnabled}
                onChange={(v) => updateSettings('security', { twoFactorEnabled: v })}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[#F5F5F5]">已登录设备</p>
              {settings.security.sessions.map((device) => (
                <div key={device.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1A1A1A]">
                  <div className="flex items-center gap-2">
                    {device.device.includes('iPhone') ? <Smartphone className="w-4 h-4 text-[#888888]" /> : <Monitor className="w-4 h-4 text-[#888888]" />}
                    <div>
                      <p className="text-sm text-[#F5F5F5]">{device.device}</p>
                      <p className="text-xs text-[#888888]">{device.lastActive}</p>
                    </div>
                  </div>
                  {!device.current && (
                    <button
                      onClick={() => toast.success(`已退出设备：${device.device}`)}
                      className="text-xs text-[#EF4444] hover:underline flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" /> 退出
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => toast.success('安全设置已保存')}
              className="px-5 py-2 rounded-lg bg-[#0ABAB5] text-black text-sm font-medium hover:shadow-[0_0_12px_rgba(10,186,181,0.3)] transition-all"
            >
              保存安全设置
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-[#0ABAB5]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-xl font-bold text-[#F5F5F5] mb-6">设置</h1>
        <div className="flex gap-6">
          {/* Left Tabs */}
          <div className="w-52 shrink-0 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'text-[#F5F5F5] bg-[#0ABAB5]/10 border-l-2 border-[#0ABAB5]'
                      : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0ABAB5]' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Content */}
          <div className="flex-1 bg-[#141414] border border-[#333333]/30 rounded-xl p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
