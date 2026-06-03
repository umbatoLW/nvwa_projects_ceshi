/**
 * Visual Style System — 12 preset visual styles for AI generation
 * Each style injects style tokens into image generation prompts.
 */

export interface VisualStyle {
  id: string;
  name: string;
  description: string;
  promptTokens: string;
  previewColor: string;
}

export function getStylePrompt(styleId: string): string {
  const style = VISUAL_STYLES.find((s) => s.id === styleId);
  return style?.promptTokens || '';
}

export function applyStyleToPrompt(prompt: string, styleId: string): string {
  const tokens = getStylePrompt(styleId);
  if (!tokens) return prompt;
  return `${prompt}, ${tokens}`;
}

export const VISUAL_STYLES: VisualStyle[] = [
  {
    id: "realistic_cinema",
    name: "电影级写实",
    description: "真实摄影质感，电影灯光，高级景深",
    promptTokens:
      "cinematic photography, photorealistic, professional lighting, shallow depth of field, film grain, 35mm lens, high-end production quality, ultra detailed, 8K UHD",
    previewColor: "#E8D5B7",
  },
  {
    id: "anime_2d_cn",
    name: "国风2D动画",
    description: "中国风格二维动画，唯美细腻",
    promptTokens:
      "Chinese style 2D animation, traditional Chinese aesthetics, elegant brushwork, soft watercolor textures, cel-shaded, beautiful linework, Studio Ghibli inspired, warm harmonious colors",
    previewColor: "#D4A574",
  },
  {
    id: "anime_2d_jp",
    name: "日式二次元",
    description: "日式动漫风格，精致人物",
    promptTokens:
      "Japanese anime style, anime illustration, detailed anime character, vibrant colors, clean linework, cel shading, manga influence, kawaii aesthetic, high quality anime art",
    previewColor: "#FFB7C5",
  },
  {
    id: "art_ink",
    name: "水墨国风",
    description: "传统水墨画风格，意境深远",
    promptTokens:
      "traditional Chinese ink wash painting, sumi-e style, flowing brushstrokes, monochrome with subtle color accents, poetic atmosphere, rice paper texture, minimalist composition, artistic ink splatter",
    previewColor: "#8B8680",
  },
  {
    id: "art_watercolor",
    name: "水彩插画",
    description: "柔和水彩质感，梦幻唯美",
    promptTokens:
      "watercolor illustration, soft watercolor textures, dreamy pastel colors, flowing pigments, wet-on-wet technique, delicate brushwork, artistic illustration, ethereal atmosphere",
    previewColor: "#B8D4E3",
  },
  {
    id: "art_oil",
    name: "油画质感",
    description: "古典油画风格，厚重质感",
    promptTokens:
      "oil painting style, classical oil painting texture, rich impasto brushstrokes, Renaissance inspired, warm chiaroscuro lighting, canvas texture visible, fine art quality, museum masterpiece",
    previewColor: "#C4A35A",
  },
  {
    id: "art_pixel",
    name: "像素风格",
    description: "复古像素艺术，游戏怀旧",
    promptTokens:
      "pixel art style, retro 16-bit pixel graphics, crisp pixel edges, limited color palette, dithering patterns, nostalgic game aesthetic, clean pixel composition, arcade style",
    previewColor: "#7FB069",
  },
  {
    id: "art_lowpoly",
    name: "低多边形",
    description: "几何低面风格，现代简约",
    promptTokens:
      "low poly 3D style, geometric faceted surfaces, clean polygon edges, modern minimalist, flat shading, ambient occlusion, isometric view, stylized 3D render",
    previewColor: "#6B8E9F",
  },
  {
    id: "art_cyberpunk",
    name: "赛博朋克",
    description: "霓虹科幻风格，未来都市",
    promptTokens:
      "cyberpunk style, neon lights, futuristic cityscape, holographic elements, dark atmospheric, synthwave colors, high tech low life, blade runner aesthetic, glowing neon accents, dystopian future",
    previewColor: "#FF6B9D",
  },
  {
    id: "art_vintage",
    name: "复古胶片",
    description: "老电影胶片质感，怀旧色调",
    promptTokens:
      "vintage film photography, retro analog film, warm sepia tones, faded colors, film grain, light leaks, vignette effect, 1970s aesthetic, nostalgic atmosphere, old photograph",
    previewColor: "#C9A87C",
  },
  {
    id: "art_fantasy",
    name: "奇幻魔幻",
    description: "魔幻史诗风格，瑰丽壮阔",
    promptTokens:
      "fantasy art style, epic magical scene, dramatic lighting, mystical atmosphere, enchanted environment, glowing magical effects, Lord of the Rings inspired, highly detailed fantasy illustration, ethereal creatures",
    previewColor: "#9B7EDE",
  },
  {
    id: "art_minimal",
    name: "极简风格",
    description: "极简主义设计，留白艺术",
    promptTokens:
      "minimalist art style, clean simple composition, generous negative space, limited color palette, flat design, geometric shapes, modern minimalist illustration, elegant simplicity, Scandinavian design influence",
    previewColor: "#F5F5F5",
  },
];

export function getStyleById(id: string): VisualStyle | undefined {
  return VISUAL_STYLES.find((s) => s.id === id);
}

export function injectStyleToPrompt(prompt: string, styleId?: string): string {
  if (!styleId) return prompt;
  const style = getStyleById(styleId);
  if (!style) return prompt;
  // Avoid duplicate injection if tokens already present
  const tokens = style.promptTokens;
  const hasToken = tokens.split(", ").some((t) => prompt.toLowerCase().includes(t.toLowerCase()));
  if (hasToken) return prompt;
  return `${prompt}, ${tokens}`;
}
