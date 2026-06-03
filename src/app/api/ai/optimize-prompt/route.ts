import { ChatCompletion } from "openai/resources/index.mjs";
import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, LLMMessage } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ success: false, error: '缺少提示词内容' }, { status: 400 });
    }

    // 分离描述和镜头信息，避免重复添加
    let description = prompt;
    let shotInfo = '';
    
    // 查找并提取镜头信息
    const shotMatch = prompt.match(/\n?镜头[：:：]\s*(.+?)(?=\n|$)/);
    if (shotMatch) {
      shotInfo = shotMatch[0].trim();
      description = prompt.replace(shotMatch[0], '').trim();
    }

    // 调用大模型优化提示词（只优化描述部分）
    // 提高temperature让每次优化结果更有多样性
    const systemPrompt = `你是一位专业的影视剧本提示词优化专家。请重新优化用户提供的分镜描述。

优化要求：
1. 增强画面感和视觉冲击力
2. 丰富光影、色彩、氛围细节
3. 使用更具表现力的词汇和修辞
4. 可以调整表达角度，带来新的视角

重要规则：
- 每次优化都要尝试不同的表达方式，不要重复之前的结果
- 直接输出优化后的描述，不要解释
- 不要添加"镜头"相关术语`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请用新的方式重新优化以下分镜描述：\n\n${description}` }
    ];

    // 调用大模型，提高temperature让结果更多样
    const completion = await chatCompletion(messages, {
      model: 'qwen-turbo',
      temperature: 0.85, // 提高温度增加多样性
      max_tokens: 2000,
    });

    const cc = completion as ChatCompletion;
    let optimizedResult = cc.choices[0]?.message?.content || description;
    
    // 清理可能产生的多余镜头信息
    optimizedResult = optimizedResult.replace(/\n?镜头[：:：]\s*.+?(?=\n|$)/g, '').trim();
    
    // 如果原有镜头信息，重新拼接（只保留一份）
    if (shotInfo) {
      optimizedResult = optimizedResult + '\n' + shotInfo;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: optimizedResult
    });

  } catch (error) {
    console.error('Optimize prompt error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '优化过程发生错误' 
    }, { status: 500 });
  }
}
