import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scriptContent, projectId } = body

    if (!scriptContent || !scriptContent.trim()) {
      return NextResponse.json(
        { error: '请提供剧本内容' },
        { status: 400 }
      )
    }

    // 模拟AI分析过程
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 模拟分析结果
    const mockAnalysisResult = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: projectId || 'demo-project',
      scriptContent,
      status: 'completed',
      errors: [
        {
          id: '1',
          type: 'timeline_inconsistency',
          typeName: '时间线不一致',
          severity: 'high',
          line: 5,
          position: { start: 50, end: 100 },
          content: '李华：还记得我吗？我们昨天才第一次见面。',
          description: '角色对见面时间的描述存在矛盾',
          suggestion: '建议修改为：李华：还记得我吗？我们上次见面已经很久了。',
          confidence: 0.92
        },
        {
          id: '2',
          type: 'character_behavior',
          typeName: '角色行为矛盾',
          severity: 'medium',
          line: 7,
          position: { start: 120, end: 180 },
          content: '张明：（困惑）昨天？可是我记得我们认识很多年了。',
          description: '张明的反应与之前的设定不符',
          suggestion: '建议修改为：张明：（惊讶）是吗？我怎么感觉我们认识很久了。',
          confidence: 0.85
        },
        {
          id: '3',
          type: 'scene_continuity',
          typeName: '场景连续性问题',
          severity: 'low',
          line: 1,
          position: { start: 0, end: 30 },
          content: '场景 1：咖啡店 - 日 - 内',
          description: '场景描述缺少具体时间点',
          suggestion: '建议修改为：场景 1：咖啡店 - 下午3点 - 内',
          confidence: 0.78
        }
      ],
      summary: {
        totalErrors: 3,
        highSeverity: 1,
        mediumSeverity: 1,
        lowSeverity: 1,
        errorTypes: {
          timeline_inconsistency: 1,
          character_behavior: 1,
          scene_continuity: 1,
          dialogue_logic: 0,
          prop_inconsistency: 0
        }
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    }

    // 如果配置了真实的API密钥，调用真实的AI服务
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (apiKey && apiKey !== 'your_deepseek_api_key_here') {
      try {
        console.log('Calling DeepSeek API...')

        const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: `你是一个专业的剧本分析师。请分析以下剧本中的逻辑错误，包括：
1. 时间线不一致
2. 角色行为矛盾
3. 场景连续性问题
4. 对话逻辑错误
5. 道具环境不一致

请以JSON格式返回分析结果，包含以下字段：
- errors: 错误数组，每个错误包含：
  - type: 错误类型（timeline_inconsistency/character_behavior/scene_continuity/dialogue_logic/prop_inconsistency）
  - typeName: 错误类型中文名
  - severity: 严重度（high/medium/low）
  - line: 错误所在行号（估计）
  - content: 原文内容
  - description: 错误描述
  - suggestion: 修改建议
  - confidence: 置信度（0-1）`
              },
              {
                role: 'user',
                content: `请分析以下剧本：\n\n${scriptContent}`
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        })

        if (deepseekResponse.ok) {
          const aiResult = await deepseekResponse.json()
          const aiContent = aiResult.choices[0].message.content

          try {
            console.log('AI Response:', aiContent)

            // 尝试提取JSON内容（有时AI会在JSON前后加文字）
            let jsonContent = aiContent
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              jsonContent = jsonMatch[0]
            }

            const parsedResult = JSON.parse(jsonContent)

            // 处理AI返回的结果，确保格式正确
            const processedErrors = (parsedResult.errors || []).map((error: any, index: number) => ({
              id: error.id || String(index + 1),
              type: error.type || 'unknown',
              typeName: error.typeName || '未知错误',
              severity: error.severity || 'medium',
              line: error.line || index + 1,
              position: error.position || { start: 0, end: 100 },
              content: error.content || '',
              description: error.description || '检测到潜在问题',
              suggestion: error.suggestion || '建议进行修改',
              confidence: error.confidence || 0.8
            }))

            // 使用AI分析的结果
            const analysisResult = {
              ...mockAnalysisResult,
              errors: processedErrors.length > 0 ? processedErrors : mockAnalysisResult.errors,
              summary: {
                totalErrors: processedErrors.length,
                highSeverity: processedErrors.filter((e: any) => e.severity === 'high').length,
                mediumSeverity: processedErrors.filter((e: any) => e.severity === 'medium').length,
                lowSeverity: processedErrors.filter((e: any) => e.severity === 'low').length,
                errorTypes: {
                  timeline_inconsistency: processedErrors.filter((e: any) => e.type === 'timeline_inconsistency').length,
                  character_behavior: processedErrors.filter((e: any) => e.type === 'character_behavior').length,
                  scene_continuity: processedErrors.filter((e: any) => e.type === 'scene_continuity').length,
                  dialogue_logic: processedErrors.filter((e: any) => e.type === 'dialogue_logic').length,
                  prop_inconsistency: processedErrors.filter((e: any) => e.type === 'prop_inconsistency').length
                }
              }
            }

            console.log('Processed analysis result:', analysisResult)

            return NextResponse.json({
              success: true,
              data: analysisResult
            })
          } catch (parseError) {
            console.log('AI response parsing error:', parseError)
            console.log('Using fallback mock data')
          }
        }
      } catch (error) {
        console.error('DeepSeek API error:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: mockAnalysisResult
    })

  } catch (error) {
    console.error('Analysis API error:', error)
    return NextResponse.json(
      { error: '分析失败，请稍后重试' },
      { status: 500 }
    )
  }
}