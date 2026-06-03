'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Workflow,
  FileText,
  Users,
  Image,
  Settings,
  Sparkles,
  Wand2,
  Clapperboard,
  LogOut,
  Box,
  Paintbrush,
  Layers,
  Menu,
  X,
  Coins,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function useCredits() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token') || 'dev-token';
      const res = await fetch('/api/credits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.data.balance ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  return { balance, loading, refresh: fetchBalance };
}

const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/workspace', label: '工作区', icon: Workflow },
  { href: '/templates', label: '模板库', icon: Layers },
  { href: '/scripts', label: '剧本库', icon: FileText },
  { href: '/characters', label: '角色库', icon: Users },
  { href: '/assets', label: '资产库', icon: Image },
];

const creationItems = [
  { href: '/create/image', label: 'AI生图', icon: Wand2 },
  { href: '/create/video', label: 'AI生视频', icon: Clapperboard },
  { href: '/create/3d', label: 'AI生3D', icon: Box },
  { href: '/create/edit', label: 'AI图像编辑', icon: Paintbrush },
];

const bottomItems = [
  { href: '/settings', label: '个人中心', icon: Settings },
];

export function AppSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  // 点击导航项后关闭移动端侧边栏
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-14 bottom-0 w-56 shrink-0 border-r border-[#333333]/30 bg-[#141414] overflow-y-auto z-30 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-2 space-y-4">
          {/* 主要导航 */}
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]'
                      : 'text-[#888888] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* AI创作工具 */}
          <div>
            <div className="px-3 py-1 text-[10px] font-medium text-[#888888]/60 uppercase tracking-wider">
              AI 创作
            </div>
            <div className="space-y-0.5 mt-1">
              {creationItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]'
                        : 'text-[#888888] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 底部 */}
          <div className="space-y-0.5 pt-2 border-t border-[#333333]/30">
            {bottomItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0ABAB5]/10 text-[#0ABAB5]'
                      : 'text-[#888888] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { balance } = useCredits();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 border-b border-[#333333]/30 bg-[#0A0A0A]/95 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* 移动端汉堡菜单按钮 */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#1A1A1A] transition-colors text-[#888888] hover:text-[#F5F5F5]"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-[#0ABAB5] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="font-bold text-base tracking-tight text-[#F5F5F5]">NVWA</span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link
              href="/credits"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0ABAB5]/15 text-[#0ABAB5] text-sm font-semibold border border-[#0ABAB5]/30 hover:bg-[#0ABAB5]/25 hover:border-[#0ABAB5]/50 transition-all shadow-[0_0_8px_rgba(10,186,181,0.15)]"
            >
              <Coins className="w-4 h-4" />
              {balance.toFixed(0)}
            </Link>
            <span className="text-xs text-[#888888] hidden sm:inline">{user.email}</span>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#1A1A1A] transition-colors text-[#888888] hover:text-[#F5F5F5]"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md bg-[#0ABAB5]/10 text-[#0ABAB5] text-xs font-medium hover:bg-[#0ABAB5]/20 transition-colors"
          >
            登录
          </Link>
        )}
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // 路由变化时关闭侧边栏
  const pathname = usePathname();
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-pulse text-[#888888]">加载中...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="pt-14 pl-0 lg:pl-56 min-h-screen">{children}</main>
    </div>
  );
}
