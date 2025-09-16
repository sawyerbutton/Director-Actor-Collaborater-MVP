import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      originalScript,     // 原始剧本
      acceptedErrors,     // 用户接受的错误列表
      rejectedErrors      // 用户拒绝的错误列表（供LLM参考）
    } = body

    const apiKey = process.env.DEEPSEEK_API_KEY

    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
      // 返回模拟的修复结果
      return NextResponse.json({
        success: true,
        data: {
          repairedScript: originalScript + '\n\n[模拟修复：由于未配置API，返回原文]',
          summary: '模拟修复完成',
          changes: []
        }
      })
    }

    // 构建智能修复提示词
    const systemPrompt = `你是一个专业的剧本修复专家。你需要根据用户接受的修改建议，智能地重写剧本。

重要原则：
1. 保持剧本的整体风格和语言特色
2. 确保修改后的内容与上下文自然衔接
3. 不要生硬地替换文本，而是重新组织语言
4. 保留原剧本的情感基调和人物性格
5. 只修复用户明确接受的问题，拒绝的问题保持原样
6. 修复时要考虑多个修改之间的关联性和连贯性`

    const userPrompt = `请修复以下剧本。

原始剧本：
${originalScript}

需要修复的问题：
${acceptedErrors.map((error: any, index: number) =>
  `${index + 1}. [${error.typeName}]
   位置：第${error.line}行
   问题：${error.description}
   原文：${error.content}
   建议：${error.suggestion}`
).join('\n\n')}

用户拒绝修复的问题（仅供参考，不要修改这些）：
${rejectedErrors.map((error: any) =>
  `- ${error.description}`
).join('\n')}

请输出修复后的完整剧本，确保所有接受的修改都被智能地应用，同时保持剧本的连贯性和可读性。`

    console.log('调用DeepSeek进行智能修复...')

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    })

    if (!response.ok) {
      throw new Error('DeepSeek API调用失败')
    }

    const result = await response.json()
    const repairedScript = result.choices[0].message.content

    // 生成修改摘要
    const changes = acceptedErrors.map((error: any) => ({
      type: error.typeName,
      original: error.content,
      description: `已智能修复：${error.description}`
    }))

    return NextResponse.json({
      success: true,
      data: {
        repairedScript,
        summary: `已智能修复 ${acceptedErrors.length} 处问题`,
        changes,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Script repair error:', error)
    return NextResponse.json(
      { error: '修复失败，请稍后重试' },
      { status: 500 }
    )
  }
}