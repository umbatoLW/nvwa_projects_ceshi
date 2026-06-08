"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shirt, MapPin, Package, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// 视图组件类型
interface ViewComponentProps {
  [key: string]: unknown;
}

type AssetType = "costume" | "scene" | "prop";

interface AssetTypeConfig {
  id: AssetType;
  label: string;
  icon: LucideIcon;
  desc: string;
  color: string;
}

const ASSET_TYPES: AssetTypeConfig[] = [
  {
    id: "costume",
    label: "服装",
    icon: Shirt,
    desc: "角色服装设定",
    color: "#7C5CFF",
  },
  {
    id: "scene",
    label: "场景",
    icon: MapPin,
    desc: "场景环境设定",
    color: "#69E7FF",
  },
  {
    id: "prop",
    label: "道具",
    icon: Package,
    desc: "道具物品设定",
    color: "#62FAD3",
  },
];

interface AssetLibraryViewProps {
  activeTab?: AssetType;
  onTabChange?: (tab: AssetType) => void;
  // 各视图的渲染函数
  renderCostumeView: () => React.ReactNode;
  renderSceneView: () => React.ReactNode;
  renderPropView: () => React.ReactNode;
  // 可选：每个类型的数量
  counts?: {
    costume?: number;
    scene?: number;
    prop?: number;
  };
}

export function AssetLibraryView({
  activeTab = "costume",
  onTabChange,
  renderCostumeView,
  renderSceneView,
  renderPropView,
  counts,
}: AssetLibraryViewProps) {
  const [internalTab, setInternalTab] = useState<AssetType>(activeTab);

  const currentTab = onTabChange ? activeTab : internalTab;
  const handleTabChange = (tab: AssetType) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-foreground">资产库</span>
          {counts && (
            <span className="text-xs text-[#9AA7C7]">
              共 {(counts.costume || 0) + (counts.scene || 0) + (counts.prop || 0)} 项
            </span>
          )}
        </div>
      </div>

      {/* Tabs 切换 */}
      <Tabs
        value={currentTab}
        onValueChange={(v) => handleTabChange(v as AssetType)}
        className="flex-1 flex flex-col"
      >
        <TabsList className="mx-4 mt-3 bg-[#141414]/50 p-1 rounded-xl">
          {ASSET_TYPES.map((type) => {
            const Icon = type.icon;
            const count = counts?.[type.id] || 0;
            return (
              <TabsTrigger
                key={type.id}
                value={type.id}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all data-[state=active]:bg-[#1A1A1A] data-[state=active]:shadow-lg",
                  currentTab === type.id && "text-white"
                )}
              >
                <Icon size={16} style={{ color: type.color }} />
                <span>{type.label}</span>
                {count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-white/10">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto mt-3">
          <TabsContent value="costume" className="m-0 h-full">
            {renderCostumeView()}
          </TabsContent>
          <TabsContent value="scene" className="m-0 h-full">
            {renderSceneView()}
          </TabsContent>
          <TabsContent value="prop" className="m-0 h-full">
            {renderPropView()}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export { ASSET_TYPES };
export type { AssetType, AssetTypeConfig };
