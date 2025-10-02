/**
 * Epic 007: Synthesis Prompt Builder
 *
 * Responsible for constructing comprehensive prompts for the synthesis engine
 * that integrate all user decisions from Acts 1-5 into cohesive instructions.
 */

import { ActType } from '@prisma/client';
import {
  SynthesisContext,
  SynthesisPrompt,
  ChangeInstruction,
  GroupedDecisions,
  ScriptChunk,
  ChunkMetadata,
  StyleProfile
} from '@/types/synthesis';
import { AIOutputValidator } from '../agents/ai-output-validator';

export class SynthesisPromptBuilder {
  /**
   * Builds the master synthesis prompt from context
   */
  buildMasterPrompt(context: SynthesisContext): SynthesisPrompt {
    const systemPrompt = this.buildSystemPrompt(context.styleProfile);
    const scriptContext = this.buildScriptContext(context.originalScript);
    const changeInstructions = this.buildChangeInstructions(context.decisions);
    const styleGuidelines = this.buildStyleGuidelines(context.styleProfile);
    const conflictResolutions = this.buildConflictResolutions(context.resolutions);

    return {
      systemPrompt,
      scriptContext,
      changeInstructions,
      styleGuidelines,
      conflictResolutions
    };
  }

  /**
   * Builds the system prompt that defines the synthesis task
   */
  private buildSystemPrompt(styleProfile: StyleProfile): string {
    return `你是一个专业的剧本合成专家，负责将多个AI分析决策自然地整合到原始剧本中。

核心任务：
1. **保持风格一致性**：严格遵循原剧本的语气、叙述风格和对话风格
2. **自然整合变更**：让所有修改看起来像是原作者写的，而非AI添加
3. **维护连贯性**：确保所有变更协调一致，不产生新的矛盾
4. **优先级处理**：按照优先级顺序应用变更，高优先级决策优先

风格要求：
- 叙述视角：${styleProfile.narrativeVoice.perspective}
- 时态使用：${styleProfile.narrativeVoice.tenseUsage}
- 描述程度：${styleProfile.narrativeVoice.descriptiveLevel}
- 对话正式度：${styleProfile.dialogueStyle.formalityLevel}
- 语气基调：${styleProfile.tone}

输出格式：
返回完整的修改后剧本，保持原有的格式和结构。确保：
- 场景标记完整
- 角色对话格式一致
- 动作描述清晰
- 过渡自然流畅

严禁：
- 添加原剧本中没有的新角色（除非明确指示）
- 改变原有的叙述视角
- 引入不符合原风格的表达方式
- 创造与原剧本矛盾的新情节`;
  }

  /**
   * Builds script context summary
   */
  private buildScriptContext(originalScript: string): string {
    const lines = originalScript.split('\n');
    const sceneCount = lines.filter(l => l.match(/^场景|^SCENE|^INT\.|^EXT\./i)).length;
    const dialogueLines = lines.filter(l => l.match(/^[A-Z\u4e00-\u9fa5]+：|^[A-Z\u4e00-\u9fa5]+\s*$/)).length;

    return `原剧本概览：
- 总行数：${lines.length}
- 场景数：${sceneCount}
- 对话行数：${dialogueLines}
- 长度级别：${this.classifyScriptLength(lines.length)}`;
  }

  /**
   * Builds change instructions from grouped decisions
   */
  private buildChangeInstructions(decisions: GroupedDecisions): ChangeInstruction[] {
    const instructions: ChangeInstruction[] = [];

    // Priority mapping for each Act
    const actPriorities: Record<ActType, number> = {
      ACT2_CHARACTER: 5,      // Highest - character arcs are foundational
      ACT3_WORLDBUILDING: 4,  // High - worldbuilding affects everything
      ACT4_PACING: 3,         // Medium-high - pacing structures narrative
      ACT5_THEME: 2           // Medium - theme enriches but doesn't restructure
    };

    for (const [key, group] of Object.entries(decisions)) {
      const changes: string[] = [];

      for (const decision of group.decisions) {
        if (decision.generatedChanges) {
          changes.push(this.formatDecisionChanges(decision, group.act));
        }
      }

      if (changes.length > 0) {
        instructions.push({
          act: group.act,
          focus: group.focusName,
          changes,
          priority: actPriorities[group.act] || 1,
          rationale: this.getActRationale(group.act, group.focusName)
        });
      }
    }

    // Sort by priority (highest first)
    return instructions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Formats decision changes for prompt
   */
  private formatDecisionChanges(decision: any, act: ActType): string {
    const changes = decision.generatedChanges;

    switch (act) {
      case 'ACT2_CHARACTER':
        return this.formatAct2Changes(changes);
      case 'ACT3_WORLDBUILDING':
        return this.formatAct3Changes(changes);
      case 'ACT4_PACING':
        return this.formatAct4Changes(changes);
      case 'ACT5_THEME':
        return this.formatAct5Changes(changes);
      default:
        return JSON.stringify(changes);
    }
  }

  /**
   * Formats Act 2 character arc changes
   */
  private formatAct2Changes(changes: any): string {
    if (!changes.dramaticActions) {
      return '无具体变更';
    }

    const actions = changes.dramaticActions;
    return `角色弧光修改：
- 整体弧光：${actions.overallArc || '未指定'}
- 戏剧动作：${Array.isArray(actions.actions) ? actions.actions.map((a: any) =>
  `场景 ${a.sceneNumber || '?'}: ${a.action || '未知动作'}`).join('\n  ') : '无'}
- 整合说明：${actions.integrationNotes || '无'}`;
  }

  /**
   * Formats Act 3 worldbuilding changes
   */
  private formatAct3Changes(changes: any): string {
    if (!changes.settingThemeAlignment) {
      return '无具体变更';
    }

    const alignment = changes.settingThemeAlignment;
    return `世界构建修改：
- 核心修正：${alignment.coreCorrection || '未指定'}
- 主题对齐策略：${Array.isArray(alignment.alignmentStrategies) ?
  alignment.alignmentStrategies.join('\n  ') : '无'}
- 影响分析：${alignment.impactAnalysis || '无'}`;
  }

  /**
   * Formats Act 4 pacing changes
   */
  private formatAct4Changes(changes: any): string {
    if (!changes.restructureStrategy) {
      return '无具体变更';
    }

    const strategy = changes.restructureStrategy;
    return `节奏优化修改：
- 重组策略：${strategy.strategyName || '未指定'}
- 调整场景：${Array.isArray(strategy.affectedScenes) ?
  strategy.affectedScenes.join(', ') : '无'}
- 执行步骤：${Array.isArray(strategy.executionSteps) ?
  strategy.executionSteps.join('\n  ') : '无'}`;
  }

  /**
   * Formats Act 5 theme changes
   */
  private formatAct5Changes(changes: any): string {
    if (!changes.characterCore) {
      return '无具体变更';
    }

    const core = changes.characterCore;
    return `主题提升修改：
- 核心恐惧：${core.coreFear || '未指定'}
- 核心信念：${core.coreBelief || '未指定'}
- 共情钩子：${Array.isArray(core.empathyHooks) ?
  core.empathyHooks.join('\n  ') : '无'}`;
  }

  /**
   * Gets rationale for each act's changes
   */
  private getActRationale(act: ActType, focusName: string): string {
    const rationales: Record<ActType, string> = {
      ACT2_CHARACTER: `角色 "${focusName}" 的弧光压力测试结果，确保角色矛盾得到戏剧化展现`,
      ACT3_WORLDBUILDING: `世界观规则审核结果，确保设定 "${focusName}" 的逻辑一致性和主题对齐`,
      ACT4_PACING: `节奏优化结果，调整 "${focusName}" 相关场景的节奏和冲突分布`,
      ACT5_THEME: `主题提炼结果，深化角色 "${focusName}" 的情感核心和共鸣点`
    };

    return rationales[act] || `${act} 分析结果应用`;
  }

  /**
   * Builds style preservation guidelines
   */
  private buildStyleGuidelines(styleProfile: StyleProfile): string {
    const guidelines: string[] = [
      `## 风格保持指南`,
      ``,
      `### 语气和基调`,
      `原剧本语气：${styleProfile.tone}`,
      `保持这种语气一致性，避免突然的风格转变。`,
      ``,
      `### 句式结构`,
      `常见句式模式：`
    ];

    // Add top 5 sentence patterns
    const topPatterns = styleProfile.sentencePatterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    topPatterns.forEach(pattern => {
      guidelines.push(`- ${pattern.pattern} (频率: ${pattern.frequency})`);
      if (pattern.examples.length > 0) {
        guidelines.push(`  示例: "${pattern.examples[0]}"`);
      }
    });

    guidelines.push('');
    guidelines.push('### 对话风格');
    guidelines.push(`- 正式度：${styleProfile.dialogueStyle.formalityLevel}`);
    guidelines.push(`- 平均长度：${styleProfile.dialogueStyle.averageLength} 字`);

    if (styleProfile.dialogueStyle.commonPhrases.length > 0) {
      guidelines.push('- 常用表达：');
      styleProfile.dialogueStyle.commonPhrases.slice(0, 10).forEach(phrase => {
        guidelines.push(`  * "${phrase}"`);
      });
    }

    guidelines.push('');
    guidelines.push('### 叙述声音');
    guidelines.push(`- 视角：${styleProfile.narrativeVoice.perspective}`);
    guidelines.push(`- 时态：${styleProfile.narrativeVoice.tenseUsage}`);
    guidelines.push(`- 描述程度：${styleProfile.narrativeVoice.descriptiveLevel}`);

    guidelines.push('');
    guidelines.push('### 节奏特征');
    guidelines.push(`- 平均场景长度：${styleProfile.pacing.averageSceneLength} 行`);
    guidelines.push(`- 对话占比：${(styleProfile.pacing.dialogueRatio * 100).toFixed(1)}%`);
    guidelines.push(`- 描述占比：${(styleProfile.pacing.descriptionRatio * 100).toFixed(1)}%`);

    return guidelines.join('\n');
  }

  /**
   * Builds conflict resolution instructions
   */
  private buildConflictResolutions(resolutions: any[]): string[] {
    if (!resolutions || resolutions.length === 0) {
      return ['没有检测到冲突，所有决策可以直接应用。'];
    }

    return resolutions.map(resolution => {
      return `冲突 ${resolution.conflictId} 的解决方案：
- 策略：${resolution.strategy}
- 应用变更：${resolution.appliedChanges.join(', ')}
- 置信度：${(resolution.confidence * 100).toFixed(1)}%`;
    });
  }

  /**
   * Chunks script for processing within token limits
   */
  chunkScript(
    script: string,
    maxTokens: number = 6000,
    affectedDecisions: any[] = []
  ): ScriptChunk[] {
    const lines = script.split('\n');
    const chunks: ScriptChunk[] = [];

    // Estimate tokens (rough: 1 token ≈ 1.5 characters for Chinese)
    const estimateTokens = (text: string): number => {
      return Math.ceil(text.length / 1.5);
    };

    // Find scene boundaries
    const sceneBoundaries = this.findSceneBoundaries(lines);

    let currentChunk: string[] = [];
    let currentTokens = 0;
    let sceneStart = 0;
    let sceneEnd = 0;
    let chunkId = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTokens = estimateTokens(line);

      if (currentTokens + lineTokens > maxTokens && currentChunk.length > 0) {
        // Create chunk
        chunks.push(this.createChunk(
          `chunk_${chunkId++}`,
          currentChunk.join('\n'),
          { start: sceneStart, end: sceneEnd },
          chunks.length > 0 ? chunks[chunks.length - 1].chunk.split('\n').slice(-10).join('\n') : undefined,
          undefined, // Next overlap will be set when next chunk is created
          affectedDecisions
        ));

        // Start new chunk with overlap
        currentChunk = currentChunk.slice(-5); // Keep last 5 lines for context
        currentTokens = estimateTokens(currentChunk.join('\n'));
        sceneStart = sceneEnd;
      }

      currentChunk.push(line);
      currentTokens += lineTokens;

      // Track scene numbers
      if (sceneBoundaries.includes(i)) {
        sceneEnd = sceneBoundaries.indexOf(i) + 1;
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(
        `chunk_${chunkId}`,
        currentChunk.join('\n'),
        { start: sceneStart, end: sceneEnd },
        chunks.length > 0 ? chunks[chunks.length - 1].chunk.split('\n').slice(-10).join('\n') : undefined,
        undefined,
        affectedDecisions
      ));
    }

    // Set next overlaps
    for (let i = 0; i < chunks.length - 1; i++) {
      chunks[i].overlaps.next = chunks[i + 1].chunk.split('\n').slice(0, 10).join('\n');
    }

    return chunks;
  }

  /**
   * Finds scene boundary line numbers
   */
  private findSceneBoundaries(lines: string[]): number[] {
    const boundaries: number[] = [];
    const sceneMarkers = [
      /^场景/,
      /^SCENE/i,
      /^INT\./i,
      /^EXT\./i,
      /^INT\/EXT\./i
    ];

    lines.forEach((line, index) => {
      if (sceneMarkers.some(marker => marker.test(line.trim()))) {
        boundaries.push(index);
      }
    });

    return boundaries;
  }

  /**
   * Creates a script chunk with metadata
   */
  private createChunk(
    id: string,
    chunk: string,
    sceneRange: { start: number; end: number },
    previousOverlap: string | undefined,
    nextOverlap: string | undefined,
    affectedDecisions: any[]
  ): ScriptChunk {
    const metadata = this.extractChunkMetadata(chunk);
    const decisionIds = affectedDecisions
      .filter(d => this.isDecisionInChunk(d, sceneRange))
      .map(d => d.id);

    return {
      id,
      chunk,
      sceneRange,
      overlaps: {
        previous: previousOverlap,
        next: nextOverlap
      },
      affectedDecisions: decisionIds,
      metadata
    };
  }

  /**
   * Extracts metadata from chunk
   */
  private extractChunkMetadata(chunk: string): ChunkMetadata {
    const lines = chunk.split('\n');

    // Extract character names (lines that are all caps followed by colon or dialogue)
    const characterNames = new Set<string>();
    lines.forEach(line => {
      const match = line.match(/^([A-Z\u4e00-\u9fa5]+)[:：]/);
      if (match) {
        characterNames.add(match[1]);
      }
    });

    // Extract settings (lines starting with scene markers)
    const settings = new Set<string>();
    lines.forEach(line => {
      const sceneMatch = line.match(/^(?:场景|SCENE|INT\.|EXT\.)\s*[：:]\s*(.+)/i);
      if (sceneMatch) {
        settings.add(sceneMatch[1].trim());
      }
    });

    // Estimate token count
    const tokenCount = Math.ceil(chunk.length / 1.5);

    return {
      characterNames: Array.from(characterNames),
      settings: Array.from(settings),
      tokenCount
    };
  }

  /**
   * Checks if a decision affects a chunk
   */
  private isDecisionInChunk(decision: any, sceneRange: { start: number; end: number }): boolean {
    // Simple heuristic: if decision has scene numbers, check overlap
    if (decision.generatedChanges?.dramaticActions?.actions) {
      const actions = decision.generatedChanges.dramaticActions.actions;
      return actions.some((action: any) => {
        const sceneNum = action.sceneNumber;
        return sceneNum >= sceneRange.start && sceneNum <= sceneRange.end;
      });
    }

    // Default: assume it might affect this chunk
    return true;
  }

  /**
   * Classifies script length
   */
  private classifyScriptLength(lines: number): string {
    if (lines < 1000) return '短篇';
    if (lines < 3000) return '中篇';
    if (lines < 10000) return '长篇';
    return '超长篇';
  }

  /**
   * Validates prompt before sending to AI
   */
  validatePrompt(prompt: SynthesisPrompt): boolean {
    if (!prompt.systemPrompt || prompt.systemPrompt.trim().length === 0) {
      return false;
    }

    if (!prompt.scriptContext || prompt.scriptContext.trim().length === 0) {
      return false;
    }

    if (!prompt.changeInstructions || prompt.changeInstructions.length === 0) {
      return false;
    }

    // Check for security risks
    const combined = `${prompt.systemPrompt}\n${prompt.scriptContext}\n${prompt.styleGuidelines}`;
    if (AIOutputValidator.containsSecurityRisk(combined)) {
      console.warn('Security risk detected in synthesis prompt');
      return false;
    }

    return true;
  }
}
