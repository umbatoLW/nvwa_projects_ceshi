'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const videos = [
  {
    src: 'https://image01.vidu.zone/vidu/landing-page/sailboat.14774333.mp4',
    poster: 'https://image01.vidu.zone/vidu/media-asset/sailboat-8eee19ce.webp',
  },
  {
    src: 'https://image01.vidu.zone/vidu/landing-page/girl.6e936562.mp4',
    poster: 'https://image01.vidu.zone/vidu/media-asset/girl-2a1d4663.webp',
  },
  {
    src: 'https://image01.vidu.zone/vidu/landing-page/banner2.c92f22ed.mp4',
    poster: 'https://image01.vidu.zone/vidu/media-asset/banner2-9da68e3f.webp',
  },
  {
    src: 'https://image01.vidu.zone/vidu/landing-page/explosion.e0203d2f.mp4',
    poster: 'https://image01.vidu.zone/vidu/media-asset/explosion-63d7069f.webp',
  },
  {
    src: 'https://image01.vidu.zone/vidu/landing-page/banner3.64dda4ef.mp4',
    poster: 'https://image01.vidu.zone/vidu/media-asset/banner3-3b5b55f3.webp',
  },
];

export default function HomePage() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % videos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSelect = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Video layers */}
      {videos.map((video, index) => (
        <div
          key={index}
          className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out"
          style={{ opacity: index === activeIndex ? 1 : 0, zIndex: 1 }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            webkit-playsinline="true"
            className="absolute inset-0 w-full h-full object-cover"
            poster={video.poster}
          >
            <source src={video.src} type="video/mp4" />
          </video>
        </div>
      ))}

      {/* Dark overlay */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            'linear-gradient(to top, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.3) 40%, rgba(10,10,10,0.1) 60%, rgba(10,10,10,0.4) 100%)',
        }}
      />

      {/* Logo */}
      <div className="absolute top-6 left-6 z-10 animate-[fadeIn_0.8s_ease-out]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-[#0ABAB5] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight text-white">NVWA</span>
        </Link>
      </div>

      {/* Right side indicators */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3 animate-[slideInRight_1s_ease-out_0.3s_both]">
        {videos.map((video, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            className={`cursor-pointer rounded-lg object-cover object-center transition-all duration-300 ${
              index === activeIndex
                ? 'w-10 h-10 opacity-100 ring-2 ring-[#0ABAB5]'
                : index === (activeIndex + 1) % videos.length || index === (activeIndex - 1 + videos.length) % videos.length
                  ? 'w-7 h-7 opacity-60'
                  : 'w-5 h-5 opacity-30'
            }`}
          >
            <img
              src={video.poster}
              alt={`视频${index + 1}`}
              className="w-full h-full rounded-lg object-cover"
            />
          </button>
        ))}
      </div>

      {/* Center content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
        <h1
          className="mb-8 text-center font-semibold text-white leading-tight animate-[fadeInUp_1s_ease-out_0.6s_both]"
          style={{
            fontSize: 'clamp(32px, 6vw, 80px)',
            textShadow: '0px 2.25px 2.25px rgba(0, 0, 0, 0.25)',
          }}
        >
          一念成剧&nbsp;&nbsp;&nbsp;&nbsp;万象生辉
        </h1>

        <div className="animate-[fadeInUp_1s_ease-out_0.9s_both]">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#0ABAB5] text-black font-semibold text-base transition-all duration-300 hover:shadow-[0_0_30px_rgba(10,186,181,0.5)] hover:scale-105"
          >
            立即创作
          </Link>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 0.8; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateY(-50%) translateX(20px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>
    </div>
  );
}
