/**
 * Cross-File Issue Advisor
 *
 * AI-powered advisor that generates detailed resolution strategies
 * for cross-file consistency issues
 */

import { DeepSeekClient } from '@/lib/api/deepseek/client';
import { DeepSeekChatRequest } from '@/lib/api/deepseek/types';
import { CrossFileFinding, CrossFileFindingType } from '@/types/diagnostic-report';
import {
  SYSTEM_PROMPT,
  buildResolutionPrompt,
} from './prompts/cross-file-advisor-prompts';

/**
 * Resolution solution structure
 */
export interface ResolutionSolution {
  name: string;
  steps: string[];
  outcome: string;
  impacts: string[];
  difficulty: 'simple' | 'medium' | 'complex';
  recommendation?: string;
}

/**
 * Complete resolution advice
 */
export interface ResolutionAdvice {
  findingId: string;
  findingType: CrossFileFindingType;
  analysis: string;
  solutions: ResolutionSolution[];
  recommendedSolutionIndex: number;
  additionalContext?: {
    characterImpact?: string;
    plotImpact?: string;
    worldbuildingImpact?: string;
  };
}

/**
 * Script context for AI analysis
 */
export interface ScriptContext {
  filename: string;
  episodeNumber: number | null;
  relevantScenes: string;
}

/**
 * Cross-file issue advisor configuration
 */
export interface CrossFileAdvisorConfig {
  /**
   * Maximum tokens for response
   * @default 2000
   */
  maxTokens?: number;

  /**
   * Temperature for AI creativity
   * @default 0.7
   */
  temperature?: number;

  /**
   * Number of solutions to generate
   * @default 3
   */
  solutionCount?: number;
}

/**
 * Cross-file issue advisor
 */
export class CrossFileAdvisor {
  private client: DeepSeekClient;
  private config: Required<CrossFileAdvisorConfig>;

  constructor(apiKey: string, config?: CrossFileAdvisorConfig) {
    this.client = new DeepSeekClient({
      apiKey,
      apiEndpoint: 'https://api.deepseek.com',
    });
    this.config = {
      maxTokens: config?.maxTokens ?? 2000,
      temperature: config?.temperature ?? 0.7,
      solutionCount: config?.solutionCount ?? 3,
    };
  }

  /**
   * Generate resolution advice for a cross-file finding
   */
  async generateAdvice(
    finding: CrossFileFinding,
    scriptContexts: ScriptContext[]
  ): Promise<ResolutionAdvice> {
    console.log(`[CrossFileAdvisor] Generating advice for finding: ${finding.id}`);

    // Build prompt based on finding type
    const userPrompt = buildResolutionPrompt(finding.type, finding, scriptContexts);

    // Call DeepSeek API
    const request: DeepSeekChatRequest = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      response_format: { type: 'json_object' },
    };

    const response = await this.client.chat(request);

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from AI');
    }

    const content = response.choices[0].message.content;

    // Parse JSON response
    const parsed = this.parseAdviceResponse(content);

    // Validate and return
    return {
      findingId: finding.id,
      findingType: finding.type,
      analysis: parsed.analysis,
      solutions: this.normalizeSolutions(parsed.solutions),
      recommendedSolutionIndex: parsed.recommendedSolutionIndex ?? 0,
      additionalContext: {
        characterImpact: parsed.characterImpact,
        plotImpact: parsed.plotImpact,
        worldbuildingImpact: parsed.worldbuildingImpact,
      },
    };
  }

  /**
   * Parse AI response
   */
  private parseAdviceResponse(content: string): any {
    try {
      const parsed = JSON.parse(content);

      if (!parsed.analysis || !parsed.solutions || !Array.isArray(parsed.solutions)) {
        throw new Error('Invalid response structure');
      }

      return parsed;
    } catch (error) {
      console.error('[CrossFileAdvisor] Failed to parse response:', content);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize solutions to ensure correct structure
   */
  private normalizeSolutions(solutions: any[]): ResolutionSolution[] {
    return solutions.map((sol) => ({
      name: sol.name || '未命名方案',
      steps: Array.isArray(sol.steps) ? sol.steps : [],
      outcome: sol.outcome || '',
      impacts: Array.isArray(sol.impacts) ? sol.impacts : [],
      difficulty: this.normalizeDifficulty(sol.difficulty),
      recommendation: sol.recommendation,
    }));
  }

  /**
   * Normalize difficulty level
   */
  private normalizeDifficulty(difficulty: string | undefined): 'simple' | 'medium' | 'complex' {
    const normalized = (difficulty || '').toLowerCase();

    if (normalized.includes('简单') || normalized === 'simple') {
      return 'simple';
    }

    if (normalized.includes('复杂') || normalized === 'complex') {
      return 'complex';
    }

    return 'medium';
  }

  /**
   * Generate batch advice for multiple findings
   */
  async generateBatchAdvice(
    findings: CrossFileFinding[],
    getScriptContexts: (finding: CrossFileFinding) => Promise<ScriptContext[]>
  ): Promise<ResolutionAdvice[]> {
    const advices: ResolutionAdvice[] = [];

    for (const finding of findings) {
      try {
        const contexts = await getScriptContexts(finding);
        const advice = await this.generateAdvice(finding, contexts);
        advices.push(advice);
      } catch (error) {
        console.error(`[CrossFileAdvisor] Failed to generate advice for ${finding.id}:`, error);
        // Continue with other findings
      }
    }

    return advices;
  }

  /**
   * Get the recommended solution for a finding
   */
  getRecommendedSolution(advice: ResolutionAdvice): ResolutionSolution {
    const index = advice.recommendedSolutionIndex;
    if (index >= 0 && index < advice.solutions.length) {
      return advice.solutions[index];
    }
    // Fallback to first solution
    return advice.solutions[0];
  }
}

/**
 * Factory function
 */
export function createCrossFileAdvisor(
  apiKey: string,
  config?: CrossFileAdvisorConfig
): CrossFileAdvisor {
  return new CrossFileAdvisor(apiKey, config);
}
