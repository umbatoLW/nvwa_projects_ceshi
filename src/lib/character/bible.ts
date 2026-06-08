/**
 * Moyin Creator Layer 1: 角色圣经管理
 * 为每个角色建立结构化档案，作为所有生图/生视频的"唯一真相源"
 */

export interface CharacterBible {
  id: string;
  projectId: string;
  name: string;

  // 基础档案
  archetype: string;        // 原型：逆袭女主/冷酷总裁/腹黑反派等
  age: number;
  gender: 'male' | 'female' | 'other';
  ethnicity: string;        // 种族/民族：东亚/欧美/混血等

  // 外貌圣经（精确到每个面部特征）
  appearance: {
    faceShape: string;        // 脸型：瓜子脸/圆脸/方脸/鹅蛋脸
    skinTone: string;         // 肤色：白皙/小麦色/古铜/黝黑
    skinTexture: string;      // 肤质：光滑/有雀斑/有痘印/细腻

    eyes: {
      shape: string;          // 眼型：杏眼/桃花眼/丹凤眼/圆眼
      color: string;          // 瞳色：黑色/棕色/琥珀色/蓝色
      size: 'large' | 'medium' | 'small' | 'almond';
      eyelid: 'double' | 'single' | 'inner-double';
      eyelashes: 'long' | 'medium' | 'short' | 'thick';
      eyebrowShape: string;   // 眉形：柳叶眉/剑眉/一字眉/弯眉
      eyebrowColor: string;
    };

    nose: {
      shape: string;          // 鼻型：直鼻/翘鼻/鹰钩鼻/小翘鼻
      bridge: 'high' | 'medium' | 'low';
      tip: 'pointed' | 'rounded' | 'flat';
    };

    lips: {
      shape: string;          // 唇形：M唇/厚唇/薄唇/微笑唇
      color: string;          // 唇色：自然粉/正红/裸色/深红
      size: 'full' | 'medium' | 'thin';
    };

    hair: {
      color: string;          // 发色：黑色/棕色/金色/银白/渐变
      style: string;          // 发型：黑长直/大波浪/短发/盘发/马尾
      length: 'long' | 'medium' | 'short' | 'bald';
      texture: 'straight' | 'wavy' | 'curly' | 'coily';
      bangs?: string;         // 刘海：空气刘海/八字刘海/无刘海
      highlights?: string;   // 挑染：无/金色挑染/红色挑染
    };

    body: {
      height: number;         // cm
      weight?: number;        // kg（可选）
      build: string;          // 体型：纤细/匀称/丰满/健壮/瘦弱
      posture: string;        // 体态：挺拔/慵懒/拘谨/自信
      distinguishingFeatures?: string[]; // 显著特征：泪痣/疤痕/纹身/胎记
    };

    overallImpression: string; // 整体印象：清冷气质/甜美可爱/成熟妩媚/阳光少年
  };

  // 服装圣经（按场景分类）
  wardrobe: {
    default: Outfit;          // 默认服装
    casual?: Outfit;          // 休闲装
    formal?: Outfit;          // 正装/礼服
    work?: Outfit;            // 职业装
    sleep?: Outfit;           // 睡衣/居家服
    special?: Record<string, Outfit>; // 特殊场景：婚礼/战斗/古装/泳装等
  };

  // 性格锚点（影响表情和动作选择）
  personality: {
    mbti?: string;            // 可选：MBTI类型
    coreTraits: string[];     // 核心特质：坚韧/温柔/腹黑/傲娇/冷静
    speechPattern: string;   // 语言风格：简洁/啰嗦/文雅/粗犷/ sarcastic
    defaultExpression: string; // 默认表情：微笑/冷漠/温柔/严肃
    signatureGesture?: string; // 标志性动作：撩头发/推眼镜/抱臂/插兜
    emotionalRange: {         // 情感范围（影响可生成的表情类型）
      highIntensity: string[]; // 强烈情绪：暴怒/狂喜/崩溃/绝望
      mediumIntensity: string[]; // 中等情绪：生气/开心/难过/惊讶
      lowIntensity: string[];   // 微弱情绪：不满/愉悦/失落/疑惑
    };
  };

  // 一致性锚点提示词（自动构建，用于生图时注入）
  consistencyAnchor: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface Outfit {
  top: string;              // 上衣：白色衬衫/黑色西装/红色连衣裙
  bottom?: string;          // 下装：黑色西裤/牛仔短裤/百褶裙
  outerwear?: string;       // 外套：黑色风衣/牛仔外套/皮草
  shoes?: string;           // 鞋子：高跟鞋/运动鞋/皮鞋/靴子
  accessories?: string[];   // 配饰：银色项链/钻石耳环/手表/眼镜
  colors: string[];         // 主色调：["black", "white", "red"]
  style: string;            // 风格：商务/休闲/复古/朋克/优雅
  season: string;           // 季节：春/夏/秋/冬
}

// 从简单角色数据构建圣经
export function buildCharacterBible(
  baseCharacter: { name: string; description: string; age?: number; gender?: string },
  projectId: string
): CharacterBible {
  const bible: CharacterBible = {
    id: crypto.randomUUID(),
    projectId,
    name: baseCharacter.name,
    archetype: 'unknown',
    age: baseCharacter.age || 25,
    gender: (baseCharacter.gender as 'male' | 'female' | 'other') || 'female',
    ethnicity: '东亚',
    appearance: {
      faceShape: '瓜子脸',
      skinTone: '白皙',
      skinTexture: '光滑细腻',
      eyes: {
        shape: '杏眼',
        color: '黑色',
        size: 'large',
        eyelid: 'double',
        eyelashes: 'long',
        eyebrowShape: '柳叶眉',
        eyebrowColor: '黑色',
      },
      nose: {
        shape: '直鼻',
        bridge: 'medium',
        tip: 'rounded',
      },
      lips: {
        shape: 'M唇',
        color: '自然粉',
        size: 'medium',
      },
      hair: {
        color: '黑色',
        style: '黑长直',
        length: 'long',
        texture: 'straight',
      },
      body: {
        height: 165,
        build: '纤细',
        posture: '挺拔',
        distinguishingFeatures: [],
      },
      overallImpression: '清冷气质',
    },
    wardrobe: {
      default: {
        top: '白色衬衫',
        bottom: '黑色铅笔裙',
        outerwear: '黑色西装外套',
        shoes: '黑色高跟鞋',
        accessories: ['银色项链', '简约耳环'],
        colors: ['black', 'white'],
        style: '商务',
        season: '春秋',
      },
    },
    personality: {
      coreTraits: ['坚韧', '冷静'],
      speechPattern: '简洁有力',
      defaultExpression: 'neutral',
      emotionalRange: {
        highIntensity: ['暴怒', '崩溃'],
        mediumIntensity: ['生气', '难过'],
        lowIntensity: ['不满', '失落'],
      },
    },
    consistencyAnchor: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 自动构建一致性锚点
  bible.consistencyAnchor = buildConsistencyAnchor(bible);

  return bible;
}

// 从圣经构建一致性锚点提示词
export function buildConsistencyAnchor(bible: CharacterBible): string {
  const a = bible.appearance;

  return `【角色一致性锚点：${bible.name}】
绝对不可改变的面部特征：
- 脸型：${a.faceShape}，肤色：${a.skinTone}，肤质：${a.skinTexture}
- 眼睛：${a.eyes.shape}，${a.eyes.color}瞳色，${a.eyes.size}眼睛，${a.eyes.eyelid}眼皮，${a.eyes.eyelashes}睫毛，${a.eyes.eyebrowShape}眉形
- 鼻子：${a.nose.shape}，鼻梁${a.nose.bridge}，鼻头${a.nose.tip}
- 嘴唇：${a.lips.shape}，${a.lips.color}，${a.lips.size}
- 发型：${a.hair.color}发色，${a.hair.style}，${a.hair.length}发，${a.hair.texture}发质${a.hair.bangs ? '，' + a.hair.bangs : ''}${a.hair.highlights ? '，' + a.hair.highlights : ''}
- 体型：${a.body.build}，${a.body.height}cm，${a.body.posture}体态
${a.body.distinguishingFeatures?.length ? '- 显著特征：' + a.body.distinguishingFeatures.join('、') : ''}
- 整体气质：${a.overallImpression}

服装锚点（默认）：
- ${bible.wardrobe.default.top} + ${bible.wardrobe.default.bottom || ''} + ${bible.wardrobe.default.outerwear || ''}
- 配饰：${bible.wardrobe.default.accessories?.join('、') || '无'}
- 色调：${bible.wardrobe.default.colors.join('、')}

性格锚点：
- 核心特质：${bible.personality.coreTraits.join('、')}
- 默认表情：${bible.personality.defaultExpression}
- 标志性动作：${bible.personality.signatureGesture || '无'}

【一致性指令】
无论场景、角度、光线如何变化，以上面部特征必须100%保持一致。
禁止改变：脸型轮廓、眼型、鼻型、唇形、发色发型、肤色、显著特征。
允许微调：表情（在emotionalRange内）、服装（在wardrobe内）、姿态、光影。`;
}

// 为特定场景选择服装
export function selectOutfitForScene(bible: CharacterBible, sceneType: string): Outfit {
  const wardrobe = bible.wardrobe;

  // 场景-服装映射
  const mapping: Record<string, keyof typeof wardrobe | string> = {
    '办公室': 'work',
    '职场': 'work',
    '商务': 'formal',
    '宴会': 'formal',
    '婚礼': 'special.wedding',
    '约会': 'casual',
    '居家': 'sleep',
    '休闲': 'casual',
    '战斗': 'special.battle',
    '古装': 'special.ancient',
  };

  const key = mapping[sceneType] || 'default';

  if (key.startsWith('special.')) {
    const specialKey = key.split('.')[1];
    return wardrobe.special?.[specialKey] || wardrobe.default;
  }

  return (wardrobe as unknown as Record<string, Outfit | undefined>)[key] || wardrobe.default;
}
