/**
 * Cross-File Issue Advisor Prompts
 *
 * AI-powered suggestions for resolving cross-file consistency issues
 */

import { CrossFileFindingType, FindingSeverity } from '@/types/diagnostic-report';

/**
 * System prompt for cross-file issue advisor
 */
export const SYSTEM_PROMPT = `【角色设定】

你是一位资深的多集剧本顾问，专门解决连续剧集之间的逻辑一致性问题。

你的核心能力：
1. 跨集剧情连贯性分析
2. 角色发展轨迹追踪
3. 时间线精确校准
4. 世界观设定统一

【工作原则】

- 优先保持故事连贯性，避免破坏已有情节
- 提供多个可选方案，让创作者有选择空间
- 修复建议要具体可执行，明确指出修改位置
- 考虑修改的连锁影响，避免引入新问题
- 尊重创作意图，不改变故事核心主题

【输出要求】

你必须以有效的JSON格式输出修复方案。
所有描述使用中文。`;

/**
 * Build user prompt for timeline issue resolution
 */
export function buildTimelineResolutionPrompt(
  finding: {
    description: string;
    affectedFiles: Array<{ filename: string; episodeNumber: number | null; location?: any }>;
    evidence: string[];
  },
  scriptContexts: Array<{ filename: string; episodeNumber: number | null; relevantScenes: string }>
): string {
  const filesList = finding.affectedFiles
    .map((f) => `- ${f.filename} (第${f.episodeNumber}集)`)
    .join('\n');

  const evidenceList = finding.evidence.map((e, i) => `${i + 1}. ${e}`).join('\n');

  const contextsSection = scriptContexts
    .map(
      (ctx) => `
### ${ctx.filename} (第${ctx.episodeNumber}集)
${ctx.relevantScenes}
`
    )
    .join('\n');

  return `【问题描述】

${finding.description}

【涉及文件】
${filesList}

【问题证据】
${evidenceList}

【相关场景内容】
${contextsSection}

【任务要求】

请分析这个时间线冲突问题，并提供2-3个可行的修复方案。

每个方案需要包含：
1. 方案名称（简短描述修复思路）
2. 具体修改步骤（明确指出需要修改的文件、场景、行号）
3. 修改后的效果（时间线如何变得一致）
4. 潜在影响（这个修改可能影响的其他情节）
5. 实施难度（简单/中等/复杂）

请以JSON格式输出：
{
  "analysis": "问题根本原因分析",
  "solutions": [
    {
      "name": "方案1名称",
      "steps": ["步骤1", "步骤2", ...],
      "outcome": "修改后效果说明",
      "impacts": ["影响1", "影响2", ...],
      "difficulty": "简单|中等|复杂",
      "recommendation": "推荐理由（如果是推荐方案）"
    }
  ],
  "recommendedSolutionIndex": 0
}`;
}

/**
 * Build user prompt for character issue resolution
 */
export function buildCharacterResolutionPrompt(
  finding: {
    description: string;
    affectedFiles: Array<{ filename: string; episodeNumber: number | null; location?: any }>;
    evidence: string[];
  },
  scriptContexts: Array<{ filename: string; episodeNumber: number | null; relevantScenes: string }>
): string {
  const filesList = finding.affectedFiles
    .map((f) => `- ${f.filename} (第${f.episodeNumber}集)`)
    .join('\n');

  const evidenceList = finding.evidence.map((e, i) => `${i + 1}. ${e}`).join('\n');

  const contextsSection = scriptContexts
    .map(
      (ctx) => `
### ${ctx.filename} (第${ctx.episodeNumber}集)
${ctx.relevantScenes}
`
    )
    .join('\n');

  return `【问题描述】

${finding.description}

【涉及文件】
${filesList}

【问题证据】
${evidenceList}

【相关场景内容】
${contextsSection}

【任务要求】

请分析这个角色一致性问题，并提供2-3个可行的修复方案。

考虑因素：
- 角色首次登场的方式
- 角色名称的统一性
- 角色戏份的合理性
- 角色发展的连贯性

每个方案需要包含：
1. 方案名称
2. 具体修改步骤
3. 修改后的效果
4. 对角色形象的影响
5. 实施难度

请以JSON格式输出：
{
  "analysis": "问题根本原因分析",
  "characterImpact": "对角色塑造的影响分析",
  "solutions": [
    {
      "name": "方案1名称",
      "steps": ["步骤1", "步骤2", ...],
      "outcome": "修改后效果说明",
      "impacts": ["影响1", "影响2", ...],
      "difficulty": "简单|中等|复杂",
      "recommendation": "推荐理由（如果是推荐方案）"
    }
  ],
  "recommendedSolutionIndex": 0
}`;
}

/**
 * Build user prompt for plot issue resolution
 */
export function buildPlotResolutionPrompt(
  finding: {
    description: string;
    affectedFiles: Array<{ filename: string; episodeNumber: number | null; location?: any }>;
    evidence: string[];
  },
  scriptContexts: Array<{ filename: string; episodeNumber: number | null; relevantScenes: string }>
): string {
  const filesList = finding.affectedFiles
    .map((f) => `- ${f.filename} (第${f.episodeNumber}集)`)
    .join('\n');

  const evidenceList = finding.evidence.map((e, i) => `${i + 1}. ${e}`).join('\n');

  const contextsSection = scriptContexts
    .map(
      (ctx) => `
### ${ctx.filename} (第${ctx.episodeNumber}集)
${ctx.relevantScenes}
`
    )
    .join('\n');

  return `【问题描述】

${finding.description}

【涉及文件】
${filesList}

【问题证据】
${evidenceList}

【相关场景内容】
${contextsSection}

【任务要求】

请分析这个情节一致性问题，并提供2-3个可行的修复方案。

考虑因素：
- 情节线索的完整性
- 因果关系的合理性
- 情节发展的节奏
- 悬念的铺垫和解决

每个方案需要包含：
1. 方案名称
2. 具体修改步骤
3. 修改后的效果
4. 对整体剧情的影响
5. 实施难度

请以JSON格式输出：
{
  "analysis": "问题根本原因分析",
  "plotImpact": "对整体剧情的影响分析",
  "solutions": [
    {
      "name": "方案1名称",
      "steps": ["步骤1", "步骤2", ...],
      "outcome": "修改后效果说明",
      "impacts": ["影响1", "影响2", ...],
      "difficulty": "简单|中等|复杂",
      "recommendation": "推荐理由（如果是推荐方案）"
    }
  ],
  "recommendedSolutionIndex": 0
}`;
}

/**
 * Build user prompt for setting issue resolution
 */
export function buildSettingResolutionPrompt(
  finding: {
    description: string;
    affectedFiles: Array<{ filename: string; episodeNumber: number | null; location?: any }>;
    evidence: string[];
  },
  scriptContexts: Array<{ filename: string; episodeNumber: number | null; relevantScenes: string }>
): string {
  const filesList = finding.affectedFiles
    .map((f) => `- ${f.filename} (第${f.episodeNumber}集)`)
    .join('\n');

  const evidenceList = finding.evidence.map((e, i) => `${i + 1}. ${e}`).join('\n');

  const contextsSection = scriptContexts
    .map(
      (ctx) => `
### ${ctx.filename} (第${ctx.episodeNumber}集)
${ctx.relevantScenes}
`
    )
    .join('\n');

  return `【问题描述】

${finding.description}

【涉及文件】
${filesList}

【问题证据】
${evidenceList}

【相关场景内容】
${contextsSection}

【任务要求】

请分析这个场景设定一致性问题，并提供2-3个可行的修复方案。

考虑因素：
- 地点描述的统一性
- 场景氛围的连贯性
- 空间逻辑的合理性
- 世界观设定的一致性

每个方案需要包含：
1. 方案名称
2. 具体修改步骤
3. 修改后的效果
4. 对世界观的影响
5. 实施难度

请以JSON格式输出：
{
  "analysis": "问题根本原因分析",
  "worldbuildingImpact": "对世界观设定的影响分析",
  "solutions": [
    {
      "name": "方案1名称",
      "steps": ["步骤1", "步骤2", ...],
      "outcome": "修改后效果说明",
      "impacts": ["影响1", "影响2", ...],
      "difficulty": "简单|中等|复杂",
      "recommendation": "推荐理由（如果是推荐方案）"
    }
  ],
  "recommendedSolutionIndex": 0
}`;
}

/**
 * Prompt builder factory
 */
export function buildResolutionPrompt(
  findingType: CrossFileFindingType,
  finding: {
    description: string;
    affectedFiles: Array<{ filename: string; episodeNumber: number | null; location?: any }>;
    evidence: string[];
  },
  scriptContexts: Array<{ filename: string; episodeNumber: number | null; relevantScenes: string }>
): string {
  switch (findingType) {
    case 'cross_file_timeline':
      return buildTimelineResolutionPrompt(finding, scriptContexts);
    case 'cross_file_character':
      return buildCharacterResolutionPrompt(finding, scriptContexts);
    case 'cross_file_plot':
      return buildPlotResolutionPrompt(finding, scriptContexts);
    case 'cross_file_setting':
      return buildSettingResolutionPrompt(finding, scriptContexts);
    default:
      throw new Error(`Unknown finding type: ${findingType}`);
  }
}
