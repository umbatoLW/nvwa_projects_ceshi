'use client';

import { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  Film, 
  MessageSquare, 
  Sparkles,
  Quote,
  User,
  Layers,
  Target,
  Lock,
} from 'lucide-react';
import {
  ScriptJsonData,
  Character,
  Villain,
  Episode,
  CoreDialogue,
  CollapsibleSection,
  getEmotionColor,
  getEmotionIcon,
  PaywallBadge,
} from './renderers';

// 解析JSON内容
function parseScriptContent(content: string): ScriptJsonData | null {
  try {
    // 尝试直接解析
    return JSON.parse(content);
  } catch {
    // 尝试提取JSON块
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

interface ScriptJsonRendererProps {
  content: string;
  onEpisodeClick?: (episode: number) => void;
}

export function ScriptJsonRenderer({ content, onEpisodeClick }: ScriptJsonRendererProps) {
  const data = parseScriptContent(content);
  
  // 检测是否是正在生成中的JSON（以{开头但不完整）
  const isPartialJson = !data && content.trim().startsWith('{') && !content.trim().endsWith('}');
  
  // 如果是部分JSON，显示加载状态
  if (isPartialJson) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#0ABAB5]/20 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-[#0ABAB5] rounded-full border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-[#F5F5F5]">正在生成剧本内容...</p>
          <p className="text-sm text-[#888] mt-1">AI正在创作中，请稍候</p>
        </div>
        {/* 显示已生成的部分内容预览 */}
        <div className="w-full max-w-2xl mt-4 p-4 bg-[#141414] rounded-xl">
          <p className="text-xs text-[#888] mb-2">已生成内容预览：</p>
          <div className="text-sm text-[#F5F5F5]/80 font-mono whitespace-pre-wrap line-clamp-6">
            {content.slice(0, 500)}...
          </div>
        </div>
      </div>
    );
  }
  
  // 如果不是JSON格式，返回null让调用者使用其他渲染方式
  if (!data) {
    return null;
  }
  
  const emotionStats: Record<string, number> = {};
  if (data.episodes) {
    data.episodes.forEach(ep => {
      if (ep.emotionBeat) {
        emotionStats[ep.emotionBeat] = (emotionStats[ep.emotionBeat] || 0) + 1;
      }
    });
  }
  
  return (
    <div className="space-y-4">
      {/* 剧名 + 类型 - Hero区域 */}
      {data.title && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0ABAB5]/10 via-[#141414] to-[#7C5CFF]/10 p-6">
          {/* 装饰性背景 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#0ABAB5]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#7C5CFF]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-5 h-5 text-[#0ABAB5]" />
              <span className="text-xs text-[#888] uppercase tracking-wider">剧本作品</span>
            </div>
            <h1 className="text-3xl font-bold text-[#F5F5F5] mb-3">{data.title}</h1>
            {data.genre && (
              <div className="flex flex-wrap gap-2">
                {data.genre.split('/').map((g, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1 rounded-full text-xs bg-[#0ABAB5]/20 text-[#0ABAB5] border border-[#0ABAB5]/30"
                  >
                    {g.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 故事简介 - Logline */}
      {data.logline && (
        <div className="p-4 rounded-xl bg-[#141414]/50 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#7C5CFF]/20 flex items-center justify-center shrink-0 mt-0.5">
              <Quote className="w-4 h-4 text-[#7C5CFF]" />
            </div>
            <div>
              <span className="text-xs text-[#888] uppercase tracking-wider mb-2 block">故事简介</span>
              <p className="text-sm text-[#F5F5F5]/90 leading-relaxed">{data.logline}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 金句 */}
      {data.keyLines && data.keyLines.length > 0 && (
        <CollapsibleSection 
          title="金句" 
          icon={Sparkles}
          badge={<span className="text-xs text-[#888]">共{data.keyLines.length}句</span>}
        >
          <div className="space-y-3 pt-4">
            {data.keyLines.map((line, i) => (
              <div 
                key={i}
                className="p-3 rounded-lg bg-[#1A1A1A]/50 border-l-2 border-[#0ABAB5] text-sm text-[#F5F5F5]/90 italic"
              >
                "{line}"
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
      
      {/* 人物小传 */}
      {data.mainCharacters && data.mainCharacters.length > 0 && (
        <CollapsibleSection 
          title="人物小传" 
          icon={Users}
          badge={<span className="text-xs text-[#888]">共{data.mainCharacters.length}人</span>}
          defaultOpen
        >
          <div className="grid gap-4 pt-4">
            {data.mainCharacters.map((char, i) => (
              <div 
                key={i}
                className="p-4 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A]/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0ABAB5]/30 to-[#7C5CFF]/30 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-[#F5F5F5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-medium text-[#F5F5F5]">{char.name}</span>
                      {char.role && (
                        <span className="px-2 py-0.5 rounded text-xs bg-[#0ABAB5]/20 text-[#0ABAB5]">
                          {char.role}
                        </span>
                      )}
                    </div>
                    {char.description && (
                      <p className="text-sm text-[#888] mb-2 leading-relaxed">{char.description}</p>
                    )}
                    {char.arc && (
                      <div className="flex items-center gap-2 text-xs text-[#666]">
                        <Layers className="w-3 h-3" />
                        <span>人物弧光: {char.arc}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
      
      {/* 反派层次 */}
      {data.villains && data.villains.length > 0 && (
        <CollapsibleSection 
          title="反派设计" 
          icon={Target}
          badge={<span className="text-xs text-[#888]">共{data.villains.length}层</span>}
        >
          <div className="space-y-3 pt-4">
            {data.villains.map((v, i) => (
              <div 
                key={i}
                className="p-3 rounded-lg bg-[#1A1A1A]/50 border border-[#333]/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                    第{v.layer || i + 1}层
                  </span>
                  <span className="text-sm font-medium text-[#F5F5F5]">{v.name}</span>
                </div>
                {v.role && (
                  <p className="text-xs text-[#888] mb-1">{v.role}</p>
                )}
                {v.motivation && (
                  <p className="text-xs text-[#666]">动机: {v.motivation}</p>
                )}
                {v.defeatEpisode && (
                  <p className="text-xs text-[#0ABAB5] mt-1">退场于第{v.defeatEpisode}集</p>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
      
      {/* 核心对话 */}
      {data.coreDialogues && data.coreDialogues.length > 0 && (
        <CollapsibleSection 
          title="核心对话" 
          icon={MessageSquare}
          badge={<span className="text-xs text-[#888]">共{data.coreDialogues.length}场</span>}
        >
          <div className="space-y-3 pt-4">
            {data.coreDialogues.map((d, i) => {
              const EmotionIcon = getEmotionIcon(d.emotion || '');
              const emotionColor = getEmotionColor(d.emotion || '');
              
              return (
                <div 
                  key={i}
                  className="p-3 rounded-lg bg-[#1A1A1A]/50 border border-[#333]/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#333] text-[#888]">
                      第{d.episode}集
                    </span>
                    {d.emotion && (
                      <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${emotionColor}`}>
                        <EmotionIcon className="w-3 h-3" />
                        {d.emotion}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#666] mb-2 italic">【{d.scene}】</p>
                  <p className="text-sm text-[#F5F5F5]/90 leading-relaxed">{d.dialogue}</p>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
      
      {/* 剧集大纲 */}
      {data.episodes && data.episodes.length > 0 && (
        <CollapsibleSection 
          title="剧集大纲" 
          icon={Film}
          badge={
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888]">共{data.episodes.length}集</span>
              {Object.keys(emotionStats).length > 0 && (
                <div className="flex items-center gap-1">
                  {Object.entries(emotionStats).slice(0, 3).map(([emotion, count]) => {
                    return (
                      <span key={emotion} className="text-xs text-[#666]">
                        {count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          }
          defaultOpen
        >
          <div className="space-y-2 pt-4">
            {data.episodes.map((ep, i) => {
              const EmotionIcon = getEmotionIcon(ep.emotionBeat || '');
              const emotionColor = getEmotionColor(ep.emotionBeat || '');
              
              return (
                <div 
                  key={i}
                  className={`p-3 rounded-lg border transition-all cursor-pointer hover:border-[#0ABAB5]/30 ${
                    ep.isPaywall 
                      ? 'bg-yellow-500/5 border-yellow-500/20' 
                      : 'bg-[#1A1A1A]/50 border-[#333]/50'
                  }`}
                  onClick={() => onEpisodeClick?.(ep.episode)}
                >
                  <div className="flex items-start gap-3">
                    {/* 集数标签 */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                      ep.isPaywall 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'bg-[#0ABAB5]/20 text-[#0ABAB5]'
                    }`}>
                      {ep.episode}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {ep.title && (
                          <span className="text-sm font-medium text-[#F5F5F5]">{ep.title}</span>
                        )}
                        {ep.isPaywall && (
                          <span className="flex items-center gap-1 text-xs text-yellow-400">
                            <Lock className="w-3 h-3" />
                            付费卡点
                          </span>
                        )}
                      </div>
                      
                      {ep.summary && (
                        <p className="text-xs text-[#888] leading-relaxed mb-2">{ep.summary}</p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {ep.emotionBeat && (
                          <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${emotionColor}`}>
                            <EmotionIcon className="w-3 h-3" />
                            {ep.emotionBeat}
                          </span>
                        )}
                        {ep.hookType && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[#333] text-[#666]">
                            {ep.hookType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

// 判断内容是否为JSON格式
export function isJsonScriptContent(content: string): boolean {
  const data = parseScriptContent(content);
  return data !== null && (data.title !== undefined || data.episodes !== undefined);
}

export default ScriptJsonRenderer;
