import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, LLMMessage } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scriptContent = body.scriptContent || body.content;
    const { model } = body;

    if (!scriptContent) {
      return NextResponse.json(
        { success: false, error: "剧本内容不能为空" },
        { status: 400 }
      );
    }

    // 统计每个角色的台词数量
    function countLines(script: string, charName: string): number {
      // 匹配：角色名：台词 或 角色名：台词
      const escapedName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [
        new RegExp(`^\\s*${escapedName}\\s*[：:]\\s*`, "gm"),
        new RegExp(`^\\s*【${escapedName}】\\s*[：:]?\\s*`, "gm"),
        new RegExp(`^\\s*（${escapedName}）\\s*[：:]?\\s*`, "gm"),
      ];
      
      let maxCount = 0;
      for (const pattern of patterns) {
        const matches = script.match(pattern);
        if (matches) {
          maxCount = Math.max(maxCount, matches.length);
        }
      }
      return maxCount;
    }

    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `你是一位专业的剧本角色分析师。请从剧本中提取所有角色信息。

严格按照以下字段格式输出JSON数组：
[{
  "name": "角色名",
  "role": "主角/配角/龙套",
  "description": "角色性格描述",
  "appearance": "外貌特征",
  "costume": "服装描述",
  "relationships": "与其他角色的关系",
  "lineCount": 台词数量(数字，根据剧本中该角色的台词行数统计)
}]

注意：
1. 只输出JSON数组，不要包含任何其他文字说明
2. 确保JSON格式正确，可以被解析
3. 角色名称使用剧本中的原名称
4. lineCount是该角色在剧本中说话的次数，请仔细统计
5. description描述角色的性格特点
6. appearance描述外貌特征（年龄、体型、发型等）
7. costume描述典型服装或造型
8. 提取所有有台词的角色，不要遗漏`,
      },
      {
        role: "user",
        content: `请从以下剧本中提取所有角色信息，并统计每个角色的台词数量：\n\n${scriptContent}`,
      },
    ];

    const completion = await chatCompletion(messages, {
      model: model || "qwen-plus",
      temperature: 0.3,
      max_tokens: 4096,
    });

    const result = completion as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = result.choices[0]?.message?.content || "";
    
    // 解析JSON
    let roles: Record<string, unknown>[] = [];
    try {
      // 尝试提取JSON数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        roles = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse roles JSON:", e);
      // 返回原始内容让前端处理
      return NextResponse.json({
        success: false,
        error: "JSON解析失败，请重试",
        rawContent: content,
      });
    }

    // 后处理：用正则重新统计台词数量，确保准确
    roles = roles.map(role => {
      const roleName = role.name as string;
      const actualLineCount = countLines(scriptContent, roleName);
      
      // 如果正则统计到了台词，使用正则结果；否则使用模型统计
      return {
        ...role,
        lineCount: actualLineCount > 0 ? actualLineCount : (role.lineCount || 0),
      };
    });

    // 按台词数量排序
    roles.sort((a, b) => ((b.lineCount as number) || 0) - ((a.lineCount as number) || 0));

    return NextResponse.json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error("Extract roles error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "角色提取失败" },
      { status: 500 }
    );
  }
}
