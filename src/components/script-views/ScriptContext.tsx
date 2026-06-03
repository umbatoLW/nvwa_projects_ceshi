"use client";
import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';

// === 类型定义 ===
export interface ScriptScene {
  num: number;
  title: string;
  location: string;
  time: string;
  content: string;
}

export interface ScriptRole {
  name: string;
  tag: string;
  description: string;
  lines: number;
  appearance: string;
  costume: string;
  feature: string;
}

export interface ScriptDetail {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  wordCount: string | number;
  sceneCount: number;
  episodeCount: number;
  tags: string[];
  synopsis: string;
  content: string;
  genre?: string;
  scenes: ScriptScene[];
  storyboards: ScriptStoryboard[];
  roles: ScriptRole[];
  costumes?: Record<string, unknown>;
  props?: Record<string, unknown>;
  extractedScenes?: Record<string, unknown>;
  coverImage?: string;
}

export interface ScriptStoryboard {
  id: string;
  shot_number?: string;
  scene?: string;
  scene_desc?: string;
  shot_type?: string;
  visual_description?: string;
  visual_desc?: string;
  description?: string;
  dialogue?: string;
  duration?: string | number;
  image_prompt?: string;
  prompt_en?: string;
  image_url?: string;
}

export interface ExtractedItem {
  name: string;
  character?: string;
  style?: string;
  details?: string;
  description?: string;
  imagePrompt?: string;
}

export interface EditingItem {
  type: 'costume' | 'scene' | 'prop';
  episode: number;
  index: number;
  data: ExtractedItem | StreamingItem;
}

export interface StreamingItem {
  name?: string;
  character?: string;
  style?: string;
  details?: string;
  description?: string;
  imagePrompt?: string;
}

export interface EpisodeInfo {
  episode: number;
  title: string;
  synopsis: string;
}

export type ViewType = "chat" | "script" | "storyboard" | "roles" | "costumes" | "scenes" | "props" | "optimize" | "redline";

// === 状态类型 ===
interface ScriptState {
  script: ScriptDetail | null;
  activeView: ViewType;
  editTitle: string;
  editContent: string;
  editSynopsis: string;
  saving: boolean;
  
  // 分镜相关
  storyboard: ScriptStoryboard[];
  storyboardLoading: boolean;
  
  // 角色相关
  roles: ScriptRole[];
  rolesLoading: boolean;
  
  // 提取相关
  costumesByEpisode: Record<number, ExtractedItem[]>;
  scenesByEpisode: Record<number, ExtractedItem[]>;
  propsByEpisode: Record<number, ExtractedItem[]>;
  extractionLoading: Record<string, boolean>;
  
  // 集数相关
  episodes: EpisodeInfo[];
  activeEpisode: number;
  episodeContentMap: Record<number, string>;
  
  // AI优化相关
  optimizeMode: string;
  optimizeResult: string;
  optimizeLoading: boolean;
  
  // 编辑相关
  editingItem: EditingItem | null;
  
  // UI状态
  showMobilePanel: boolean;
  generatingViews: Set<number>;
  failedImages: Set<string>;
}

// === Action类型 ===
type ScriptAction =
  | { type: 'SET_SCRIPT'; payload: ScriptDetail | null }
  | { type: 'SET_ACTIVE_VIEW'; payload: ViewType }
  | { type: 'SET_EDIT_TITLE'; payload: string }
  | { type: 'SET_EDIT_CONTENT'; payload: string }
  | { type: 'SET_EDIT_SYNOPSIS'; payload: string }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_STORYBOARD'; payload: ScriptStoryboard[] }
  | { type: 'SET_STORYBOARD_LOADING'; payload: boolean }
  | { type: 'SET_ROLES'; payload: ScriptRole[] }
  | { type: 'SET_ROLES_LOADING'; payload: boolean }
  | { type: 'SET_COSTUMES'; payload: { episode: number; items: ExtractedItem[] } }
  | { type: 'SET_SCENES'; payload: { episode: number; items: ExtractedItem[] } }
  | { type: 'SET_PROPS'; payload: { episode: number; items: ExtractedItem[] } }
  | { type: 'SET_EXTRACTION_LOADING'; payload: { key: string; loading: boolean } }
  | { type: 'SET_EPISODES'; payload: EpisodeInfo[] }
  | { type: 'SET_ACTIVE_EPISODE'; payload: number }
  | { type: 'SET_EPISODE_CONTENT'; payload: { episode: number; content: string } }
  | { type: 'SET_OPTIMIZE_MODE'; payload: string }
  | { type: 'SET_OPTIMIZE_RESULT'; payload: string }
  | { type: 'SET_OPTIMIZE_LOADING'; payload: boolean }
  | { type: 'SET_EDITING_ITEM'; payload: EditingItem | null }
  | { type: 'SET_SHOW_MOBILE_PANEL'; payload: boolean }
  | { type: 'ADD_GENERATING_VIEW'; payload: number }
  | { type: 'REMOVE_GENERATING_VIEW'; payload: number }
  | { type: 'ADD_FAILED_IMAGE'; payload: string }
  | { type: 'REMOVE_FAILED_IMAGE'; payload: string };

// === 初始状态 ===
const initialState: ScriptState = {
  script: null,
  activeView: 'chat',
  editTitle: '',
  editContent: '',
  editSynopsis: '',
  saving: false,
  storyboard: [],
  storyboardLoading: false,
  roles: [],
  rolesLoading: false,
  costumesByEpisode: {},
  scenesByEpisode: {},
  propsByEpisode: {},
  extractionLoading: {},
  episodes: [],
  activeEpisode: 1,
  episodeContentMap: {},
  optimizeMode: 'polish',
  optimizeResult: '',
  optimizeLoading: false,
  editingItem: null,
  showMobilePanel: false,
  generatingViews: new Set(),
  failedImages: new Set(),
};

// === Reducer ===
function scriptReducer(state: ScriptState, action: ScriptAction): ScriptState {
  switch (action.type) {
    case 'SET_SCRIPT':
      return { ...state, script: action.payload };
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_EDIT_TITLE':
      return { ...state, editTitle: action.payload };
    case 'SET_EDIT_CONTENT':
      return { ...state, editContent: action.payload };
    case 'SET_EDIT_SYNOPSIS':
      return { ...state, editSynopsis: action.payload };
    case 'SET_SAVING':
      return { ...state, saving: action.payload };
    case 'SET_STORYBOARD':
      return { ...state, storyboard: action.payload };
    case 'SET_STORYBOARD_LOADING':
      return { ...state, storyboardLoading: action.payload };
    case 'SET_ROLES':
      return { ...state, roles: action.payload };
    case 'SET_ROLES_LOADING':
      return { ...state, rolesLoading: action.payload };
    case 'SET_COSTUMES':
      return { 
        ...state, 
        costumesByEpisode: { ...state.costumesByEpisode, [action.payload.episode]: action.payload.items } 
      };
    case 'SET_SCENES':
      return { 
        ...state, 
        scenesByEpisode: { ...state.scenesByEpisode, [action.payload.episode]: action.payload.items } 
      };
    case 'SET_PROPS':
      return { 
        ...state, 
        propsByEpisode: { ...state.propsByEpisode, [action.payload.episode]: action.payload.items } 
      };
    case 'SET_EXTRACTION_LOADING':
      return { 
        ...state, 
        extractionLoading: { ...state.extractionLoading, [action.payload.key]: action.payload.loading } 
      };
    case 'SET_EPISODES':
      return { ...state, episodes: action.payload };
    case 'SET_ACTIVE_EPISODE':
      return { ...state, activeEpisode: action.payload };
    case 'SET_EPISODE_CONTENT':
      return { 
        ...state, 
        episodeContentMap: { ...state.episodeContentMap, [action.payload.episode]: action.payload.content } 
      };
    case 'SET_OPTIMIZE_MODE':
      return { ...state, optimizeMode: action.payload };
    case 'SET_OPTIMIZE_RESULT':
      return { ...state, optimizeResult: action.payload };
    case 'SET_OPTIMIZE_LOADING':
      return { ...state, optimizeLoading: action.payload };
    case 'SET_EDITING_ITEM':
      return { ...state, editingItem: action.payload };
    case 'SET_SHOW_MOBILE_PANEL':
      return { ...state, showMobilePanel: action.payload };
    case 'ADD_GENERATING_VIEW':
      return { 
        ...state, 
        generatingViews: new Set(state.generatingViews).add(action.payload) 
      };
    case 'REMOVE_GENERATING_VIEW': {
      const newSet = new Set(state.generatingViews);
      newSet.delete(action.payload);
      return { ...state, generatingViews: newSet };
    }
    case 'ADD_FAILED_IMAGE':
      return { 
        ...state, 
        failedImages: new Set(state.failedImages).add(action.payload) 
      };
    case 'REMOVE_FAILED_IMAGE': {
      const newSet = new Set(state.failedImages);
      newSet.delete(action.payload);
      return { ...state, failedImages: newSet };
    }
    default:
      return state;
  }
}

// === Context ===
interface ScriptContextValue {
  state: ScriptState;
  dispatch: Dispatch<ScriptAction>;
}

const ScriptContext = createContext<ScriptContextValue | null>(null);

export function ScriptProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scriptReducer, initialState);
  return (
    <ScriptContext.Provider value={{ state, dispatch }}>
      {children}
    </ScriptContext.Provider>
  );
}

export function useScriptState() {
  const context = useContext(ScriptContext);
  if (!context) {
    throw new Error('useScriptState must be used within a ScriptProvider');
  }
  return context;
}
