/**
 * Epic 007: Main Synthesis Engine
 *
 * Orchestrates the complete synthesis process: conflict detection, style preservation,
 * and natural integration of all user decisions into the final script.
 */

import { DeepSeekClient } from '../api/deepseek/client';
import { SynthesisPromptBuilder } from './prompt-builder';
import { ConflictDetector } from './conflict-detector';
import { StyleAnalyzer } from './style-analyzer';
import {
  SynthesisResult,
  SynthesisContext,
  SynthesisOptions,
  GroupedDecisions,
  ChangeEntry,
  ValidationReport,
  SynthesisConfig,
  DEFAULT_SYNTHESIS_CONFIG
} from '@/types/synthesis';
import { ActType } from '@prisma/client';
import { AIOutputValidator } from '../agents/ai-output-validator';
import { RetryHelper } from '../utils/retry-helper';

export class SynthesisEngine {
  private client: DeepSeekClient;
  private promptBuilder: SynthesisPromptBuilder;
  private conflictDetector: ConflictDetector;
  private styleAnalyzer: StyleAnalyzer;
  private config: SynthesisConfig;

  constructor(config: Partial<SynthesisConfig> = {}) {
    this.config = { ...DEFAULT_SYNTHESIS_CONFIG, ...config };
    this.client = new DeepSeekClient({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      apiEndpoint: process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com',
      maxRetries: this.config.maxRetries,
      timeout: 60000 // 60s for synthesis
    });
    this.promptBuilder = new SynthesisPromptBuilder();
    this.conflictDetector = new ConflictDetector();
    this.styleAnalyzer = new StyleAnalyzer();
  }

  /**
   * Main synthesis orchestration method
   */
  async synthesizeScript(
    projectId: string,
    originalScript: string,
    decisions: any[], // RevisionDecision[]
    options: SynthesisOptions = {
      preserveOriginalStyle: true,
      conflictResolution: 'auto',
      changeIntegrationMode: 'balanced',
      includeChangeLog: true,
      validateCoherence: true
    }
  ): Promise<SynthesisResult> {
    const startTime = Date.now();

    try {
      // Step 1: Group decisions by act and focus
      const groupedDecisions = this.groupDecisions(decisions);

      // Step 2: Detect and resolve conflicts
      console.log('[Synthesis] Detecting conflicts...');
      const conflictReport = await this.conflictDetector.detectConflicts(groupedDecisions);

      if (conflictReport.unresolvedConflicts.length > 0 && options.conflictResolution === 'manual') {
        throw new Error(`${conflictReport.unresolvedConflicts.length} unresolved conflicts require manual review`);
      }

      // Step 3: Analyze original style
      console.log('[Synthesis] Analyzing script style...');
      const styleProfile = await this.styleAnalyzer.analyzeStyle(originalScript);

      if (!this.styleAnalyzer.validateProfile(styleProfile)) {
        throw new Error('Invalid style profile generated');
      }

      // Step 4: Build synthesis context
      const context: SynthesisContext = {
        originalScript,
        decisions: groupedDecisions,
        resolutions: conflictReport.resolutions,
        styleProfile,
        options
      };

      // Step 5: Generate synthesis prompt
      console.log('[Synthesis] Building synthesis prompt...');
      const synthesisPrompt = this.promptBuilder.buildMasterPrompt(context);

      if (!this.promptBuilder.validatePrompt(synthesisPrompt)) {
        throw new Error('Invalid synthesis prompt generated');
      }

      // Step 6: Execute synthesis (with chunking if needed)
      console.log('[Synthesis] Executing synthesis...');
      const synthesizedScript = await this.executeSynthesis(
        originalScript,
        synthesisPrompt,
        context
      );

      // Step 7: Generate change log
      const changeLog = this.generateChangeLog(decisions, synthesizedScript);

      // Step 8: Calculate confidence
      const confidence = this.calculateConfidence(conflictReport, styleProfile, synthesizedScript);

      // Step 9: Validate if requested
      if (options.validateCoherence) {
        console.log('[Synthesis] Validating coherence...');
        const validation = await this.validateSynthesis(synthesizedScript, originalScript, decisions);
        if (!validation.isValid && validation.issues.some(i => i.severity === 'critical')) {
          throw new Error(`Synthesis validation failed: ${validation.issues[0].description}`);
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        synthesizedScript,
        changeLog: options.includeChangeLog ? changeLog : [],
        conflicts: [conflictReport],
        confidence,
        metadata: {
          decisionsApplied: decisions.map(d => d.id),
          styleProfile,
          processingTime,
          tokenUsage: this.estimateTokenUsage(originalScript, synthesizedScript),
          version: 2, // V2 is the synthesized version
          createdAt: new Date()
        }
      };
    } catch (error) {
      console.error('[Synthesis] Error:', error);
      throw new Error(`Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Groups decisions by act and focus area
   */
  private groupDecisions(decisions: any[]): GroupedDecisions {
    const grouped: GroupedDecisions = {};

    decisions.forEach(decision => {
      const key = `${decision.act}:${decision.focusName}`;

      if (!grouped[key]) {
        grouped[key] = {
          act: decision.act as ActType,
          focusName: decision.focusName,
          decisions: [],
          priority: this.getActPriority(decision.act as ActType)
        };
      }

      grouped[key].decisions.push({
        id: decision.id,
        focusContext: decision.focusContext,
        proposals: decision.proposals,
        userChoice: decision.userChoice || '',
        generatedChanges: decision.generatedChanges
      });
    });

    return grouped;
  }

  /**
   * Gets priority for each act type
   */
  private getActPriority(act: ActType): number {
    const priorities: Record<ActType, number> = {
      ACT2_CHARACTER: 5,
      ACT3_WORLDBUILDING: 4,
      ACT4_PACING: 3,
      ACT5_THEME: 2
    };
    return priorities[act] || 1;
  }

  /**
   * Executes the synthesis with AI
   */
  private async executeSynthesis(
    originalScript: string,
    prompt: any,
    context: SynthesisContext
  ): Promise<string> {
    const scriptLength = originalScript.length;
    const maxChunkSize = this.config.maxTokensPerChunk * 1.5; // Rough character estimate

    // If script is small enough, process in one go
    if (scriptLength < maxChunkSize) {
      return await this.synthesizeChunk(originalScript, prompt);
    }

    // Otherwise, chunk and process
    console.log('[Synthesis] Script too large, using chunking strategy...');
    const chunks = this.promptBuilder.chunkScript(
      originalScript,
      this.config.maxTokensPerChunk,
      Object.values(context.decisions).flatMap(g => g.decisions)
    );

    const synthesizedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[Synthesis] Processing chunk ${i + 1}/${chunks.length}...`);

      // Build chunk-specific prompt
      const chunkPrompt = { ...prompt };
      chunkPrompt.scriptContext = `处理第 ${i + 1}/${chunks.length} 个片段\n场景范围: ${chunks[i].sceneRange.start}-${chunks[i].sceneRange.end}\n\n${chunks[i].chunk}`;

      const synthesizedChunk = await this.synthesizeChunk(chunks[i].chunk, chunkPrompt);
      synthesizedChunks.push(synthesizedChunk);
    }

    // Merge chunks
    return this.mergeChunks(synthesizedChunks);
  }

  /**
   * Synthesizes a single chunk
   */
  private async synthesizeChunk(chunk: string, prompt: any): Promise<string> {
    const fullPrompt = this.buildFullPrompt(chunk, prompt);

    const response = await RetryHelper.withRetry(
      async () => {
        const result = await this.client.chat({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: prompt.systemPrompt
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          temperature: 0.3, // Low temperature for consistency
          max_tokens: 8000
        });

        return result.choices[0].message.content;
      },
      {
        maxAttempts: this.config.maxRetries,
        backoffMs: [2000, 4000, 8000],
        timeout: 60000
      }
    );

    // Validate response
    if (AIOutputValidator.containsSecurityRisk(response)) {
      throw new Error('Security risk detected in synthesis output');
    }

    return response;
  }

  /**
   * Builds the full synthesis prompt
   */
  private buildFullPrompt(script: string, prompt: any): string {
    const parts: string[] = [];

    parts.push('# 原始剧本片段');
    parts.push(script);
    parts.push('');

    parts.push('# 风格保持指南');
    parts.push(prompt.styleGuidelines);
    parts.push('');

    parts.push('# 需要应用的变更');
    prompt.changeInstructions.forEach((instruction: any, index: number) => {
      parts.push(`## 变更 ${index + 1}: ${instruction.act} - ${instruction.focus}`);
      parts.push(`优先级: ${instruction.priority}`);
      parts.push(`理由: ${instruction.rationale}`);
      parts.push('');
      instruction.changes.forEach((change: string) => {
        parts.push(change);
        parts.push('');
      });
    });

    if (prompt.conflictResolutions && prompt.conflictResolutions.length > 0) {
      parts.push('# 冲突解决方案');
      prompt.conflictResolutions.forEach((resolution: string) => {
        parts.push(resolution);
      });
      parts.push('');
    }

    parts.push('# 任务说明');
    parts.push('请将以上所有变更自然地整合到原始剧本中，确保：');
    parts.push('1. 严格遵循原剧本的风格和语气');
    parts.push('2. 所有变更协调一致，无新增矛盾');
    parts.push('3. 按照优先级顺序应用变更');
    parts.push('4. 保持剧本的整体结构和格式');
    parts.push('');
    parts.push('直接返回修改后的完整剧本，不要添加任何解释或元评论。');

    return parts.join('\n');
  }

  /**
   * Merges synthesized chunks
   */
  private mergeChunks(chunks: string[]): string {
    // Simple merge - in production, would need smarter overlap handling
    return chunks.join('\n\n');
  }

  /**
   * Generates change log
   */
  private generateChangeLog(decisions: any[], synthesizedScript: string): ChangeEntry[] {
    const changeLog: ChangeEntry[] = [];

    decisions.forEach(decision => {
      if (!decision.generatedChanges) return;

      const entry: ChangeEntry = {
        id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        decisionId: decision.id,
        act: decision.act,
        focusName: decision.focusName,
        changeType: 'modification', // Simplified
        modifiedText: JSON.stringify(decision.generatedChanges),
        location: {},
        rationale: this.getChangeRationale(decision.act, decision.focusName),
        appliedAt: new Date()
      };

      changeLog.push(entry);
    });

    return changeLog;
  }

  /**
   * Gets rationale for a change
   */
  private getChangeRationale(act: ActType, focusName: string): string {
    const rationales: Record<ActType, string> = {
      ACT2_CHARACTER: `应用角色 "${focusName}" 的弧光优化`,
      ACT3_WORLDBUILDING: `应用世界观 "${focusName}" 的规则修正`,
      ACT4_PACING: `应用 "${focusName}" 的节奏调整`,
      ACT5_THEME: `应用角色 "${focusName}" 的主题深化`
    };
    return rationales[act] || '应用AI分析结果';
  }

  /**
   * Calculates synthesis confidence
   */
  private calculateConfidence(conflictReport: any, styleProfile: any, synthesizedScript: string): number {
    let confidence = 1.0;

    // Penalty for unresolved conflicts
    const unresolvedCount = conflictReport.unresolvedConflicts?.length || 0;
    confidence -= unresolvedCount * 0.1;

    // Penalty for low-confidence conflict resolutions
    const lowConfidenceResolutions = conflictReport.resolutions?.filter((r: any) => r.confidence < 0.7).length || 0;
    confidence -= lowConfidenceResolutions * 0.05;

    // Bonus for rich style profile
    if (styleProfile.sentencePatterns?.length > 10) {
      confidence += 0.05;
    }

    // Ensure confidence is in [0, 1]
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Validates synthesis result
   */
  private async validateSynthesis(
    synthesized: string,
    original: string,
    decisions: any[]
  ): Promise<ValidationReport> {
    const issues: any[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (synthesized.length < original.length * 0.5) {
      issues.push({
        type: 'completeness',
        severity: 'critical',
        description: '合成剧本长度明显短于原剧本，可能丢失内容'
      });
    }

    if (synthesized.length > original.length * 3) {
      warnings.push('合成剧本长度显著增加，请检查是否过度扩展');
    }

    // Calculate scores
    const coherenceScore = this.calculateCoherenceScore(synthesized);
    const styleConsistencyScore = await this.calculateStyleConsistencyScore(synthesized, original);
    const completenessScore = Math.min(1, synthesized.length / original.length);

    return {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      coherenceScore,
      styleConsistencyScore,
      completenessScore,
      issues,
      warnings
    };
  }

  /**
   * Calculates coherence score
   */
  private calculateCoherenceScore(script: string): number {
    // Simple heuristic: check for scene markers and dialogue structure
    const lines = script.split('\n');
    const sceneLines = lines.filter(l => l.match(/^场景|^SCENE|^INT\.|^EXT\./i)).length;
    const dialogueLines = lines.filter(l => l.match(/^[A-Z\u4e00-\u9fa5]+：/)).length;

    if (sceneLines === 0 || dialogueLines === 0) {
      return 0.5; // Missing structure
    }

    return 0.9; // Simplified - in production would use more sophisticated analysis
  }

  /**
   * Calculates style consistency score
   */
  private async calculateStyleConsistencyScore(synthesized: string, original: string): Promise<number> {
    // Compare style profiles
    const originalProfile = await this.styleAnalyzer.analyzeStyle(original);
    const synthesizedProfile = await this.styleAnalyzer.analyzeStyle(synthesized);

    // Simple comparison
    let score = 1.0;

    if (originalProfile.tone !== synthesizedProfile.tone) {
      score -= 0.2;
    }

    if (originalProfile.dialogueStyle.formalityLevel !== synthesizedProfile.dialogueStyle.formalityLevel) {
      score -= 0.1;
    }

    return Math.max(0, score);
  }

  /**
   * Estimates token usage
   */
  private estimateTokenUsage(original: string, synthesized: string): number {
    return Math.ceil((original.length + synthesized.length) / 1.5);
  }
}
