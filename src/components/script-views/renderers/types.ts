// 剧本JSON数据结构
export interface ScriptJsonData {
  title?: string;
  genre?: string;
  logline?: string;
  mainCharacters?: Character[];
  villains?: Villain[];
  episodes?: Episode[];
  coreDialogues?: CoreDialogue[];
  keyLines?: string[];
}

export interface Character {
  name: string;
  role?: string;
  description?: string;
  arc?: string;
}

export interface Villain {
  layer?: number;
  name: string;
  role?: string;
  motivation?: string;
  defeatEpisode?: number;
}

export interface Episode {
  episode: number;
  title?: string;
  summary?: string;
  emotionBeat?: string;
  hookType?: string;
  isPaywall?: boolean;
  content?: string;
}

export interface CoreDialogue {
  episode: number;
  scene: string;
  dialogue: string;
  emotion?: string;
}
