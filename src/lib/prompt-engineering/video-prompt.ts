/**
 * SkyReels-V1 影视级视频提示词模板
 * 来源：SkyworkAI/SkyReels-V1（基于1000万+影视片段训练）
 * 核心规范：提示词必须以 "FPS-24, " 开头
 */

// ============================================
// 景别（Shot Type）
// ============================================

export const SHOT_TYPES = {
  EXTREME_CLOSE_UP: {
    name: '大特写',
    english: 'extreme close-up',
    description: '聚焦面部局部（眼睛/嘴唇/手指），强调细节和情绪',
    useCase: '情绪高潮、关键细节、眼神变化',
  },
  CLOSE_UP: {
    name: '特写',
    english: 'close-up',
    description: '头部和肩膀，强调面部表情',
    useCase: '对话、情绪表达、反应镜头',
  },
  MEDIUM_CLOSE_UP: {
    name: '近景',
    english: 'medium close-up',
    description: '胸部以上，兼顾表情和姿态',
    useCase: '对话、单人表演',
  },
  MEDIUM_SHOT: {
    name: '中景',
    english: 'medium shot',
    description: '腰部以上，展示肢体语言和互动',
    useCase: '双人对话、互动场景',
  },
  MEDIUM_LONG_SHOT: {
    name: '中远景',
    english: 'medium long shot',
    description: '膝盖以上，展示人物与环境关系',
    useCase: '动作场景、环境互动',
  },
  FULL_SHOT: {
    name: '全景',
    english: 'full shot',
    description: '完整人物，展示全身动作',
    useCase: '舞蹈、打斗、全身动作',
  },
  WIDE_SHOT: {
    name: '远景',
    english: 'wide shot',
    description: '人物占画面1/3，强调环境',
    useCase: '环境展示、大场面、人群',
  },
  EXTREME_WIDE_SHOT: {
    name: '大远景',
    english: 'extreme wide shot',
    description: '人物极小，强调宏大环境',
    useCase: '城市全景、自然风光、战争场面',
  },
  OVER_THE_SHOULDER: {
    name: '过肩镜头',
    english: 'over-the-shoulder shot',
    description: '从一人肩膀拍摄另一人，建立对话关系',
    useCase: '对话场景、面试、对峙',
  },
  POINT_OF_VIEW: {
    name: '主观视角',
    english: 'point of view shot',
    description: '从角色眼睛看到的画面',
    useCase: '惊吓、发现、回忆',
  },
} as const;

// ============================================
// 运镜（Camera Movement）
// ============================================

export const CAMERA_MOVEMENTS = {
  STATIC: {
    name: '固定',
    english: 'static camera',
    description: '摄像机不动，强调稳定、严肃或紧张',
    useCase: '对话、审讯、情绪特写',
  },
  PAN_LEFT: {
    name: '左摇',
    english: 'panning left',
    description: '摄像机水平向左转动',
    useCase: '跟随移动物体、展示环境',
  },
  PAN_RIGHT: {
    name: '右摇',
    english: 'panning right',
    description: '摄像机水平向右转动',
    useCase: '跟随移动物体、展示环境',
  },
  TILT_UP: {
    name: '上摇',
    english: 'tilting up',
    description: '摄像机垂直向上转动',
    useCase: '展示高大建筑、人物站起',
  },
  TILT_DOWN: {
    name: '下摇',
    english: 'tilting down',
    description: '摄像机垂直向下转动',
    useCase: '展示地面、人物坐下/倒下',
  },
  DOLLY_IN: {
    name: '推轨前进',
    english: 'dolly in',
    description: '摄像机向被摄体推进',
    useCase: '强调情绪、进入细节、紧张感增加',
  },
  DOLLY_OUT: {
    name: '推轨后退',
    english: 'dolly out',
    description: '摄像机远离被摄体',
    useCase: '展示环境、情绪释放、孤独感',
  },
  DOLLY_SLOW_PUSH_IN: {
    name: '缓慢推轨前进',
    english: 'slow dolly push-in',
    description: '缓慢推进，强调情绪变化',
    useCase: '情绪高潮、发现真相、深情时刻',
  },
  TRACK_LEFT: {
    name: '左跟',
    english: 'tracking left',
    description: '摄像机向左平行移动',
    useCase: '跟随行走、侧面展示',
  },
  TRACK_RIGHT: {
    name: '右跟',
    english: 'tracking right',
    description: '摄像机向右平行移动',
    useCase: '跟随行走、侧面展示',
  },
  CRANE_UP: {
    name: '升臂',
    english: 'crane up',
    description: '摄像机升高',
    useCase: '展示全景、情绪升华、上帝视角',
  },
  CRANE_DOWN: {
    name: '降臂',
    english: 'crane down',
    description: '摄像机降低',
    useCase: '进入场景、聚焦细节、压迫感',
  },
  STEADICAM: {
    name: '斯坦尼康',
    english: 'steadicam shot',
    description: '稳定器跟随拍摄，流畅自然',
    useCase: '跟随主角、长镜头、沉浸感',
  },
  STEADICAM_CIRCLE: {
    name: '斯坦尼康环绕',
    english: 'steadicam circling',
    description: '围绕角色360度旋转',
    useCase: '情绪高潮、发现真相、浪漫时刻',
  },
  HANDHELD: {
    name: '手持',
    english: 'handheld camera',
    description: '手持拍摄，画面轻微晃动',
    useCase: '纪录片感、紧张、真实感',
  },
  ZOOM_IN: {
    name: '变焦推进',
    english: 'zoom in',
    description: '镜头焦距变化推进',
    useCase: '快速强调、惊悚、发现',
  },
  ZOOM_OUT: {
    name: '变焦拉远',
    english: 'zoom out',
    description: '镜头焦距变化拉远',
    useCase: '揭示环境、讽刺、孤独',
  },
  RACK_FOCUS: {
    name: '移焦',
    english: 'rack focus',
    description: '焦点从前景移到背景或反之',
    useCase: '揭示关系、转移注意力、对比',
  },
} as const;

// ============================================
// 灯光（Lighting）
// ============================================

export const LIGHTING_SETUPS = {
  NATURAL: {
    name: '自然光',
    english: 'natural lighting',
    description: '日光或环境光，柔和真实',
    useCase: '日常场景、户外、真实感',
  },
  SOFT_NATURAL_GOLDEN_HOUR: {
    name: '柔和自然黄金时刻',
    english: 'soft natural golden hour lighting',
    description: '日出/日落时分，暖色调，柔和浪漫',
    useCase: '浪漫场景、回忆、温馨',
  },
  KEY_LIGHT: {
    name: '主光',
    english: 'key light',
    description: '主要光源，塑造人物轮廓',
    useCase: '标准照明、人物特写',
  },
  KEY_LIGHT_WITH_RIM: {
    name: '主光+轮廓光',
    english: 'key light with rim light',
    description: '主光+背光勾勒轮廓，立体感强',
    useCase: '人物特写、英雄时刻、高级感',
  },
  BACK_LIGHT: {
    name: '背光',
    english: 'back lighting',
    description: '光源在人物背后，形成剪影',
    useCase: '神秘、剪影、离别、回忆',
  },
  RIM_LIGHT: {
    name: '轮廓光',
    english: 'rim lighting',
    description: '边缘光勾勒人物轮廓，分离背景',
    useCase: '高级感、科幻、英雄',
  },
  THREE_POINT: {
    name: '三点布光',
    english: 'three-point lighting',
    description: '主光+补光+轮廓光，经典人像布光',
    useCase: '标准人像、访谈、精致场景',
  },
  SINGLE_SOFT_KEY: {
    name: '单柔光',
    english: 'single soft key light',
    description: '单一柔和光源，阴影柔和',
    useCase: '情绪特写、温柔、脆弱',
  },
  HIGH_CONTRAST: {
    name: '高对比',
    english: 'high contrast lighting',
    description: '明暗对比强烈，阴影深重',
    useCase: '悬疑、noir、冲突、反派',
  },
  LOW_KEY: {
    name: '低调',
    english: 'low key lighting',
    description: '整体偏暗，仅局部照明',
    useCase: '悬疑、恐怖、阴谋、夜晚',
  },
  HIGH_KEY: {
    name: '高调',
    english: 'high key lighting',
    description: '整体明亮，阴影极少',
    useCase: '喜剧、广告、梦幻、纯洁',
  },
  NEON: {
    name: '霓虹',
    english: 'neon lighting',
    description: '彩色霓虹灯光，赛博朋克感',
    useCase: '夜店、赛博朋克、都市夜生活',
  },
  CANDLELIGHT: {
    name: '烛光',
    english: 'candlelight',
    description: '暖黄色烛光，摇曳不定',
    useCase: '浪漫晚餐、古代、温馨、私密',
  },
  MOONLIGHT: {
    name: '月光',
    english: 'moonlight',
    description: '冷蓝色月光，清冷神秘',
    useCase: '夜晚、浪漫、孤独、神秘',
  },
} as const;

// ============================================
// 构图（Composition）
// ============================================

export const COMPOSITIONS = {
  RULE_OF_THIRDS: {
    name: '三分法',
    english: 'rule of thirds composition',
    description: '主体放在画面1/3处，平衡和谐',
    useCase: '标准构图、风景、对话',
  },
  RULE_OF_THIRDS_EYE_LINE: {
    name: '三分法眼线',
    english: 'rule of thirds with eye line',
    description: '眼睛放在画面上1/3线，经典人像',
    useCase: '人物特写、对话、情绪',
  },
  CENTER_SYMMETRY: {
    name: '中心对称',
    english: 'center symmetry composition',
    description: '主体在画面正中心，对称稳定',
    useCase: '庄严、正式、对称建筑、仪式感',
  },
  LEADING_LINE: {
    name: '引导线',
    english: 'leading line composition',
    description: '线条引导视线到主体',
    useCase: '道路、走廊、纵深场景',
  },
  FRAME_IN_FRAME: {
    name: '框中框',
    english: 'frame within frame',
    description: '用门窗等框架框住主体',
    useCase: '偷窥、隔离、聚焦、层次',
  },
  DEPTH_OF_FIELD_SHALLOW: {
    name: '浅景深',
    english: 'shallow depth of field',
    description: '背景虚化，突出主体',
    useCase: '人像、特写、焦点转移',
  },
  DEPTH_OF_FIELD_DEEP: {
    name: '深景深',
    english: 'deep depth of field',
    description: '前后景都清晰，展示环境',
    useCase: '风景、大场面、环境叙事',
  },
  DUTCH_ANGLE: {
    name: '荷兰角',
    english: 'dutch angle',
    description: '画面倾斜，制造不安或紧张',
    useCase: '惊悚、疯狂、失衡、动荡',
  },
} as const;

// ============================================
// 预设场景模板
// ============================================

export const SCENE_PRESETS = {
  romantic_encounter: {
    name: '浪漫相遇',
    description: '男女主初次相遇或重逢',
    template: {
      shotType: 'MEDIUM_SHOT',
      cameraMovement: 'DOLLY_SLOW_PUSH_IN',
      lighting: 'SOFT_NATURAL_GOLDEN_HOUR',
      composition: 'RULE_OF_THIRDS',
    },
  },
  dramatic_confrontation: {
    name: '戏剧对峙',
    description: '冲突、对峙、争吵',
    template: {
      shotType: 'CLOSE_UP',
      cameraMovement: 'STATIC',
      lighting: 'HIGH_CONTRAST',
      composition: 'CENTER_SYMMETRY',
    },
  },
  emotional_revelation: {
    name: '情绪揭示',
    description: '真相揭露、情感爆发',
    template: {
      shotType: 'EXTREME_CLOSE_UP',
      cameraMovement: 'DOLLY_IN',
      lighting: 'SINGLE_SOFT_KEY',
      composition: 'RULE_OF_THIRDS_EYE_LINE',
    },
  },
  action_sequence: {
    name: '动作场面',
    description: '打斗、追逐、动作',
    template: {
      shotType: 'FULL_SHOT',
      cameraMovement: 'STEADICAM',
      lighting: 'NATURAL',
      composition: 'RULE_OF_THIRDS',
    },
  },
  mystery_suspense: {
    name: '悬疑惊悚',
    description: '悬疑、惊悚、紧张',
    template: {
      shotType: 'CLOSE_UP',
      cameraMovement: 'HANDHELD',
      lighting: 'LOW_KEY',
      composition: 'DUTCH_ANGLE',
    },
  },
  dialogue_scene: {
    name: '对话场景',
    description: '双人对话、交流',
    template: {
      shotType: 'OVER_THE_SHOULDER',
      cameraMovement: 'STATIC',
      lighting: 'THREE_POINT',
      composition: 'RULE_OF_THIRDS',
    },
  },
  establishing_shot: {
    name: '建立镜头',
    description: '展示环境、地点',
    template: {
      shotType: 'WIDE_SHOT',
      cameraMovement: 'CRANE_UP',
      lighting: 'NATURAL',
      composition: 'DEPTH_OF_FIELD_DEEP',
    },
  },
  intimate_moment: {
    name: '亲密时刻',
    description: '告白、拥抱、亲吻',
    template: {
      shotType: 'MEDIUM_CLOSE_UP',
      cameraMovement: 'STEADICAM_CIRCLE',
      lighting: 'KEY_LIGHT_WITH_RIM',
      composition: 'CENTER_SYMMETRY',
    },
  },
  villain_reveal: {
    name: '反派揭露',
    description: '反派身份揭晓',
    template: {
      shotType: 'MEDIUM_SHOT',
      cameraMovement: 'RACK_FOCUS',
      lighting: 'BACK_LIGHT',
      composition: 'FRAME_IN_FRAME',
    },
  },
  triumph_victory: {
    name: '胜利凯旋',
    description: '成功、胜利、凯旋',
    template: {
      shotType: 'FULL_SHOT',
      cameraMovement: 'CRANE_UP',
      lighting: 'KEY_LIGHT_WITH_RIM',
      composition: 'LOW_ANGLE',
    },
  },
} as const;

// ============================================
// 提示词构建函数
// ============================================

export interface VideoPromptParams {
  shotType?: keyof typeof SHOT_TYPES;
  cameraMovement?: keyof typeof CAMERA_MOVEMENTS;
  lighting?: keyof typeof LIGHTING_SETUPS;
  composition?: keyof typeof COMPOSITIONS;
  sceneDescription: string;
  characters?: string;
  mood?: string;
  fps?: number;
}

/**
 * 构建影视级视频提示词
 * 核心规范：必须以 "FPS-24, " 开头
 */
export function buildVideoPrompt(params: VideoPromptParams): string {
  const {
    shotType = 'MEDIUM_SHOT',
    cameraMovement = 'STATIC',
    lighting = 'THREE_POINT',
    composition = 'RULE_OF_THIRDS',
    sceneDescription,
    characters,
    mood = 'dramatic',
    fps = 24,
  } = params;

  const shot = SHOT_TYPES[shotType];
  const camera = CAMERA_MOVEMENTS[cameraMovement];
  const light = LIGHTING_SETUPS[lighting];
  const comp = COMPOSITIONS[composition];

  // SkyReels-V1 核心规范：必须以 "FPS-24, " 开头
  const prompt = `FPS-${fps}, ${shot.english}, ${camera.english}, ${light.english}, ${comp.english}.

Scene: ${sceneDescription}.
${characters ? `Characters: ${characters}.` : ''}
Mood: ${mood}.

Technical details: ${shot.description}. ${camera.description}. ${light.description}. ${comp.description}.
Quality: High-quality film footage, detailed textures, natural skin tones, professional color grading, cinematic look.`;

  return prompt;
}

/**
 * 从预设场景快速构建提示词
 */
export function buildPresetPrompt(
  presetKey: keyof typeof SCENE_PRESETS,
  sceneDescription: string,
  characters?: string,
  mood?: string
): string {
  const preset = SCENE_PRESETS[presetKey];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetKey}`);
  }

  return buildVideoPrompt({
    shotType: preset.template.shotType as keyof typeof SHOT_TYPES,
    cameraMovement: preset.template.cameraMovement as keyof typeof CAMERA_MOVEMENTS,
    lighting: preset.template.lighting as keyof typeof LIGHTING_SETUPS,
    composition: preset.template.composition as keyof typeof COMPOSITIONS,
    sceneDescription,
    characters,
    mood,
  });
}

/**
 * 推荐场景预设
 */
export function recommendPreset(sceneDescription: string): keyof typeof SCENE_PRESETS {
  const desc = sceneDescription.toLowerCase();

  if (desc.includes('告白') || desc.includes('表白') || desc.includes('重逢') || desc.includes('相遇')) {
    return 'romantic_encounter';
  }
  if (desc.includes('争吵') || desc.includes('对峙') || desc.includes('冲突')) {
    return 'dramatic_confrontation';
  }
  if (desc.includes('真相') || desc.includes('揭露') || desc.includes('发现')) {
    return 'emotional_revelation';
  }
  if (desc.includes('打斗') || desc.includes('追逐') || desc.includes('动作')) {
    return 'action_sequence';
  }
  if (desc.includes('悬疑') || desc.includes('惊悚') || desc.includes('紧张')) {
    return 'mystery_suspense';
  }
  if (desc.includes('对话') || desc.includes('交流')) {
    return 'dialogue_scene';
  }
  if (desc.includes('环境') || desc.includes('全景') || desc.includes('建立')) {
    return 'establishing_shot';
  }
  if (desc.includes('拥抱') || desc.includes('亲吻') || desc.includes('亲密')) {
    return 'intimate_moment';
  }
  if (desc.includes('反派') || desc.includes('阴谋')) {
    return 'villain_reveal';
  }
  if (desc.includes('胜利') || desc.includes('成功') || desc.includes('凯旋')) {
    return 'triumph_victory';
  }

  return 'dialogue_scene'; // 默认
}

/**
 * 获取所有预设列表（用于UI选择器）
 */
export function getPresetList(): Array<{ key: string; name: string; description: string }> {
  return Object.entries(SCENE_PRESETS).map(([key, preset]) => ({
    key,
    name: preset.name,
    description: preset.description,
  }));
}
