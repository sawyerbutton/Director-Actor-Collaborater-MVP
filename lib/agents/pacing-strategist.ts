/**
 * PacingStrategist Agent
 * Epic 006: Act 4 - Pacing and Structure Optimization
 *
 * Implements P10-P11 prompt chain:
 * P10: Rhythm and emotional space analysis
 * P11: Conflict redistribution
 */

import { DeepSeekClient } from '@/lib/api/deepseek/client';
import { DeepSeekChatRequest } from '@/lib/api/deepseek/types';
import { PacingStrategistPromptBuilder } from './prompts/pacing-strategist-prompts';

// Type definitions
export type PacingIssueType = 'information_overload' | 'emotional_compression' | 'conflict_stacking';
export type SeverityLevel = 'high' | 'medium' | 'low';

export interface PacingIssue {
  episode: number;
  issue: PacingIssueType;
  severity: SeverityLevel;
  description: string;
  location: string;
  audienceImpact: string;
}

export interface EmotionalCurve {
  peaks: string[];
  valleys: string[];
  transitions: string[];
}

export interface PacingAnalysis {
  pacingIssues: PacingIssue[];
  emotionalCurve: EmotionalCurve;
  overallAssessment: string;
}

export type RestructureApproach = 'foreshadowing' | 'resequencing' | 'spacing';

export interface ConflictChange {
  episode: number;
  modification: string;
  rationale: string;
}

export interface RestructureStrategy {
  id: string;
  approach: RestructureApproach;
  title: string;
  description: string;
  changes: ConflictChange[];
  expectedImprovement: string;
  risks: string[];
}

export interface RestructureResult {
  strategies: RestructureStrategy[];
  recommendedSequence: string;
  continuityChecks: string[];
}

export interface PacingStrategistConfig {
  apiKey: string;
  apiEndpoint?: string;
  timeout?: number;
  maxRetries?: number;
  temperature?: number;
}

/**
 * PacingStrategist - AI agent for pacing and structure optimization
 */
export class PacingStrategist {
  private client: DeepSeekClient;
  private config: PacingStrategistConfig;

  constructor(config: PacingStrategistConfig) {
    this.config = {
      apiEndpoint: process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com',
      timeout: 60000,
      maxRetries: 3,
      temperature: 0.7,
      ...config
    };

    this.client = new DeepSeekClient({
      apiKey: this.config.apiKey,
      apiEndpoint: this.config.apiEndpoint!,
      timeout: this.config.timeout!,
      maxRetries: this.config.maxRetries!
    });
  }

  /**
   * P10: Rhythm and emotional space analysis
   * Analyzes pacing issues in the script
   */
  async analyzePacing(
    episodes: string,
    timeRange: string
  ): Promise<PacingAnalysis> {
    const prompts = PacingStrategistPromptBuilder.buildP10Analyze(
      episodes,
      timeRange
    );

    const request: DeepSeekChatRequest = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user }
      ],
      temperature: this.config.temperature,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    };

    try {
      const response = await this.client.chat(request);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from AI');
      }

      const result = this.parseJSON<PacingAnalysis>(content);
      this.validatePacingAnalysis(result);

      return result;
    } catch (error) {
      throw new Error(
        `P10 Pacing analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * P11: Conflict redistribution
   * Generates restructuring strategies for better pacing
   */
  async restructureConflicts(
    issues: PacingIssue[]
  ): Promise<RestructureResult> {
    const prompts = PacingStrategistPromptBuilder.buildP11Restructure(issues);

    const request: DeepSeekChatRequest = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user }
      ],
      temperature: this.config.temperature,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    };

    try {
      const response = await this.client.chat(request);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from AI');
      }

      const result = this.parseJSON<RestructureResult>(content);
      this.validateRestructureResult(result);

      return result;
    } catch (error) {
      throw new Error(
        `P11 Restructure failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Complete workflow: P10 → P11
   * Returns all results from the full pacing optimization
   */
  async completePacingOptimization(
    episodes: string,
    timeRange: string
  ): Promise<{
    analysis: PacingAnalysis;
    restructure: RestructureResult;
  }> {
    // P10: Analyze
    const analysis = await this.analyzePacing(episodes, timeRange);

    // P11: Restructure (only if issues found)
    let restructure: RestructureResult = {
      strategies: [],
      recommendedSequence: '未发现节奏问题，无需重构',
      continuityChecks: []
    };

    if (analysis.pacingIssues.length > 0) {
      restructure = await this.restructureConflicts(analysis.pacingIssues);
    }

    return {
      analysis,
      restructure
    };
  }

  // ========== Validation Methods ==========

  private validatePacingAnalysis(result: any): asserts result is PacingAnalysis {
    if (!Array.isArray(result.pacingIssues)) {
      throw new Error('Invalid PacingAnalysis: pacingIssues must be an array');
    }

    result.pacingIssues.forEach((issue: any, index: number) => {
      if (typeof issue.episode !== 'number') {
        throw new Error(`Invalid PacingIssue ${index}: episode must be a number`);
      }

      if (!['information_overload', 'emotional_compression', 'conflict_stacking'].includes(issue.issue)) {
        throw new Error(`Invalid PacingIssue ${index}: invalid issue type`);
      }

      if (!['high', 'medium', 'low'].includes(issue.severity)) {
        throw new Error(`Invalid PacingIssue ${index}: invalid severity level`);
      }

      if (!issue.description || typeof issue.description !== 'string') {
        throw new Error(`Invalid PacingIssue ${index}: missing or invalid description`);
      }

      if (!issue.location || typeof issue.location !== 'string') {
        throw new Error(`Invalid PacingIssue ${index}: missing or invalid location`);
      }

      if (!issue.audienceImpact || typeof issue.audienceImpact !== 'string') {
        throw new Error(`Invalid PacingIssue ${index}: missing or invalid audienceImpact`);
      }
    });

    if (!result.emotionalCurve || typeof result.emotionalCurve !== 'object') {
      throw new Error('Invalid PacingAnalysis: emotionalCurve must be an object');
    }

    if (!Array.isArray(result.emotionalCurve.peaks)) {
      throw new Error('Invalid EmotionalCurve: peaks must be an array');
    }

    if (!Array.isArray(result.emotionalCurve.valleys)) {
      throw new Error('Invalid EmotionalCurve: valleys must be an array');
    }

    if (!Array.isArray(result.emotionalCurve.transitions)) {
      throw new Error('Invalid EmotionalCurve: transitions must be an array');
    }

    if (!result.overallAssessment || typeof result.overallAssessment !== 'string') {
      throw new Error('Invalid PacingAnalysis: missing or invalid overallAssessment');
    }
  }

  private validateRestructureResult(result: any): asserts result is RestructureResult {
    if (!Array.isArray(result.strategies)) {
      throw new Error('Invalid RestructureResult: strategies must be an array');
    }

    result.strategies.forEach((strategy: any, index: number) => {
      if (!strategy.id || typeof strategy.id !== 'string') {
        throw new Error(`Invalid Strategy ${index}: missing or invalid id`);
      }

      if (!['foreshadowing', 'resequencing', 'spacing'].includes(strategy.approach)) {
        throw new Error(`Invalid Strategy ${index}: invalid approach type`);
      }

      if (!strategy.title || typeof strategy.title !== 'string') {
        throw new Error(`Invalid Strategy ${index}: missing or invalid title`);
      }

      if (!strategy.description || typeof strategy.description !== 'string') {
        throw new Error(`Invalid Strategy ${index}: missing or invalid description`);
      }

      if (!Array.isArray(strategy.changes)) {
        throw new Error(`Invalid Strategy ${index}: changes must be an array`);
      }

      strategy.changes.forEach((change: any, changeIndex: number) => {
        if (typeof change.episode !== 'number') {
          throw new Error(`Invalid Change ${changeIndex} in Strategy ${index}: episode must be a number`);
        }

        if (!change.modification || typeof change.modification !== 'string') {
          throw new Error(`Invalid Change ${changeIndex} in Strategy ${index}: missing or invalid modification`);
        }

        if (!change.rationale || typeof change.rationale !== 'string') {
          throw new Error(`Invalid Change ${changeIndex} in Strategy ${index}: missing or invalid rationale`);
        }
      });

      if (!strategy.expectedImprovement || typeof strategy.expectedImprovement !== 'string') {
        throw new Error(`Invalid Strategy ${index}: missing or invalid expectedImprovement`);
      }

      if (!Array.isArray(strategy.risks)) {
        throw new Error(`Invalid Strategy ${index}: risks must be an array`);
      }
    });

    if (!result.recommendedSequence || typeof result.recommendedSequence !== 'string') {
      throw new Error('Invalid RestructureResult: missing or invalid recommendedSequence');
    }

    if (!Array.isArray(result.continuityChecks)) {
      throw new Error('Invalid RestructureResult: continuityChecks must be an array');
    }
  }

  /**
   * Safe JSON parsing with error handling
   */
  private parseJSON<T>(content: string): T {
    try {
      return JSON.parse(content);
    } catch (error) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          throw new Error('Failed to parse JSON from markdown block');
        }
      }

      // Try to find JSON object in text
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch {
          throw new Error('Failed to parse JSON object from text');
        }
      }

      throw new Error('No valid JSON found in response');
    }
  }
}

/**
 * Factory function to create PacingStrategist instance
 */
export function createPacingStrategist(
  config?: Partial<PacingStrategistConfig>
): PacingStrategist {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required');
  }

  return new PacingStrategist({
    apiKey,
    ...config
  });
}
