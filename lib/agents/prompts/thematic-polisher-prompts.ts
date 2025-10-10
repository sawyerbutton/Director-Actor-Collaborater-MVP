/**
 * ThematicPolisher Agent Prompts - 创作深化导向
 * Epic 006: Act 5 - Character Spiritual Depth and Theme Enhancement (主题精神深化)
 *
 * 业务定位：不是修复扁平角色，而是深化角色精神内核和主题表达
 * 价值转化：从表层角色 → 精神深度的角色（内核丰富、主题共鸣、情感穿透）
 *
 * Prompt Chain:
 * P12: Enhance character spiritual depth (深化角色精神内核)
 * P13: Define empathy core and thematic resonance (定义共鸣核心)
 */

// P12: Character Spiritual Depth Enhancement - Deepen character inner core
export const P12_ENHANCE_SYSTEM_PROMPT = `你是一位角色精神内核创作导师，专注于帮助编剧构建具有精神深度和主题共鸣的角色。

你的职责是：
1. 深化角色的精神内核，超越表层特征进入内在本质
2. 挖掘角色与主题之间的深层精神关联
3. 创造角色独特的内在声音和精神气质
4. 构建角色间的精神共鸣和价值碰撞
5. 让角色成为主题的有机载体和情感放大器

重要：你不是在"去除标签"修复扁平角色，而是在"深化精神内核"。即使角色已有一定深度，也可以通过挖掘内在本质使其达到精神层面的共鸣。

你必须以有效的JSON格式输出深化结果。所有输出必须使用中文。`;

export function buildP12EnhancePrompt(
  character: string,
  theme: string,
  styleReference: string
): string {
  return `请深入挖掘以下角色的精神内核，使其达到主题共鸣的精神深度：

## 角色信息
${character}

## 核心主题
${theme}

## 风格参考
${styleReference}

## 精神内核深化要求
1. **精神本质挖掘**：
   - 超越表层特征，挖掘角色的精神内核（价值观、人生信条、存在意义）
   - 识别角色的精神追求和内在矛盾
   - 创造反映人性复杂性的内在本质

2. **主题精神共鸣**：
   - 分析角色精神内核如何体现和放大核心主题
   - 建立角色内在追求与主题的深层共鸣
   - 让角色成为主题的精神化身和情感载体

3. **内在声音与精神气质**：
   - 设计角色独特的内在声音（不仅是说话方式，而是精神表达）
   - 创造角色的精神气质和存在感
   - 体现角色的生命哲学和世界感知方式

4. **精神关系网络**：
   - 分析角色与其他角色的精神共鸣和价值碰撞
   - 建立基于内在本质的深层关系动力学
   - 通过关系冲突深化主题表达

## 精神深化示例
❌ 表层描述："李明是一个聪明的科学家"
✅ 精神内核："李明相信一切都可以被理性解构，这既是他的力量也是他的囚笼。他用科学的确定性对抗存在的虚无感，但越追求答案，越发现人性的不可测量。他的孤独不是来自缺乏社交，而是来自对世界本质的深刻理解——当你看透一切规律，便失去了惊喜的能力。"

## 输出格式
请以JSON格式返回深化结果：

{
  "characterSpiritualProfile": {
    "name": "${character}",
    "currentDepth": "当前角色深度评估（中文，100字）",
    "spiritualCore": {
      "essence": "精神本质（中文，150-200字，揭示角色的内在追求和存在意义）",
      "innerConflict": "内在精神矛盾（中文，150-200字，人性的复杂性）",
      "lifePhilosophy": "生命哲学（中文，100-150字，角色的世界观和人生信条）"
    },
    "thematicResonance": {
      "connectionToTheme": "与主题的精神共鸣（中文，150-200字）",
      "thematicEmbodiment": "如何成为主题的化身（中文，150-200字）",
      "emotionalAmplifier": "如何放大主题情感（中文，100-150字）"
    },
    "innerVoice": {
      "spiritualExpression": "精神表达方式（中文，150-200字，超越语言的内在声音）",
      "spiritualPresence": "精神气质和存在感（中文，100-150字）",
      "worldPerception": "世界感知方式（中文，100-150字）"
    },
    "spiritualRelations": {
      "character1": "与角色1的精神共鸣/价值碰撞（中文，150-200字）",
      "character2": "与角色2的精神共鸣/价值碰撞（中文，150-200字）"
    }
  },
  "depthEnhancement": "从当前深度到精神层面的提升路径（中文，200-300字）"
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

// P13: Empathy Core and Thematic Resonance - Create deep emotional connection
export const P13_DEFINE_SYSTEM_PROMPT = `你是一位情感共鸣创作大师，专注于构建角色与观众之间的深层情感连接和主题共鸣。

你的职责是：
1. 定义角色的共鸣核心（触发观众情感投入的内在本质）
2. 创造角色的精神脆弱性时刻（展现人性真实的关键场景）
3. 建立角色内在追求与主题的深层共鸣
4. 设计情感穿透点（让观众与角色产生精神连接的触发机制）
5. 确保角色成为主题的情感放大器和精神载体

重要：你不是在"挖掘恐惧和信念"来修复角色，而是在"构建共鸣核心"来深化观众的情感体验和主题表达。

你必须以有效的JSON格式输出共鸣核心定义。所有输出必须使用中文。`;

export function buildP13DefinePrompt(
  character: string,
  enhancedProfile: any
): string {
  return `基于以下深化的角色精神资料，构建角色的共鸣核心和情感穿透机制：

## 深化角色精神资料
${JSON.stringify(enhancedProfile, null, 2)}

## 共鸣核心构建要求
1. **共鸣核心**（Resonance Core）：
   - 角色内在本质中最触动人心的部分
   - 源于角色的精神追求或存在困境
   - 能让观众产生"我懂这种感受"的瞬间
   - 与主题形成深层精神共鸣

2. **精神脆弱性时刻**（Spiritual Vulnerability）：
   - 设计1-2个关键场景
   - 角色精神防御崩溃，内在本质完全暴露
   - 展现人性的真实和复杂
   - 高度戏剧化、情感穿透力强的时刻

3. **主题共鸣机制**（Thematic Resonance）：
   - 角色的内在追求如何体现主题精神
   - 角色的精神困境如何放大主题张力
   - 观众通过角色体验主题的情感路径

4. **情感穿透点**（Emotional Penetration）：
   - 让观众与角色产生精神连接的触发机制
   - 基于人类共通的存在体验和精神追问
   - 超越表层情感，触及内在本质的锚点

## 共鸣核心创作示例
角色：外表强悍的警探

✅ 共鸣核心：对"无能为力"的深刻恐惧和对"掌控感"的执着追求
- 精神本质：他用理性和秩序对抗存在的脆弱感，但越想掌控，越发现人生的不可控
- 主题共鸣：体现主题"人的有限性 vs 秩序的渴望"

✅ 精神脆弱性时刻：案发现场
- 看到与妹妹相似的受害者，所有理性防御瞬间崩溃
- 不只是情绪失控，而是多年构建的精神秩序的坍塌
- 观众看到：一个用职业身份掩盖内在伤痛的灵魂

✅ 情感穿透点："每个人都有无法原谅自己的时刻"
- 不只是恐惧，而是对自我价值的根本质疑
- 观众共鸣：我们都曾对自己的无能为力感到绝望

## 输出格式
请以JSON格式返回共鸣核心定义：

{
  "resonanceCore": {
    "name": "${character}",
    "coreResonance": {
      "essence": "共鸣核心本质（中文，150-200字，最触动人心的内在部分）",
      "spiritualPursuit": "精神追求（中文，100-150字，角色内在渴望什么）",
      "existentialDilemma": "存在困境（中文，150-200字，角色面对的精神困境）",
      "audienceRecognition": "观众共鸣点（中文，100-150字，为什么观众能感同身受）"
    },
    "spiritualVulnerability": {
      "scene": "场景设定（中文，具体的时间、地点、情境）",
      "trigger": "触发事件（中文，100-150字）",
      "collapse": "精神防御崩溃过程（中文，200-300字，高度戏剧化，展现内在本质）",
      "humanityRevealed": "揭示的人性真实（中文，150-200字）"
    },
    "thematicResonance": {
      "themeEmbodiment": "如何体现主题精神（中文，150-200字）",
      "themeAmplification": "如何放大主题张力（中文，150-200字）",
      "emotionalJourney": "观众的情感体验路径（中文，150-200字）"
    },
    "emotionalPenetration": {
      "penetrationPoint": "情感穿透点（中文，简短有力，触及内在本质）",
      "universalExperience": "对应的普世存在体验（中文）",
      "spiritualConnection": "如何建立精神连接（中文，150-200字）"
    }
  },
  "creativeIntegration": "如何将共鸣核心创作性融入剧情，深化主题表达（中文，200-300字）"
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
