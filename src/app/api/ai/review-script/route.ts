import { NextRequest, NextResponse } from "next/server";
import { getAIClient, LLMMessage } from "@/lib/ai-client";
import { loadKnowledgeForTask } from "@/lib/prompt-knowledge";

/**
 * 剧本五维度质量评分 API
 * 
 * 评分维度：
 * 1. 节奏把控（Pacing）- 是否符合四段式节奏曲线
 * 2. 钩子设计（Hooks）- 每集结尾是否有有效钩子
 * 3. 人物一致性（Character）- 人物性格是否一致
 * 4. 爽感密度（Satisfaction）- 爽感要素是否足够
 * 5. 合规性（Compliance）- 是否触碰内容红线
 */

export interface ReviewResult {
  overallScore: number; // 总分 0-100
  dimensions: {
    pacing: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
    hooks: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
    character: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
    satisfaction: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
    compliance: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
  };
  summary: string;
  topIssues: string[]; // 最需要修复的3个问题
}

export async function POST(request: NextRequest) {
  try {
    const {
      script, // 剧本内容
      outline, // 大纲（可选，用于对照检查）
      genre, // 类型
      targetEpisodes, // 目标集数
    } = await request.json();

    if (!script) {
      return NextResponse.json({ error: "请提供剧本内容" }, { status: 400 });
    }

    const client = getAIClient();

    // 加载评分知识库
    const knowledge = loadKnowledgeForTask("script-review");

    const prompt: LLMMessage[] = [
      {
        role: "system",
        content: `你是一位专业短剧审核专家。你的任务是对剧本进行五维度质量评分。

${knowledge}

## 评分标准（每项0-20分，总分0-100）

### 1. 节奏把控（Pacing）
- 是否符合四段式节奏曲线（起势15%、攀升30%、风暴35%、决战20%）
- 每集是否有情绪起伏
- 是否有拖沓或过于仓促的部分
- 高潮是否集中且有力

### 2. 钩子设计（Hooks）
- 每集结尾是否有钩子
- 钩子类型是否多样化（情绪/悬念/危机/信息/反转）
- 付费卡点是否在情绪最高点
- 钩子是否与下集开头衔接

### 3. 人物一致性（Character）
- 人物性格是否前后一致
- 人物是否有成长弧光
- 对白是否符合人物身份
- 四层反派是否层次分明

### 4. 爽感密度（Satisfaction）
- 是否有足够的打脸/逆袭/甜宠/燃点
- 爽感分布是否均匀
- 是否符合题材的爽感配比
- 是否有连续多集无爽点

### 5. 合规性（Compliance）
- 是否触碰内容红线
- 价值观是否正向
- 是否有需要修改的内容
- 敏感内容是否已标注

## 输出格式（JSON）
{
  "overallScore": 75,
  "dimensions": {
    "pacing": {
      "score": 16,
      "issues": ["第10-15集节奏偏慢", "高潮集中在后期，前期铺垫过长"],
      "suggestions": ["建议将第12-14集压缩为2集", "将部分悬念提前到第8集"]
    },
    "hooks": {
      "score": 18,
      "issues": ["第5集结尾无钩子"],
      "suggestions": ["在第5集结尾添加悬念钩子"]
    },
    "character": {
      "score": 14,
      "issues": ["女主第20集后性格突变", "反派动机不明确"],
      "suggestions": ["补充女主心态转变的铺垫", "明确反派的动机背景"]
    },
    "satisfaction": {
      "score": 15,
      "issues": ["第8-12集无爽点", "打脸不够爽"],
      "suggestions": ["在第10集添加小打脸", "强化打脸的震撼感"]
    },
    "compliance": {
      "score": 20,
      "issues": [],
      "suggestions": []
    }
  },
  "summary": "整体质量良好，节奏把控和爽感密度需要优化。建议重点修改第10-15集。",
  "topIssues": ["第10-15集节奏偏慢", "女主第20集后性格突变", "第8-12集无爽点"]
}`,
      },
      {
        role: "user",
        content: `请对以下剧本进行五维度质量评分。

类型：${genre || "都市"}
集数：${targetEpisodes || "未知"}

${outline ? `大纲：\n${JSON.stringify(outline, null, 2)}\n\n` : ""}

剧本内容：
${script.slice(0, 8000)}${script.length > 8000 ? "\n...（内容过长，已截断）" : ""}`,
      },
    ];

    const response = await client.chat.completions.create({
      model: "qwen-plus",
      messages: prompt,
      temperature: 0.3, // 低温度保证评分稳定
    });

    const content = response.choices[0]?.message?.content || "";

    try {
      const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result: ReviewResult = JSON.parse(clean);
      return NextResponse.json(result);
    } catch {
      // JSON 解析失败，返回默认结果
      return NextResponse.json({
        overallScore: 0,
        dimensions: {
          pacing: { score: 0, issues: ["评分解析失败"], suggestions: [] },
          hooks: { score: 0, issues: ["评分解析失败"], suggestions: [] },
          character: { score: 0, issues: ["评分解析失败"], suggestions: [] },
          satisfaction: { score: 0, issues: ["评分解析失败"], suggestions: [] },
          compliance: { score: 0, issues: ["评分解析失败"], suggestions: [] },
        },
        summary: "评分解析失败，请检查剧本格式",
        topIssues: ["评分解析失败"],
        rawResponse: content,
      } as ReviewResult & { rawResponse: string });
    }
  } catch (error) {
    console.error("Review script error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Review failed" },
      { status: 500 }
    );
  }
}

/**
 * GET 接口：获取评分维度说明
 */
export async function GET() {
  return NextResponse.json({
    dimensions: [
      {
        key: "pacing",
        name: "节奏把控",
        description: "是否符合四段式节奏曲线，每集是否有情绪起伏",
        maxScore: 20,
      },
      {
        key: "hooks",
        name: "钩子设计",
        description: "每集结尾是否有有效钩子，钩子类型是否多样化",
        maxScore: 20,
      },
      {
        key: "character",
        name: "人物一致性",
        description: "人物性格是否前后一致，是否有成长弧光",
        maxScore: 20,
      },
      {
        key: "satisfaction",
        name: "爽感密度",
        description: "是否有足够的打脸/逆袭/甜宠/燃点",
        maxScore: 20,
      },
      {
        key: "compliance",
        name: "合规性",
        description: "是否触碰内容红线，价值观是否正向",
        maxScore: 20,
      },
    ],
    totalMaxScore: 100,
    passingScore: 70,
    excellentScore: 85,
  });
}
