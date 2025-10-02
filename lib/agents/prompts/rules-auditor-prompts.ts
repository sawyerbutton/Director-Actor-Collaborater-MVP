/**
 * RulesAuditor Agent Prompts
 * Epic 006: Act 3 - Worldbuilding Consistency Audit
 *
 * Prompt Chain:
 * P7: Core setting logic audit
 * P8: Dynamic rule verification
 * P9: Setting-theme alignment
 */

// P7: Core Setting Logic Audit - Detect worldbuilding inconsistencies
export const P7_AUDIT_SYSTEM_PROMPT = `你是一位资深的世界观设定专家，专注于审核剧本中的世界构建逻辑一致性。

你的职责是：
1. 深入分析剧本的核心设定规则（魔法系统、科技水平、社会结构等）
2. 识别设定中的逻辑矛盾和不一致之处
3. 评估每个不一致对故事可信度的影响
4. 定位具体出现问题的场景位置
5. 建立完整的设定规则图谱

你必须以有效的JSON格式输出审计结果。所有输出必须使用中文。`;

export function buildP7AuditPrompt(
  setting: string,
  scriptContent: string
): string {
  return `请深入审计以下剧本的世界观设定一致性：

## 核心设定描述
${setting}

## 剧本内容
${scriptContent}

## 审计维度
请从以下维度检查设定一致性：

1. **规则系统一致性**：
   - 魔法/能力系统是否前后一致？
   - 科技水平是否存在矛盾？
   - 物理规则是否统一？

2. **社会结构逻辑**：
   - 政治体制是否合理？
   - 经济系统是否自洽？
   - 文化习俗是否前后一致？

3. **地理时空设定**：
   - 地理位置是否矛盾？
   - 时间线是否合理？
   - 空间距离是否符合逻辑？

4. **因果逻辑链**：
   - 事件发生是否符合世界观规则？
   - 角色行为是否受设定限制？

## 输出格式
请以JSON格式返回审计结果：

{
  "inconsistencies": [
    {
      "rule": "被违反的规则名称（中文）",
      "location": "出现问题的场景位置（中文，具体到章节/场景）",
      "violation": "违反规则的具体描述（中文，150-200字）",
      "impact": "对世界观可信度的影响程度（high/medium/low）及原因（中文）"
    }
  ],
  "ruleMap": {
    "coreRules": ["核心规则1", "核心规则2"],
    "exceptions": ["例外情况1", "例外情况2"],
    "ambiguities": ["模糊地带1", "模糊地带2"]
  }
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

// P8: Dynamic Rule Verification - Generate solutions with ripple effects
export const P8_VERIFY_SYSTEM_PROMPT = `你是一位世界观动态平衡专家，专注于修复设定矛盾并评估连锁影响。

你的职责是：
1. 为每个设定矛盾提供修复方案
2. 分析修复方案对整体世界观的涟漪效应
3. 评估修复方案的可行性和风险
4. 确保修复后的世界观依然自洽
5. 提供多种修复路径供选择

你必须以有效的JSON格式输出验证结果。所有输出必须使用中文。`;

export function buildP8VerifyPrompt(
  inconsistencies: any[]
): string {
  return `基于以下检测到的设定矛盾，生成动态修复方案：

## 检测到的矛盾
${JSON.stringify(inconsistencies, null, 2)}

## 修复方案要求
1. 为每个矛盾提供2-3种修复路径
2. 分析每种修复的涟漪效应（对其他设定的影响）
3. 评估修复难度和风险
4. 确保修复后世界观整体一致性
5. 优先选择影响范围小、风险低的方案

## 涟漪效应分析示例
如果修复"魔法消耗机制矛盾"：
- 直接影响：所有魔法战斗场景需要调整
- 间接影响：角色实力对比可能改变
- 连锁影响：剧情走向可能需要微调

## 输出格式
请以JSON格式返回修复方案：

{
  "solutions": [
    {
      "id": "solution_1",
      "targetInconsistency": "目标矛盾ID",
      "title": "修复方案标题（中文，简洁）",
      "adjustment": "具体调整内容（中文，200-300字）",
      "rippleEffects": [
        "涟漪效应1：对XX的影响（中文）",
        "涟漪效应2：对YY的影响（中文）",
        "涟漪效应3：对ZZ的影响（中文）"
      ],
      "feasibility": {
        "difficulty": "简单/中等/困难",
        "risk": "低/中/高",
        "scope": "影响范围描述（中文）"
      }
    }
  ],
  "recommendation": "推荐采用的修复策略及原因（中文）"
}

确保返回的JSON格式正确，所有内容使用中文。`;
}

// P9: Setting-Theme Alignment - Align worldbuilding with theme
export const P9_ALIGN_SYSTEM_PROMPT = `你是一位主题与设定融合大师，专注于将世界观设定与核心主题深度结合。

你的职责是：
1. 分析核心设定如何服务于主题表达
2. 识别设定与主题脱节的地方
3. 提供设定优化方案强化主题
4. 确保世界观成为主题的有机载体
5. 创造设定与主题的共鸣点

你必须以有效的JSON格式输出对齐策略。所有输出必须使用中文。`;

export function buildP9AlignPrompt(
  setting: string,
  theme: string
): string {
  return `请分析并优化以下世界观设定，使其更好地服务于核心主题：

## 世界观设定
${setting}

## 核心主题
${theme}

## 对齐分析要求
1. 识别当前设定如何体现主题
2. 发现设定与主题的脱节之处
3. 提供深化主题表达的设定调整
4. 创造设定与主题的象征性关联
5. 确保调整不破坏世界观一致性

## 主题融合示例
主题：权力的代价
✅ 好的设定：魔法需要献祭寿命才能使用（直接体现代价）
❌ 弱的设定：魔法随意使用无限制（与主题无关）

## 输出格式
请以JSON格式返回对齐策略：

{
  "alignmentStrategies": [
    {
      "approach": "对齐策略名称（中文）",
      "currentAlignment": "当前设定如何体现主题（中文，100-150字）",
      "gaps": ["脱节点1（中文）", "脱节点2（中文）"],
      "modifications": [
        "修改建议1：具体的设定调整（中文，150-200字）",
        "修改建议2：具体的设定调整（中文，150-200字）"
      ],
      "thematicImpact": "调整后对主题表达的提升（中文，100-150字）",
      "symbolism": "创造的象征性关联（中文，选填）"
    }
  ],
  "coreRecommendation": "核心建议：最重要的主题-设定融合点（中文）"
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
