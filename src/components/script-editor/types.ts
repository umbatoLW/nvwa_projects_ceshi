export interface ScriptGenerationStage {
  stage: number;
  name: string;
  output: string;
  detail?: string;
}

export interface ScriptDetail {
  id: string;
  title: string;
  content: string;
  episodeCount?: number;
  wordCount?: string | number;
  sceneCount?: number;
  status?: string;
  type?: string;
  tags?: string[];
  synopsis?: string;
  scenes?: ScriptScene[];
  storyboards?: ScriptStoryboard[];
  roles?: ScriptRole[];
  coverImage?: string;
  genre?: string;
}

export interface ScriptScene {
  num: number;
  title: string;
  location: string;
  time: string;
  content: string;
}

export interface ScriptStoryboard {
  num: number;
  duration: string;
  description: string;
  character: string;
  shot: string;
  camera: string;
  audio: string;
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

export interface ScriptEditorProps {
  script: ScriptDetail | null;
  editContent: string;
  setEditContent: (v: string) => void;
  // 注意：aiGeneratedContent 相关 props 已移除，剧本编辑界面完全独立
  episodeContentMap: Record<number, string>;
  setEpisodeContentMap: (v: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  activeEpisode: number;
  setActiveEpisode: (v: number) => void;
  isUploading: boolean;
  uploadProgress: string;
  analyzeProgress: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyToStoryboard?: (content: string, episode: number) => void;
}
