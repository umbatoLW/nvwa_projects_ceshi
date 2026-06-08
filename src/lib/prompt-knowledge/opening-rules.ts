/**
 * 开篇设计知识库
 * 整合自 Short Drama Skill
 * 
 * 定义开篇黄金法则和6种标准开场模板
 */

// 开篇黄金法则
export const OPENING_GOLDEN_RULES = {
  // 3秒法则：前3秒必须抓住观众
  THREE_SECOND_RULE: {
    name: '3秒法则',
    description: '前3秒必须抓住观众注意力',
    techniques: [
      '视觉冲击：豪车、豪宅、精美服化',
      '动作冲击：打斗、追逐、争吵',
      '信息冲击：惊人台词、惊人身份',
      '反差冲击：身份反差、场景反差'
    ]
  },
  
  // 10秒法则：前10秒交代主角核心标签
  TEN_SECOND_RULE: {
    name: '10秒法则',
    description: '前10秒交代主角核心标签',
    labels: [
      '身份标签：总裁/医生/律师/学生...',
      '性格标签：腹黑/傲娇/软萌/霸道...',
      '能力标签：顶级高手/隐藏富豪/天才...',
      '关系标签：前男友/青梅竹马/仇人之女...'
    ]
  },
  
  // 30秒法则：前30秒完成核心矛盾铺垫
  THIRTY_SECOND_RULE: {
    name: '30秒法则',
    description: '前30秒完成核心矛盾铺垫',
    elements: [
      '核心矛盾点明',
      '第一反派/对手露面',
      '主角第一个小目标/困境'
    ]
  },
  
  // 反差法则
  CONTRAST_RULE: {
    name: '反差法则',
    description: '开篇必须有反差设计',
    types: [
      '身份反差：外卖小哥→隐藏太子爷',
      '场景反差：破旧出租屋→豪车接送',
      '行为反差：表面怂包→实则顶级高手',
      '态度反差：冷漠拒绝→疯狂追妻'
    ]
  }
};

// 6种开场模板
export const OPENING_TEMPLATES = {
  // 1. 冲突开场：直接切入矛盾
  CONFLICT: {
    name: '冲突开场',
    description: '直接切入矛盾现场，瞬间抓住眼球',
    structure: [
      '冲突现场（争吵/打斗/对峙）',
      '主角身份/立场交代',
      '矛盾根源暗示',
      '第一个小爽点/悬念'
    ],
    example: '女主要是被误会现场，男主霸气解围',
    suitableGenres: ['霸总', '复仇', '悬疑', '宫斗'],
    tips: [
      '冲突要有具体性，不要抽象矛盾',
      '主角立场要明确，让观众快速站队',
      '结尾留悬念钩子'
    ]
  },
  
  // 2. 反差开场：身份/地位反差
  CONTRAST: {
    name: '反差开场',
    description: '通过身份反差制造好奇和爽感预期',
    structure: [
      '低身份展示（外卖员/清洁工/实习生）',
      '隐藏身份暗示（眼神/小动作/旁人反应）',
      '冲突触发（被轻视/被欺负）',
      '反转预埋'
    ],
    example: '穿着外卖服的主角，眼神一冷，背景暗示其真实身份',
    suitableGenres: ['霸总', '复仇', '重生'],
    tips: [
      '反差要足够大，但不要夸张到假',
      '暗示要隐晦，让观众自己发现',
      '欺负者要足够讨厌，让观众期待打脸'
    ]
  },
  
  // 3. 悬念开场：抛出谜题
  SUSPENSE: {
    name: '悬念开场',
    description: '抛出谜题/秘密，引发追看欲',
    structure: [
      '悬念事件（凶案/失踪/秘密）',
      '主角介入（调查/目击/被卷入）',
      '第一线索',
      '危险暗示'
    ],
    example: '主角收到神秘快递，里面是与自己相关的绝密文件',
    suitableGenres: ['悬疑', '复仇', '都市'],
    tips: [
      '悬念要有个人关联性',
      '线索不要太明显，保持神秘感',
      '结尾要加深悬念而非直接解答'
    ]
  },
  
  // 4. 标签开场：直接展示主角核心标签
  LABEL: {
    name: '标签开场',
    description: '直接展示主角核心标签，快速立人设',
    structure: [
      '身份标签展示（工作/社会地位）',
      '能力标签展示（专业能力瞬间）',
      '性格标签展示（对他人态度）',
      '引出核心矛盾'
    ],
    example: '主角在手术室完美完成高难度手术，展现顶级医生身份',
    suitableGenres: ['甜宠', '都市', '复仇'],
    tips: [
      '标签展示要具体，不要空喊口号',
      '能力展示要有专业感',
      '性格展示要有细节支撑'
    ]
  },
  
  // 5. 危机开场：主角陷入危机
  CRISIS: {
    name: '危机开场',
    description: '主角陷入危机，激发同情和期待',
    structure: [
      '危机降临（被陷害/被追杀/绝境）',
      '主角应对（挣扎/反抗）',
      '关键人物出现/关键线索',
      '转机暗示'
    ],
    example: '主角被陷害入狱，在狱中发现关键证据',
    suitableGenres: ['复仇', '重生', '悬疑'],
    tips: [
      '危机要足够紧迫，让观众揪心',
      '主角应对要展现性格',
      '转机暗示要隐晦'
    ]
  },
  
  // 6. 期待开场：建立期待感
  EXPECTATION: {
    name: '期待开场',
    description: '建立对未来事件的期待感',
    structure: [
      '预告式开头（"三天后，一切将改变"）',
      '倒计时展示',
      '当前平静vs即将风暴对比',
      '关键人物/事件引入'
    ],
    example: '"三天后，他将失去一切——如果他不签下那份契约"',
    suitableGenres: ['霸总', '复仇', '都市'],
    tips: [
      '预告要足够吸引人',
      '倒计时要真实推动剧情',
      '不要滥用，会审美疲劳'
    ]
  }
};

// 根据题材推荐开场模板
export function recommendOpening(genre: string): string[] {
  const recommendations: Record<string, string[]> = {
    '霸总': ['CONFLICT', 'CONTRAST', 'EXPECTATION'],
    '甜宠': ['LABEL', 'CONFLICT', 'EXPECTATION'],
    '复仇': ['CRISIS', 'CONTRAST', 'SUSPENSE'],
    '重生': ['CONTRAST', 'CRISIS', 'EXPECTATION'],
    '悬疑': ['SUSPENSE', 'CRISIS', 'CONFLICT'],
    '宫斗': ['CONFLICT', 'CRISIS', 'SUSPENSE'],
    '穿越': ['CONTRAST', 'EXPECTATION', 'LABEL'],
    '都市': ['LABEL', 'CONFLICT', 'SUSPENSE']
  };
  
  return recommendations[genre] || ['CONFLICT', 'LABEL'];
}

// 开篇设计知识库导出
export const OPENING_KNOWLEDGE = {
  name: '开篇设计系统',
  description: '定义开篇黄金法则和6种标准开场模板',
  goldenRules: OPENING_GOLDEN_RULES,
  templates: OPENING_TEMPLATES,
  helpers: {
    recommendOpening
  }
};

export default OPENING_KNOWLEDGE;
