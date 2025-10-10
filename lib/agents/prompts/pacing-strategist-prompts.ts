/**
 * PacingStrategist Agent Prompts - 创作优化导向
 * Epic 006: Act 4 - Pacing Enhancement and Rhythm Optimization (叙事节奏优化)
 *
 * 业务定位：不是修复节奏问题，而是优化叙事节奏和戏剧张力
 * 价值转化：从流畅节奏 → 扣人心弦的节奏（戏剧张力强、情感起伏饱满）
 *
 * Prompt Chain:
 * P10: Analyze pacing enhancement opportunities (分析节奏优化机会)
 * P11: Generate pacing enhancement strategies (生成节奏优化策略)
 */

// P10: Pacing Enhancement Analysis - Identify opportunities for dramatic rhythm
export const P10_ANALYZE_SYSTEM_PROMPT = `你是一位叙事节奏创作导师，专注于帮助编剧构建扣人心弦的戏剧节奏。

你的职责是：
1. 深入分析剧本的叙事节奏和情感曲线
2. 识别可以优化的节奏维度（信息分布、情感起伏、冲突密度）
3. 发掘增强戏剧张力和观众沉浸感的机会
4. 评估节奏优化的戏剧价值
5. 构建更具吸引力的情感体验路径

重要：你不是在"修复节奏问题"，而是在"优化戏剧体验"。即使节奏流畅，也可以通过增强张力和情感起伏使其更扣人心弦。

你必须以有效的JSON格式输出分析结果。所有输出必须使用中文。`;

export function buildP10AnalyzePrompt(
  episodes: string,
  timeRange: string
): string {
  return `请深入分析以下剧集范围的叙事节奏优化潜力，发掘增强戏剧张力的机会：

## 剧集内容
${episodes}

## 分析时间范围
${timeRange}

## 节奏优化分析维度
请从创作增强的角度分析叙事节奏：

1. **信息分布优化机会**：
   - 如何通过调整信息披露节奏增强悬念？
   - 哪些关键信息可以延迟揭示来制造张力？
   - 如何利用信息差创造戏剧性反转？

2. **情感起伏强化机会**：
   - 如何增强情感高潮的冲击力？
   - 哪些场景可以拉长以深化情感共鸣？
   - 如何优化情感过渡使观众更投入？

3. **冲突密度调优机会**：
   - 如何重新编排冲突使节奏更扣人心弦？
   - 哪些冲突可以递进叠加以制造高潮？
   - 如何在高强度冲突间设计恰当的节奏缓冲？

4. **观众体验提升潜力**：
   - 节奏优化如何增强观众的沉浸感和期待感？
   - 哪些调整会让故事更有吸引力和话题性？

## 输出格式
请以JSON格式返回分析结果：

{
  "pacingOpportunities": [
    {
      "episode": 剧集编号（数字）,
      "dimension": "优化维度：information_distribution | emotional_impact | conflict_orchestration",
      "opportunity": "优化机会描述（中文，150-200字，说明如何让节奏更扣人心弦）",
      "currentState": "当前节奏状态（中文，100字）",
      "enhancementPotential": "增强潜力（high/medium/low）及原因（中文）",
      "location": "具体位置（中文，章节/场景）",
      "audienceImpact": "对观众体验的提升（中文，100-150字）"
    }
  ],
  "emotionalCurve": {
    "currentPeaks": ["当前高潮点1（中文）", "当前高潮点2（中文）"],
    "enhancementOpportunities": ["可强化高潮1（中文）", "可强化高潮2（中文）"],
    "newDramaticMoments": ["可创造的新戏剧点1（中文）", "可创造的新戏剧点2（中文）"]
  },
  "overallPotential": "整体节奏优化潜力评估（中文，200-300字，强调如何从流畅变得扣人心弦）"
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

// P11: Pacing Enhancement Strategies - Optimize dramatic rhythm and tension
export const P11_RESTRUCTURE_SYSTEM_PROMPT = `你是一位叙事节奏创作大师，专注于设计扣人心弦的戏剧节奏和张力曲线。

你的职责是：
1. 基于节奏分析设计创作性的优化策略
2. 提供多种节奏强化路径（悬念铺垫、高潮编排、张力控制）
3. 确保优化后的节奏更具戏剧性和吸引力
4. 保持剧情逻辑和因果链条的完整性
5. 评估每种策略的艺术价值和观众体验提升

重要：你提供的是"创作增强方案"，不是"问题修复方案"。目标是让节奏从"流畅"变得"扣人心弦"。

你必须以有效的JSON格式输出优化策略。所有输出必须使用中文。`;

export function buildP11RestructurePrompt(
  opportunities: any[]
): string {
  return `基于以下识别的节奏优化机会，设计创作性的节奏强化策略：

## 节奏优化机会分析
${JSON.stringify(opportunities, null, 2)}

## 创作优化策略要求
1. 提供3-4种不同的节奏强化策略
2. 每种策略明确具体的创作优化动作
3. 策略类型包括：
   - **悬念铺垫（suspense_building）**：通过延迟信息披露和伏笔制造张力
   - **高潮编排（climax_orchestration）**：重新编排冲突和情感高潮使其更震撼
   - **张力控制（tension_modulation）**：在高强度场景间设计恰当的节奏起伏

4. 确保优化后：
   - 剧情逻辑依然自洽且因果链条完整
   - 节奏更扣人心弦，戏剧张力显著增强
   - 观众情感投入和沉浸感大幅提升

## 创作优化示例（从流畅→扣人心弦）
当前状态：第3-4集节奏平稳流畅

✅ 悬念铺垫策略：
- 将第4集的重要揭示延迟到结尾，中间穿插误导性线索
- 效果：观众一直处于猜测和期待状态，张力持续积累

✅ 高潮编排策略：
- 将第3集的冲突A与第4集的冲突B重新编排，形成递进式双重高潮
- 效果：情感冲击力翻倍，观众体验更震撼

✅ 张力控制策略：
- 在第3集高潮后增加一场看似平静实则暗藏危机的过渡场景
- 效果：形成"暴风雨前的宁静"效果，为下一次爆发积蓄能量

## 输出格式
请以JSON格式返回优化策略：

{
  "strategies": [
    {
      "id": "strategy_1",
      "approach": "策略类型：suspense_building | climax_orchestration | tension_modulation",
      "title": "策略标题（中文，简洁有力，体现优化方向）",
      "description": "策略概述（中文，100-150字，强调如何增强戏剧性）",
      "enhancements": [
        {
          "episode": 剧集编号（数字）,
          "modification": "具体优化内容（中文，150-200字）",
          "dramaticValue": "戏剧价值（中文，说明如何让节奏更扣人心弦）"
        }
      ],
      "expectedImpact": {
        "suspenseLevel": "悬念提升程度（high/medium/low）",
        "emotionalIntensity": "情感强度提升（high/medium/low）",
        "audienceEngagement": "观众投入度提升（中文描述）"
      },
      "artisticValue": "艺术价值评估（中文，150-200字）",
      "executionNotes": ["执行要点1（中文）", "执行要点2（中文）"]
    }
  ],
  "recommendedApproach": "推荐的策略组合及创作实施建议（中文，强调如何达到最佳戏剧效果）",
  "continuityGuidelines": ["保持连贯性的创作指引1（中文）", "保持连贯性的创作指引2（中文）"]
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

export class PacingStrategistPromptBuilder {
  static buildP10Analyze(
    episodes: string,
    timeRange: string
  ): { system: string; user: string } {
    return {
      system: P10_ANALYZE_SYSTEM_PROMPT,
      user: buildP10AnalyzePrompt(episodes, timeRange)
    };
  }

  static buildP11Restructure(issues: any[]): { system: string; user: string } {
    return {
      system: P11_RESTRUCTURE_SYSTEM_PROMPT,
      user: buildP11RestructurePrompt(issues)
    };
  }
}
