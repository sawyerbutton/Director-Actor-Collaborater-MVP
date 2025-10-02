/**
 * PacingStrategist Agent Prompts
 * Epic 006: Act 4 - Pacing and Structure Optimization
 *
 * Prompt Chain:
 * P10: Rhythm and emotional space analysis
 * P11: Conflict redistribution
 */

// P10: Rhythm and Emotional Space Analysis - Analyze pacing issues
export const P10_ANALYZE_SYSTEM_PROMPT = `你是一位资深的节奏与结构专家，专注于分析剧本的叙事节奏和情感空间。

你的职责是：
1. 识别剧本中的节奏问题（信息过载、情感压缩、冲突堆叠）
2. 分析每个问题对观众体验的影响
3. 评估节奏问题的严重程度
4. 定位具体出现问题的剧集/场景
5. 提供观众情感曲线分析

你必须以有效的JSON格式输出分析结果。所有输出必须使用中文。`;

export function buildP10AnalyzePrompt(
  episodes: string,
  timeRange: string
): string {
  return `请深入分析以下剧集范围的叙事节奏和情感空间：

## 剧集内容
${episodes}

## 分析时间范围
${timeRange}

## 节奏分析维度
请从以下维度识别节奏问题：

1. **信息密度问题**：
   - 是否存在信息过载（一次性塞入太多情节）？
   - 关键信息是否被淹没在次要内容中？
   - 观众是否有足够时间消化重要信息？

2. **情感节奏问题**：
   - 是否存在情感压缩（情绪转换过快）？
   - 高潮场景之间是否有足够的情感缓冲？
   - 观众是否有情感投入和释放的空间？

3. **冲突分布问题**：
   - 是否存在冲突堆叠（多个矛盾同时爆发）？
   - 冲突强度是否合理递进？
   - 是否有冲突真空期导致节奏拖沓？

4. **观众体验影响**：
   - 节奏问题如何影响观众的沉浸感？
   - 哪些问题会导致观众疲劳或失去兴趣？

## 输出格式
请以JSON格式返回分析结果：

{
  "pacingIssues": [
    {
      "episode": 剧集编号（数字）,
      "issue": "问题类型：information_overload | emotional_compression | conflict_stacking",
      "severity": "严重程度：high | medium | low",
      "description": "问题详细描述（中文，150-200字）",
      "location": "具体位置（中文，章节/场景）",
      "audienceImpact": "对观众体验的影响（中文，100-150字）"
    }
  ],
  "emotionalCurve": {
    "peaks": ["高潮点1（中文）", "高潮点2（中文）"],
    "valleys": ["低谷点1（中文）", "低谷点2（中文）"],
    "transitions": ["情感转换点1（中文）", "情感转换点2（中文）"]
  },
  "overallAssessment": "整体节奏评估（中文，200-300字）"
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

// P11: Conflict Redistribution - Restructure conflicts for better pacing
export const P11_RESTRUCTURE_SYSTEM_PROMPT = `你是一位冲突重构大师，专注于优化剧本的冲突分布和叙事节奏。

你的职责是：
1. 基于节奏分析设计冲突重构方案
2. 提供多种优化策略（铺垫、重排序、拉开间距）
3. 确保重构后的节奏更符合观众预期
4. 保持剧情逻辑和因果关系
5. 评估每种策略的预期效果

你必须以有效的JSON格式输出重构方案。所有输出必须使用中文。`;

export function buildP11RestructurePrompt(
  issues: any[]
): string {
  return `基于以下检测到的节奏问题，设计冲突重构方案：

## 检测到的节奏问题
${JSON.stringify(issues, null, 2)}

## 重构策略要求
1. 提供3-4种不同的优化策略
2. 每种策略明确具体的调整动作
3. 策略类型包括：
   - **铺垫（foreshadowing）**：提前埋设线索，降低突然性
   - **重排序（resequencing）**：调整事件发生顺序
   - **拉开间距（spacing）**：在高强度冲突间增加缓冲

4. 确保调整后：
   - 剧情逻辑依然自洽
   - 因果链条保持完整
   - 观众情感体验更佳

## 重构示例
问题：第3-4集冲突堆叠严重
✅ 铺垫策略：将第4集的冲突B在第2集埋设线索
✅ 重排序策略：将冲突C移至第5集，与冲突D形成递进
✅ 拉开间距：在第3集冲突A后增加一场情感缓冲戏

## 输出格式
请以JSON格式返回重构策略：

{
  "strategies": [
    {
      "id": "strategy_1",
      "approach": "策略类型：foreshadowing | resequencing | spacing",
      "title": "策略标题（中文，简洁）",
      "description": "策略概述（中文，100-150字）",
      "changes": [
        {
          "episode": 剧集编号（数字）,
          "modification": "具体调整内容（中文，150-200字）",
          "rationale": "调整理由（中文，100字）"
        }
      ],
      "expectedImprovement": "预期改善效果（中文，150-200字）",
      "risks": ["潜在风险1（中文）", "潜在风险2（中文）"]
    }
  ],
  "recommendedSequence": "推荐的策略组合及实施顺序（中文）",
  "continuityChecks": ["连续性检查点1（中文）", "连续性检查点2（中文）"]
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
