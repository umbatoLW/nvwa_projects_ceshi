"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Filter, Grid3X3, List, Download, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * 提取项类型
 */
export interface ExtractedItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  imageUrl?: string;
  count?: number;
}

/**
 * 提取项视图属性
 */
export interface ExtractedItemsViewProps {
  /** 标题 */
  title: string;
  /** 提取项列表 */
  items: ExtractedItem[];
  /** 可筛选的类型 */
  types?: string[];
  /** 默认视图模式 */
  defaultViewMode?: "grid" | "list";
  /** 是否显示搜索 */
  showSearch?: boolean;
  /** 是否显示筛选 */
  showFilter?: boolean;
  /** 是否显示导出 */
  showExport?: boolean;
  /** 点击项目回调 */
  onItemClick?: (item: ExtractedItem) => void;
  /** 导出回调 */
  onExport?: (items: ExtractedItem[]) => void;
  /** 自定义渲染项 */
  renderItem?: (item: ExtractedItem, viewMode: "grid" | "list") => React.ReactNode;
  /** 空状态提示 */
  emptyText?: string;
  /** 容器类名 */
  className?: string;
}

/**
 * 通用提取项视图组件
 * 用于角色、服装、场景、道具等提取内容的统一展示
 */
export function ExtractedItemsView({
  title,
  items,
  types = [],
  defaultViewMode = "grid",
  showSearch = true,
  showFilter = true,
  showExport = true,
  onItemClick,
  onExport,
  renderItem,
  emptyText = "暂无提取内容",
  className,
}: ExtractedItemsViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 筛选和搜索
  const filteredItems = useMemo(() => {
    let result = items;

    // 类型筛选
    if (selectedType) {
      result = result.filter(item => item.type === selectedType);
    }

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [items, selectedType, searchQuery]);

  // 类型统计
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    items.forEach(item => {
      stats[item.type] = (stats[item.type] || 0) + 1;
    });
    return stats;
  }, [items]);

  // 展开/收起切换
  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 复制项目名称
  const copyItemName = async (item: ExtractedItem) => {
    await navigator.clipboard.writeText(item.name);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 导出处理
  const handleExport = () => {
    if (onExport) {
      onExport(filteredItems);
    } else {
      // 默认导出为JSON
      const data = JSON.stringify(filteredItems, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}-提取项.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // 默认渲染项
  const defaultRenderItem = (item: ExtractedItem, mode: "grid" | "list") => {
    const isExpanded = expandedItems.has(item.id);

    if (mode === "grid") {
      return (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className={cn(
            "group relative p-4 rounded-xl border border-border/50",
            "bg-card hover:bg-accent/5 hover:border-primary/30",
            "cursor-pointer transition-all duration-200"
          )}
        >
          {/* 图片预览 */}
          {item.imageUrl && (
            <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-muted">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
          )}

          {/* 名称 */}
          <h4 className="font-medium text-foreground truncate">{item.name}</h4>

          {/* 类型标签 */}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {item.type}
            </Badge>
            {item.count !== undefined && (
              <span className="text-xs text-muted-foreground">×{item.count}</span>
            )}
          </div>

          {/* 描述 */}
          {item.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* 标签 */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 列表模式
    return (
      <div key={item.id} className="border-b border-border/30 last:border-0">
        <div
          onClick={() => toggleExpanded(item.id)}
          className="flex items-center gap-3 py-3 px-2 hover:bg-accent/5 cursor-pointer transition-colors"
        >
          {item.description ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            )
          ) : (
            <div className="w-4" />
          )}

          {/* 图片缩略图 */}
          {item.imageUrl && (
            <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-muted">
              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground truncate">{item.name}</span>
              <Badge variant="secondary" className="text-xs shrink-0">
                {item.type}
              </Badge>
              {item.count !== undefined && (
                <span className="text-xs text-muted-foreground shrink-0">×{item.count}</span>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                copyItemName(item);
              }}
            >
              {copiedId === item.id ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* 展开详情 */}
        {isExpanded && item.description && (
          <div className="px-2 pb-3 pl-10">
            <p className="text-sm text-muted-foreground">{item.description}</p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <Badge variant="outline" className="text-xs">
            {filteredItems.length} 项
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* 搜索 */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="pl-8 w-40 h-8 text-sm"
              />
            </div>
          )}

          {/* 筛选 */}
          {showFilter && types.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  {selectedType || "全部"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedType(null)}>
                  全部 ({items.length})
                </DropdownMenuItem>
                {types.map(type => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => setSelectedType(type)}
                  >
                    {type} ({typeStats[type] || 0})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* 视图切换 */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-l-none border-l"
              onClick={() => setViewMode("list")}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* 导出 */}
          {showExport && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              导出
            </Button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      {filteredItems.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {searchQuery || selectedType ? "无匹配结果" : emptyText}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item =>
            renderItem ? renderItem(item, viewMode) : defaultRenderItem(item, viewMode)
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card">
          {filteredItems.map(item =>
            renderItem ? renderItem(item, viewMode) : defaultRenderItem(item, viewMode)
          )}
        </div>
      )}
    </div>
  );
}

export default ExtractedItemsView;
