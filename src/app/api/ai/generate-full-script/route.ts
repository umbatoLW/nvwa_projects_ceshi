import { NextRequest, NextResponse } from "next/server";
import { getAIClient, LLMMessage } from "@/lib/ai-client";
import { loadKnowledgeForTask } from "@/lib/prompt-knowledge";
import { parseUserIdea, formatForbiddenPrompt, type ParsedIntent } from "@/lib/parse-user-idea";

/**
 * 三阶段剧本生成 API
 * 
 * 阶段一：核心对话（主对话流 + 关键台词）
 * 阶段二：完整大纲（人物关系 + 剧情骨架 + 四层反派）
 * 阶段三：逐集撰写（注入知识库 + 钩子设计 + 付费卡点）
 */

/**
 * 从用户创意中提取禁止/约束项
 * 识别格式：禁止xxx、不要xxx、避免xxx、不能xxx、不可以xxx
 */
function extractConstraints(idea: string): {
  effectiveForbidden: string[];  // 禁止项
  cleanIdea: string;    // 清理后的创意
} {
  const effectiveForbidden: string[] = [];
  
  // 匹配禁止项的模式（支持多行格式）
  // 格式1：禁止xxx（同一行）
  // 格式2：禁止：换行xxx（多行）
  const patterns = [
    /禁止[：:]\s*([\s\S]*?)(?=\n\n|要求|故事|创意|$)/gi,  // 多行格式：禁止：\n xxx
    /禁止([^，。！？,.\n]+)/g,                             // 同行格式：禁止xxx
    /不要([^，。！？,.\n]+)/g,
    /避免([^，。！？,.\n]+)/g,
    /不能([^，。！？,.\n]+)/g,
    /不可以([^，。！？,.\n]+)/g,
    /不允许([^，。！？,.\n]+)/g,
    /严禁([^，。！？,.\n]+)/g,
  ];
  
  let cleanIdea = idea;
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(idea)) !== null) {
      const constraint = match[1].trim();
      if (constraint && constraint.length < 50 && constraint.length > 0) {  // 放宽长度限制
        // 分割可能的多个禁止项（逗号、顿号、换行分隔）
        const items = constraint.split(/[，,、\n]/).map(s => s.trim()).filter(s => s);
        for (const item of items) {
          if (item && !effectiveForbidden.includes(item)) {
            effectiveForbidden.push(item);
          }
        }
        // 从创意中移除禁止语句，让创意更清晰
        cleanIdea = cleanIdea.replace(match[0], '').trim();
      }
    }
  }
  
  // 去重并过滤掉无效项
  const uniqueForbidden = [...new Set(effectiveForbidden)].filter(
    f => f.length > 0 && f.length < 30 && !['故事', '要求', '创意'].includes(f)
  );
  
  console.log('[约束提取] 原始创意:', idea);
  console.log('[约束提取] 提取的禁止项:', uniqueForbidden);
  console.log('[约束提取] 清理后的创意:', cleanIdea);
  
  return { effectiveForbidden: uniqueForbidden, cleanIdea };
}

/**
 * 从用户创意中推断题材
 * 识别关键词：古装、现代、都市、仙侠、玄幻、权谋、穿越等
 */
function inferGenreFromIdea(idea: string): string | null {
  const genreKeywords: Record<string, string[]> = {
    '古装': ['古装', '古代', '历史', '朝代', '皇帝', '皇后', '丞相', '将军', '武侠', '江湖'],
    '现代': ['现代', '都市', '职场', '公司', '白领', '创业'],
    '仙侠': ['仙侠', '修仙', '仙门', '宗门', '飞升', '渡劫'],
    '玄幻': ['玄幻', '异界', '魔法', '斗气', '武魂'],
    '权谋': ['权谋', '宫廷', '争权', '夺位', '政治', '权术'],
    '穿越': ['穿越', '重生', '回到', '来到'],
    '甜宠': ['甜宠', '恋爱', '爱情', '甜蜜', '宠妻'],
    '悬疑': ['悬疑', '推理', '探案', '破案', '谜团'],
  };
  
  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    for (const keyword of keywords) {
      if (idea.includes(keyword)) {
        return genre;
      }
    }
  }
  
  return null;
}

// 解析大纲文本为结构化数据
function parseOutlineText(outlineText: string): Array<{
  episode: number;
  title: string;
  summary: string;
  emotion?: string;
  hook?: string;
}> {
  const lines = outlineText.split('\n');
  const result: Array<{ episode: number; title: string; summary: string; emotion?: string; hook?: string }> = [];
  
  for (const line of lines) {
    // 匹配【第N集】标题 格式
    const match = line.match(/【第(\d+)集】\s*(.+)/);
    if (match) {
      const episode = parseInt(match[1], 10);
      const title = match[2].trim();
      result.push({ episode, title, summary: title });
    }
  }
  
  // 如果没有解析出任何集数，根据文本长度估算
  if (result.length === 0 && outlineText.length > 100) {
    const estimatedEpisodes = Math.ceil(outlineText.length / 500);
    for (let i = 1; i <= estimatedEpisodes; i++) {
      result.push({ episode: i, title: `第${i}集`, summary: outlineText.slice((i-1) * 500, i * 500) });
    }
  }
  
  return result;
}

// 阶段一：核心对话生成
async function generateCoreDialogue(
  client: ReturnType<typeof getAIClient>,
  params: {
    idea: string;
    genre?: string;
    style?: string;
    targetEpisodes: number;
    model?: string;
    effectiveForbidden?: string[];  // 从外部传入的禁止项
  },
  onProgress: (data: unknown) => void
): Promise<{
  title: string;
  coreDialogues: Array<{ episode: number; scene: string; dialogue: string; emotion: string }>;
  keyLines: string[];
}> {
  onProgress({ type: "progress", stage: "dialogue", message: "正在生成核心对话流..." });

  // 使用外部传入的禁止项，如果没有则从创意中提取
  const effectiveForbidden = params.effectiveForbidden && params.effectiveForbidden.length > 0 
    ? params.effectiveForbidden 
    : extractConstraints(params.idea).effectiveForbidden;
  const cleanIdea = params.idea;  // 外部已经清理过了
  
  // 【题材推断】从创意中推断题材（如果用户未指定）
  const inferredGenre = inferGenreFromIdea(params.idea);
  const effectiveGenre = params.genre || inferredGenre || "都市";
  
  // 【约束强化】构建禁止项提示
  const effectiveForbiddenPrompt = effectiveForbidden.length > 0 
    ? `\n\n## ⚠️ 严格禁止（必须遵守）
以下内容在剧本中**绝对禁止出现**，违反将导致生成失败：
${effectiveForbidden.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
    : '';
  
  // 加载知识库：题材指南 + 节奏曲线 + 开篇规范
  const knowledge = loadKnowledgeForTask("script-generate");

  const modelToUse = params.model || 'deepseek-v4-pro';
  
  const prompt: LLMMessage[] = [
    {
      role: "system",
      content: `你是一位专业短剧编剧，擅长从用户的创意想法中提炼核心冲突与角色关系，以紧凑节奏构建短剧的核心对话流，适配喜剧、生活、情感等多种短剧类型，确保对话精炼且推动剧情发展。

${knowledge}
${effectiveForbiddenPrompt}

## 任务
为${params.targetEpisodes}集短剧生成：
1. 每集的核心场景对话（不是完整剧本，而是最关键的3-5句对白）
2. 金句台词（观众会记住的台词）
3. 情绪标签（这段对话的情绪类型：甜/虐/爽/燃/悬）

## 输出格式（JSON）
{
  "title": "剧名",
  "coreDialogues": [
    {
      "episode": 1,
      "scene": "场景描述",
      "dialogue": "核心对白（A：xxx B：xxx）",
      "emotion": "甜/虐/爽/燃/悬"
    }
  ],
  "keyLines": ["金句1", "金句2", "金句3"]
}

## 要求
- 每集至少1个核心对话
- 金句要朗朗上口，观众会记住
- 情绪分布要合理：甜宠类甜>虐，逆袭类爽>虐
- **严格遵守禁止项**，不要尝试绕过或曲解用户的约束`,
    },
    {
      role: "user",
      content: `创意：${cleanIdea}
类型：${effectiveGenre}
风格：${params.style || "甜宠"}
集数：${params.targetEpisodes}集
${effectiveForbidden.length > 0 ? `\n⚠️ 再次提醒：严格禁止 ${effectiveForbidden.join('、')}` : ''}

请生成核心对话流。`,
    },
  ];

  let result = "";
  const stream = await client.chat.completions.create({
    model: modelToUse,
    messages: prompt,
    temperature: 0.8,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      result += content;
      // 阶段一生成 JSON 中间结果，不发送原始内容到前端
      // 只发送进度消息
      onProgress({ type: "progress", stage: "dialogue", message: "正在生成核心对话..." });
    }
  }

  try {
    const clean = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { title: "未命名剧本", coreDialogues: [], keyLines: [] };
  }
}

// 阶段二：完整大纲生成
async function generateFullOutline(
  client: ReturnType<typeof getAIClient>,
  params: {
    idea: string;
    genre?: string;
    style?: string;
    targetEpisodes: number;
    coreDialogue: { title: string; coreDialogues: unknown[]; keyLines: string[] };
    model?: string;
    effectiveForbidden?: string[];
  },
  onProgress: (data: unknown) => void
): Promise<{
  title: string;
  genre: string;
  logline: string;
  mainCharacters: Array<{ name: string; role: string; description: string; arc: string }>;
  villains: Array<{ layer: number; name: string; role: string; motivation: string; defeatEpisode: number }>;
  episodes: Array<{
    episode: number;
    title: string;
    summary: string;
    emotionBeat: string;
    hookType: string;
    isPaywall?: boolean;
  }>;
}> {
  onProgress({ type: "progress", stage: "outline", message: "正在生成完整大纲..." });

  const modelToUse = params.model || 'deepseek-v4-pro';

  // 【约束提取】优先使用解析结果，否则从创意中提取
  const extractResult = extractConstraints(params.idea);
  const effectiveForbidden = params.effectiveForbidden && params.effectiveForbidden.length > 0
    ? params.effectiveForbidden
    : extractResult.effectiveForbidden;
  const cleanIdea = extractResult.cleanIdea || params.idea;
  
  // 【题材推断】从创意中推断题材（如果用户未指定）
  const inferredGenre = inferGenreFromIdea(params.idea);
  const effectiveGenre = params.genre || inferredGenre || "都市";
  
  // 【约束强化】构建禁止项提示
  const effectiveForbiddenPrompt = effectiveForbidden.length > 0 
    ? `\n\n## ⚠️ 严格禁止（必须遵守）
以下内容在剧本中**绝对禁止出现**，违反将导致生成失败：
${effectiveForbidden.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
    : '';

  // 加载知识库
  const knowledge = loadKnowledgeForTask("outline-create");

  const prompt: LLMMessage[] = [
    {
      role: "system",
      content: `你是一位经验丰富的专业短剧编剧，擅长通过核心对话流构建紧凑且富有张力的剧本，注重人物性格塑造与情节推进的节奏感，以生动的场景描写和贴合生活的语言风格创作短剧（60-90秒/集为宜），确保故事在短时间内具备吸引力、冲突性和情感共鸣点，生成完整的剧本大纲。

${knowledge}
${effectiveForbiddenPrompt}

## 任务
生成包含以下元素的大纲：
1. 人物设定（主角 + 配角 + 四层反派）
2. 每集概要（包含情绪节拍、钩子类型、角色认知状态）
3. 付费卡点位置（10-15%的集数）

## ⚠️ summary写作要求（重要）
每集的summary必须是简洁的剧情概要（50字以内）：
- 写清楚：本集发生什么事、推进什么剧情、解决什么问题
- 不要文艺描写、不要抒情、不要比喻
- 示例："女主发现爷爷的军功章，质问爷爷为何隐瞒身份，爷爷讲述当年战场救人的故事。"

## 输出格式（JSON）
{
  "title": "剧名",
  "genre": "类型",
  "logline": "一句话简介",
  "mainCharacters": [
    {"name": "角色名", "role": "主角/配角", "description": "描述", "arc": "人物弧光"}
  ],
  "villains": [
    {"layer": 1, "name": "反派名", "role": "关系", "motivation": "动机", "defeatEpisode": 20}
  ],
  "episodes": [
    {
      "episode": 1,
      "title": "标题",
      "summary": "简洁剧情概要（50字以内）：本集发生什么事、推进什么剧情、解决什么问题、埋下什么伏笔。不要文艺描写。",
      "emotionBeat": "甜/虐/爽/燃/悬",
      "hookType": "情绪/悬念/危机/信息/反转",
      "isPaywall": false,
      "characterKnowledge": {
        "角色名": ["该角色在本集结束时已知的事实1", "已知的事实2"]
      },
      "revealedFacts": ["本集向观众/角色揭示的新事实"]
    }
  ]
}

## 角色认知一致性规则（必须遵守）
1. 每集的 characterKnowledge 必须继承上一集的所有认知
2. 第N集的认知 = 第N-1集认知 + 第N集新增认知
3. 角色只能对"本集新揭示"的事实表示惊讶
4. 角色对"上一集已知道"的事实不得表现出惊讶或疑惑

示例：
- 第1集：女主说出"爷爷收养了18个孤儿" → characterKnowledge.女主包含"爷爷收养18孤儿"
- 第2集：女主不能对"爷爷收养18孤儿"表示惊讶（她第1集就知道了）
- 第2集：女主可以对"爷爷有一等功军功章"表示惊讶（这是新事实）

- **严格遵守禁止项**，不要尝试绕过或曲解用户的约束`,
    },
    {
      role: "user",
      content: `创意：${cleanIdea}
类型：${effectiveGenre}
风格：${params.style || "甜宠"}
集数：${params.targetEpisodes}集
${effectiveForbidden.length > 0 ? `\n⚠️ 再次提醒：严格禁止 ${effectiveForbidden.join('、')}` : ''}

核心对话流（已生成）：
${JSON.stringify(params.coreDialogue, null, 2)}

请生成完整大纲（必须生成${params.targetEpisodes}集，不能多不能少）。`,
    },
  ];

  let result = "";
  const stream = await client.chat.completions.create({
    model: modelToUse,
    messages: prompt,
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      result += content;
      // 阶段二生成 JSON 中间结果，不发送原始内容到前端
      // 只发送进度消息
      onProgress({ type: "progress", stage: "outline", message: "正在生成完整大纲..." });
    }
  }

  try {
    const clean = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    console.log('[大纲生成] 原始结果长度:', result.length, '清理后长度:', clean.length);
    
    // 检查 JSON 是否完整（简单检查）
    const hasClosingBrace = clean.trim().endsWith('}');
    const hasEpisodes = clean.includes('"episodes"');
    console.log('[大纲生成] JSON完整性检查:', { hasClosingBrace, hasEpisodes });
    
    const outline = JSON.parse(clean);
    console.log('[大纲生成] 解析成功:', { 
      title: outline.title, 
      episodeCount: outline.episodes?.length,
      targetEpisodes: params.targetEpisodes,
      hasMainCharacters: !!outline.mainCharacters?.length 
    });
    
    // 【强制验证】确保 episodes 存在
    if (!outline.episodes) {
      outline.episodes = [];
      console.log('[大纲生成] 警告: episodes 不存在，已初始化为空数组');
    }
    
    // 【强制截断】验证并修正集数
    const originalCount = outline.episodes.length;
    if (originalCount !== params.targetEpisodes) {
      if (originalCount > params.targetEpisodes) {
        // 截断多余的集数
        outline.episodes = outline.episodes.slice(0, params.targetEpisodes);
        console.log(`[大纲生成] ⚠️ 集数超出目标，已强制截断: ${originalCount} -> ${params.targetEpisodes}`);
        // 发送警告到前端
        onProgress({
          type: "validation_warning",
          stage: "outline",
          message: `大纲生成了${originalCount}集，已自动截断为目标${params.targetEpisodes}集`,
        });
      } else {
        console.log(`[大纲生成] ⚠️ 警告: 生成的集数(${originalCount})少于目标(${params.targetEpisodes})`);
      }
    } else {
      console.log(`[大纲生成] ✅ 集数验证通过: ${params.targetEpisodes}集`);
    }
    
    // 大纲一致性检查与自动修复
    const validationResult = validateOutlineConsistency(outline);
    if (validationResult.hasIssues) {
      console.log('[大纲一致性检查] 发现问题:', validationResult.issues);
      // 自动修复
      const fixedOutline = fixOutlineConsistency(outline, validationResult);
      console.log('[大纲一致性检查] 已自动修复');
      
      // 发送警告到前端
      onProgress({
        type: "validation_warning",
        stage: "outline",
        message: `大纲一致性检查发现${validationResult.issues.length}个问题，已自动修复`,
        issues: validationResult.issues,
      });
      
      return fixedOutline;
    }
    
    return outline;
  } catch (parseError) {
    console.error('[大纲生成] JSON解析失败:', parseError);
    console.error('[大纲生成] 原始结果前500字符:', result.slice(0, 500));
    return {
      title: params.coreDialogue.title || "未命名剧本",
      genre: params.genre || "都市",
      logline: "",
      mainCharacters: [],
      villains: [],
      episodes: [],
    };
  }
}

/**
 * 大纲一致性检查
 * 检查 characterKnowledge 是否正确继承
 */
function validateOutlineConsistency(outline: {
  episodes: Array<{
    episode: number;
    title: string;
    summary: string;
    characterKnowledge?: Record<string, string[]>;
    revealedFacts?: string[];
  }>;
}): {
  hasIssues: boolean;
  issues: Array<{
    episode: number;
    type: 'missing_inheritance' | 'missing_field';
    character: string;
    missingFacts: string[];
    description: string;
  }>;
} {
  const issues: Array<{
    episode: number;
    type: 'missing_inheritance' | 'missing_field';
    character: string;
    missingFacts: string[];
    description: string;
  }> = [];

  // 计算累积认知并检查每集是否正确继承
  let accumulatedKnowledge: Record<string, string[]> = {};

  for (let i = 0; i < outline.episodes.length; i++) {
    const ep = outline.episodes[i];
    const epKnowledge = ep.characterKnowledge || {};

    // 检查当前集是否继承了上一集的所有认知
    for (const [character, prevFacts] of Object.entries(accumulatedKnowledge)) {
      const currFacts = epKnowledge[character] || [];
      
      // 找出缺失的事实
      const missingFacts = prevFacts.filter(fact => !currFacts.includes(fact));
      
      if (missingFacts.length > 0) {
        issues.push({
          episode: ep.episode,
          type: 'missing_inheritance',
          character,
          missingFacts,
          description: `第${ep.episode}集的 ${character} 遗漏了上一集的认知: ${missingFacts.join(', ')}`,
        });
      }
    }

    // 检查 characterKnowledge 字段是否存在
    if (!ep.characterKnowledge || Object.keys(epKnowledge).length === 0) {
      issues.push({
        episode: ep.episode,
        type: 'missing_field',
        character: '',
        missingFacts: [],
        description: `第${ep.episode}集缺少 characterKnowledge 字段`,
      });
    }

    // 更新累积认知（当前集的认知 = 累积认知 + 本集新增）
    for (const [character, facts] of Object.entries(epKnowledge)) {
      if (!accumulatedKnowledge[character]) {
        accumulatedKnowledge[character] = [];
      }
      // 合并并去重
      accumulatedKnowledge[character] = [
        ...new Set([...accumulatedKnowledge[character], ...facts])
      ];
    }
  }

  return {
    hasIssues: issues.length > 0,
    issues,
  };
}

/**
 * 自动修复大纲一致性问题
 */
function fixOutlineConsistency(
  outline: {
    title: string;
    genre: string;
    logline: string;
    mainCharacters: Array<{ name: string; role: string; description: string; arc: string }>;
    villains: Array<{ layer: number; name: string; role: string; motivation: string; defeatEpisode: number }>;
    episodes: Array<{
      episode: number;
      title: string;
      summary: string;
      emotionBeat: string;
      hookType: string;
      isPaywall?: boolean;
      characterKnowledge?: Record<string, string[]>;
      revealedFacts?: string[];
    }>;
  },
  validationResult: ReturnType<typeof validateOutlineConsistency>
): typeof outline {
  // 计算每集应有的累积认知
  let accumulatedKnowledge: Record<string, string[]> = {};

  const fixedEpisodes = outline.episodes.map((ep, index) => {
    // 获取当前集的认知
    let epKnowledge = ep.characterKnowledge ? { ...ep.characterKnowledge } : {};

    // 补充遗漏的继承认知
    for (const [character, prevFacts] of Object.entries(accumulatedKnowledge)) {
      if (!epKnowledge[character]) {
        epKnowledge[character] = [];
      }
      // 添加上一集的所有认知
      for (const fact of prevFacts) {
        if (!epKnowledge[character].includes(fact)) {
          epKnowledge[character].push(fact);
        }
      }
    }

    // 更新累积认知
    for (const [character, facts] of Object.entries(epKnowledge)) {
      if (!accumulatedKnowledge[character]) {
        accumulatedKnowledge[character] = [];
      }
      accumulatedKnowledge[character] = [
        ...new Set([...accumulatedKnowledge[character], ...facts])
      ];
    }

    return {
      ...ep,
      characterKnowledge: epKnowledge,
    };
  });

  return {
    ...outline,
    episodes: fixedEpisodes,
  };
}

// 方案A：剧本生成后一致性检查
interface EpisodeCheckResult {
  hasIssue: boolean;
  issues: Array<{
    character: string;
    issue: string;
    context?: string;
  }>;
}

/**
 * 检查单集剧本是否存在逻辑矛盾
 * 在每集生成完成后调用，作为二次保障
 */
function checkEpisodeConsistency(
  episodeContent: string,
  accumulatedKnowledge: Record<string, string[]>,
  episodeNum: number
): EpisodeCheckResult {
  const issues: EpisodeCheckResult['issues'] = [];
  
  // 如果没有累积认知，跳过检查
  if (Object.keys(accumulatedKnowledge).length === 0) {
    return { hasIssue: false, issues: [] };
  }
  
  // 检查每种角色的已知事实
  for (const [character, facts] of Object.entries(accumulatedKnowledge)) {
    const uniqueFacts = [...new Set(facts)];
    
    for (const fact of uniqueFacts) {
      // 提取事实的关键词（用于匹配）
      const keywords = extractKeywords(fact);
      
      // 检查角色是否对该事实表现出惊讶
      const surprisePatterns = [
        new RegExp(`${character}[^】]*？[^】]*(什么|怎么会|不可能|真的吗)`, 'g'),
        new RegExp(`${character}[^】]*(惊讶|震惊|瞪大眼|愣住|颤抖)[^】]*什么`, 'g'),
        new RegExp(`${character}[^】]*["""]([^"""]*什么[^"""]*)["""]`, 'g'),
      ];
      
      // 检查是否有惊讶表达，且该惊讶与已知事实相关
      for (const pattern of surprisePatterns) {
        const matches = episodeContent.match(pattern);
        if (matches && matches.length > 0) {
          // 检查惊讶是否与已知事实相关
          for (const match of matches) {
            const matchKeywords = extractKeywords(match);
            const overlap = keywords.some(k => matchKeywords.includes(k));
            
            if (overlap) {
              issues.push({
                character,
                issue: `对已知事实"${fact}"表现出惊讶`,
                context: match.substring(0, 50) + '...',
              });
            }
          }
        }
      }
    }
  }
  
  return {
    hasIssue: issues.length > 0,
    issues,
  };
}

/**
 * 从文本中提取关键词
 */
function extractKeywords(text: string): string[] {
  // 移除标点符号，分词
  const cleaned = text.replace(/[，。！？、；：""''【】《》—…\s]/g, ' ');
  
  // 提取2-4字的关键词
  const keywords: string[] = [];
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2 && w.length <= 4);
  keywords.push(...words);
  
  // 提取包含特定关键词的短语
  const importantPatterns = [
    /收养[零九十百\d]+孤儿/g,
    /一等功/g,
    /捡破烂/g,
    /[零九十百\d]+个孩子/g,
    /[零九十百\d]+个孤儿/g,
  ];
  
  for (const pattern of importantPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  }
  
  return [...new Set(keywords)];
}

// 阶段三：逐集撰写
async function writeEpisode(
  client: ReturnType<typeof getAIClient>,
  params: {
    episode: number;
    outline: {
      title: string;
      mainCharacters: Array<{ name: string; role: string; description: string; arc: string }>;
      episodes: Array<{
        episode: number;
        title: string;
        summary: string;
        emotionBeat: string;
        hookType: string;
        isPaywall?: boolean;
        characterKnowledge?: Record<string, string[]>;
        revealedFacts?: string[];
      }>;
    };
    coreDialogue: { coreDialogues: Array<{ episode: number; scene: string; dialogue: string; emotion: string }>; keyLines: string[] };
    previousEpisodes: string[];
    wordsPerEpisode: number;
    model?: string;
  },
  onProgress: (data: unknown) => void
): Promise<string> {
  onProgress({
    type: "progress",
    stage: "writing",
    episode: params.episode,
    message: `正在撰写第${params.episode}集...`,
  });

  const modelToUse = params.model || 'deepseek-v4-pro';

  // 加载知识库
  const knowledge = loadKnowledgeForTask("episode-write");

  // 找到当前集的核心对话
  const coreDialogue = params.coreDialogue.coreDialogues.find((d) => d.episode === params.episode);

  // 找到当前集的大纲
  const episodeOutline = params.outline.episodes.find((e) => e.episode === params.episode);

  // 计算当前集在整剧中的位置（用于节奏控制）
  const totalEpisodes = params.outline.episodes.length;
  const positionRatio = params.episode / totalEpisodes;
  const stageName = positionRatio <= 0.15 ? "起势阶段" :
                    positionRatio <= 0.45 ? "攀升阶段" :
                    positionRatio <= 0.80 ? "风暴阶段" : "决战阶段";

  // 钩子类型轮换（避免连续使用同类型钩子）
  const hookTypes = ["情绪钩", "危机钩", "信息钩", "反转钩", "悬念钩"];
  const hookType = hookTypes[(params.episode - 1) % hookTypes.length];

  // 计算累积的角色认知状态（从第1集到上一集）
  const accumulatedKnowledge: Record<string, string[]> = {};
  if (params.outline.episodes) {
    for (let i = 0; i < params.episode - 1; i++) {
      const ep = params.outline.episodes[i];
      if (ep?.characterKnowledge) {
        for (const [character, facts] of Object.entries(ep.characterKnowledge)) {
          if (!accumulatedKnowledge[character]) {
            accumulatedKnowledge[character] = [];
          }
          accumulatedKnowledge[character].push(...(facts as string[]));
        }
      }
    }
  }

  // 本集新增认知（用于判断哪些是新事实）
  const newKnowledgeThisEpisode = episodeOutline?.characterKnowledge || {};

  // 构建角色认知约束提示
  let characterConstraintPrompt = "";
  if (Object.keys(accumulatedKnowledge).length > 0) {
    characterConstraintPrompt = `
## 【强制执行】角色认知一致性约束

### 截至上一集，各角色已知事实：
${Object.entries(accumulatedKnowledge)
  .map(([character, facts]) => `- ${character}：${[...new Set(facts)].join("、")}`)
  .join("\n")}

### 一致性规则（必须遵守）：
1. 角色对"上一集已知"的事实，**不得表现出惊讶、疑惑或不知道**
2. 角色只能对"本集新揭示"的事实表示惊讶
3. 本集新事实：${Object.entries(newKnowledgeThisEpisode)
  .map(([c, facts]) => `${c}得知【${(facts as string[]).join("、")}】`)
  .join("；") || "无特定新事实"}

### 违反示例（禁止出现）：
❌ 错误：第1集女主说"爷爷收养了18个孤儿"，第2集女主听到同样信息时惊讶说"什么？"
✅ 正确：第2集女主对新信息（如"爷爷有一等功"）表示惊讶，对已知信息保持平静
`;
  }

  const prompt: LLMMessage[] = [
    {
      role: "system",
      content: `你是一位专业短剧编剧，拥有丰富的短剧创作经验，擅长根据用户提供的大纲和核心对话，创作结构完整、情节紧凑、对话生动的短剧剧本。你能够精准把握短剧的叙事节奏，塑造鲜明的角色形象，并通过场景描写和细节补充，让剧本具备强烈的画面感和感染力，适配短剧时长需求，撰写完整的剧本内容。

${knowledge}
${characterConstraintPrompt}
## 【强制执行】知识库核心规则

### ⚠️ 最高优先级：主体客体一致性（违反必失败！）

**核心规则：任何动作/事件必须明确"谁做了什么对谁"，绝不能混淆执行者和承受者！**

#### 典型错误案例（绝对禁止）：
❌ 场景：司马光砸缸救出上官婉儿
❌ 台词：司马光说"救命之恩，当以身相许——但我是被救的那个啊..."
❌ 错误原因：司马光是救人者，台词却说他自己是"被救的那个"——主体客体完全颠倒！

#### 正确示例：
✅ 场景：司马光砸缸救出上官婉儿
✅ 司马光台词：姑娘，你没事吧？我救你出来了。
✅ 上官婉儿台词：你救了我？那你得负责！砸了我的缸，赔我一个相公！
✅ 正确原因：司马光是救人者，上官婉儿是被救者，台词正确反映关系

#### 生成前自检（必须执行）：
在生成每句台词前，检查：
1. 这个动作是谁做的？（执行者）
2. 这个动作对谁做的？（承受者）
3. 台词中的"我/你/他"是否正确对应执行者/承受者？
4. 如果台词中执行者说自己是承受者 → 立即修正！

### 爽感要素配比（严格执行）
- 甜宠/感动：30-40%（温馨、治愈、心动）
- 虐心/紧张：20-25%（误会、分离、危机）
- 打脸/逆袭：10-15%（反击、翻盘、爽点）
- 搞笑/轻松：10-15%（调节气氛、轻快节奏）
- 悬疑/反转：5-10%（伏笔、揭秘）

### 钩子类型轮换（严格执行）
连续3集不能使用同类型钩子，5种钩子轮换使用：
- 情绪钩：情感冲击（泪水、心动、心疼）
- 危机钩：突发危险（车祸、绑架、意外）
- 信息钩：关键揭秘（身份、真相、秘密）
- 反转钩：认知颠覆（好人变坏、敌变友）
- 悬念钩：未解之谜（消失、伏笔、暗示）

### 四段式节奏（严格执行）
- 起势阶段（1-15%）：铺垫人物、建立关系、埋下伏笔
- 攀升阶段（15-45%）：矛盾升级、小高潮频出、情感推进
- 风暴阶段（45-80%）：核心冲突爆发、大反派对决、情感大起大落
- 决战阶段（80-100%）：终极清算、所有伏笔回收、大结局

### 对话要求（短剧核心）
- 对话占比≥60%，减少画外音/OS
- 每句对白≤30字（短句更有力）
- 动作+对白结合（▶人物（动作）：对白）

## 严格执行：剧本输出格式
[场景1] 内/外 | 地点 | 日/夜
[人物] 人物A  人物B
▶人物A（动作）：对白内容
▶人物B（动作）：对白内容

## 当前集特殊要求
- 第${params.episode}集 / 共${totalEpisodes}集（${stageName}，位置${Math.round(positionRatio * 100)}%）
- 每集${params.wordsPerEpisode}字左右
- 保持人物性格一致性
- 本集钩子类型：${hookType}（严禁使用其他类型钩子！）
- 本集情绪节拍：${episodeOutline?.emotionBeat || "推进"}
${episodeOutline?.isPaywall ? "- 本集是付费卡点，在情绪最高点截断" : ""}
${positionRatio <= 0.15 ? "- 【起势阶段】重点铺垫人物关系，埋下核心伏笔" : ""}
${positionRatio > 0.15 && positionRatio <= 0.45 ? "- 【攀升阶段】制造小高潮，矛盾升级，推进情感" : ""}
${positionRatio > 0.45 && positionRatio <= 0.80 ? "- 【风暴阶段】核心冲突爆发，情感大起大落" : ""}
${positionRatio > 0.80 ? "- 【决战阶段】终极清算，伏笔回收，大结局" : ""}`,
    },
    {
      role: "user",
      content: `剧名：${params.outline.title}
第${params.episode}集标题：${episodeOutline?.title || "未命名"}
本集概要：${episodeOutline?.summary || "推进主线剧情"}
主要人物：${params.outline.mainCharacters.map((c) => `${c.name}(${c.description})`).join("、")}

核心对话（必须包含）：
${coreDialogue ? `场景：${coreDialogue.scene}\n对白：${coreDialogue.dialogue}` : "（无特定核心对话，按概要发挥）"}

金句台词（可选使用）：
${params.coreDialogue.keyLines.slice(0, 3).join(" / ")}

${params.previousEpisodes.length > 0 ? `前文回顾（第${Math.max(1, params.episode - 1)}集结尾）：\n${params.previousEpisodes[params.previousEpisodes.length - 1].slice(-500)}` : ""}

## ⚠️ 输出要求（最重要）
1. 只输出剧本正文内容，不要输出任何验证、检查、说明内容
2. 不要输出"✅ 严格执行校验"或类似的自我检查内容
3. 不要输出"> "开头的说明性文字
4. 输出格式：
   【第X集】标题
   ══════════════════════════════
   [场景1] ...
   ▶人物（动作）：对白
   ...
   ——第X集·完——

请撰写第${params.episode}集完整剧本（只输出剧本，不要任何额外内容）。`,
    },
  ];

  let result = "";
  const stream = await client.chat.completions.create({
    model: modelToUse,
    messages: prompt,
    temperature: 0.55, // 降低温度，让AI更严格遵循知识库规则
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      result += content;
      onProgress({
        type: "progress",
        stage: "writing",
        episode: params.episode,
        content,
      });
    }
  }

  // 方案A：剧本生成后一致性检查（二次保障）
  const checkResult = checkEpisodeConsistency(result, accumulatedKnowledge, params.episode);
  if (checkResult.hasIssue) {
    onProgress({
      type: "episode_check_warning",
      episode: params.episode,
      issues: checkResult.issues,
      message: `第${params.episode}集发现潜在逻辑问题，已生成但建议检查`,
    });
  }

  return result;
}

/**
 * 主入口：三阶段剧本生成
 */
export async function POST(request: NextRequest) {
  try {
    const {
      idea, // 一句话创意
      outline, // 剧本大纲（可选，跳过阶段二）
      targetEpisodes = 3, // 目标集数（默认3集，短剧）
      targetWords: inputTargetWords, // 每集字数（可选，会根据 creativeMode 自动计算）
      creativeMode = 'short', // 创作模式：short=短剧, medium=中剧, long=长剧
      genre, // 类型
      style, // 风格
      startFromEpisode, // 从第几集开始（续写用）
      existingScript, // 已有剧本（续写用）
      episodesToWrite, // 每次续写集数（可选，默认3集，最多10集）
      model = 'deepseek-v4-pro', // 用户选择的模型，默认 deepseek-v4-pro
    } = await request.json();

    // 根据创作模式计算每集字数（如果未手动指定）
    // 短剧：60-90秒/集 ≈ 400字
    // 中剧：2-3分钟/集 ≈ 1000字
    // 长剧：5-8分钟/集 ≈ 2000字
    const getTargetWordsByMode = (mode: string): number => {
      switch (mode) {
        case 'short': return 400;   // 短剧：60-90秒/集
        case 'medium': return 1000; // 中剧：2-3分钟/集
        case 'long': return 2000;   // 长剧：5-8分钟/集
        default: return 400;
      }
    };
    const targetWords = inputTargetWords || getTargetWordsByMode(creativeMode);

    if (!idea && !outline) {
      return NextResponse.json({ error: "请提供创意或大纲" }, { status: 400 });
    }

    // ========== AI 语义理解：解析用户意图 ==========
    // 使用 AI 理解用户输入，提取题材、风格、约束、禁止项等
    const parsedIdea = await parseUserIdea(idea || (typeof outline === 'string' ? outline : JSON.stringify(outline)));
    console.log('[AI语义理解] 解析结果:', {
      genre: parsedIdea.genre,
      subGenre: parsedIdea.subGenre,
      effectiveForbidden: parsedIdea.effectiveForbidden,
      confidence: parsedIdea.confidence
    });

    // 使用解析结果
    const effectiveGenre = genre || parsedIdea.genre || '都市';
    const effectiveStyle = style || parsedIdea.styles?.join('、') || '甜宠';
    const effectiveForbidden = parsedIdea.effectiveForbidden;

    const client = getAIClient();
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // ========== 判断是否续写 ==========
          const isContinuation = !!(startFromEpisode && startFromEpisode > 1) || !!(existingScript && existingScript.length > 0);
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let coreDialogue: any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let fullOutline: any;

          if (isContinuation && outline) {
            // 续写模式：跳过阶段一和阶段二，直接使用已有大纲
            send({ type: "stage", stage: 1, name: "核心对话生成（跳过）" });
            send({ type: "stage_complete", stage: 1, data: { skipped: true, message: "使用已有核心对话" } });
            
            send({ type: "stage", stage: 2, name: "完整大纲生成（跳过）" });
            // 解析已有大纲 - 支持 JSON 字符串和纯文本两种格式
            if (typeof outline === 'string') {
              // 尝试解析 JSON
              if (outline.trim().startsWith('{') || outline.trim().startsWith('[')) {
                try {
                  fullOutline = JSON.parse(outline);
                  console.log('[续写] 大纲从 JSON 解析成功', { 
                    hasEpisodes: !!fullOutline.episodes,
                    episodesCount: fullOutline.episodes?.length 
                  });
                } catch {
                  // JSON 解析失败，尝试文本解析
                  fullOutline = parseOutlineText(outline);
                }
              } else {
                // 纯文本格式
                fullOutline = parseOutlineText(outline);
              }
            } else {
              fullOutline = outline;
            }
            
            // 【续写时也进行大纲一致性检查】
            const outlineValidation = validateOutlineConsistency(fullOutline);
            if (outlineValidation.hasIssues) {
              console.log('[续写] 大纲一致性检查发现问题，自动修复');
              fullOutline = fixOutlineConsistency(fullOutline, outlineValidation);
              send({
                type: "validation_warning",
                stage: "outline_continuation",
                message: "续写时发现大纲认知继承问题，已自动修复",
                details: outlineValidation.issues.slice(0, 3),
                fixed: true
              });
            }
            
            send({ type: "stage_complete", stage: 2, data: { skipped: true, outline: fullOutline } });
            
            // 构造默认核心对话（续写时需要符合 writeEpisode 的结构）
            coreDialogue = {
              title: fullOutline.title || "续写剧本",
              genre: fullOutline.genre || genre || "都市",
              mainCharacters: fullOutline.mainCharacters || [],
              coreScenes: [],
              // writeEpisode 需要的字段
              coreDialogues: fullOutline.episodes?.map((ep: { episode: number; title: string; summary: string }) => ({
                episode: ep.episode,
                scene: ep.title,
                dialogue: "（续写，无核心对话）",
                emotion: "推进",
              })) || [],
              keyLines: [],
            };
          } else {
            // ========== 阶段一：核心对话 ==========
            send({ type: "stage", stage: 1, name: "核心对话生成" });

            coreDialogue = await generateCoreDialogue(
              client,
              { 
                idea: parsedIdea.cleanIdea || idea || outline, 
                genre: effectiveGenre, 
                style: effectiveStyle, 
                targetEpisodes, 
                model,
                effectiveForbidden: effectiveForbidden,
              },
              send
            );

            send({
              type: "stage_complete",
              stage: 1,
              data: coreDialogue,
            });

            // ========== 阶段二：完整大纲 ==========
            send({ type: "stage", stage: 2, name: "完整大纲生成" });

            fullOutline = await generateFullOutline(
              client,
              { 
                idea: parsedIdea.cleanIdea || idea || outline, 
                genre: effectiveGenre, 
                style: effectiveStyle, 
                targetEpisodes, 
                coreDialogue, 
                model,
                effectiveForbidden: effectiveForbidden,
              },
              send
            );

            // 【调试日志】发送大纲前确认数据完整性
            console.log('[大纲发送] stage_complete 发送前', {
              title: fullOutline?.title,
              genre: fullOutline?.genre,
              loglinePreview: fullOutline?.logline?.substring?.(0, 50),
              episodeCount: fullOutline?.episodes?.length,
              mainCharacterCount: fullOutline?.mainCharacters?.length,
              villainCount: fullOutline?.villains?.length,
              keys: fullOutline ? Object.keys(fullOutline) : [],
            });

            send({
              type: "stage_complete",
              stage: 2,
              data: fullOutline,
            });
          }

          // ========== 阶段三：逐集撰写 ==========
          send({ type: "stage", stage: 3, name: "逐集撰写" });

          const fullScript: string[] = existingScript || [];
          // 使用自定义续写集数，最多10集，默认3集
          const episodesToGenerate = Math.min(episodesToWrite || 3, 10, targetEpisodes);
          const startEpisode = startFromEpisode || 1;
          const endEpisode = Math.min(startEpisode + episodesToGenerate - 1, targetEpisodes);
          
          // 【日志】循环参数
          console.log('[续写] 逐集撰写参数', {
            startEpisode,
            endEpisode,
            episodesToGenerate,
            targetEpisodes,
            existingScriptLength: fullScript.length,
            willLoop: startEpisode <= endEpisode,
          });

          for (let ep = startEpisode; ep <= endEpisode; ep++) {
            console.log('[续写] 开始生成第', ep, '集');
            const episodeScript = await writeEpisode(
              client,
              {
                episode: ep,
                outline: fullOutline,
                coreDialogue,
                previousEpisodes: fullScript,
                wordsPerEpisode: targetWords,
                model,
              },
              send
            );

            // 清理 AI 可能自己添加的【第X集】格式，避免重复
            const cleanedScript = episodeScript.replace(/^【第\d+集】[^\n]*\n?/g, '').trim();
            const episodeTitle = fullOutline.episodes[ep - 1]?.title || "";
            const formatted = `\n\n══════════════════════════════\n【第${ep}集】${episodeTitle}\n══════════════════════════════\n\n${cleanedScript}`;
            fullScript.push(formatted);

            send({
              type: "episode_complete",
              episode: ep,
              script: formatted,
            });
          }

          // ========== 返回完整结果 ==========
          // 添加剧名标题
          const scriptTitle = `《${fullOutline.title || "剧本"}》\n\n`;
          const fullScriptText = scriptTitle + fullScript.join("\n\n");
          
          // 【修复】正确计算已生成的集数：使用 endEpisode 而非数组长度
          // endEpisode 是本次生成结束的集数，代表当前已生成的最大集数
          const actualGeneratedEpisodes = endEpisode;
          
          send({
            type: "complete",
            data: {
              title: fullOutline.title,
              genre: fullOutline.genre,
              logline: fullOutline.logline,
              mainCharacters: fullOutline.mainCharacters,
              villains: fullOutline.villains,
              outline: fullOutline,
              coreDialogue,
              script: fullScriptText,
              generatedEpisodes: actualGeneratedEpisodes,
              totalEpisodes: targetEpisodes,
              paywallEpisodes: fullOutline.episodes?.filter((e: { isPaywall?: boolean }) => e.isPaywall).map((e: { episode: number }) => e.episode) || [],
            },
          });

          controller.close();
        } catch (error) {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "剧本生成失败",
          });
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Generate script error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generate script failed" },
      { status: 500 }
    );
  }
}
