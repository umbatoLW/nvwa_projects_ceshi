/**
 * 提示词工程模块 - 统一导出
 * 
 * 包含：
 * - video-prompt: SkyReels 影视级提示词模板
 * - prompt-fusion: 3层提示词融合
 * - ../prompt-knowledge: 剧本创作知识库
 * - ../skyreels-knowledge: SkyReels 表情动作库
 */

// 影视级提示词模板
export {
  SHOT_TYPES,
  CAMERA_MOVEMENTS,
  LIGHTING_SETUPS,
  COMPOSITIONS,
  SCENE_PRESETS,
  buildVideoPrompt,
  buildPresetPrompt,
  recommendPreset,
  getPresetList,
  type VideoPromptParams,
} from './video-prompt';

// 3层提示词融合
export {
  fusePrompt,
  quickFuse,
  buildPromptFromShot,
  PROMPT_FUSION_VERSION,
  type CharacterAction,
  type ActionLayer,
  type CameraLayer,
  type StyleLayer,
  type FusedPrompt,
  type ShotData,
  type CharacterDatabase,
} from './prompt-fusion';

// 知识库（按需加载）
export {
  KNOWLEDGE_BASE,
  loadKnowledgeForTask,
  getKnowledge,
  type KnowledgeKey,
} from '../prompt-knowledge';

// SkyReels 表情动作库
export {
  EXPRESSION_LIBRARY,
  ACTION_LIBRARY,
  EXPRESSION_TEMPLATES,
  getExpression,
  getAction,
  getExpressionTemplate,
  recommendExpression,
  generatePerformanceInstruction,
} from '../skyreels-knowledge';

// ============================================
// 便捷函数：为不同任务类型构建完整提示词
// ============================================

import { buildVideoPrompt, recommendPreset, buildPresetPrompt } from './video-prompt';
import { fusePrompt, type CharacterAction } from './prompt-fusion';
import { loadKnowledgeForTask } from '../prompt-knowledge';
import { getExpression, getAction, EXPRESSION_TEMPLATES } from '../skyreels-knowledge';

/**
 * 任务类型枚举
 */
export type TaskType = 
  | 'script_generation' 
  | 'image_generation' 
  | 'video_generation'
  | 'character_design'
  | 'storyboard_creation'
  | 'dialogue_writing'
  | 'plot_outline';

/**
 * 完整的提示词构建选项
 */
export interface FullPromptOptions {
  taskType: TaskType;
  sceneDescription: string;
  characters?: CharacterAction[];
  mood?: string;
  genre?: string;
  usePreset?: boolean;
  injectKnowledge?: boolean;
}

/**
 * 知识库内容类型
 */
interface KnowledgeContent {
  title: string;
  content: string;
}

/**
 * 一站式提示词构建函数
 * 自动注入知识库、选择预设、构建完整提示词
 */
export function buildFullPrompt(options: FullPromptOptions): {
  prompt: string;
  knowledge: KnowledgeContent[];
  metadata: {
    taskType: TaskType;
    preset?: string;
    knowledgeUsed: string[];
  };
} {
  const {
    taskType,
    sceneDescription,
    characters = [],
    mood = 'dramatic',
    genre,
    usePreset = true,
    injectKnowledge = true,
  } = options;

  // 1. 加载相关知识库
  let knowledge: KnowledgeContent[] = [];
  if (injectKnowledge) {
    const knowledgeTask = mapTaskToKnowledgeTask(taskType);
    const loadedKnowledge = loadKnowledgeForTask(knowledgeTask);
    // 转换为 KnowledgeContent 格式
    if (Array.isArray(loadedKnowledge)) {
      knowledge = loadedKnowledge.map((k: { title: string; content: string }) => ({
        title: k.title,
        content: k.content,
      }));
    }
  }

  // 2. 构建视频提示词
  let prompt: string;

  if (usePreset) {
    const preset = recommendPreset(sceneDescription);
    prompt = buildPresetPrompt(preset, sceneDescription, characters.map(c => c.name).join(', '), mood);
  } else {
    prompt = buildVideoPrompt({
      sceneDescription,
      characters: characters.map(c => `${c.name}: ${c.appearance}, ${c.expression}, ${c.action}`).join('; '),
      mood,
    });
  }

  // 3. 如果有知识库，注入到提示词
  if (knowledge.length > 0) {
    const knowledgeContext = knowledge
      .map(k => `【${k.title}】\n${k.content}`)
      .join('\n\n');
    
    prompt = `${prompt}\n\n【创作指导】\n${knowledgeContext}`;
  }

  return {
    prompt,
    knowledge,
    metadata: {
      taskType,
      preset: usePreset ? recommendPreset(sceneDescription) : undefined,
      knowledgeUsed: knowledge.map(k => k.title),
    },
  };
}

/**
 * 任务类型映射到知识库任务类型
 */
function mapTaskToKnowledgeTask(taskType: TaskType): string {
  const mapping: Record<TaskType, string> = {
    script_generation: 'script',
    image_generation: 'image',
    video_generation: 'video',
    character_design: 'character',
    storyboard_creation: 'storyboard',
    dialogue_writing: 'dialogue',
    plot_outline: 'outline',
  };
  return mapping[taskType] || 'script';
}

/**
 * 为角色添加表情和动作
 */
export function enhanceCharacterWithExpression(
  characterName: string,
  appearance: string,
  expressionKey?: string,
  actionKey?: string
): CharacterAction {
  const expression = expressionKey ? getExpression(expressionKey) : null;
  const action = actionKey ? getAction('body', actionKey) : null;

  return {
    name: characterName,
    appearance,
    expression: expression ? `${expression.name}` : 'neutral expression',
    action: action ? `${action.name}` : 'standing still',
  };
}

/**
 * 获取场景的表情动作模板
 */
export function getSceneTemplate(templateKey: keyof typeof EXPRESSION_TEMPLATES) {
  return EXPRESSION_TEMPLATES[templateKey] || null;
}

/**
 * 模块版本
 */
export const PROMPT_ENGINEERING_VERSION = '1.0.0';
