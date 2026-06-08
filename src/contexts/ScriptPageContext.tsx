"use client";

import { createContext, useContext, useReducer, ReactNode } from 'react';

// === 类型定义 ===
export interface ExtractedItem {
  name: string;
  character?: string;
  style?: string;
  details?: string;
  description?: string;
  imagePrompt?: string;
}

export interface StreamingItem {
  name?: string;
  character?: string;
  style?: string;
  details?: string;
  description?: string;
  imagePrompt?: string;
  content?: string;
  status?: 'pending' | 'streaming' | 'completed';
}

export interface EditingItem {
  type: 'costume' | 'scene' | 'prop';
  episode: number;
  index: number;
  data: ExtractedItem | StreamingItem;
}

export type ViewType = 'chat' | 'script' | 'storyboard' | 'roles' | 'costumes' | 'scenes' | 'props' | 'optimize' | 'redline';

// === 状态结构 ===
export interface ScriptPageState {
  // 视图状态
  activeView: ViewType;
  showDelete: boolean;
  showMobilePanel: boolean;
  
  // 脚本状态
  loading: boolean;
  script: any | null;
  editTitle: string;
  editSynopsis: string;
  editContent: string;
  aiGeneratedContent: string;
  contentVersion: 'manual' | 'ai';
  
  // 续写状态
  generatedEpisodes: number;
  totalEpisodes: number;
  cachedOutline: unknown;
  cachedCoreDialogue: unknown;
  creativeMode: 'short' | 'medium' | 'long';
  
  // 操作状态
  isSaving: boolean;
  isSplitting: boolean;
  isExtracting: boolean;
  isOptimizing: boolean;
  isChecking: boolean;
  checkResult: string | null;
  
  // 提取状态
  isExtractingOutline: boolean;
  isExtractingCostumes: boolean;
  isExtractingScenes: boolean;
  isExtractingProps: boolean;
  
  // 集数状态
  episodeContentMap: Record<number, string>;
  activeEpisode: number;
  
  // 优化状态
  optimizingMode: 'polish' | 'character' | 'visual' | 'rhythm';
  optimizedStreamText: string;
  isOptimizingStream: boolean;
  
  // 编辑状态
  editingItem: EditingItem | null;
  
  // 提取结果
  costumeByEpisode: Record<number, ExtractedItem[]>;
  sceneByEpisode: Record<number, ExtractedItem[]>;
  propsByEpisode: Record<number, ExtractedItem[]>;
  
  // 选集详情
  selectedEpisodeDetail: { type: 'costume' | 'scene' | 'prop' | null; episode: number | null };
  isLoadingEpisodeDetail: boolean;
  
  // 流式状态
  streamingItems: StreamingItem[];
  isStreaming: boolean;
  streamingText: string;
  
  // 展开状态
  showCostumeEpisodes: boolean;
  showSceneEpisodes: boolean;
}

// === 初始状态 ===
export const initialState: ScriptPageState = {
  activeView: 'script',
  showDelete: false,
  showMobilePanel: false,
  loading: true,
  script: null,
  editTitle: '',
  editSynopsis: '',
  editContent: '',
  aiGeneratedContent: '',
  contentVersion: 'manual',
  generatedEpisodes: 0,
  totalEpisodes: 0,
  cachedOutline: null,
  cachedCoreDialogue: null,
  creativeMode: 'short',
  isSaving: false,
  isSplitting: false,
  isExtracting: false,
  isOptimizing: false,
  isChecking: false,
  checkResult: null,
  isExtractingOutline: false,
  isExtractingCostumes: false,
  isExtractingScenes: false,
  isExtractingProps: false,
  episodeContentMap: {},
  activeEpisode: 1,
  optimizingMode: 'polish',
  optimizedStreamText: '',
  isOptimizingStream: false,
  editingItem: null,
  costumeByEpisode: {},
  sceneByEpisode: {},
  propsByEpisode: {},
  selectedEpisodeDetail: { type: null, episode: null },
  isLoadingEpisodeDetail: false,
  streamingItems: [],
  isStreaming: false,
  streamingText: '',
  showCostumeEpisodes: false,
  showSceneEpisodes: false,
};

// === Action 类型 ===
export type ScriptPageAction =
  | { type: 'SET_VIEW'; payload: ViewType }
  | { type: 'SET_SCRIPT'; payload: any }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EDIT_CONTENT'; payload: string }
  | { type: 'SET_AI_CONTENT'; payload: string }
  | { type: 'SET_CONTENT_VERSION'; payload: 'manual' | 'ai' }
  | { type: 'SET_EPISODE_MAP'; payload: Record<number, string> }
  | { type: 'SET_ACTIVE_EPISODE'; payload: number }
  | { type: 'SET_STREAMING'; payload: { isStreaming: boolean; text: string } }
  | { type: 'SET_CREATING_MODE'; payload: 'short' | 'medium' | 'long' }
  | { type: 'SET_OPERATION'; payload: { key: keyof ScriptPageState; value: boolean } }
  | { type: 'SET_EXTRACTED'; payload: { type: 'costume' | 'scene' | 'prop'; episode: number; items: ExtractedItem[] } }
  | { type: 'RESET' };

// === Reducer ===
export function scriptPageReducer(state: ScriptPageState, action: ScriptPageAction): ScriptPageState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_SCRIPT':
      return { ...state, script: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_EDIT_CONTENT':
      return { ...state, editContent: action.payload };
    case 'SET_AI_CONTENT':
      return { ...state, aiGeneratedContent: action.payload };
    case 'SET_CONTENT_VERSION':
      return { ...state, contentVersion: action.payload };
    case 'SET_EPISODE_MAP':
      return { ...state, episodeContentMap: action.payload };
    case 'SET_ACTIVE_EPISODE':
      return { ...state, activeEpisode: action.payload };
    case 'SET_STREAMING':
      return { ...state, isStreaming: action.payload.isStreaming, streamingText: action.payload.text };
    case 'SET_CREATING_MODE':
      return { ...state, creativeMode: action.payload };
    case 'SET_OPERATION':
      return { ...state, [action.payload.key]: action.payload.value };
    case 'SET_EXTRACTED':
      const { type, episode, items } = action.payload;
      if (type === 'costume') {
        return { ...state, costumeByEpisode: { ...state.costumeByEpisode, [episode]: items } };
      } else if (type === 'scene') {
        return { ...state, sceneByEpisode: { ...state.sceneByEpisode, [episode]: items } };
      } else {
        return { ...state, propsByEpisode: { ...state.propsByEpisode, [episode]: items } };
      }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// === Context ===
interface ScriptPageContextValue {
  state: ScriptPageState;
  dispatch: React.Dispatch<ScriptPageAction>;
}

const ScriptPageContext = createContext<ScriptPageContextValue | null>(null);

// === Provider ===
export function ScriptPageProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scriptPageReducer, initialState);
  return (
    <ScriptPageContext.Provider value={{ state, dispatch }}>
      {children}
    </ScriptPageContext.Provider>
  );
}

// === Hook ===
export function useScriptPage() {
  const context = useContext(ScriptPageContext);
  if (!context) {
    throw new Error('useScriptPage must be used within ScriptPageProvider');
  }
  return context;
}
