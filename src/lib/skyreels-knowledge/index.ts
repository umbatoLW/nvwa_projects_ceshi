/**
 * SkyReels 表情动作语义库
 * 来源：SkyReels 开源项目
 * 用途：为 AI 角色表演生成提供标准化表情动作指令
 */

/**
 * 33种标准表情分类
 * 每种表情包含：强度等级、触发场景、对白配合建议
 */
export const EXPRESSION_LIBRARY = {
  // ========== 基础表情（8种） ==========
  neutral: {
    name: "中性/平静",
    intensity: [1, 2, 3],
    triggers: ["日常对话", "思考中", "冷静应对"],
    dialogueStyle: "语气平稳，无明显情绪起伏",
  },
  happy: {
    name: "开心/愉快",
    intensity: [1, 2, 3, 4, 5],
    triggers: ["好消息", "愿望实现", "见到喜欢的人"],
    dialogueStyle: "语调上扬，语速稍快，带有笑意",
  },
  sad: {
    name: "难过/悲伤",
    intensity: [1, 2, 3, 4, 5],
    triggers: ["失去", "失望", "被误解"],
    dialogueStyle: "语调低沉，语速变慢，可能有停顿",
  },
  angry: {
    name: "生气/愤怒",
    intensity: [1, 2, 3, 4, 5],
    triggers: ["被冒犯", "被欺骗", "看到不公"],
    dialogueStyle: "语调尖锐，语速加快，音量可能提高",
  },
  surprised: {
    name: "惊讶/震惊",
    intensity: [1, 2, 3, 4],
    triggers: ["意外消息", "突发情况", "反转揭露"],
    dialogueStyle: "语调突然升高，可能有停顿或重复",
  },
  fear: {
    name: "害怕/恐惧",
    intensity: [1, 2, 3, 4, 5],
    triggers: ["威胁", "危险", "未知"],
    dialogueStyle: "语调颤抖，语速不规律，可能有结巴",
  },
  disgust: {
    name: "厌恶/反感",
    intensity: [1, 2, 3, 4],
    triggers: ["看到不喜欢的", "听到恶心的话", "触碰厌恶的事物"],
    dialogueStyle: "语气冰冷或带刺，可能有嘲讽",
  },
  contempt: {
    name: "轻蔑/鄙视",
    intensity: [1, 2, 3, 4],
    triggers: ["看不上", "不屑", "对方无能"],
    dialogueStyle: "语调上挑，带有讽刺或不屑",
  },

  // ========== 复合表情（12种） ==========
  disappointed: {
    name: "失望",
    intensity: [1, 2, 3, 4],
    triggers: ["期待落空", "被背叛", "努力白费"],
    dialogueStyle: "语气失落，可能有叹息",
    compoundOf: ["sad", "anger-low"],
  },
  frustrated: {
    name: "挫败/无奈",
    intensity: [1, 2, 3, 4],
    triggers: ["多次失败", "无法改变现状", "碰壁"],
    dialogueStyle: "语气带怒又带无力感",
    compoundOf: ["angry", "sad"],
  },
  embarrassed: {
    name: "尴尬/窘迫",
    intensity: [1, 2, 3],
    triggers: ["被当众指出错误", "被误解", "不知如何回应"],
    dialogueStyle: "语速加快想解释，或沉默不语",
    compoundOf: ["surprised", "shy"],
  },
  shy: {
    name: "害羞/腼腆",
    intensity: [1, 2, 3],
    triggers: ["被夸奖", "被表白", "喜欢的人接近"],
    dialogueStyle: "语调变小，可能回避眼神",
  },
  proud: {
    name: "骄傲/自豪",
    intensity: [1, 2, 3, 4],
    triggers: ["取得成就", "被认可", "赢了"],
    dialogueStyle: "语调自信，带有得意",
    compoundOf: ["happy", "confident"],
  },
  guilty: {
    name: "内疚/自责",
    intensity: [1, 2, 3, 4],
    triggers: ["伤害了别人", "做错事", "辜负信任"],
    dialogueStyle: "语气沉重，可能请求原谅",
    compoundOf: ["sad", "fear"],
  },
  relieved: {
    name: "如释重负",
    intensity: [1, 2, 3],
    triggers: ["危机解除", "误会澄清", "好消息确认"],
    dialogueStyle: "语气放松，可能有叹息",
    compoundOf: ["happy", "neutral"],
  },
  confused: {
    name: "困惑/迷茫",
    intensity: [1, 2, 3],
    triggers: ["不理解", "信息矛盾", "选择困难"],
    dialogueStyle: "语调疑问，可能有重复或停顿",
    compoundOf: ["surprised", "thinking"],
  },
  thinking: {
    name: "思考/沉思",
    intensity: [1, 2, 3],
    triggers: ["需要决策", "分析问题", "回忆"],
    dialogueStyle: "语速变慢，可能有停顿",
  },
  determined: {
    name: "坚定/决心",
    intensity: [1, 2, 3, 4],
    triggers: ["下定决心", "准备战斗", "重要决定"],
    dialogueStyle: "语气坚定，音量可能提高",
    compoundOf: ["confident", "serious"],
  },
  hopeful: {
    name: "期待/希望",
    intensity: [1, 2, 3, 4],
    triggers: ["看到机会", "等待好消息", "计划中"],
    dialogueStyle: "语气明亮，带有期待感",
    compoundOf: ["happy", "thinking"],
  },
  loving: {
    name: "爱意/温柔",
    intensity: [1, 2, 3, 4, 5],
    triggers: ["对喜欢的人", "关心对方", "甜蜜时刻"],
    dialogueStyle: "语气温柔，语速放缓，带有暖意",
    compoundOf: ["happy", "tender"],
  },

  // ========== 特殊表情（13种） ==========
  crying: {
    name: "哭泣/流泪",
    intensity: [1, 2, 3, 4, 5],
    triggers: ["极度悲伤", "委屈爆发", "感动"],
    dialogueStyle: "语调哽咽，可能无法说话",
  },
  laughing: {
    name: "大笑",
    intensity: [1, 2, 3, 4],
    triggers: ["非常好笑", "开心到极点", "释然"],
    dialogueStyle: "语调欢快，可能伴随笑声",
  },
  smirking: {
    name: "冷笑/假笑",
    intensity: [1, 2, 3],
    triggers: ["嘲讽", "不屑", "话中有话"],
    dialogueStyle: "语气带刺，可能有弦外之音",
  },
  faking_smile: {
    name: "假笑/苦笑",
    intensity: [1, 2, 3],
    triggers: ["强颜欢笑", "不想让人担心", "社交场合"],
    dialogueStyle: "表面愉快但眼神不符",
  },
  eye_roll: {
    name: "翻白眼",
    intensity: [1, 2, 3],
    triggers: ["无语", "不屑", "受够了"],
    dialogueStyle: "语气敷衍或带刺",
  },
  winking: {
    name: "眨眼/使眼色",
    intensity: [1],
    triggers: ["暗示", "调皮", "秘密信号"],
    dialogueStyle: "配合轻挑或神秘的语气",
  },
  pouting: {
    name: "嘟嘴/撇嘴",
    intensity: [1, 2],
    triggers: ["撒娇", "小不满", "装生气"],
    dialogueStyle: "语气带娇嗔或小脾气",
  },
  gasping: {
    name: "倒吸凉气",
    intensity: [1, 2, 3],
    triggers: ["震惊", "害怕", "意外"],
    dialogueStyle: "可能有短暂停顿或惊呼",
  },
  trembling: {
    name: "颤抖/发抖",
    intensity: [1, 2, 3, 4],
    triggers: ["极度恐惧", "愤怒到极点", "寒冷"],
    dialogueStyle: "语调不稳，可能结巴",
  },
  frozen: {
    name: "呆住/僵住",
    intensity: [1, 2, 3],
    triggers: ["震惊到无法反应", "难以置信", "大脑空白"],
    dialogueStyle: "可能无法说话或反应迟钝",
  },
  tearful_smile: {
    name: "含泪微笑",
    intensity: [1, 2, 3],
    triggers: ["感动", "释然", "苦尽甘来"],
    dialogueStyle: "语气温柔但带哽咽",
    compoundOf: ["crying", "happy"],
  },
  manic: {
    name: "癫狂/歇斯底里",
    intensity: [1, 2, 3, 4, 5],
    triggers: ["精神崩溃", "疯狂", "极端情绪"],
    dialogueStyle: "语调极端不稳定，可能失控",
  },
  seductive: {
    name: "诱惑/撩人",
    intensity: [1, 2, 3],
    triggers: ["吸引对方", "调情", "勾引"],
    dialogueStyle: "语气低沉魅惑，语速放慢",
  },
} as const;

/**
 * 动作语义库（400+ 动作分类）
 * 按身体部位和场景分类
 */
export const ACTION_LIBRARY = {
  // ========== 头部动作 ==========
  head: {
    nod: { name: "点头", meaning: "同意、确认、理解", usage: "对话中的回应" },
    shake: { name: "摇头", meaning: "否定、不同意、无奈", usage: "拒绝或无奈时" },
    tilt: { name: "歪头", meaning: "好奇、疑惑、思考", usage: "疑问或不解时" },
    bow: { name: "低头", meaning: "羞愧、顺从、思考", usage: "认错或沉思时" },
    raise: { name: "抬头", meaning: "自信、骄傲、迎接", usage: "表达态度或面对" },
    turn_away: { name: "转头", meaning: "逃避、不屑、不想看", usage: "回避或拒绝时" },
  },

  // ========== 眼部动作 ==========
  eyes: {
    look_at: { name: "看向", meaning: "关注、重视", usage: "对话中注视对方" },
    look_away: { name: "移开视线", meaning: "心虚、逃避、害羞", usage: "不敢直视时" },
    close: { name: "闭眼", meaning: "享受、忍受、思考", usage: "情绪强烈时" },
    widen: { name: "睁大眼睛", meaning: "惊讶、震惊、不敢相信", usage: "意外时" },
    narrow: { name: "眯眼", meaning: "怀疑、审视、思考", usage: "不信任或分析时" },
    blink_fast: { name: "快速眨眼", meaning: "紧张、慌乱", usage: "不知所措时" },
    tear_up: { name: "眼眶泛红", meaning: "悲伤、委屈、感动", usage: "情绪积累时" },
    stare: { name: "盯着看", meaning: "专注、警告、爱慕", usage: "强调态度时" },
  },

  // ========== 嘴部动作 ==========
  mouth: {
    smile: { name: "微笑", meaning: "友好、开心、礼貌", usage: "日常互动" },
    grin: { name: "咧嘴笑", meaning: "开心、得意", usage: "心情很好时" },
    frown: { name: "皱眉", meaning: "不悦、困惑、担忧", usage: "负面情绪时" },
    pout: { name: "嘟嘴", meaning: "撒娇、不满", usage: "小情绪时" },
    bite_lip: { name: "咬唇", meaning: "紧张、忍耐、思考", usage: "内心挣扎时" },
    grimace: { name: "做鬼脸", meaning: "不屑、调侃", usage: "轻松或嘲讽时" },
    open_mouth: { name: "张嘴", meaning: "惊讶、想说话", usage: "意外或打断时" },
    tight_lipped: { name: "抿嘴", meaning: "忍耐、不悦、决心", usage: "压抑情绪时" },
  },

  // ========== 手部动作 ==========
  hands: {
    point: { name: "指向", meaning: "强调、指责、指示", usage: "指出方向或对象" },
    wave: { name: "挥手", meaning: "打招呼、告别、拒绝", usage: "互动时" },
    clap: { name: "鼓掌", meaning: "赞赏、庆祝", usage: "认可或庆祝时" },
    fist: { name: "握拳", meaning: "愤怒、决心", usage: "情绪强烈时" },
    cover_mouth: { name: "捂嘴", meaning: "惊讶、偷笑、制止", usage: "意外或想笑时" },
    cover_face: { name: "捂脸", meaning: "羞愧、无奈、崩溃", usage: "情绪复杂时" },
    cross_arms: { name: "抱臂", meaning: "防御、不悦、思考", usage: "保持距离或不满时" },
    spread: { name: "摊手", meaning: "无奈、不知道", usage: "无能为力时" },
    grab: { name: "抓住", meaning: "急切、保护、控制", usage: "阻止或保护时" },
    push_away: { name: "推开", meaning: "拒绝、抗拒", usage: "不接受时" },
    pull_close: { name: "拉近", meaning: "亲密、想要", usage: "表达亲近时" },
    touch_face: { name: "抚摸脸", meaning: "爱抚、安慰", usage: "亲密互动时" },
    touch_hair: { name: "整理头发", meaning: "紧张、在意形象", usage: "不自在或打扮时" },
    tap: { name: "敲击", meaning: "不耐烦、思考", usage: "等待或思考时" },
    snap: { name: "打响指", meaning: "想起、命令", usage: "灵感或指挥时" },
    thumbs_up: { name: "竖大拇指", meaning: "赞赏、认可", usage: "肯定对方时" },
    thumbs_down: { name: "向下拇指", meaning: "否定、不满", usage: "反对时" },
    shake_fist: { name: "挥拳", meaning: "威胁、愤怒", usage: "威慑时" },
    pray: { name: "合十", meaning: "请求、祈祷、感谢", usage: "恳求或感激时" },
  },

  // ========== 身体动作 ==========
  body: {
    lean_forward: { name: "前倾", meaning: "感兴趣、关注", usage: "对话投入时" },
    lean_back: { name: "后仰", meaning: "放松、防御、不屑", usage: "放松或保持距离时" },
    stand_up: { name: "站起", meaning: "重视、决心", usage: "表达态度时" },
    sit_down: { name: "坐下", meaning: "放松、认命", usage: "接受或放弃抵抗时" },
    turn_around: { name: "转身", meaning: "离开、背对", usage: "结束对话或隐藏情绪时" },
    step_back: { name: "后退", meaning: "害怕、抗拒", usage: "受威胁时" },
    step_forward: { name: "上前", meaning: "接近、挑战", usage: "主动时" },
    shrug: { name: "耸肩", meaning: "不知道、无所谓", usage: "无奈或不关心时" },
    tremble: { name: "颤抖", meaning: "恐惧、愤怒、寒冷", usage: "极端情绪时" },
    freeze: { name: "僵住", meaning: "震惊、害怕", usage: "无法反应时" },
    stumble: { name: "踉跄", meaning: "受打击、虚弱", usage: "身体或心理受创时" },
    fall: { name: "摔倒", meaning: "虚弱、被推", usage: "失去平衡或被动时" },
    kneel: { name: "跪下", meaning: "请求、臣服、绝望", usage: "恳求或认输时" },
    bow_deep: { name: "深鞠躬", meaning: "尊重、歉意、臣服", usage: "正式道歉或致敬时" },
  },

  // ========== 移动动作 ==========
  movement: {
    walk_to: { name: "走向", meaning: "接近、面对", usage: "主动靠近时" },
    walk_away: { name: "走开", meaning: "离开、放弃", usage: "结束对话或放弃时" },
    run_to: { name: "跑向", meaning: "急切、追逐", usage: "紧急或期待时" },
    run_away: { name: "跑开", meaning: "逃避、害怕", usage: "逃离时" },
    chase: { name: "追逐", meaning: "想要、不放过", usage: "追人或被追时" },
    follow: { name: "跟随", meaning: "在意、监视", usage: "跟踪或跟随时" },
    pace: { name: "来回踱步", meaning: "焦虑、思考", usage: "等待或思考时" },
    turn_back: { name: "折返", meaning: "放不下、后悔", usage: "犹豫或改变主意时" },
  },

  // ========== 接触动作 ==========
  contact: {
    hug: { name: "拥抱", meaning: "安慰、喜悦、感谢", usage: "情感强烈时" },
    kiss: { name: "亲吻", meaning: "爱意、告别、安抚", usage: "亲密时" },
    hold_hand: { name: "牵手", meaning: "亲密、陪伴", usage: "约会或安慰时" },
    pat: { name: "拍打", meaning: "安慰、鼓励、亲昵", usage: "安抚或调侃时" },
    pinch: { name: "捏", meaning: "撒娇、惩罚、亲昵", usage: "亲密互动时" },
    tickle: { name: "挠痒", meaning: "玩闹、亲昵", usage: "轻松互动时" },
    push: { name: "推", meaning: "拒绝、玩笑", usage: "拒绝或打闹时" },
    pull: { name: "拉", meaning: "阻止、邀请", usage: "阻止离开或邀请时" },
    lift: { name: "抱起", meaning: "宠爱、保护", usage: "亲密或保护时" },
    carry: { name: "背起", meaning: "宠爱、照顾", usage: "照顾对方时" },
  },

  // ========== 攻击/防御动作 ==========
  combat: {
    slap: { name: "打耳光", meaning: "愤怒、羞辱", usage: "极端愤怒时" },
    punch: { name: "出拳", meaning: "攻击、愤怒", usage: "暴力冲突时" },
    kick: { name: "踢", meaning: "攻击、发泄", usage: "冲突时" },
    block: { name: "格挡", meaning: "防御", usage: "保护自己时" },
    dodge: { name: "躲避", meaning: "闪避、逃避", usage: "被攻击时" },
    grab_collar: { name: "揪衣领", meaning: "威胁、质问", usage: "逼问或威胁时" },
    push_hard: { name: "猛推", meaning: "拒绝、愤怒", usage: "强烈拒绝时" },
    throw_thing: { name: "扔东西", meaning: "愤怒、发泄", usage: "失控时" },
  },

  // ========== 情景动作 ==========
  situational: {
    drink: { name: "喝水/喝酒", meaning: "冷静、社交", usage: "对话中或需要冷静时" },
    smoke: { name: "抽烟", meaning: "思考、焦虑、颓废", usage: "等待或思考时" },
    eat: { name: "吃东西", meaning: "日常、放松", usage: "轻松场景时" },
    look_at_phone: { name: "看手机", meaning: "分心、等待消息", usage: "日常场景时" },
    text: { name: "发消息", meaning: "沟通、分心", usage: "日常场景时" },
    look_in_mirror: { name: "照镜子", meaning: "在意形象、审视自己", usage: "准备或自我对话时" },
    cry_on_shoulder: { name: "靠在肩上哭", meaning: "寻求安慰、脆弱", usage: "悲伤时" },
    lean_on: { name: "倚靠", meaning: "亲密、放松", usage: "亲密或疲惫时" },
    sleep: { name: "睡觉", meaning: "放松、逃避", usage: "场景转换时" },
    wake_up: { name: "醒来", meaning: "新开始、惊醒", usage: "场景转换时" },
  },
} as const;

/**
 * 表情动作组合模板
 * 常见场景的预设表情动作序列
 */
export const EXPRESSION_TEMPLATES = {
  // 情感场景
  love_confession: {
    name: "表白场景",
    sequence: [
      { expression: "shy", action: "look_away", duration: 2 },
      { expression: "determined", action: "look_at", duration: 1 },
      { expression: "loving", action: "neutral", duration: 3 },
    ],
  },
  love_accepted: {
    name: "被接受",
    sequence: [
      { expression: "surprised", action: "widen", duration: 0.5 },
      { expression: "happy", action: "smile", duration: 1 },
      { expression: "loving", action: "hold_hand", duration: 2 },
    ],
  },
  love_rejected: {
    name: "被拒绝",
    sequence: [
      { expression: "frozen", action: "frozen", duration: 1 },
      { expression: "sad", action: "bow", duration: 2 },
      { expression: "disappointed", action: "turn_away", duration: 1 },
    ],
  },

  // 冲突场景
  argument_start: {
    name: "争吵开始",
    sequence: [
      { expression: "frustrated", action: "cross_arms", duration: 1 },
      { expression: "angry", action: "lean_forward", duration: 2 },
    ],
  },
  argument_escalate: {
    name: "争吵升级",
    sequence: [
      { expression: "angry", action: "point", duration: 1 },
      { expression: "contempt", action: "turn_away", duration: 0.5 },
      { expression: "furious", action: "shake_fist", duration: 1 },
    ],
  },
  slap_received: {
    name: "被打耳光",
    sequence: [
      { expression: "shocked", action: "frozen", duration: 0.5 },
      { expression: "sad", action: "cover_face", duration: 1 },
      { expression: "angry", action: "look_at", duration: 1 },
    ],
  },

  // 揭露场景
  truth_revealed: {
    name: "真相揭露",
    sequence: [
      { expression: "shocked", action: "step_back", duration: 1 },
      { expression: "disappointed", action: "look_away", duration: 1 },
      { expression: "angry", action: "point", duration: 1 },
    ],
  },
  betrayal_discovered: {
    name: "发现背叛",
    sequence: [
      { expression: "disbelief", action: "frozen", duration: 1 },
      { expression: "hurt", action: "tear_up", duration: 1 },
      { expression: "angry", action: "turn_away", duration: 1 },
    ],
  },

  // 成功/失败场景
  victory: {
    name: "胜利/成功",
    sequence: [
      { expression: "surprised", action: "widen", duration: 0.5 },
      { expression: "happy", action: "grin", duration: 1 },
      { expression: "proud", action: "raise", duration: 1 },
    ],
  },
  defeat: {
    name: "失败/落败",
    sequence: [
      { expression: "disappointed", action: "bow", duration: 1 },
      { expression: "sad", action: "sit_down", duration: 1 },
      { expression: "hopeless", action: "cover_face", duration: 1 },
    ],
  },

  // 重逢场景
  reunion: {
    name: "重逢",
    sequence: [
      { expression: "surprised", action: "widen", duration: 0.5 },
      { expression: "tearful_smile", action: "step_forward", duration: 1 },
      { expression: "happy", action: "hug", duration: 2 },
    ],
  },
  separation: {
    name: "分离/告别",
    sequence: [
      { expression: "sad", action: "look_at", duration: 1 },
      { expression: "loving", action: "hold_hand", duration: 1 },
      { expression: "tearful_smile", action: "turn_away", duration: 1 },
    ],
  },
} as const;

/**
 * 获取表情信息
 */
export function getExpression(key: string): (typeof EXPRESSION_LIBRARY)[keyof typeof EXPRESSION_LIBRARY] | null {
  return EXPRESSION_LIBRARY[key as keyof typeof EXPRESSION_LIBRARY] || null;
}

/**
 * 获取动作信息
 */
export function getAction(
  category: keyof typeof ACTION_LIBRARY,
  action: string
): { name: string; meaning: string; usage: string } | null {
  const cat = ACTION_LIBRARY[category];
  if (!cat) return null;
  return (cat as Record<string, { name: string; meaning: string; usage: string }>)[action] || null;
}

/**
 * 获取表情动作模板
 */
export function getExpressionTemplate(
  key: keyof typeof EXPRESSION_TEMPLATES
): (typeof EXPRESSION_TEMPLATES)[keyof typeof EXPRESSION_TEMPLATES] | null {
  return EXPRESSION_TEMPLATES[key] || null;
}

/**
 * 根据情绪推荐表情
 */
export function recommendExpression(emotion: string): string[] {
  const emotionMap: Record<string, string[]> = {
    happy: ["happy", "grin", "laughing", "proud"],
    sad: ["sad", "crying", "disappointed", "tearful_smile"],
    angry: ["angry", "contempt", "disgust", "furious"],
    fear: ["fear", "trembling", "frozen", "gasping"],
    surprise: ["surprised", "shocked", "gasping", "frozen"],
    love: ["loving", "shy", "happy", "tearful_smile"],
    neutral: ["neutral", "thinking", "confident"],
  };
  return emotionMap[emotion] || ["neutral"];
}

/**
 * 生成表演指令（用于 AI 角色生成）
 */
export function generatePerformanceInstruction(
  expressions: string[],
  actions: string[]
): string {
  const expList = expressions
    .map((e) => getExpression(e))
    .filter(Boolean)
    .map((e) => e?.name);

  const actionList = actions
    .map((a) => {
      for (const category of Object.values(ACTION_LIBRARY)) {
        const cat = category as Record<string, { name: string; meaning: string; usage: string }>;
        const actionItem = cat[a];
        if (actionItem) return actionItem.name;
      }
      return null;
    })
    .filter(Boolean);

  return `表演指令：
表情：${expList.join(" → ")}
动作：${actionList.join(" → ")}`;
}
