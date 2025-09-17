import { LogicErrorType, ErrorSeverity } from '@/types/analysis';
import { ERROR_DETECTION_RULES, ErrorDetectionRule } from '../types';

export const SYSTEM_PROMPT = `You are a professional script consistency analyzer specializing in detecting logical errors, plot holes, and inconsistencies in screenplays and scripts. 

Your role is to:
1. Carefully analyze the provided script content
2. Identify logical inconsistencies across multiple dimensions
3. Provide specific, actionable feedback
4. Rate severity based on impact to story coherence
5. Suggest concrete fixes when possible

You must output your analysis in valid JSON format following the specified schema.

Severity Guidelines:
- CRITICAL: Breaks fundamental story logic or makes the plot impossible
- HIGH: Major inconsistency that disrupts audience understanding
- MEDIUM: Noticeable issue that affects immersion
- LOW: Minor inconsistency that most viewers might overlook`;

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

  return `Analyze the following script for consistency issues. Focus on these specific areas:

${rulesSection}

## Script Content:
${scriptContent}

## Analysis Requirements:
1. Examine the script systematically, scene by scene
2. Cross-reference information across scenes for contradictions
3. Track character knowledge and states throughout
4. Verify temporal and spatial logic
5. Check dialogue flow and information consistency
6. Return up to ${maxErrors} most significant errors

## Output Format:
Provide your analysis as a JSON array of detected errors. Each error should include:
- type: one of [${checkTypes.join(', ')}]
- severity: one of [critical, high, medium, low]
- location: specific scene/character/line reference
- description: clear explanation of the issue
- suggestion: how to fix it (optional)
- context: relevant script excerpt (optional)

Ensure your response is valid JSON that can be parsed directly.`;
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
    "description": "<Clear, specific description of the inconsistency>",
    "suggestion": "<Concrete suggestion for fixing the issue>",
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
    "description": "Character mentions events from 'yesterday' that actually occurred two days ago based on the established timeline",
    "suggestion": "Change dialogue to reference 'two days ago' or adjust the scene's time setting",
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