/**
 * CharacterArchitect Agent Prompts
 * Epic 005: Act 2 - Character Arc Iteration
 *
 * Prompt Chain:
 * P4: Focus on character contradiction
 * P5: Generate solution proposals
 * P6: Execute "Show, Don't Tell" transformation
 */

// P4: Focus Prompt - Analyze character contradiction in depth
export const P4_FOCUS_SYSTEM_PROMPT = `你是一位资深的角色发展专家，专注于深入分析角色的内在矛盾和发展弧线。

你的职责是：
1. 深入理解角色矛盾的本质和根源
2. 识别矛盾对角色弧线的影响
3. 分析矛盾在剧本中的表现形式
4. 评估矛盾的戏剧潜力
5. 建立角色矛盾的完整上下文

你必须以有效的JSON格式输出分析结果。所有输出必须使用中文。`;

export function buildP4FocusPrompt(
  characterName: string,
  contradiction: string,
  scriptContext: string
): string {
  return `请深入分析以下角色矛盾：

## 角色信息
角色名称：${characterName}

## 矛盾描述
${contradiction}

## 相关剧本上下文
${scriptContext}

## 分析要求
请从以下维度分析这个矛盾：

1. **矛盾本质**：这个矛盾的核心是什么？
2. **根源分析**：矛盾产生的深层原因
3. **表现形式**：矛盾如何在剧本中体现
4. **影响范围**：对角色弧线和整体故事的影响
5. **戏剧潜力**：这个矛盾可以创造怎样的戏剧张力

## 输出格式
请以JSON格式返回分析结果：

{
  "character": "${characterName}",
  "contradiction": "${contradiction}",
  "analysis": {
    "essence": "矛盾的核心本质（中文）",
    "rootCause": "矛盾的深层根源（中文）",
    "manifestation": "矛盾在剧本中的表现形式（中文）",
    "impact": "对角色和故事的影响（中文）",
    "dramaticPotential": "可开发的戏剧潜力（中文）"
  },
  "relatedScenes": ["场景引用1", "场景引用2"],
  "keyMoments": ["关键时刻1", "关键时刻2"]
}`;
}

// P5: Proposal Generation - Create solution proposals
export const P5_PROPOSAL_SYSTEM_PROMPT = `你是一位创意十足的剧本顾问，专注于为角色矛盾提供创造性的解决方案。

你的职责是：
1. 基于角色矛盾分析生成解决方案
2. 提供恰好2个不同风格的提案
3. 每个提案都有明确的优缺点
4. 确保提案具有可执行性
5. 保持提案的戏剧性和故事性

你必须以有效的JSON格式输出结果。所有输出必须使用中文。`;

export function buildP5ProposalPrompt(
  focusContext: any
): string {
  return `基于以下角色矛盾分析，生成恰好2个解决方案提案：

## 角色矛盾上下文
${JSON.stringify(focusContext, null, 2)}

## 提案要求
1. 提供恰好2个不同风格的解决方案
2. 第一个提案：偏向渐进式、细腻的角色发展
3. 第二个提案：偏向戏剧性、冲突性的转折
4. 每个提案必须包含明确的优点和缺点
5. 提案必须具体、可执行、符合剧本逻辑

## 输出格式
请以JSON格式返回恰好2个提案：

{
  "proposals": [
    {
      "id": "proposal_1",
      "title": "提案标题（中文，简洁有力）",
      "description": "提案的详细描述（中文，150-200字）",
      "approach": "渐进式角色发展",
      "pros": [
        "优点1（中文）",
        "优点2（中文）",
        "优点3（中文）"
      ],
      "cons": [
        "缺点1（中文）",
        "缺点2（中文）"
      ],
      "dramaticImpact": "对戏剧效果的影响（中文）"
    },
    {
      "id": "proposal_2",
      "title": "提案标题（中文，简洁有力）",
      "description": "提案的详细描述（中文，150-200字）",
      "approach": "戏剧性转折",
      "pros": [
        "优点1（中文）",
        "优点2（中文）",
        "优点3（中文）"
      ],
      "cons": [
        "缺点1（中文）",
        "缺点2（中文）"
      ],
      "dramaticImpact": "对戏剧效果的影响（中文）"
    }
  ],
  "recommendation": "推荐意见（中文，说明哪个提案更适合当前剧本，为什么）"
}

确保返回的JSON格式正确，可以直接解析。`;
}

// P6: Show Don't Tell - Transform into dramatic actions
export const P6_SHOW_DONT_TELL_SYSTEM_PROMPT = `你是一位"Show, Don't Tell"原则的大师，专注于将抽象的角色发展转化为具体的戏剧动作。

你的职责是：
1. 将选定的提案转化为具体的戏剧动作
2. 遵循"Show, Don't Tell"原则
3. 创造视觉化、具象化的场景
4. 确保动作揭示角色内在状态
5. 保持戏剧张力和故事节奏

你必须以有效的JSON格式输出结果。所有输出必须使用中文。`;

export function buildP6ShowDontTellPrompt(
  selectedProposal: any,
  focusContext: any
): string {
  return `请将以下选定的提案转化为具体的戏剧动作，遵循"Show, Don't Tell"原则：

## 选定提案
${JSON.stringify(selectedProposal, null, 2)}

## 角色矛盾上下文
${JSON.stringify(focusContext, null, 2)}

## 转化要求
1. 创造3-5个具体的戏剧动作场景
2. 每个场景必须：
   - 通过动作、表情、行为展现角色内在
   - 避免直白的独白或说明
   - 具有视觉冲击力
   - 推动角色弧线发展
3. 场景应该形成递进关系
4. 确保戏剧张力逐步积累

## "Show, Don't Tell"原则示例
❌ 错误（Tell）："张三很愤怒。"
✅ 正确（Show）："张三紧握双拳，指甲刺入掌心，青筋暴起。他深吸一口气，然后猛地将桌上的水杯摔向墙壁。"

## 输出格式
请以JSON格式返回戏剧动作：

{
  "dramaticActions": [
    {
      "sequence": 1,
      "scene": "场景描述（中文，具体的时间、地点、环境）",
      "action": "具体的动作描述（中文，详细的视觉化动作，150-200字）",
      "reveals": "这个动作揭示了什么（中文，角色的内在状态、矛盾的进展）",
      "dramaticFunction": "戏剧功能（中文，在角色弧线中的作用）"
    },
    {
      "sequence": 2,
      "scene": "...",
      "action": "...",
      "reveals": "...",
      "dramaticFunction": "..."
    }
  ],
  "overallArc": "整体弧线描述（中文，这些动作如何共同推动角色发展）",
  "integrationNotes": "整合建议（中文，如何将这些动作整合到现有剧本中）"
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

export class PromptBuilder {
  static buildP4Focus(
    characterName: string,
    contradiction: string,
    scriptContext: string
  ): { system: string; user: string } {
    return {
      system: P4_FOCUS_SYSTEM_PROMPT,
      user: buildP4FocusPrompt(characterName, contradiction, scriptContext)
    };
  }

  static buildP5Proposal(focusContext: any): { system: string; user: string } {
    return {
      system: P5_PROPOSAL_SYSTEM_PROMPT,
      user: buildP5ProposalPrompt(focusContext)
    };
  }

  static buildP6ShowDontTell(
    selectedProposal: any,
    focusContext: any
  ): { system: string; user: string } {
    return {
      system: P6_SHOW_DONT_TELL_SYSTEM_PROMPT,
      user: buildP6ShowDontTellPrompt(selectedProposal, focusContext)
    };
  }
}
