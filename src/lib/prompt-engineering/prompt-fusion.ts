/**
 * 3层提示词融合系统
 * 来源：Moyin Creator 的分层提示词架构
 * 
 * Layer 1: Action Layer - 角色表情+动作+场景动作
 * Layer 2: Camera Layer - 景别+运镜+灯光+构图
 * Layer 3: Style Layer - 视觉风格+氛围+质量
 */

import { SHOT_TYPES, CAMERA_MOVEMENTS, LIGHTING_SETUPS, COMPOSITIONS, buildVideoPrompt } from './video-prompt';

// ============================================
// Layer 1: Action Layer
// ============================================

export interface CharacterAction {
  name: string;
  appearance: string;
  expression: string;
  action: string;
}

export interface ActionLayer {
  characters: CharacterAction[];
  sceneAction: string;
}

// ============================================
// Layer 2: Camera Layer
// ============================================

export interface CameraLayer {
  shotType: string;
  cameraMovement: string;
  lighting: string;
  composition: string;
}

// ============================================
// Layer 3: Style Layer
// ============================================

export interface StyleLayer {
  visualStyle: string;
  mood: string;
  quality: string;
}

// ============================================
// 融合函数
// ============================================

export interface FusedPrompt {
  actionLayer: ActionLayer;
  cameraLayer: CameraLayer;
  styleLayer: StyleLayer;
  fullPrompt: string;
}

/**
 * 融合3层提示词为完整的影视级提示词
 */
export function fusePrompt(layers: {
  actionLayer: ActionLayer;
  cameraLayer: CameraLayer;
  styleLayer: StyleLayer;
}): string {
  const { actionLayer, cameraLayer, styleLayer } = layers;

  // Layer 1: Character and Action
  const characterDescriptions = actionLayer.characters
    .map(c => `${c.name}: ${c.appearance}, ${c.expression}, ${c.action}`)
    .join('; ');

  // Layer 2: Camera and Lighting
  const cameraDescription = `Shot: ${cameraLayer.shotType}, Camera: ${cameraLayer.cameraMovement}, Lighting: ${cameraLayer.lighting}, Composition: ${cameraLayer.composition}`;

  // Layer 3: Style and Quality
  const styleDescription = `Style: ${styleLayer.visualStyle}, Mood: ${styleLayer.mood}, Quality: ${styleLayer.quality}`;

  // 融合为 SkyReels-V1 格式（必须以 "FPS-24, " 开头）
  return `FPS-24, ${cameraLayer.shotType}, ${cameraLayer.cameraMovement}, ${cameraLayer.lighting}, ${cameraLayer.composition}.

【Characters】
${characterDescriptions}

【Scene Action】
${actionLayer.sceneAction}

【Camera】
${cameraDescription}

【Style】
${styleDescription}

Professional film footage, detailed textures, natural skin tones, professional color grading, cinematic quality.`;
}

/**
 * 快速融合（简化版）
 * 自动根据场景类型选择合适的预设
 */
export function quickFuse(
  sceneType: string,
  characters: CharacterAction[],
  sceneAction: string
): string {
  // 根据场景类型选择预设
  const preset = getScenePreset(sceneType);

  const actionLayer: ActionLayer = {
    characters,
    sceneAction,
  };

  const cameraLayer: CameraLayer = preset.camera;

  const styleLayer: StyleLayer = {
    visualStyle: 'cinematic realistic',
    mood: preset.mood,
    quality: 'high-quality film footage, detailed textures, natural skin tones, professional color grading',
  };

  return fusePrompt({ actionLayer, cameraLayer, styleLayer });
}

// ============================================
// 场景预设映射
// ============================================

interface ScenePreset {
  camera: CameraLayer;
  mood: string;
}

function getScenePreset(sceneType: string): ScenePreset {
  const presets: Record<string, ScenePreset> = {
    '告白': {
      camera: {
        shotType: 'medium close-up',
        cameraMovement: 'slow dolly push-in',
        lighting: 'soft natural golden hour lighting',
        composition: 'center symmetry composition',
      },
      mood: 'romantic, tender, hopeful',
    },
    '分手': {
      camera: {
        shotType: 'close-up',
        cameraMovement: 'static camera',
        lighting: 'single soft key light',
        composition: 'rule of thirds with eye line',
      },
      mood: 'sad, emotional, bittersweet',
    },
    '打脸': {
      camera: {
        shotType: 'medium shot',
        cameraMovement: 'static camera',
        lighting: 'high contrast lighting',
        composition: 'center symmetry composition',
      },
      mood: 'tense, dramatic, satisfying',
    },
    '复仇': {
      camera: {
        shotType: 'close-up',
        cameraMovement: 'dolly in',
        lighting: 'key light with rim light',
        composition: 'rule of thirds composition',
      },
      mood: 'intense, determined, powerful',
    },
    '重逢': {
      camera: {
        shotType: 'medium shot',
        cameraMovement: 'steadicam circling',
        lighting: 'soft natural golden hour lighting',
        composition: 'rule of thirds composition',
      },
      mood: 'emotional, joyful, relieved',
    },
    '危机': {
      camera: {
        shotType: 'close-up',
        cameraMovement: 'handheld camera',
        lighting: 'low key lighting',
        composition: 'dutch angle',
      },
      mood: 'tense, urgent, frightening',
    },
    '阴谋揭露': {
      camera: {
        shotType: 'extreme close-up',
        cameraMovement: 'rack focus',
        lighting: 'back lighting',
        composition: 'frame within frame',
      },
      mood: 'shocking, dramatic, suspenseful',
    },
    '胜利': {
      camera: {
        shotType: 'full shot',
        cameraMovement: 'crane up',
        lighting: 'key light with rim light',
        composition: 'rule of thirds composition',
      },
      mood: 'triumphant, powerful, satisfying',
    },
    '争吵': {
      camera: {
        shotType: 'over-the-shoulder shot',
        cameraMovement: 'handheld camera',
        lighting: 'high contrast lighting',
        composition: 'rule of thirds composition',
      },
      mood: 'tense, confrontational, dramatic',
    },
    '温馨': {
      camera: {
        shotType: 'medium close-up',
        cameraMovement: 'static camera',
        lighting: 'candlelight',
        composition: 'rule of thirds with eye line',
      },
      mood: 'warm, tender, intimate',
    },
  };

  return presets[sceneType] || {
    camera: {
      shotType: 'medium shot',
      cameraMovement: 'static camera',
      lighting: 'three-point lighting',
      composition: 'rule of thirds composition',
    },
    mood: 'dramatic',
  };
}

// ============================================
// 从分镜数据构建提示词
// ============================================

export interface ShotData {
  description: string;
  characters: Array<{ id: string; name: string; appearance?: string }>;
  shotType?: string;
  cameraMovement?: string;
  lighting?: string;
  mood?: string;
}

export interface CharacterDatabase {
  [id: string]: {
    appearance: string;
    defaultExpression?: string;
    defaultAction?: string;
  };
}

/**
 * 从分镜数据自动构建3层提示词
 */
export function buildPromptFromShot(
  shot: ShotData,
  characterDatabase: CharacterDatabase
): string {
  // 构建 Action Layer
  const actionLayer: ActionLayer = {
    characters: shot.characters.map(c => {
      const db = characterDatabase[c.id] || {};
      return {
        name: c.name,
        appearance: c.appearance || db.appearance || 'unknown appearance',
        expression: db.defaultExpression || 'neutral expression',
        action: db.defaultAction || 'standing',
      };
    }),
    sceneAction: shot.description,
  };

  // 构建 Camera Layer（从分镜数据或默认值）
  const cameraLayer: CameraLayer = {
    shotType: shot.shotType || 'medium shot',
    cameraMovement: shot.cameraMovement || 'static',
    lighting: shot.lighting || 'three-point lighting',
    composition: 'rule of thirds',
  };

  // 构建 Style Layer
  const styleLayer: StyleLayer = {
    visualStyle: 'cinematic realistic',
    mood: shot.mood || 'dramatic',
    quality: 'high-quality film footage, detailed textures, natural skin tones, professional color grading',
  };

  return fusePrompt({ actionLayer, cameraLayer, styleLayer });
}

// ============================================
// 导出所有类型和函数
// ============================================

export const PROMPT_FUSION_VERSION = '1.0.0';
