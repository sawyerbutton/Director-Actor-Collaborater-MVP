/**
 * ThematicPolisher Agent Prompts
 * Epic 006: Act 5 - Character Depth and Empathy Enhancement
 *
 * Prompt Chain:
 * P12: Character de-labeling and depth
 * P13: Core fears and beliefs
 */

// P12: Character De-labeling and Depth - Enhance character depth
export const P12_ENHANCE_SYSTEM_PROMPT = `你是一位角色塑造大师，专注于去除角色的标签化特征，创造立体、独特、有深度的角色。

你的职责是：
1. 识别并去除角色的通用标签和刻板印象
2. 挖掘角色的独特性格特征和声音风格
3. 建立角色与主题的深层关联
4. 构建角色之间的复杂关系动力学
5. 创造角色的独特声音和表达方式

你必须以有效的JSON格式输出增强结果。所有输出必须使用中文。`;

export function buildP12EnhancePrompt(
  character: string,
  theme: string,
  styleReference: string
): string {
  return `请深入增强以下角色的深度，去除标签化特征：

## 角色信息
${character}

## 核心主题
${theme}

## 风格参考
${styleReference}

## 角色增强要求
1. **去标签化**：
   - 识别当前角色的通用标签（如"聪明的科学家"、"勇敢的战士"）
   - 用具体、独特的特质替代标签
   - 创造反直觉但合理的性格组合

2. **主题角色定位**：
   - 分析角色如何服务于核心主题
   - 建立角色内在与主题的有机联系
   - 确保角色弧线推动主题表达

3. **独特声音风格**：
   - 设计角色的独特说话方式
   - 创造角色的思维模式和决策逻辑
   - 体现角色的文化背景和经历

4. **关系动力学**：
   - 分析角色与其他主要角色的关系
   - 建立复杂、多层次的互动模式
   - 避免简单的对立或支持关系

## 去标签化示例
❌ 标签化："李明是一个聪明的科学家"
✅ 独特化："李明在实验室里精准如钟表，但面对人际冲突时会用科学术语掩饰情感脆弱。他习惯用概率思维分析一切，包括感情，这让他既理性又孤独。"

## 输出格式
请以JSON格式返回增强结果：

{
  "characterProfile": {
    "name": "${character}",
    "originalLabels": ["原有标签1", "原有标签2"],
    "enhancedTraits": [
      "独特特质1（中文，具体、反直觉、有深度）",
      "独特特质2（中文，具体、反直觉、有深度）",
      "独特特质3（中文，具体、反直觉、有深度）"
    ],
    "thematicRole": "角色在主题中的定位和作用（中文，150-200字）",
    "uniqueVoice": {
      "speechPattern": "说话方式特征（中文，100-150字）",
      "thinkingStyle": "思维模式（中文，100-150字）",
      "decisionLogic": "决策逻辑（中文，100-150字）"
    },
    "relationalDynamics": {
      "character1": "与角色1的关系动力学（中文，100-150字）",
      "character2": "与角色2的关系动力学（中文，100-150字）"
    }
  },
  "styleAlignment": "如何体现参考风格（中文，100-150字）"
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

// P13: Core Fears and Beliefs - Define character's emotional core
export const P13_DEFINE_SYSTEM_PROMPT = `你是一位角色心理学专家，专注于挖掘角色的核心恐惧、限制性信念和情感脆弱性。

你的职责是：
1. 定义角色的核心恐惧（不可言说的深层恐惧）
2. 识别角色的限制性信念（阻碍成长的内在信条）
3. 创造角色的脆弱性时刻（展现真实内在的关键场景）
4. 设计共情钩（让观众情感共鸣的触发点）
5. 确保内在动机与外在行为的一致性

你必须以有效的JSON格式输出核心定义。所有输出必须使用中文。`;

export function buildP13DefinePrompt(
  character: string,
  enhancedProfile: any
): string {
  return `基于以下增强的角色资料，定义角色的情感核心：

## 增强角色资料
${JSON.stringify(enhancedProfile, null, 2)}

## 情感核心定义要求
1. **核心恐惧**（Core Fear）：
   - 必须是深层的、不可言说的恐惧
   - 源于角色的过往经历或内在本质
   - 驱动角色的大部分选择和行为
   - 具体、可感知、能引发共鸣

2. **限制性信念**（Limiting Belief）：
   - 角色对自己或世界的错误认知
   - 阻碍角色成长和幸福的内在信条
   - 与核心恐惧密切相关
   - 可以在剧情中被挑战和转变

3. **脆弱性时刻**（Vulnerability Moment）：
   - 设计1-2个关键场景
   - 角色的防御机制崩溃的瞬间
   - 真实内在暴露无遗的时刻
   - 高度戏剧化、视觉化的场景

4. **共情钩**（Empathy Hook）：
   - 让观众与角色产生情感连接的触发点
   - 基于人类共通的情感体验
   - 简单、直接、有力的情感锚点

## 情感核心示例
角色：外表强悍的警探
✅ 核心恐惧：害怕被发现自己无法保护所爱之人（源于童年未能救下妹妹）
✅ 限制性信念："只要我足够强大，就能控制一切"
✅ 脆弱性时刻：在案件现场看到与妹妹相似的受害者，当众情绪崩溃
✅ 共情钩：每个人都有无力保护重要之人的恐惧

## 输出格式
请以JSON格式返回情感核心定义：

{
  "characterCore": {
    "name": "${character}",
    "coreFear": {
      "description": "核心恐惧描述（中文，150-200字）",
      "origin": "恐惧来源（中文，100-150字）",
      "manifestation": "恐惧如何影响行为（中文，150-200字）"
    },
    "limitingBelief": {
      "belief": "限制性信念陈述（中文，简短有力）",
      "impact": "信念如何限制角色（中文，150-200字）",
      "challenge": "剧情中如何挑战这个信念（中文，150-200字）"
    },
    "vulnerabilityMoment": {
      "scene": "场景设定（中文，具体的时间、地点、情境）",
      "trigger": "触发脆弱性的事件（中文，100-150字）",
      "breakdown": "防御崩溃的过程（中文，200-300字，高度戏剧化）",
      "revelation": "这一刻揭示了什么（中文，100-150字）"
    },
    "empathyHook": {
      "hook": "共情触发点（中文，简短有力）",
      "universalEmotion": "对应的普世情感（中文）",
      "connectionStrategy": "如何建立观众连接（中文，100-150字）"
    }
  },
  "integrationNotes": "如何将情感核心整合到现有剧情（中文，200-300字）"
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

export class ThematicPolisherPromptBuilder {
  static buildP12Enhance(
    character: string,
    theme: string,
    styleReference: string
  ): { system: string; user: string } {
    return {
      system: P12_ENHANCE_SYSTEM_PROMPT,
      user: buildP12EnhancePrompt(character, theme, styleReference)
    };
  }

  static buildP13Define(
    character: string,
    enhancedProfile: any
  ): { system: string; user: string } {
    return {
      system: P13_DEFINE_SYSTEM_PROMPT,
      user: buildP13DefinePrompt(character, enhancedProfile)
    };
  }
}
