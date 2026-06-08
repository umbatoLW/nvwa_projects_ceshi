import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai-client';
import { buildCharacterBible, buildConsistencyAnchor, CharacterBible } from '@/lib/character/bible';

// 简单的 JSON 解析函数
function safeJsonParse(str: string, context: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    console.error(`[${context}] JSON parse error`);
    return null;
  }
}

// POST: 从角色描述生成结构化圣经
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterId, projectId, description, name, age, gender } = body;

    if (!characterId && !description) {
      return NextResponse.json(
        { error: 'Either characterId or description is required' },
        { status: 400 }
      );
    }

    let baseDescription = description || '';
    let baseName = name || '未命名角色';
    let baseAge = age || 25;
    let baseGender = gender || 'female';

    // 使用 LLM 解析描述，生成结构化圣经
    const prompt = `请根据以下角色描述，生成精确的结构化角色档案（角色圣经）。

角色描述：
名称：${baseName}
${baseAge ? `年龄：${baseAge}` : ''}
${baseGender ? `性别：${baseGender}` : ''}
描述：${baseDescription}

请按以下JSON格式输出，确保每个面部特征都具体可描述：

{
  "archetype": "角色原型（如：逆袭女主/冷酷总裁/腹黑反派）",
  "age": 25,
  "gender": "female",
  "ethnicity": "东亚",
  "appearance": {
    "faceShape": "瓜子脸/圆脸/方脸/鹅蛋脸",
    "skinTone": "白皙/小麦色/古铜/黝黑",
    "skinTexture": "光滑细腻/有雀斑/有痘印",
    "eyes": {
      "shape": "杏眼/桃花眼/丹凤眼/圆眼",
      "color": "黑色/棕色/琥珀色/蓝色",
      "size": "large/medium/small/almond",
      "eyelid": "double/single/inner-double",
      "eyelashes": "long/medium/short/thick",
      "eyebrowShape": "柳叶眉/剑眉/一字眉/弯眉",
      "eyebrowColor": "黑色/棕色"
    },
    "nose": {
      "shape": "直鼻/翘鼻/鹰钩鼻/小翘鼻",
      "bridge": "high/medium/low",
      "tip": "pointed/rounded/flat"
    },
    "lips": {
      "shape": "M唇/厚唇/薄唇/微笑唇",
      "color": "自然粉/正红/裸色/深红",
      "size": "full/medium/thin"
    },
    "hair": {
      "color": "黑色/棕色/金色/银白",
      "style": "黑长直/大波浪/短发/盘发",
      "length": "long/medium/short",
      "texture": "straight/wavy/curly",
      "bangs": "空气刘海/八字刘海/无刘海（可选）",
      "highlights": "无/金色挑染/红色挑染（可选）"
    },
    "body": {
      "height": 165,
      "build": "纤细/匀称/丰满/健壮/瘦弱",
      "posture": "挺拔/慵懒/拘谨/自信",
      "distinguishingFeatures": ["泪痣", "疤痕", "纹身（可选）"]
    },
    "overallImpression": "清冷气质/甜美可爱/成熟妩媚/阳光少年"
  },
  "wardrobe": {
    "default": {
      "top": "白色衬衫",
      "bottom": "黑色铅笔裙",
      "outerwear": "黑色西装外套",
      "shoes": "黑色高跟鞋",
      "accessories": ["银色项链", "简约耳环"],
      "colors": ["black", "white"],
      "style": "商务",
      "season": "春秋"
    }
  },
  "personality": {
    "coreTraits": ["坚韧", "冷静"],
    "speechPattern": "简洁有力",
    "defaultExpression": "neutral",
    "signatureGesture": "撩头发/推眼镜/抱臂/插兜（可选）",
    "emotionalRange": {
      "highIntensity": ["暴怒", "崩溃"],
      "mediumIntensity": ["生气", "难过"],
      "lowIntensity": ["不满", "失落"]
    }
  }
}

要求：
1. 每个特征必须具体、可视觉化，不能模糊（如"漂亮"不可接受，"杏眼+柳叶眉+M唇"可接受）
2. 面部特征组合必须协调合理（如丹凤眼配剑眉，杏眼配柳叶眉）
3. 服装必须符合角色身份和年龄
4. 显著特征（distinguishingFeatures）最多2个，且必须与角色故事相关`;

    const client = getAIClient();
    const response = await client.chat.completions.create({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = safeJsonParse(content, 'character-bible-generation');

    // 构建完整圣经
    const bible = buildCharacterBible(
      { name: baseName, description: baseDescription, age: baseAge, gender: baseGender },
      projectId || 'default'
    );

    // 用 LLM 输出覆盖默认值
    if (parsed && typeof parsed === 'object') {
      const parsedObj = parsed as Partial<CharacterBible>;
      if (parsedObj.archetype) bible.archetype = parsedObj.archetype;
      if (parsedObj.age) bible.age = parsedObj.age;
      if (parsedObj.gender) bible.gender = parsedObj.gender;
      if (parsedObj.ethnicity) bible.ethnicity = parsedObj.ethnicity;
      if (parsedObj.appearance) bible.appearance = parsedObj.appearance;
      if (parsedObj.wardrobe) bible.wardrobe = parsedObj.wardrobe;
      if (parsedObj.personality) bible.personality = parsedObj.personality;
    }
    
    bible.id = characterId || crypto.randomUUID();
    bible.consistencyAnchor = buildConsistencyAnchor(bible);

    return NextResponse.json({ success: true, bible });
  } catch (error) {
    console.error('[character-bible] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate character bible' },
      { status: 500 }
    );
  }
}

// GET: 查询角色圣经
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (!characterId) {
      return NextResponse.json(
        { error: 'characterId is required' },
        { status: 400 }
      );
    }

    // 简化实现：返回提示需要先生成圣经
    // 完整实现需要从数据库查询
    return NextResponse.json({
      success: false,
      message: 'Character bible not found. Please generate first.',
      characterId,
    });
  } catch (error) {
    console.error('[character-bible] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get character bible' },
      { status: 500 }
    );
  }
}
