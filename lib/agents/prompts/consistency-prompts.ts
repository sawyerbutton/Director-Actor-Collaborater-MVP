import { LogicErrorType, ErrorSeverity } from '@/types/analysis';
import { ERROR_DETECTION_RULES, ErrorDetectionRule } from '../types';

export const SYSTEM_PROMPT = `你是一位专业的剧本一致性分析师，专门检测剧本和电影脚本中的逻辑错误、情节漏洞和不一致之处。

你的职责是：
1. 仔细分析提供的剧本内容
2. 从多个维度识别逻辑不一致性
3. 提供具体、可操作的反馈
4. 根据对故事连贯性的影响评定严重程度
5. 尽可能提出具体的修复建议

你必须以有效的JSON格式输出分析结果，并遵循指定的结构。

严重程度指南：
- CRITICAL（严重）：破坏基本故事逻辑或使情节不可能发生
- HIGH（高）：严重的不一致性，会影响观众理解
- MEDIUM（中等）：明显的问题，会影响观看体验
- LOW（轻微）：大多数观众可能忽略的小问题

请使用中文描述所有的错误和建议。`;

export function buildUserPrompt(
  scriptContent: string,
  checkTypes: LogicErrorType[] = ['timeline', 'character', 'plot', 'dialogue', 'scene'],
  maxErrors: number = 50
): string {
  const selectedRules = ERROR_DETECTION_RULES.filter(rule => 
    checkTypes.includes(rule.type)
  );
  
  const rulesSection = selectedRules.map(rule => 
    `\n### ${rule.name}\n${rule.checkPrompt}\nKey indicators: ${rule.indicators.join(', ')}`
  ).join('\n');

  return `分析以下剧本的一致性问题。重点关注以下几个方面：

${rulesSection}

## 剧本内容：
${scriptContent}

## 分析要求：
1. 系统地检查剧本，逐场分析
2. 交叉对照各场景信息，查找矛盾之处
3. 追踪角色的认知和状态变化
4. 验证时间和空间逻辑
5. 检查对话流程和信息一致性
6. 返回最多${maxErrors}个最重要的错误

## 输出格式：
以JSON数组格式提供你的分析结果。每个错误应包含：
- type: 以下之一 [${checkTypes.join(', ')}]
- severity: 以下之一 [critical, high, medium, low]
- location: 具体的场景/角色/台词引用
- description: 问题的清晰解释（用中文）
- suggestion: 修复建议（可选，用中文）
- context: 相关剧本摘录（可选）

确保你的响应是可以直接解析的有效JSON。所有描述和建议必须使用中文。`;
}

export function buildOutputFormatPrompt(): string {
  return `
Your response must be a valid JSON array following this exact structure:

[
  {
    "type": "timeline|character|plot|dialogue|scene",
    "severity": "critical|high|medium|low",
    "location": {
      "sceneNumber": <number>,
      "characterName": "<character name if applicable>",
      "dialogueIndex": <index if applicable>,
      "timeReference": "<time reference if applicable>"
    },
    "description": "<不一致性的清晰、具体描述（中文）>",
    "suggestion": "<修复问题的具体建议（中文）>",
    "context": "<Relevant excerpt from the script>",
    "relatedElements": ["<scene id>", "<character name>", etc.]
  }
]

Example:
[
  {
    "type": "timeline",
    "severity": "high",
    "location": {
      "sceneNumber": 5,
      "timeReference": "morning"
    },
    "description": "角色提到的'昨天'发生的事件，根据既定时间线实际发生在两天前",
    "suggestion": "将对话改为'两天前'或调整场景的时间设置",
    "context": "JOHN: Remember what happened yesterday at the park?",
    "relatedElements": ["Scene 3", "John"]
  }
]`;
}

export function buildChunkedPrompt(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
  previousContext?: string
): string {
  const contextSection = previousContext 
    ? `\n## Previous Context:\n${previousContext}\n`
    : '';

  return `Analyzing chunk ${chunkIndex + 1} of ${totalChunks}.
${contextSection}
## Current Chunk:
${chunk}

Note: This is a partial analysis. Focus on errors within this chunk and any that relate to the previous context provided.`;
}

export function buildValidationPrompt(errors: any[]): string {
  return `Validate and refine the following detected errors for accuracy and clarity:

${JSON.stringify(errors, null, 2)}

For each error:
1. Verify it's a genuine inconsistency (not a stylistic choice or intentional plot device)
2. Ensure the severity rating is appropriate
3. Clarify the description if needed
4. Add or improve suggestions for fixing

Return the validated errors in the same JSON format, removing any false positives.`;
}

export class PromptBuilder {
  private scriptContent: string;
  private checkTypes: LogicErrorType[];
  private maxErrors: number;

  constructor(
    scriptContent: string,
    checkTypes: LogicErrorType[] = ['timeline', 'character', 'plot', 'dialogue', 'scene'],
    maxErrors: number = 50
  ) {
    this.scriptContent = scriptContent;
    this.checkTypes = checkTypes;
    this.maxErrors = maxErrors;
  }

  buildFullPrompt(): { system: string; user: string } {
    return {
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(this.scriptContent, this.checkTypes, this.maxErrors) + '\n\n' + buildOutputFormatPrompt()
    };
  }

  buildPromptForRule(rule: ErrorDetectionRule): { system: string; user: string } {
    return {
      system: SYSTEM_PROMPT,
      user: `Focus exclusively on ${rule.name} analysis.

${rule.checkPrompt}

Key indicators to watch for: ${rule.indicators.join(', ')}

## Script Content:
${this.scriptContent}

${buildOutputFormatPrompt()}`
    };
  }

  static buildExamplePrompt(): { input: string; output: string } {
    return {
      input: `Scene 1 - INT. OFFICE - MORNING
John enters, looking tired.
JOHN: "I can't believe what happened at the party last night."

Scene 2 - INT. OFFICE - AFTERNOON  
MARY: "John, you weren't at the party. You were home sick, remember?"
JOHN: "Oh right, I was thinking of last week's party."

Scene 3 - INT. BAR - EVENING (FLASHBACK - LAST NIGHT)
John is shown dancing at the party.`,
      
      output: JSON.stringify([
        {
          type: "character",
          severity: "high",
          location: {
            sceneNumber: 3,
            characterName: "John"
          },
          description: "John is shown at the party in Scene 3's flashback, but Mary confirms in Scene 2 that he was home sick",
          suggestion: "Either remove the flashback scene or change Mary's dialogue to match John's actual whereabouts",
          context: "Scene 3 shows John at party, but Scene 2 establishes he was home sick",
          relatedElements: ["Scene 2", "Scene 3", "John", "Mary"]
        }
      ], null, 2)
    };
  }
}