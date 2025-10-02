/**
 * RulesAuditor Agent
 * Epic 006: Act 3 - Worldbuilding Consistency Audit
 *
 * Implements P7-P9 prompt chain:
 * P7: Core setting logic audit
 * P8: Dynamic rule verification
 * P9: Setting-theme alignment
 */

import { DeepSeekClient } from '@/lib/api/deepseek/client';
import { DeepSeekChatRequest } from '@/lib/api/deepseek/types';
import { RulesAuditorPromptBuilder } from './prompts/rules-auditor-prompts';

// Type definitions
export interface RuleInconsistency {
  rule: string;
  location: string;
  violation: string;
  impact: string;
}

export interface RuleMap {
  coreRules: string[];
  exceptions: string[];
  ambiguities: string[];
}

export interface AuditResult {
  inconsistencies: RuleInconsistency[];
  ruleMap: RuleMap;
}

export interface Solution {
  id: string;
  targetInconsistency: string;
  title: string;
  adjustment: string;
  rippleEffects: string[];
  feasibility: {
    difficulty: 'simple' | 'medium' | 'hard';
    risk: 'low' | 'medium' | 'high';
    scope: string;
  };
}

export interface VerificationResult {
  solutions: Solution[];
  recommendation: string;
}

export interface AlignmentStrategy {
  approach: string;
  currentAlignment: string;
  gaps: string[];
  modifications: string[];
  thematicImpact: string;
  symbolism?: string;
}

export interface AlignmentResult {
  alignmentStrategies: AlignmentStrategy[];
  coreRecommendation: string;
}

export interface RulesAuditorConfig {
  apiKey: string;
  apiEndpoint?: string;
  timeout?: number;
  maxRetries?: number;
  temperature?: number;
}

/**
 * RulesAuditor - AI agent for worldbuilding consistency audit
 */
export class RulesAuditor {
  private client: DeepSeekClient;
  private config: RulesAuditorConfig;

  constructor(config: RulesAuditorConfig) {
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
   * P7: Core setting logic audit
   * Detects worldbuilding inconsistencies in the script
   */
  async auditWorldRules(
    setting: string,
    scriptContent: string
  ): Promise<AuditResult> {
    const prompts = RulesAuditorPromptBuilder.buildP7Audit(
      setting,
      scriptContent
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

      const result = this.parseJSON<AuditResult>(content);
      this.validateAuditResult(result);

      return result;
    } catch (error) {
      throw new Error(
        `P7 Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * P8: Dynamic rule verification
   * Generates solutions with ripple effect analysis
   */
  async verifyDynamicConsistency(
    inconsistencies: RuleInconsistency[]
  ): Promise<VerificationResult> {
    const prompts = RulesAuditorPromptBuilder.buildP8Verify(inconsistencies);

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

      const result = this.parseJSON<VerificationResult>(content);
      this.validateVerificationResult(result);

      return result;
    } catch (error) {
      throw new Error(
        `P8 Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * P9: Setting-theme alignment
   * Aligns worldbuilding with thematic goals
   */
  async alignSettingWithTheme(
    setting: string,
    theme: string
  ): Promise<AlignmentResult> {
    const prompts = RulesAuditorPromptBuilder.buildP9Align(
      setting,
      theme
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

      const result = this.parseJSON<AlignmentResult>(content);
      this.validateAlignmentResult(result);

      return result;
    } catch (error) {
      throw new Error(
        `P9 Alignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Complete workflow: P7 → P8 → P9
   * Returns all results from the full worldbuilding audit
   */
  async completeWorldbuildingAudit(
    setting: string,
    scriptContent: string,
    theme: string
  ): Promise<{
    audit: AuditResult;
    verification: VerificationResult;
    alignment: AlignmentResult;
  }> {
    // P7: Audit
    const audit = await this.auditWorldRules(setting, scriptContent);

    // P8: Verify (only if inconsistencies found)
    let verification: VerificationResult = {
      solutions: [],
      recommendation: '未发现设定矛盾，无需修复'
    };

    if (audit.inconsistencies.length > 0) {
      verification = await this.verifyDynamicConsistency(audit.inconsistencies);
    }

    // P9: Align
    const alignment = await this.alignSettingWithTheme(setting, theme);

    return {
      audit,
      verification,
      alignment
    };
  }

  // ========== Validation Methods ==========

  private validateAuditResult(result: any): asserts result is AuditResult {
    if (!Array.isArray(result.inconsistencies)) {
      throw new Error('Invalid AuditResult: inconsistencies must be an array');
    }

    result.inconsistencies.forEach((item: any, index: number) => {
      if (!item.rule || typeof item.rule !== 'string') {
        throw new Error(`Invalid Inconsistency ${index}: missing or invalid rule`);
      }

      if (!item.location || typeof item.location !== 'string') {
        throw new Error(`Invalid Inconsistency ${index}: missing or invalid location`);
      }

      if (!item.violation || typeof item.violation !== 'string') {
        throw new Error(`Invalid Inconsistency ${index}: missing or invalid violation`);
      }

      if (!item.impact || typeof item.impact !== 'string') {
        throw new Error(`Invalid Inconsistency ${index}: missing or invalid impact`);
      }
    });

    if (!result.ruleMap || typeof result.ruleMap !== 'object') {
      throw new Error('Invalid AuditResult: ruleMap must be an object');
    }

    if (!Array.isArray(result.ruleMap.coreRules)) {
      throw new Error('Invalid RuleMap: coreRules must be an array');
    }

    if (!Array.isArray(result.ruleMap.exceptions)) {
      throw new Error('Invalid RuleMap: exceptions must be an array');
    }

    if (!Array.isArray(result.ruleMap.ambiguities)) {
      throw new Error('Invalid RuleMap: ambiguities must be an array');
    }
  }

  private validateVerificationResult(result: any): asserts result is VerificationResult {
    if (!Array.isArray(result.solutions)) {
      throw new Error('Invalid VerificationResult: solutions must be an array');
    }

    result.solutions.forEach((solution: any, index: number) => {
      if (!solution.id || typeof solution.id !== 'string') {
        throw new Error(`Invalid Solution ${index}: missing or invalid id`);
      }

      if (!solution.title || typeof solution.title !== 'string') {
        throw new Error(`Invalid Solution ${index}: missing or invalid title`);
      }

      if (!solution.adjustment || typeof solution.adjustment !== 'string') {
        throw new Error(`Invalid Solution ${index}: missing or invalid adjustment`);
      }

      if (!Array.isArray(solution.rippleEffects)) {
        throw new Error(`Invalid Solution ${index}: rippleEffects must be an array`);
      }

      if (!solution.feasibility || typeof solution.feasibility !== 'object') {
        throw new Error(`Invalid Solution ${index}: feasibility must be an object`);
      }
    });

    if (!result.recommendation || typeof result.recommendation !== 'string') {
      throw new Error('Invalid VerificationResult: missing or invalid recommendation');
    }
  }

  private validateAlignmentResult(result: any): asserts result is AlignmentResult {
    if (!Array.isArray(result.alignmentStrategies)) {
      throw new Error('Invalid AlignmentResult: alignmentStrategies must be an array');
    }

    result.alignmentStrategies.forEach((strategy: any, index: number) => {
      if (!strategy.approach || typeof strategy.approach !== 'string') {
        throw new Error(`Invalid Strategy ${index}: missing or invalid approach`);
      }

      if (!strategy.currentAlignment || typeof strategy.currentAlignment !== 'string') {
        throw new Error(`Invalid Strategy ${index}: missing or invalid currentAlignment`);
      }

      if (!Array.isArray(strategy.gaps)) {
        throw new Error(`Invalid Strategy ${index}: gaps must be an array`);
      }

      if (!Array.isArray(strategy.modifications)) {
        throw new Error(`Invalid Strategy ${index}: modifications must be an array`);
      }

      if (!strategy.thematicImpact || typeof strategy.thematicImpact !== 'string') {
        throw new Error(`Invalid Strategy ${index}: missing or invalid thematicImpact`);
      }
    });

    if (!result.coreRecommendation || typeof result.coreRecommendation !== 'string') {
      throw new Error('Invalid AlignmentResult: missing or invalid coreRecommendation');
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
 * Factory function to create RulesAuditor instance
 */
export function createRulesAuditor(
  config?: Partial<RulesAuditorConfig>
): RulesAuditor {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required');
  }

  return new RulesAuditor({
    apiKey,
    ...config
  });
}
