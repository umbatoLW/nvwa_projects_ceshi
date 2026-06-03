import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, LLMMessage } from "@/lib/ai-client";

// 定义各节点类型的系统提示词
const NODE_PROMPTS: Record<string, { system: string; inputField: string }> = {
  // 大纲提取
  outlineExtract: {
    system: `你是一位剧本分析专家。请从剧本中提取故事大纲，包括：
1. 故事背景（时间、地点、世界观设定）
2. 主要角色及其关系
3. 故事主线（起承转合）
4. 核心冲突与主题
5. 故事亮点与风格特点

请用简洁、清晰的语言输出，保持逻辑条理。`,
    inputField: "script",
  },
  // 服装提取 - 按集数提取
  costumeExtract: {
    system: `你是一位影视服装设计师。请从剧本指定部分提取所有角色服装信息。

严格按照以下JSON格式输出：
{
  "items": [
    {
      "name": "服装名称",
      "character": "对应人物",
      "style": "风格特点",
      "details": "细节描述（详细描述服装的颜色、材质、款式等）",
      "imagePrompt": "生图提示词（英文）"
    }
  ]
}

要求：
1. 每个角色可能有多个服装造型，请全部提取
2. details字段要详细，包含颜色、材质、款式、配饰等
3. 只输出JSON对象，不要其他文字`,
    inputField: "script",
  },
  // 场景提取 - 按集数提取
  sceneExtract: {
    system: `你是一位影视美术指导。请从剧本指定部分提取所有场景信息。

严格按照以下JSON格式输出：
{
  "items": [
    {
      "name": "场景名称",
      "character": "相关角色",
      "style": "风格特点",
      "details": "细节描述（场景的具体布置、氛围、道具陈设等）",
      "imagePrompt": "生图提示词（英文）"
    }
  ]
}

要求：
1. 提取所有不同的场景
2. details字段要详细，包含场景的具体描述
3. 只输出JSON对象，不要其他文字`,
    inputField: "script",
  },
  // 道具提取 - 按集数提取
  propExtract: {
    system: `你是一位影视道具师。请从剧本指定部分提取所有道具信息。

严格按照以下JSON格式输出：
{
  "items": [
    {
      "name": "道具名称",
      "character": "使用角色",
      "style": "风格特点",
      "details": "细节描述（道具的外观、材质、功能等）",
      "imagePrompt": "生图提示词（英文）"
    }
  ]
}

要求：
1. 提取所有重要的道具
2. details字段要详细，包含道具的具体特征
3. 只输出JSON对象，不要其他文字`,
    inputField: "script",
  },
  // 角色提取
  characterExtract: {
    system: `你是一位角色分析专家。请从剧本中提取所有角色信息。

输出JSON数组格式：
[{
  "name": "角色名",
  "description": "角色描述",
  "traits": ["性格特征"],
  "appearance": "外貌特征",
  "role": "protagonist/antagonist/supporting"
}]

只输出JSON数组，不要其他文字。`,
    inputField: "script",
  },
  // 合规检测
  complianceCheck: {
    system: `你是一位内容审核专家。请对输入内容进行合规性检测，检查以下方面：
1. 政治敏感内容
2. 暴力血腥内容
3. 色情低俗内容
4. 违法犯罪内容
5. 不良价值观引导
6. 侵权风险

输出格式：
## 合规检测结果
- 风险等级：低/中/高
- 问题类型：[无/具体类型]
- 问题详情：[如有问题，详细说明位置和原因]
- 修改建议：[如有问题，给出修改建议]`,
    inputField: "content",
  },
  // 分镜优化/故事输入
  storyInput: {
    system: `你是一位AI绘画提示词专家。请将用户输入优化为高质量的AI绘画提示词。
要求：
1. 输出英文
2. 包含风格、光影、构图、细节等关键词
3. 结构清晰，逗号分隔
4. 保持原意的同时增强画面感`,
    inputField: "content",
  },
};

// 自动识别剧本集数
async function detectEpisodes(script: string): Promise<number> {
  // 首先用正则快速检测
  const episodePatterns = [
    /第\s*(\d+)\s*集/g,
    /Episode\s*(\d+)/gi,
    /EP\s*(\d+)/gi,
    /第\s*(\d+)\s*话/g,
  ];
  
  let maxEpisode = 0;
  for (const pattern of episodePatterns) {
    const matches = script.matchAll(pattern);
    for (const match of matches) {
      const ep = parseInt(match[1], 10);
      if (ep > maxEpisode) {
        maxEpisode = ep;
      }
    }
  }
  
  // 如果正则找到了集数，直接返回
  if (maxEpisode > 0) {
    return maxEpisode;
  }
  
  // 否则用大模型分析
  try {
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: "请分析这个剧本共有多少集。只输出一个数字，不要其他文字。",
      },
      {
        role: "user",
        content: script.substring(0, 3000),
      },
    ];
    
    const completion = await chatCompletion(messages, {
      model: "qwen-turbo",
      temperature: 0.1,
      max_tokens: 50,
    });
    
    const result = completion as { choices: Array<{ message: { content: string } }> };
    const content = result.choices[0]?.message?.content || "1";
    const num = parseInt(content.match(/\d+/)?.[0] || "1", 10);
    return num > 0 ? num : 1;
  } catch {
    return 1;
  }
}

// 按集数分割剧本内容
function splitScriptByEpisodes(script: string, totalEpisodes: number): string[] {
  const lines = script.split('\n');
  const episodeContents: string[] = [];
  
  // 找到每集的起始行
  const episodeStarts: number[] = [];
  const patterns = [
    /^第\s*(\d+)\s*集/,
    /^Episode\s*(\d+)/i,
    /^EP\s*(\d+)/i,
    /^第\s*(\d+)\s*话/,
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        const match = line.match(pattern);
        if (match) {
          const ep = parseInt(match[1] || match[0].match(/\d+/)?.[0] || "0", 10);
          if (ep >= 1 && ep <= totalEpisodes) {
            episodeStarts[ep - 1] = i;
          }
        }
        break;
      }
    }
  }
  
  // 如果找到了分集标记
  if (episodeStarts.filter(Boolean).length > 0) {
    for (let ep = 0; ep < totalEpisodes; ep++) {
      const start = episodeStarts[ep] || (ep === 0 ? 0 : (episodeStarts[ep - 1] || 0));
      const end = episodeStarts[ep + 1] || lines.length;
      episodeContents[ep] = lines.slice(start, end).join('\n');
    }
  } else {
    // 没有找到分集标记，均匀分割
    const linesPerEpisode = Math.ceil(lines.length / totalEpisodes);
    for (let ep = 0; ep < totalEpisodes; ep++) {
      const start = ep * linesPerEpisode;
      const end = Math.min((ep + 1) * linesPerEpisode, lines.length);
      episodeContents[ep] = lines.slice(start, end).join('\n');
    }
  }
  
  return episodeContents;
}

// 单集提取函数
async function extractSingleEpisode(
  nodeType: "costumeExtract" | "sceneExtract" | "propExtract",
  scriptPart: string,
  episodeNum: number
): Promise<Record<string, unknown>[]> {
  const nodeConfig = NODE_PROMPTS[nodeType];
  
  const userContent = `请从以下第${episodeNum}集剧本内容中提取信息：\n\n${scriptPart.substring(0, 6000)}`;

  const messages: LLMMessage[] = [
    { role: "system", content: nodeConfig.system },
    { role: "user", content: userContent },
  ];

  try {
    const completion = await chatCompletion(messages, {
      model: "qwen-plus",
      temperature: 0.3,
      max_tokens: 4096,
    });

    const result = completion as {
      choices: Array<{ message: { content: string } }>;
    };

    const outputContent = result.choices[0]?.message?.content || "";

    // 尝试解析JSON
    const jsonMatch = outputContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.items || [];
    }
  } catch (err) {
    console.error(`Failed to extract episode ${episodeNum}:`, err);
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    const { nodeType, inputs, content, episodeCount, episodes } = await request.json();

    if (!nodeType) {
      return NextResponse.json(
        { success: false, error: "nodeType is required" },
        { status: 400 }
      );
    }

    const nodeConfig = NODE_PROMPTS[nodeType];
    if (!nodeConfig) {
      return NextResponse.json(
        { success: false, error: `Unknown nodeType: ${nodeType}` },
        { status: 400 }
      );
    }

    // 获取输入内容
    let inputContent = "";
    if (inputs && inputs[nodeConfig.inputField]) {
      inputContent = inputs[nodeConfig.inputField];
    } else if (content) {
      inputContent = content;
    } else if (inputs?.script) {
      inputContent = inputs.script;
    }

    if (!inputContent) {
      return NextResponse.json(
        { success: false, error: "Input content is required" },
        { status: 400 }
      );
    }

    // 对于服装/场景/道具提取，自动检测集数并按集提取
    if (["costumeExtract", "sceneExtract", "propExtract"].includes(nodeType)) {
      // 自动检测集数
      const totalEpisodes = episodes || episodeCount || await detectEpisodes(inputContent);
      
      // 按集数分割剧本
      const episodeContents = splitScriptByEpisodes(inputContent, totalEpisodes);
      
      // 并行提取所有集（限制并发数）
      const byEpisode: Record<number, Record<string, unknown>[]> = {};
      
      // 串行处理以避免API限流
      for (let ep = 1; ep <= totalEpisodes; ep++) {
        const scriptPart = episodeContents[ep - 1] || inputContent;
        const items = await extractSingleEpisode(
          nodeType as "costumeExtract" | "sceneExtract" | "propExtract",
          scriptPart,
          ep
        );
        byEpisode[ep] = items;
      }

      return NextResponse.json({
        success: true,
        byEpisode,
        totalEpisodes,
      });
    }

    // 其他节点类型的原有逻辑
    const messages: LLMMessage[] = [
      { role: "system", content: nodeConfig.system },
      { role: "user", content: inputContent },
    ];

    const completion = await chatCompletion(messages, {
      model: "qwen-plus",
      temperature: 0.3,
      max_tokens: 4096,
    });

    const result = completion as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage: { total_tokens: number };
    };

    const outputContent = result.choices[0]?.message?.content || "";

    // 尝试解析JSON
    let parsedData = outputContent;
    try {
      const jsonMatch = outputContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // 保持原始文本
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
      model: result.model,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Execute node error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}
