import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Serif_SC, JetBrains_Mono } from 'next/font/google';
import { Inspector } from 'react-dev-inspector';
import { ClientProviders } from '@/components/client-providers';
import { GlobalErrorBoundary } from '@/components/global-error-boundary';
import './globals.css';

// 预加载字体，消除 FOUT 闪烁
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-noto-serif',
  display: 'swap',
  preload: true,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false, // 禁止缩放，防止页面缩放错乱
  viewportFit: 'cover',
  themeColor: '#0A0A0A',
};

export const metadata: Metadata = {
  title: {
    default: 'NVWA 女娲 - AI短剧智创聚合平台',
    template: '%s | NVWA 女娲',
  },
  description:
    'NVWA 女娲是一站式AI短剧智创聚合平台，支持从创意到成片的全流程短剧创作。',
  keywords: [
    'NVWA',
    '女娲',
    'AI短剧',
    '短剧创作',
    'AI编剧',
    '文生视频',
    '工作流',
    '节点编排',
  ],
  // iOS Safari 专用
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NVWA 女娲',
  },
  // 格式化不安全的链接
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`dark ${inter.variable} ${notoSerifSC.variable} ${jetBrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <ClientProviders>
          <GlobalErrorBoundary>
            <Inspector />
            {children}
          </GlobalErrorBoundary>
        </ClientProviders>
      </body>
    </html>
  );
}
