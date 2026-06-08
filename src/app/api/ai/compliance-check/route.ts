import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, LLMMessage } from "@/lib/ai-client";
import { loadKnowledgeForTask } from "@/lib/prompt-knowledge";


// 敏感词分类配置
const SENSITIVE_CATEGORIES = {
  politics: {
    name: "政治敏感",
    keywords: ["政治敏感词列表"],
    severity: "high",
  },
  violence: {
    name: "暴力血腥",
    keywords: ["暴力", "血腥", "杀人", "暴力血腥词列表"],
    severity: "high",
  },
  pornography: {
    name: "色情低俗",
    keywords: ["色情低俗词列表"],
    severity: "high",
  },
  gambling: {
    name: "赌博相关",
    keywords: ["赌博", "赌钱", "下注"],
    severity: "medium",
  },
  drugs: {
    name: "毒品相关",
    keywords: ["毒品", "吸毒"],
    severity: "high",
  },
  discrimination: {
    name: "歧视言论",
    keywords: ["歧视词列表"],
    severity: "medium",
  },
  advertising: {
    name: "广告营销",
    keywords: ["加微信", "点击链接", "免费领取"],
    severity: "low",
  },
};

interface ComplianceIssue {
  category: string;
  categoryName: string;
  severity: "high" | "medium" | "low";
  keyword?: string;
  position?: { start: number; end: number };
  context?: string;
  suggestion: string;
}

interface ComplianceResult {
  passed: boolean;
  score: number;
  issues: ComplianceIssue[];
  summary: string;
  details: string;
}

export async function POST(request: NextRequest) {
  try {
    const { content, options = {} } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "内容不能为空" },
        { status: 400 }
      );
    }

    // 如果内容太短，直接通过
    if (content.length < 10) {
      return NextResponse.json({
        success: true,
        result: {
          passed: true,
          score: 100,
          issues: [],
          summary: "内容过短，无需审查",
          details: "",
        },
      });
    }

    // 1. 先进行关键词快速检测
    const keywordIssues = quickKeywordCheck(content);

    // 2. 如果内容较长，使用 AI 进行深度审查
    let aiIssues: ComplianceIssue[] = [];
    let aiAnalysis = "";

    if (content.length > 100 && options.deepCheck !== false) {
      const aiResult = await aiComplianceCheck(content);
      aiIssues = aiResult.issues;
      aiAnalysis = aiResult.analysis;
    }

    // 3. 合并结果
    const allIssues = [...keywordIssues, ...aiIssues];

    // 4. 计算安全分数
    const score = calculateScore(allIssues, content.length);

    // 5. 生成总结
    const summary = generateSummary(allIssues, score);

    const result: ComplianceResult = {
      passed: allIssues.filter((i) => i.severity === "high").length === 0,
      score,
      issues: allIssues,
      summary,
      details: aiAnalysis,
    };

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Compliance check error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "审查失败" },
      { status: 500 }
    );
  }
}

// 快速关键词检测
function quickKeywordCheck(content: string): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  for (const [key, config] of Object.entries(SENSITIVE_CATEGORIES)) {
    for (const keyword of config.keywords) {
      if (keyword === "词列表") continue; // 跳过占位符

      const regex = new RegExp(keyword, "gi");
      let match;
      while ((match = regex.exec(content)) !== null) {
        const start = Math.max(0, match.index - 20);
        const end = Math.min(content.length, match.index + keyword.length + 20);

        issues.push({
          category: key,
          categoryName: config.name,
          severity: config.severity as "high" | "medium" | "low",
          keyword: match[0],
          position: { start: match.index, end: match.index + keyword.length },
          context: content.slice(start, end),
          suggestion: getSuggestion(key),
        });
      }
    }
  }

  return issues;
}

// AI 深度审查
async function aiComplianceCheck(
  content: string
): Promise<{ issues: ComplianceIssue[]; analysis: string }> {
  // 加载合规知识库
  const complianceKnowledge = loadKnowledgeForTask("compliance-check");
  
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `你是一位专业的内容审查专家。请审查以下剧本内容，识别可能存在的合规问题。

${complianceKnowledge}

请按以下JSON格式输出审查结果：
{
  "issues": [
    {
      "category": "violence|pornography|discrimination|gambling|drugs|other",
      "severity": "high|medium|low",
      "description": "具体问题描述",
      "context": "问题上下文（原文片段）",
      "suggestion": "修改建议"
    }
  ],
  "analysis": "整体内容合规性分析报告"
}

注意：
- 只输出JSON，不要有其他文字
- 如果内容合规，issues为空数组
- 区分艺术表达和真正的问题`,
    },
    {
      role: "user",
      content: `请审查以下剧本内容的合规性：\n\n${content.slice(0, 4000)}`,
    },
  ];

  try {
    const completion = await chatCompletion(messages, {
      model: "qwen-plus",
      temperature: 0.1,
      max_tokens: 2048,
    });

    const result = completion as { choices: Array<{ message: { content: string } }> };
    const responseText = result.choices[0]?.message?.content || "";

    // 解析 JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        issues: (parsed.issues || []).map((i: Record<string, unknown>) => ({
          category: i.category || "other",
          categoryName: getCategoryName(i.category as string),
          severity: i.severity || "low",
          context: i.context,
          suggestion: i.suggestion || "建议修改相关内容",
        })),
        analysis: parsed.analysis || "",
      };
    }
  } catch (error) {
    console.error("AI compliance check failed:", error);
  }

  return { issues: [], analysis: "" };
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    violence: "暴力血腥",
    pornography: "色情低俗",
    discrimination: "歧视言论",
    gambling: "赌博相关",
    drugs: "毒品相关",
    other: "其他问题",
  };
  return names[category] || "未知类型";
}

function getSuggestion(category: string): string {
  const suggestions: Record<string, string> = {
    politics: "建议移除或修改政治敏感内容",
    violence: "建议淡化暴力描写，避免血腥细节",
    pornography: "建议移除低俗内容，保持健康向上",
    gambling: "建议移除赌博相关内容",
    drugs: "建议移除毒品相关内容",
    discrimination: "建议修改歧视性表述",
    advertising: "建议移除广告营销内容",
  };
  return suggestions[category] || "建议修改相关内容";
}

function calculateScore(issues: ComplianceIssue[], contentLength: number): number {
  if (issues.length === 0) return 100;

  let deduction = 0;
  for (const issue of issues) {
    switch (issue.severity) {
      case "high":
        deduction += 30;
        break;
      case "medium":
        deduction += 15;
        break;
      case "low":
        deduction += 5;
        break;
    }
  }

  // 根据内容长度调整扣分
  const lengthFactor = Math.max(0.5, 1 - contentLength / 10000);
  deduction = deduction * lengthFactor;

  return Math.max(0, Math.round(100 - deduction));
}

function generateSummary(issues: ComplianceIssue[], score: number): string {
  if (issues.length === 0) {
    return "内容合规，未发现问题";
  }

  const highCount = issues.filter((i) => i.severity === "high").length;
  const mediumCount = issues.filter((i) => i.severity === "medium").length;
  const lowCount = issues.filter((i) => i.severity === "low").length;

  const parts: string[] = [];
  if (highCount > 0) parts.push(`严重问题 ${highCount} 处`);
  if (mediumCount > 0) parts.push(`中等问题 ${mediumCount} 处`);
  if (lowCount > 0) parts.push(`轻微问题 ${lowCount} 处`);

  return `发现 ${parts.join("，")}，安全评分 ${score} 分`;
}
