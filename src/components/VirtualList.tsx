"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

/**
 * 虚拟列表组件
 * 用于渲染大量数据时优化性能，只渲染可见区域
 */
function VirtualListInner<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  className = "",
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = useMemo(
    () => items.length * itemHeight,
    [items.length, itemHeight]
  );

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + height) / itemHeight) + overscan
    );

    const visible: Array<{ item: T; index: number; top: number }> = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visible.push({
        item: items[i],
        index: i,
        top: i * itemHeight,
      });
    }
    return visible;
  }, [items, scrollTop, itemHeight, height, overscan]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto relative ${className}`}
      style={{ height }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: "absolute",
              top,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// 使用类型断言创建泛型组件
export const VirtualList = VirtualListInner as <T>(
  props: VirtualListProps<T>
) => React.ReactElement;

export default VirtualList;
