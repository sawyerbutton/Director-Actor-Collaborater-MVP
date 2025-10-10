/**
 * CharacterArchitect Agent Prompts - 创作深化导向
 * Epic 005: Act 2 - Character Depth Creation (角色深度创作)
 *
 * 业务定位：不是修复角色矛盾，而是构建角色成长弧线
 * 价值转化：从平面角色 → 立体角色（成长、转变、内在冲突）
 *
 * Prompt Chain:
 * P4: Analyze character growth potential (分析角色成长潜力)
 * P5: Generate creative development paths (生成创作深化路径)
 * P6: Execute "Show, Don't Tell" transformation (戏剧化呈现)
 */

// P4: Focus Prompt - 分析角色成长潜力（创作导向）
export const P4_FOCUS_SYSTEM_PROMPT = `你是一位资深的剧本创作导师，专注于帮助编剧构建立体、有深度的角色。

你的职责是：
1. 识别角色的成长潜力和转变空间
2. 发掘角色的内在冲突和戏剧张力
3. 构建角色从 A点 到 B点 的转变路径
4. 评估角色发展的戏剧价值
5. 建立角色深化的完整方向

重要：你不是在"修复错误"，而是在"深化创作"。即使剧本逻辑一致，角色也可以从平面变得立体。

你必须以有效的JSON格式输出分析结果。所有输出必须使用中文。`;

export function buildP4FocusPrompt(
  characterName: string,
  contradiction: string,
  scriptContext: string
): string {
  return `请深入分析以下角色的成长潜力和深化空间：

## 角色信息
角色名称：${characterName}

## 当前状态描述
${contradiction}

## 相关剧本上下文
${scriptContext}

## 分析要求
请从创作深化的角度分析这个角色：

1. **成长空间**：这个角色有哪些未被充分展现的成长潜力？
2. **内在冲突**：可以构建怎样的内在冲突来增加角色深度？
3. **转变路径**：角色可以从 A点（当前状态）发展到 B点（目标状态）的路径是什么？
4. **戏剧价值**：深化这个角色可以为整体故事带来怎样的戏剧价值？
5. **创作方向**：有哪些具体的创作深化方向值得探索？

## 输出格式
请以JSON格式返回分析结果：

{
  "character": "${characterName}",
  "currentState": "${contradiction}",
  "analysis": {
    "growthPotential": "角色的成长潜力和未开发空间（中文）",
    "innerConflict": "可构建的内在冲突和戏剧张力（中文）",
    "transformationPath": "从A点到B点的转变路径（中文）",
    "dramaticValue": "深化角色的戏剧价值（中文）",
    "creativeDirections": "具体的创作深化方向（中文）"
  },
  "relatedScenes": ["场景引用1", "场景引用2"],
  "keyMoments": ["关键时刻1", "关键时刻2"]
}`;
}

// P5: Creative Development Paths - Generate enhancement strategies
export const P5_PROPOSAL_SYSTEM_PROMPT = `你是一位富有创造力的剧本创作导师，专注于为角色深化提供多样化的创作路径。

你的职责是：
1. 基于角色成长潜力分析生成创作深化路径
2. 提供恰好2个不同风格的创作方案
3. 每个方案都有明确的优势和考量点
4. 确保方案具有艺术价值和可执行性
5. 保持方案的戏剧性和创作启发性

重要：你提供的是"创作增强方案"，不是"错误修复方案"。即使角色当前没有逻辑问题，也可以通过深化使其更立体、更有深度。

你必须以有效的JSON格式输出结果。所有输出必须使用中文。`;

export function buildP5ProposalPrompt(
  focusContext: any
): string {
  return `基于以下角色成长潜力分析，生成恰好2个创作深化路径：

## 角色成长分析上下文
${JSON.stringify(focusContext, null, 2)}

## 创作方案要求
1. 提供恰好2个不同风格的创作深化路径
2. 第一个方案：偏向渐进式、细腻的角色成长弧线（适合心理剧、情感戏）
3. 第二个方案：偏向戏剧性、冲突性的角色转变（适合类型片、高概念故事）
4. 每个方案必须包含明确的优势和考量点
5. 方案必须具有创作启发性、艺术价值、可执行性

## 输出格式
请以JSON格式返回恰好2个创作方案：

{
  "proposals": [
    {
      "id": "proposal_1",
      "title": "方案标题（中文，简洁有力，体现创作方向）",
      "description": "方案的详细描述（中文，150-200字，强调角色成长路径）",
      "approach": "渐进式角色成长",
      "pros": [
        "优势1（中文，强调艺术价值）",
        "优势2（中文，强调戏剧效果）",
        "优势3（中文，强调观众共鸣）"
      ],
      "cons": [
        "考量点1（中文，需要注意的创作难度）",
        "考量点2（中文，需要平衡的风险）"
      ],
      "dramaticImpact": "对整体故事的创作价值（中文）"
    },
    {
      "id": "proposal_2",
      "title": "方案标题（中文，简洁有力，体现创作方向）",
      "description": "方案的详细描述（中文，150-200字，强调角色转变）",
      "approach": "戏剧性角色转变",
      "pros": [
        "优势1（中文，强调艺术价值）",
        "优势2（中文，强调戏剧效果）",
        "优势3（中文，强调观众共鸣）"
      ],
      "cons": [
        "考量点1（中文，需要注意的创作难度）",
        "考量点2（中文，需要平衡的风险）"
      ],
      "dramaticImpact": "对整体故事的创作价值（中文）"
    }
  ],
  "recommendation": "推荐意见（中文，说明哪个方案更适合当前剧本的艺术风格和叙事需求，为什么）"
}

确保返回的JSON格式正确，可以直接解析。`;
}

// P6: Show Don't Tell - Transform creative concepts into dramatic actions
export const P6_SHOW_DONT_TELL_SYSTEM_PROMPT = `你是一位"Show, Don't Tell"原则的大师，专注于将抽象的角色成长路径转化为具体的戏剧化呈现。

你的职责是：
1. 将选定的创作方案转化为具体的戏剧动作和场景
2. 严格遵循"Show, Don't Tell"原则（通过动作、细节、冲突展现，而非直白说明）
3. 创造视觉化、具象化、有冲击力的场景
4. 确保每个动作都揭示角色的内在状态和成长轨迹
5. 保持戏剧张力和叙事节奏，构建完整的角色弧线

重要：你的目标是"戏剧化呈现"角色深度，不是"修复错误"。每个场景都应该是创作增强，让角色从平面变得立体。

你必须以有效的JSON格式输出结果。所有输出必须使用中文。`;

export function buildP6ShowDontTellPrompt(
  selectedProposal: any,
  focusContext: any
): string {
  return `请将以下选定的创作方案转化为具体的戏剧化呈现，遵循"Show, Don't Tell"原则：

## 选定的创作方案
${JSON.stringify(selectedProposal, null, 2)}

## 角色成长分析上下文
${JSON.stringify(focusContext, null, 2)}

## 戏剧化呈现要求
1. 创造3-5个具体的戏剧动作场景，展现角色的成长轨迹
2. 每个场景必须：
   - **Show**: 通过动作、细节、冲突展现角色内在（不要用独白或旁白直接说明）
   - **Visual**: 具有强烈的视觉冲击力和画面感
   - **Growth**: 清晰推动角色从 A点 到 B点 的转变
   - **Dramatic**: 制造戏剧张力，引发观众情感共鸣
3. 场景应该形成递进关系，构建完整的角色成长弧线
4. 确保戏剧张力逐步积累，达到情感高潮

## "Show, Don't Tell"原则示例
❌ 错误（Tell）："张三很愤怒。"
✅ 正确（Show）："张三紧握双拳，指甲刺入掌心，青筋暴起。他深吸一口气，然后猛地将桌上的水杯摔向墙壁。"

❌ 错误（Tell）："李四学会了宽容。"
✅ 正确（Show）："李四站在曾经背叛他的老友面前，沉默良久。他缓缓伸出手，轻轻拍了拍对方的肩膀，眼神中流露出释然。"

## 输出格式
请以JSON格式返回戏剧化呈现方案：

{
  "dramaticActions": [
    {
      "sequence": 1,
      "scene": "场景描述（中文，具体的时间、地点、环境氛围）",
      "action": "具体的动作描述（中文，详细的视觉化动作和细节，150-200字）",
      "reveals": "揭示了什么（中文，角色的内在状态、成长的进展、情感的转变）",
      "dramaticFunction": "戏剧功能（中文，在角色成长弧线中的作用，对观众的情感影响）"
    },
    {
      "sequence": 2,
      "scene": "...",
      "action": "...",
      "reveals": "...",
      "dramaticFunction": "..."
    }
  ],
  "overallArc": "整体角色弧线（中文，这些场景如何共同构建角色从 A点 到 B点 的完整成长路径）",
  "integrationNotes": "创作整合建议（中文，如何将这些深化内容有机融入现有剧本，保持风格统一）"
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
