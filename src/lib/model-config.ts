/**
 * Model Configuration for Nvwa Platform
 * Defines all available models and their parameters
 */

// ===== LLM Models =====
export const LLM_CATEGORIES = [
  { id: "premium", name: "旗舰模型", description: "最强性能，适合复杂任务" },
  { id: "fast", name: "快速模型", description: "响应快，适合日常对话" },
  { id: "vision", name: "视觉模型", description: "支持图片理解" },
  { id: "reasoning", name: "推理模型", description: "深度思考，适合复杂推理" },
  { id: "code", name: "编程模型", description: "代码生成和优化" },
];

export const LLM_MODELS = [
  // 旗舰模型
  { id: "qwen-plus", name: "通义千问 Plus", category: "premium", description: "均衡高性能" },
  { id: "qwen-max", name: "通义千问 Max", category: "premium", description: "旗舰最强" },
  { id: "qwen3.6-plus", name: "通义千问 3.6 Plus", category: "premium", description: "最新旗舰" },
  { id: "deepseek-v3", name: "DeepSeek V3", category: "premium", description: "均衡推理" },
  { id: "deepseek-r1", name: "DeepSeek R1", category: "reasoning", description: "深度推理" },
  { id: "kimi-k2.5", name: "Kimi K2.5", category: "premium", description: "Kimi旗舰" },
  { id: "glm-5", name: "GLM-5", category: "premium", description: "智谱旗舰" },
  { id: "MiniMax-M2.5", name: "MiniMax M2.5", category: "premium", description: "MiniMax旗舰" },
  // 快速模型
  { id: "qwen-turbo", name: "通义千问 Turbo", category: "fast", description: "快速响应" },
  { id: "qwen-flash", name: "通义千问 Flash", category: "fast", description: "极速版" },
  // 视觉模型
  { id: "qwen-vl-max", name: "通义千问 VL Max", category: "vision", description: "视觉理解" },
  { id: "qwen3-vl-plus", name: "通义千问 3 VL Plus", category: "vision", description: "新版视觉" },
  // 编程模型
  { id: "qwen-coder-plus", name: "通义千问 Coder Plus", category: "code", description: "编程专用" },
];

// ===== Image Models =====
export const IMAGE_CATEGORIES = [
  { id: "wanxiang", name: "通义万相", description: "阿里云官方生图模型，有免费额度" },
  { id: "jimeng", name: "即梦 Seedream", description: "字节跳动 Seedream 3.0/4.6，高质量生图" },
  { id: "qwen", name: "通义生图", description: "文字渲染强，适合海报" },
];

// 图片尺寸模式类型
export type ImageSizeMode = 'resolution' | 'aspectRatio';

// 分辨率档位配置
export const RESOLUTION_TIERS = {
  '1K': { width: 1024, height: 1024, label: '1K (1024×1024)' },
  '2K': { width: 2048, height: 2048, label: '2K (2048×2048)' },
  '4K': { width: 4096, height: 4096, label: '4K (4096×4096)' },
};

// 比例对应的推荐像素（用于按比例生成模式）
export const ASPECT_RATIO_SIZES: Record<string, Record<string, { width: number; height: number }>> = {
  'wan2.7-image-pro': {
    '1:1': { width: 2048, height: 2048 },
    '16:9': { width: 2048, height: 1152 },
    '9:16': { width: 1152, height: 2048 },
    '4:3': { width: 2048, height: 1536 },
    '3:4': { width: 1536, height: 2048 },
  },
  'wan2.7-image': {
    '1:1': { width: 2048, height: 2048 },
    '16:9': { width: 2048, height: 1152 },
    '9:16': { width: 1152, height: 2048 },
    '4:3': { width: 2048, height: 1536 },
    '3:4': { width: 1536, height: 2048 },
  },
  'qwen-image-2.0-pro': {
    '1:1': { width: 2048, height: 2048 },
    '16:9': { width: 2688, height: 1536 },
    '9:16': { width: 1536, height: 2688 },
    '4:3': { width: 2368, height: 1728 },
    '3:4': { width: 1728, height: 2368 },
  },
  'qwen-max': {
    '16:9': { width: 1664, height: 928 },
    '4:3': { width: 1472, height: 1104 },
    '1:1': { width: 1328, height: 1328 },
    '3:4': { width: 1104, height: 1472 },
    '9:16': { width: 928, height: 1664 },
  },
  'qwen-plus': {
    '16:9': { width: 1664, height: 928 },
    '4:3': { width: 1472, height: 1104 },
    '1:1': { width: 1328, height: 1328 },
    '3:4': { width: 1104, height: 1472 },
    '9:16': { width: 928, height: 1664 },
  },
};

// 支持的比例列表
export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

export const IMAGE_MODELS = [
  // 通义万相 2.7 Pro (最新旗舰，支持多图参考)
  {
    id: "wan2.7-image-pro",
    name: "通义万相 2.7 Pro",
    category: "wanxiang",
    description: "最新旗舰，支持多图参考",
    supportsReference: true,
    // 尺寸模式配置
    sizeModes: ['resolution', 'aspectRatio'] as ImageSizeMode[],
    // 分辨率档位
    resolutionTiers: ['1K', '2K', '4K'],
    resolutionTiersWithImage: ['1K', '2K'], // 有图输入时禁用4K
    // 像素范围
    pixelRangeText2Image: { min: 768, max: 4096 }, // 文生图
    pixelRangeWithImage: { min: 768, max: 2048 },  // 有图输入
    // 支持的比例
    aspectRatios: ASPECT_RATIOS,
    // 最大图片数量
    maxImages: 9,
    // 最大生成数量
    maxOutput: 4,
  },
  // 通义万相 2.7 (标准版，支持参考图)
  {
    id: "wan2.7-image",
    name: "通义万相 2.7",
    category: "wanxiang",
    description: "最新版，支持参考图",
    supportsReference: true,
    sizeModes: ['resolution', 'aspectRatio'] as ImageSizeMode[],
    resolutionTiers: ['1K', '2K'],
    resolutionTiersWithImage: ['1K', '2K'],
    pixelRangeText2Image: { min: 768, max: 2048 },
    pixelRangeWithImage: { min: 768, max: 2048 },
    aspectRatios: ASPECT_RATIOS,
    maxImages: 9,
    maxOutput: 4,
  },
  // 通义万相 2.1 Turbo (不支持参考图)
  {
    id: "wanx2.1-t2i-turbo",
    name: "通义万相 2.1 Turbo",
    category: "wanxiang",
    description: "灵感级画质，速度快",
    supportsReference: false,
    sizeModes: ['aspectRatio'] as ImageSizeMode[],
    // 尺寸映射（宽*高格式）
    sizes: {
      '1:1': ['1024*1024'],
      '4:3': ['1024*768'],
      '3:4': ['768*1024'],
      '16:9': ['1280*720'],
      '9:16': ['720*1280'],
    },
    aspectRatios: ASPECT_RATIOS,
    maxImages: 0,
    maxOutput: 4,
  },
  // 通义万相 2.1 Plus (不支持参考图)
  {
    id: "wanx2.1-t2i-plus",
    name: "通义万相 2.1 Plus",
    category: "wanxiang",
    description: "高品质画质，细节更生动",
    supportsReference: false,
    sizeModes: ['aspectRatio'] as ImageSizeMode[],
    sizes: {
      '1:1': ['1024*1024'],
      '4:3': ['1024*768'],
      '3:4': ['768*1024'],
      '16:9': ['1280*720'],
      '9:16': ['720*1280'],
    },
    aspectRatios: ASPECT_RATIOS,
    maxImages: 0,
    maxOutput: 4,
  },
  // 即梦 Seedream 3.0 文生图
  {
    id: "seedream-3.0-t2i",
    name: "即梦 Seedream 3.0",
    category: "jimeng",
    description: "字节跳动最新生图模型，画质优秀",
    supportsReference: false,
    sizeModes: ['aspectRatio'] as ImageSizeMode[],
    sizes: {
      '1:1': ['1024*1024'],
      '4:3': ['1024*768'],
      '3:4': ['768*1024'],
      '16:9': ['1280*720'],
      '9:16': ['720*1280'],
    },
    aspectRatios: ASPECT_RATIOS,
    maxImages: 0,
    maxOutput: 4,
  },
  // 即梦 Seedream 4.6 文生图
  {
    id: "seedream-4.6-t2i",
    name: "即梦 Seedream 4.6",
    category: "jimeng",
    description: "人像写真、平面设计、图片风格化",
    supportsReference: false,
    sizeModes: ['aspectRatio'] as ImageSizeMode[],
    sizes: {
      '1:1': ['2048*2048'],
      '4:3': ['2304*1728'],
      '3:4': ['1728*2304'],
      '16:9': ['2560*1440'],
      '9:16': ['1440*2560'],
      '3:2': ['2496*1664'],
      '2:3': ['1664*2496'],
      '21:9': ['3024*1296'],
      '9:21': ['1296*3024'],
    },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '9:21'],
    maxImages: 0,
    maxOutput: 6, // 4.6支持最多6张
  },
];

// ===== Video Models =====
// 参数根据阿里云API文档精确配置
export const VIDEO_CATEGORIES = [
  { id: "seedance", name: "Seedance 2.0", description: "推荐！高质量视频，支持多参考图、首尾帧、音频" },
  { id: "wanxiang", name: "万相视频 2.7", description: "阿里最新视频模型，支持首尾帧、音频" },
  { id: "happyhorse", name: "HappyHorse", description: "支持文生/图生/参考生视频" },
];

export const VIDEO_MODELS = [
  // Seedance 2.0 - 推荐模型，支持文生视频和图生视频
  {
    id: "seedance2",
    name: "Seedance 2.0",
    category: "seedance",
    description: "推荐！高质量视频，支持首尾帧、音频生成",
    supportsT2V: true,
    supportsI2V: true,
    supportsFirstLast: true,
    durations: [4, 5, 6, 7, 8, 10, 12, 15],
    ratios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    resolutions: ["480p", "720p", "1080p"],
    supportsAudio: true,
    supportsNegativePrompt: false,
    maxReferenceImages: 9,
    maxReferenceVideos: 3,
  },
  // Seedance 2.0 真人版
  {
    id: "seedance2_face",
    name: "Seedance 2.0 真人版",
    category: "seedance",
    description: "支持真人参考图，效果更佳",
    supportsT2V: true,
    supportsI2V: true,
    supportsFirstLast: true,
    durations: [4, 5, 6, 7, 8, 10, 12, 15],
    ratios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    resolutions: ["480p", "720p", "1080p"],
    supportsAudio: true,
    supportsNegativePrompt: false,
    maxReferenceImages: 9,
    maxReferenceVideos: 3,
  },
  // 万相2.7 文生视频 - 支持音频输入
  {
    id: "wan2.7-t2v-2026-04-25",
    name: "万相 2.7 文生视频",
    category: "wanxiang",
    description: "阿里最新视频模型，支持音频输入",
    supportsT2V: true,
    supportsI2V: false,
    supportsFirstLast: false,
    durations: [2, 3, 4, 5, 6, 7, 8, 10, 12, 15],
    ratios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    resolutions: ["720P", "1080P"],
    supportsAudio: true,
    supportsNegativePrompt: true,
  },
  // 万相2.7 图生视频 - 支持首帧、首尾帧、视频续写
  {
    id: "wan2.7-i2v-2026-04-25",
    name: "万相 2.7 图生视频",
    category: "wanxiang",
    description: "支持首帧、首尾帧、视频续写",
    supportsT2V: false,
    supportsI2V: true,
    supportsFirstLast: true,
    durations: [2, 3, 4, 5, 6, 7, 8, 10, 12, 15],
    ratios: [], // 图生视频无ratio参数，宽高比跟随输入素材
    resolutions: ["720P", "1080P"],
    supportsAudio: true,
    supportsVideoExtend: true,
    supportsNegativePrompt: true,
  },
  // HappyHorse 文生视频
  {
    id: "happyhorse-1.0-t2v",
    name: "HappyHorse 文生视频",
    category: "happyhorse",
    description: "支持多种比例，默认1080P",
    supportsT2V: true,
    supportsI2V: false,
    supportsFirstLast: false,
    durations: [3, 4, 5, 6, 7, 8, 10, 12, 15],
    ratios: ["16:9", "9:16", "1:1", "4:3", "3:4", "4:5", "5:4"],
    resolutions: ["720P", "1080P"],
  },
  // HappyHorse 图生视频 - 无ratio参数
  {
    id: "happyhorse-1.0-i2v",
    name: "HappyHorse 图生视频",
    category: "happyhorse",
    description: "图生视频，比例跟随素材",
    supportsT2V: false,
    supportsI2V: true,
    supportsFirstLast: false,
    durations: [3, 4, 5, 6, 7, 8, 10, 12, 15],
    ratios: [], // 图生视频无ratio参数
    resolutions: ["720P", "1080P"],
  },
  // HappyHorse 参考生视频 - 支持1-9张参考图
  {
    id: "happyhorse-1.0-r2v",
    name: "HappyHorse 参考生视频",
    category: "happyhorse",
    description: "支持1-9张参考图片",
    supportsT2V: false,
    supportsI2V: true,
    supportsFirstLast: false,
    durations: [3, 4, 5, 6, 7, 8, 10, 12, 15],
    ratios: ["16:9", "9:16", "3:4", "4:3", "4:5", "5:4", "1:1"],
    resolutions: ["720P", "1080P"],
    maxReferenceImages: 9,
  },
];

// 根据模式获取可用模型
export function getModelsByMode(mode: 'text2video' | 'image2video' | 'firstlast2video') {
  return VIDEO_MODELS.filter(model => {
    if (mode === 'text2video') return model.supportsT2V;
    if (mode === 'image2video') return model.supportsI2V;
    if (mode === 'firstlast2video') return model.supportsFirstLast;
    return false;
  });
}

// ===== 3D Models =====
// Tripo 3D模型生成 - 支持文生3D、单图生3D、多图生3D
export const MODEL_3D = [
  { 
    id: "Tripo/Tripo-H3.1", 
    name: "Tripo H3.1（高精度）", 
    description: "高精度3D模型，最高200万面",
    textureQualities: ["standard", "detailed"],
    geometryQualities: ["standard", "ultra"],
    modes: ["text2model", "image2model", "multiview"] 
  },
  { 
    id: "Tripo/Tripo-P1.0", 
    name: "Tripo P1.0（专业版）", 
    description: "专业版，最高2万面，速度更快",
    textureQualities: ["standard", "detailed"],
    geometryQualities: [],
    modes: ["text2model", "image2model", "multiview"] 
  },
];

// ===== Image Edit Models =====
// 千问图像编辑 - 支持多图输入输出，可精确修改文字、增删物体、改变动作、迁移风格
export const IMAGE_EDIT_MODELS = [
  { 
    id: "qwen-image-2.0-pro", 
    name: "通义图像编辑 2.0 Pro", 
    description: "推荐，文字渲染、真实质感、语义遵循能力强",
    endpoint: "multimodal-generation",
    features: ["edit", "style", "text", "object", "multi-image"],
    maxOutput: 6,
    supported: true
  },
  { 
    id: "qwen-image-2.0", 
    name: "通义图像编辑 2.0", 
    description: "加速版，兼顾效果与响应速度",
    endpoint: "multimodal-generation",
    features: ["edit", "style", "text", "object"],
    maxOutput: 6,
    supported: true
  },
  { 
    id: "qwen-image-edit-max", 
    name: "通义图像编辑 Max", 
    description: "工业设计、几何推理、角色一致性更强",
    endpoint: "multimodal-generation",
    features: ["edit", "style", "text", "object"],
    maxOutput: 6,
    supported: true
  },
  { 
    id: "qwen-image-edit-plus", 
    name: "通义图像编辑 Plus", 
    description: "支持多图输出与自定义分辨率",
    endpoint: "multimodal-generation",
    features: ["edit", "style", "text", "object"],
    maxOutput: 6,
    supported: true
  },
  { 
    id: "qwen-image-edit", 
    name: "通义图像编辑", 
    description: "基础版，支持单图编辑和多图融合",
    endpoint: "multimodal-generation",
    features: ["edit", "style", "text", "object"],
    maxOutput: 1,
    supported: true
  },
];

// ===== Music Models =====
export const MUSIC_MODELS = [
  { id: "fun-music", name: "通义音乐", type: "music", features: ["instrumental", "vocal", "style-control"] },
];

// ===== Helper Functions =====

export function getModelById(id: string) {
  return (
    LLM_MODELS.find((m) => m.id === id) ||
    IMAGE_MODELS.find((m) => m.id === id) ||
    VIDEO_MODELS.find((m) => m.id === id) ||
    MODEL_3D.find((m) => m.id === id) ||
    IMAGE_EDIT_MODELS.find((m) => m.id === id) ||
    MUSIC_MODELS.find((m) => m.id === id) ||
    null
  );
}

export function getVideoModelParams(modelId: string) {
  return VIDEO_MODELS.find((m) => m.id === modelId);
}

export function getImageModelParams(modelId: string) {
  return IMAGE_MODELS.find((m) => m.id === modelId);
}

// 别名，方便使用
export const getImageModelConfig = getImageModelParams;

// 导出类型
export type SizeModeType = 'resolution' | 'aspectRatio';
export type ImageModelConfig = typeof IMAGE_MODELS[number];

// 获取有效的尺寸参数
export function getValidSize(
  modelId: string, 
  mode: SizeModeType, 
  value: string, 
  hasImages: boolean = false
): string | null {
  const model = IMAGE_MODELS.find((m) => m.id === modelId);
  if (!model) return null;
  
  if (mode === 'resolution') {
    // 分辨率档位模式
    const tiers = hasImages && 'resolutionTiersWithImage' in model && model.resolutionTiersWithImage 
      ? model.resolutionTiersWithImage 
      : ('resolutionTiers' in model ? model.resolutionTiers : []);
    if (tiers && tiers.includes(value)) {
      // 返回对应的像素尺寸
      if (value === '1K') return '1024*1024';
      if (value === '2K') return '2048*2048';
      if (value === '4K') return '4096*4096';
    }
    return null;
  } else {
    // 比例模式 - 使用预定义的尺寸
    const modelSizes = ASPECT_RATIO_SIZES[modelId];
    if (modelSizes && modelSizes[value]) {
      const { width, height } = modelSizes[value];
      return `${width}*${height}`;
    }
    
    // 如果没有预定义尺寸，检查sizes映射
    if ('sizes' in model && model.sizes) {
      const sizeArr = (model.sizes as Record<string, string[]>)[value];
      if (sizeArr && sizeArr.length > 0) {
        return sizeArr[0];
      }
    }
    
    return null;
  }
}

// 获取模型支持的分辨率档位
export function getImageResolutions(modelId: string, hasImages: boolean = false): string[] {
  const model = IMAGE_MODELS.find((m) => m.id === modelId);
  if (!model) return [];
  
  // 有图片输入时使用 resolutionTiersWithImage
  if (hasImages && 'resolutionTiersWithImage' in model && model.resolutionTiersWithImage) {
    return model.resolutionTiersWithImage;
  }
  
  // 否则使用 resolutionTiers
  if ('resolutionTiers' in model && model.resolutionTiers) {
    return model.resolutionTiers;
  }
  
  return [];
}

// 获取模型支持的比例
export function getImageRatios(modelId: string): string[] {
  const model = IMAGE_MODELS.find((m) => m.id === modelId);
  if (model && 'aspectRatios' in model && model.aspectRatios) {
    return model.aspectRatios;
  }
  return [];
}

// 根据比例计算合法的尺寸像素
export function calculateSizeFromRatio(
  ratio: string, 
  modelId: string, 
  hasImages: boolean = false
): string {
  const [w, h] = ratio.split(':').map(Number);
  const ratioValue = w / h;
  
  // 根据模型和场景确定最大像素
  let maxPixels = 2048 * 2048; // 默认2K
  const minPixels = 768 * 768;
  
  if (modelId === 'wan2.7-image-pro') {
    if (!hasImages) {
      maxPixels = 4096 * 4096; // 文生图支持4K
    } else {
      maxPixels = 2048 * 2048; // 有图输入限制2K
    }
  } else if (modelId === 'wan2.7-image') {
    maxPixels = 2048 * 2048;
  }
  
  // 计算正方形边长
  const squareSize = Math.floor(Math.sqrt(maxPixels));
  
  // 根据比例计算宽高
  let width: number, height: number;
  if (ratioValue >= 1) {
    width = squareSize;
    height = Math.floor(squareSize / ratioValue);
  } else {
    height = squareSize;
    width = Math.floor(squareSize * ratioValue);
  }
  
  // 确保在有效范围内
  width = Math.max(768, Math.min(4096, width));
  height = Math.max(768, Math.min(4096, height));
  
  return `${width}*${height}`;
}

// 检查模型是否支持参考图
export function supportsReferenceImage(modelId: string): boolean {
  const model = IMAGE_MODELS.find((m) => m.id === modelId);
  return model?.supportsReference ?? false;
}

// 获取模型最大图片数量
export function getMaxImageCount(modelId: string): number {
  const model = IMAGE_MODELS.find((m) => m.id === modelId);
  return model?.maxImages ?? 0;
}

// 获取模型最大生成数量
export function getMaxOutputCount(modelId: string): number {
  const model = IMAGE_MODELS.find((m) => m.id === modelId);
  return model?.maxOutput ?? 1;
}

// ===== Default Values =====
export const DEFAULT_LLM_MODEL = "deepseek-v4-pro";
export const DEFAULT_IMAGE_MODEL = "wan2.7-image-pro";
export const DEFAULT_VIDEO_MODEL = "seedance2";
export const DEFAULT_3D_MODEL = "Tripo/Tripo-H3.1";

// ===== Type Exports =====
export type ModelCategory = "llm" | "image" | "video" | "3d" | "music" | "edit";

export type AiModel =
  | (typeof LLM_MODELS)[number]
  | (typeof IMAGE_MODELS)[number]
  | (typeof VIDEO_MODELS)[number]
  | (typeof MODEL_3D)[number]
  | (typeof IMAGE_EDIT_MODELS)[number]
  | (typeof MUSIC_MODELS)[number];

export type ImageModelId = (typeof IMAGE_MODELS)[number]["id"];
export type ImageSize = string;

export type VideoModelId = (typeof VIDEO_MODELS)[number]["id"];
export type VideoDuration = number;
export type VideoAspectRatio = string;
export type VideoResolution = string;

export type ThreeDModelId = (typeof MODEL_3D)[number]["id"];

// ===== Options for UI =====
export const MODELS = {
  llm: LLM_MODELS,
  image: IMAGE_MODELS,
  video: VIDEO_MODELS,
  "3d": MODEL_3D,
  edit: IMAGE_EDIT_MODELS,
  music: MUSIC_MODELS,
};

export const MODEL3D_OPTIONS = MODEL_3D;

export const VIDEO_DURATION_OPTIONS = [5, 6, 7, 8, 10, 12, 15, 16];
export const VIDEO_ASPECT_OPTIONS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
export const VIDEO_RESOLUTION_OPTIONS = ["540p", "720p", "1080p"];

// 3D贴图质量选项
export const THREE_D_TEXTURE_QUALITY_OPTIONS = [
  { value: "standard", label: "标准贴图" },
  { value: "detailed", label: "高清贴图" },
];

// 3D几何精度选项（仅H3.1支持）
export const THREE_D_GEOMETRY_QUALITY_OPTIONS = [
  { value: "standard", label: "标准（最高150万面）" },
  { value: "ultra", label: "超清（最高200万面）" },
];

// 兼容旧版
export const THREE_D_QUALITY_OPTIONS = THREE_D_TEXTURE_QUALITY_OPTIONS;
