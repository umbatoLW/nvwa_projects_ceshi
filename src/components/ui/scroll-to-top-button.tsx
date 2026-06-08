"use client";

import React, { useRef, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

interface ScrollToTopButtonProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function ScrollToTopButton({ scrollContainerRef }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const handleScroll = () => {
      setIsVisible(container.scrollTop > 200);
    };

    // 初始检查
    handleScroll();
    
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  const scrollToTop = () => {
    const container = scrollContainerRef?.current;
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-20 right-6 z-50 p-2 rounded-full bg-[#1A1A1A] border border-[#333] text-[#888] hover:text-[#0ABAB5] hover:border-[#0ABAB5] transition-all shadow-lg"
      aria-label="回到顶部"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
