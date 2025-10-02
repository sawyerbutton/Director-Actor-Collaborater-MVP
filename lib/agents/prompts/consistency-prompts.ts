import { LogicErrorType, ErrorSeverity } from '@/types/analysis';
import { ERROR_DETECTION_RULES, ErrorDetectionRule } from '../types';

export const SYSTEM_PROMPT = `【Prompt 1：设定角色与目标】

你的角色：一个顶级的剧本医生，沟通风格绝对客观、理智、精准，专注于结构化分析。

你的核心任务：为我检查剧本，专注于检测并列出以下几类核心逻辑错误：
1. 角色不一致（角色行为与动机矛盾、性格前后不符）
2. 时间线冲突（时间顺序混乱、时间跳跃不合理、同时性矛盾）
3. 情节漏洞（因果关系断裂、缺失关键铺垫、plot hole）
4. 对话逻辑错误（答非所问、信息凭空出现、对话不连贯）
5. 场景转换问题（空间逻辑矛盾、缺少必要过渡、位置冲突）

【关键要求】：
- 你必须用批判性思维，像侦探一样寻找每一个可疑之处
- 任何逻辑上说不通、需要观众"脑补"才能理解的地方，都要标记出来
- 宁可多报告潜在问题，也不要遗漏真实存在的硬伤
- 每个错误必须指明：错误类型、具体位置、问题描述、修复建议

你必须以有效的JSON格式输出分析结果。
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
    `\n### ${rule.name}\n${rule.checkPrompt}\n关键指标: ${rule.indicators.join('、')}`
  ).join('\n');

  return `【Prompt 2：输入剧本并要求分析】

这是需要诊断的剧本内容，请你开始执行核心任务。

## 剧本内容：
${scriptContent}

【Prompt 3：要求结构化反馈】

请以结构化报告的形式，向我呈现你的分析结果。报告需要明确指出每一个发现的潜在逻辑问题，并解释：
1. 错误归属的类型（角色不一致/时间线冲突/情节漏洞/对话逻辑/场景转换）
2. 定位（在哪个场景/哪一行/涉及哪个角色）
3. 判断依据（为什么这是一个问题）
4. 对剧情的潜在影响
5. 修复建议（如何改正）

## 检测重点：
${rulesSection}

## 分析流程：
1. 逐场景扫描，建立时间线和角色状态追踪表
2. 交叉验证场景之间的信息一致性
3. 检查角色动机与行为的因果链条
4. 验证对话的逻辑连贯性和信息来源
5. 检查场景转换的空间和时间合理性
6. 返回最多${maxErrors}个最严重的错误（优先级：high > medium > low）

【重要】：如果发现逻辑问题，必须在location.content字段中包含问题所在的原始文本摘录

## 输出格式：
以JSON数组格式提供你的分析结果。每个错误应包含：
- type: 以下之一 [${checkTypes.join(', ')}]
- severity: 以下之一 [critical, high, medium, low]
- location: 对象，必须包含以下字段：
  * sceneNumber: 场景编号
  * line: 行号
  * content: **【必填】问题所在的原始文本摘录（直接从剧本中复制，不能为空）**
  * characterName: 角色名称（如适用）
  * dialogueIndex: 对话索引（如适用）
- description: 问题的清晰解释（用中文）
- suggestion: 修复建议（用中文）
- context: 相关剧本摘录（可选）
- confidence: 置信度（0-100），基于以下标准：
  * 90-100: 明确的逻辑错误（如时间线矛盾、角色信息冲突）
  * 70-89: 很可能的问题（需要轻微推理才能发现）
  * 50-69: 可能的问题（存在模糊性，但值得注意）
  * 30-49: 不太确定的问题（可能是风格选择）

**重要**:
1. location.content字段必须包含原始的有问题的文本，不能留空
2. confidence 必须根据问题的明确程度给出合理评分，不要都使用相同值

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
      "line": <line number>,
      "characterName": "<character name if applicable>",
      "dialogueIndex": <index if applicable>,
      "timeReference": "<time reference if applicable>",
      "content": "<原文：问题所在的原始文本摘录>"
    },
    "description": "<不一致性的清晰、具体描述（中文）>",
    "suggestion": "<修复问题的具体建议（中文）>",
    "context": "<Relevant excerpt from the script>",
    "relatedElements": ["<scene id>", "<character name>", etc.]
  }
]

IMPORTANT: The "location.content" field MUST contain the original problematic text from the script. Never leave it empty.

Example:
[
  {
    "type": "timeline",
    "severity": "high",
    "location": {
      "sceneNumber": 5,
      "line": 42,
      "timeReference": "morning",
      "content": "JOHN: Remember what happened yesterday at the park?"
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