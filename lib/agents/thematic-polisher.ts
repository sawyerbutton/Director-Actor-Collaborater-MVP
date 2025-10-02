/**
 * ThematicPolisher Agent
 * Epic 006: Act 5 - Character Depth and Empathy Enhancement
 *
 * Implements P12-P13 prompt chain:
 * P12: Character de-labeling and depth
 * P13: Core fears and beliefs
 */

import { DeepSeekClient } from '@/lib/api/deepseek/client';
import { DeepSeekChatRequest } from '@/lib/api/deepseek/types';
import { ThematicPolisherPromptBuilder } from './prompts/thematic-polisher-prompts';

// Type definitions
export interface UniqueVoice {
  speechPattern: string;
  thinkingStyle: string;
  decisionLogic: string;
}

export interface CharacterProfile {
  name: string;
  originalLabels: string[];
  enhancedTraits: string[];
  thematicRole: string;
  uniqueVoice: UniqueVoice;
  relationalDynamics: Record<string, string>;
}

export interface EnhancedProfile {
  characterProfile: CharacterProfile;
  styleAlignment: string;
}

export interface CoreFear {
  description: string;
  origin: string;
  manifestation: string;
}

export interface LimitingBelief {
  belief: string;
  impact: string;
  challenge: string;
}

export interface VulnerabilityMoment {
  scene: string;
  trigger: string;
  breakdown: string;
  revelation: string;
}

export interface EmpathyHook {
  hook: string;
  universalEmotion: string;
  connectionStrategy: string;
}

export interface CharacterCore {
  name: string;
  coreFear: CoreFear;
  limitingBelief: LimitingBelief;
  vulnerabilityMoment: VulnerabilityMoment;
  empathyHook: EmpathyHook;
}

export interface CoreDefinition {
  characterCore: CharacterCore;
  integrationNotes: string;
}

export interface ThematicPolisherConfig {
  apiKey: string;
  apiEndpoint?: string;
  timeout?: number;
  maxRetries?: number;
  temperature?: number;
}

/**
 * ThematicPolisher - AI agent for character depth and empathy enhancement
 */
export class ThematicPolisher {
  private client: DeepSeekClient;
  private config: ThematicPolisherConfig;

  constructor(config: ThematicPolisherConfig) {
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
   * P12: Character de-labeling and depth
   * Enhances character depth by removing generic labels
   */
  async enhanceCharacterDepth(
    character: string,
    theme: string,
    styleReference: string
  ): Promise<EnhancedProfile> {
    const prompts = ThematicPolisherPromptBuilder.buildP12Enhance(
      character,
      theme,
      styleReference
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

      const result = this.parseJSON<EnhancedProfile>(content);
      this.validateEnhancedProfile(result);

      return result;
    } catch (error) {
      throw new Error(
        `P12 Character enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * P13: Core fears and beliefs
   * Defines character's emotional core
   */
  async defineCharacterCore(
    character: string,
    enhancedProfile: CharacterProfile
  ): Promise<CoreDefinition> {
    const prompts = ThematicPolisherPromptBuilder.buildP13Define(
      character,
      enhancedProfile
    );

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

      const result = this.parseJSON<CoreDefinition>(content);
      this.validateCoreDefinition(result);

      return result;
    } catch (error) {
      throw new Error(
        `P13 Core definition failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Complete workflow: P12 → P13
   * Returns all results from the full character polishing process
   */
  async completeCharacterPolishing(
    character: string,
    theme: string,
    styleReference: string
  ): Promise<{
    enhanced: EnhancedProfile;
    core: CoreDefinition;
  }> {
    // P12: Enhance
    const enhanced = await this.enhanceCharacterDepth(
      character,
      theme,
      styleReference
    );

    // P13: Define Core
    const core = await this.defineCharacterCore(
      character,
      enhanced.characterProfile
    );

    return {
      enhanced,
      core
    };
  }

  // ========== Validation Methods ==========

  private validateEnhancedProfile(result: any): asserts result is EnhancedProfile {
    if (!result.characterProfile || typeof result.characterProfile !== 'object') {
      throw new Error('Invalid EnhancedProfile: characterProfile must be an object');
    }

    const profile = result.characterProfile;

    if (!profile.name || typeof profile.name !== 'string') {
      throw new Error('Invalid CharacterProfile: missing or invalid name');
    }

    if (!Array.isArray(profile.originalLabels)) {
      throw new Error('Invalid CharacterProfile: originalLabels must be an array');
    }

    if (!Array.isArray(profile.enhancedTraits) || profile.enhancedTraits.length === 0) {
      throw new Error('Invalid CharacterProfile: enhancedTraits must be a non-empty array');
    }

    if (!profile.thematicRole || typeof profile.thematicRole !== 'string') {
      throw new Error('Invalid CharacterProfile: missing or invalid thematicRole');
    }

    if (!profile.uniqueVoice || typeof profile.uniqueVoice !== 'object') {
      throw new Error('Invalid CharacterProfile: uniqueVoice must be an object');
    }

    if (!profile.uniqueVoice.speechPattern || typeof profile.uniqueVoice.speechPattern !== 'string') {
      throw new Error('Invalid UniqueVoice: missing or invalid speechPattern');
    }

    if (!profile.uniqueVoice.thinkingStyle || typeof profile.uniqueVoice.thinkingStyle !== 'string') {
      throw new Error('Invalid UniqueVoice: missing or invalid thinkingStyle');
    }

    if (!profile.uniqueVoice.decisionLogic || typeof profile.uniqueVoice.decisionLogic !== 'string') {
      throw new Error('Invalid UniqueVoice: missing or invalid decisionLogic');
    }

    if (!profile.relationalDynamics || typeof profile.relationalDynamics !== 'object') {
      throw new Error('Invalid CharacterProfile: relationalDynamics must be an object');
    }

    if (!result.styleAlignment || typeof result.styleAlignment !== 'string') {
      throw new Error('Invalid EnhancedProfile: missing or invalid styleAlignment');
    }
  }

  private validateCoreDefinition(result: any): asserts result is CoreDefinition {
    if (!result.characterCore || typeof result.characterCore !== 'object') {
      throw new Error('Invalid CoreDefinition: characterCore must be an object');
    }

    const core = result.characterCore;

    if (!core.name || typeof core.name !== 'string') {
      throw new Error('Invalid CharacterCore: missing or invalid name');
    }

    // Validate Core Fear
    if (!core.coreFear || typeof core.coreFear !== 'object') {
      throw new Error('Invalid CharacterCore: coreFear must be an object');
    }

    if (!core.coreFear.description || typeof core.coreFear.description !== 'string') {
      throw new Error('Invalid CoreFear: missing or invalid description');
    }

    if (!core.coreFear.origin || typeof core.coreFear.origin !== 'string') {
      throw new Error('Invalid CoreFear: missing or invalid origin');
    }

    if (!core.coreFear.manifestation || typeof core.coreFear.manifestation !== 'string') {
      throw new Error('Invalid CoreFear: missing or invalid manifestation');
    }

    // Validate Limiting Belief
    if (!core.limitingBelief || typeof core.limitingBelief !== 'object') {
      throw new Error('Invalid CharacterCore: limitingBelief must be an object');
    }

    if (!core.limitingBelief.belief || typeof core.limitingBelief.belief !== 'string') {
      throw new Error('Invalid LimitingBelief: missing or invalid belief');
    }

    if (!core.limitingBelief.impact || typeof core.limitingBelief.impact !== 'string') {
      throw new Error('Invalid LimitingBelief: missing or invalid impact');
    }

    if (!core.limitingBelief.challenge || typeof core.limitingBelief.challenge !== 'string') {
      throw new Error('Invalid LimitingBelief: missing or invalid challenge');
    }

    // Validate Vulnerability Moment
    if (!core.vulnerabilityMoment || typeof core.vulnerabilityMoment !== 'object') {
      throw new Error('Invalid CharacterCore: vulnerabilityMoment must be an object');
    }

    if (!core.vulnerabilityMoment.scene || typeof core.vulnerabilityMoment.scene !== 'string') {
      throw new Error('Invalid VulnerabilityMoment: missing or invalid scene');
    }

    if (!core.vulnerabilityMoment.trigger || typeof core.vulnerabilityMoment.trigger !== 'string') {
      throw new Error('Invalid VulnerabilityMoment: missing or invalid trigger');
    }

    if (!core.vulnerabilityMoment.breakdown || typeof core.vulnerabilityMoment.breakdown !== 'string') {
      throw new Error('Invalid VulnerabilityMoment: missing or invalid breakdown');
    }

    if (!core.vulnerabilityMoment.revelation || typeof core.vulnerabilityMoment.revelation !== 'string') {
      throw new Error('Invalid VulnerabilityMoment: missing or invalid revelation');
    }

    // Validate Empathy Hook
    if (!core.empathyHook || typeof core.empathyHook !== 'object') {
      throw new Error('Invalid CharacterCore: empathyHook must be an object');
    }

    if (!core.empathyHook.hook || typeof core.empathyHook.hook !== 'string') {
      throw new Error('Invalid EmpathyHook: missing or invalid hook');
    }

    if (!core.empathyHook.universalEmotion || typeof core.empathyHook.universalEmotion !== 'string') {
      throw new Error('Invalid EmpathyHook: missing or invalid universalEmotion');
    }

    if (!core.empathyHook.connectionStrategy || typeof core.empathyHook.connectionStrategy !== 'string') {
      throw new Error('Invalid EmpathyHook: missing or invalid connectionStrategy');
    }

    if (!result.integrationNotes || typeof result.integrationNotes !== 'string') {
      throw new Error('Invalid CoreDefinition: missing or invalid integrationNotes');
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
 * Factory function to create ThematicPolisher instance
 */
export function createThematicPolisher(
  config?: Partial<ThematicPolisherConfig>
): ThematicPolisher {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required');
  }

  return new ThematicPolisher({
    apiKey,
    ...config
  });
}
