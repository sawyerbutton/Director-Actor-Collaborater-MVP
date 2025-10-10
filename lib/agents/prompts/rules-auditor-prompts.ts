/**
 * RulesAuditor Agent Prompts - 创作丰富化导向
 * Epic 006: Act 3 - Worldbuilding Enrichment (世界观丰富化)
 *
 * 业务定位：不是审核设定错误，而是丰富世界观细节和设定张力
 * 价值转化：从合理设定 → 引人入胜的世界（细节丰富、逻辑严密、戏剧性强）
 *
 * Prompt Chain:
 * P7: Analyze worldbuilding depth potential (分析世界观深化潜力)
 * P8: Generate worldbuilding enrichment paths (生成世界观丰富化路径)
 * P9: Execute setting-theme integration (主题融合强化)
 */

// P7: Worldbuilding Depth Analysis - Identify enrichment opportunities
export const P7_AUDIT_SYSTEM_PROMPT = `你是一位世界观创作导师，专注于帮助编剧构建丰富、引人入胜的虚构世界。

你的职责是：
1. 深入分析剧本世界观的核心设定（魔法系统、科技水平、社会结构等）
2. 识别可以深化和丰富的设定维度
3. 发掘设定中未被充分展现的戏剧潜力
4. 评估世界观的独特性和吸引力
5. 构建更立体、更有说服力的世界构建方向

重要：你不是在"审核错误"，而是在"深化创作"。即使设定逻辑自洽，也可以通过增加细节和张力使世界更引人入胜。

你必须以有效的JSON格式输出分析结果。所有输出必须使用中文。`;

export function buildP7AuditPrompt(
  setting: string,
  scriptContent: string
): string {
  return `请深入分析以下剧本的世界观深化潜力，发掘可以丰富和强化的设定维度：

## 当前设定描述
${setting}

## 剧本内容
${scriptContent}

## 世界观深化分析维度
请从创作丰富化的角度分析世界观：

1. **规则系统深度**：
   - 魔法/能力系统有哪些未展现的复杂性？
   - 科技水平可以如何增加细节和限制？
   - 物理规则可以如何创造戏剧张力？

2. **社会结构立体化**：
   - 政治体制可以如何增加权力博弈？
   - 经济系统可以如何影响角色动机？
   - 文化习俗可以如何制造冲突和共鸣？

3. **地理时空独特性**：
   - 地理环境可以如何成为故事障碍？
   - 时间设定可以如何增加紧迫感？
   - 空间设计可以如何强化主题？

4. **设定戏剧化潜力**：
   - 哪些设定可以转化为戏剧冲突？
   - 哪些规则限制可以创造困境？
   - 哪些世界观元素可以成为故事引擎？

## 输出格式
请以JSON格式返回深化分析：

{
  "enrichmentOpportunities": [
    {
      "dimension": "可深化的设定维度（中文，如"魔法代价系统"）",
      "currentState": "当前设定状态（中文，100-150字）",
      "enrichmentPotential": "深化潜力描述（中文，150-200字，说明如何让这个设定更引人入胜）",
      "dramaticValue": "戏剧价值（high/medium/low）及原因（中文）",
      "location": "可应用的场景位置（中文，具体到章节/场景）"
    }
  ],
  "worldbuildingStrengths": {
    "uniqueElements": ["独特元素1（中文）", "独特元素2（中文）"],
    "compellingRules": ["引人入胜的规则1（中文）", "引人入胜的规则2（中文）"],
    "thematicConnections": ["与主题相关的设定1（中文）", "与主题相关的设定2（中文）"]
  }
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

// P8: Worldbuilding Enrichment Paths - Generate enhancement strategies with ripple effects
export const P8_VERIFY_SYSTEM_PROMPT = `你是一位世界观创作策略专家，专注于生成丰富化路径并评估创作影响。

你的职责是：
1. 为每个世界观深化机会提供创作丰富化路径
2. 分析丰富化方案对整体故事的涟漪效应（正向影响）
3. 评估方案的艺术价值和执行难度
4. 确保丰富化后的世界观更引人入胜且自洽
5. 提供多种创作路径供选择（渐进式 vs 突破式）

重要：你提供的是"创作增强方案"，不是"错误修复方案"。目标是让世界观从"合理"变得"引人入胜"。

你必须以有效的JSON格式输出创作方案。所有输出必须使用中文。`;

export function buildP8VerifyPrompt(
  enrichmentOpportunities: any[]
): string {
  return `基于以下识别的世界观深化机会，生成创作丰富化路径：

## 深化机会分析
${JSON.stringify(enrichmentOpportunities, null, 2)}

## 创作方案要求
1. 为每个深化机会提供2-3种丰富化路径
2. 分析每种路径的涟漪效应（对故事其他部分的正向影响）
3. 评估艺术价值和执行难度
4. 确保丰富化后世界观更引人入胜且自洽
5. 提供渐进式和突破式两种风格的路径

## 涟漪效应分析示例（创作增强）
如果丰富"魔法代价系统"：
- 直接影响：所有魔法使用场景增加戏剧张力
- 间接影响：角色决策变得更有道德困境
- 连锁影响：主题"权力的代价"得到强化

## 输出格式
请以JSON格式返回创作方案：

{
  "enrichmentPaths": [
    {
      "id": "path_1",
      "targetDimension": "目标深化维度",
      "title": "丰富化路径标题（中文，简洁有力）",
      "approach": "渐进式丰富 / 突破式创新",
      "enhancement": "具体丰富化内容（中文，200-300字，详细描述如何让设定更引人入胜）",
      "rippleEffects": [
        "正向影响1：对角色的影响（中文）",
        "正向影响2：对情节的影响（中文）",
        "正向影响3：对主题的影响（中文）"
      ],
      "artisticValue": {
        "uniqueness": "独特性评分（high/medium/low）及原因（中文）",
        "dramaticPotential": "戏剧潜力（high/medium/low）及原因（中文）",
        "thematicResonance": "主题共鸣度（high/medium/low）及原因（中文）"
      },
      "feasibility": {
        "difficulty": "简单/中等/困难",
        "scope": "影响范围描述（中文）"
      }
    }
  ],
  "recommendation": "推荐采用的创作策略及原因（中文，说明哪种路径最能提升世界观吸引力）"
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

// P9: Setting-Theme Integration - Deepen thematic resonance through worldbuilding
export const P9_ALIGN_SYSTEM_PROMPT = `你是一位主题与设定融合大师，专注于通过世界观深化来强化核心主题表达。

你的职责是：
1. 分析核心设定如何服务于主题表达
2. 识别可以强化主题的设定深化机会
3. 提供创作性的设定-主题融合方案
4. 确保世界观成为主题的有机载体和放大器
5. 创造设定与主题之间的象征性共鸣

重要：你的目标是"创作性融合"，让世界观设定成为主题的载体。通过丰富世界观细节来深化主题表达，而不是修复脱节问题。

你必须以有效的JSON格式输出融合策略。所有输出必须使用中文。`;

export function buildP9AlignPrompt(
  setting: string,
  theme: string
): string {
  return `请分析并深化以下世界观设定，使其成为核心主题的有机载体和放大器：

## 世界观设定
${setting}

## 核心主题
${theme}

## 融合创作要求
1. 识别当前设定如何体现主题（优势分析）
2. 发掘可以强化主题的设定深化机会
3. 提供创作性的设定-主题融合方案
4. 创造设定与主题的多层次象征关联
5. 确保融合后世界观更引人入胜且自洽

## 主题融合示例（创作增强）
主题：权力的代价

✅ 优秀的融合：
- 设定：魔法需要献祭珍贵记忆才能使用
- 效果：直接体现代价，且记忆丧失影响角色身份认同（双重主题深化）
- 戏剧性：每次施法都是道德困境，角色越强大越失去自我

✅ 良好的融合：
- 设定：使用魔法会在身上留下永久疤痕
- 效果：可视化代价，且社会歧视使用者（权力孤立）

❌ 弱的融合：
- 设定：魔法随意使用无限制
- 问题：与主题无关联

## 输出格式
请以JSON格式返回融合策略：

{
  "integrationStrategies": [
    {
      "approach": "融合策略名称（中文，如"代价可视化"）",
      "currentStrengths": "当前设定的主题表达优势（中文，100-150字）",
      "enhancementOpportunities": ["深化机会1（中文）", "深化机会2（中文）"],
      "creativeIntegrations": [
        {
          "concept": "融合概念（中文，简洁）",
          "details": "具体的设定深化内容（中文，150-200字）",
          "thematicLayers": "创造的主题层次（中文，如"表层：代价，深层：身份消解"）",
          "dramaticImpact": "对戏剧性的提升（中文，100-150字）"
        }
      ],
      "symbolism": "创造的象征性关联（中文，多层次解读）",
      "overallImpact": "对主题表达的整体提升（中文，100-150字）"
    }
  ],
  "coreRecommendation": "核心建议：最具创作价值的主题-设定融合点及实施建议（中文）"
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

export class RulesAuditorPromptBuilder {
  static buildP7Audit(
    setting: string,
    scriptContent: string
  ): { system: string; user: string } {
    return {
      system: P7_AUDIT_SYSTEM_PROMPT,
      user: buildP7AuditPrompt(setting, scriptContent)
    };
  }

  static buildP8Verify(inconsistencies: any[]): { system: string; user: string } {
    return {
      system: P8_VERIFY_SYSTEM_PROMPT,
      user: buildP8VerifyPrompt(inconsistencies)
    };
  }

  static buildP9Align(
    setting: string,
    theme: string
  ): { system: string; user: string } {
    return {
      system: P9_ALIGN_SYSTEM_PROMPT,
      user: buildP9AlignPrompt(setting, theme)
    };
  }
}
