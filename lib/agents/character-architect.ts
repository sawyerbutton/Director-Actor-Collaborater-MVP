/**
 * CharacterArchitect Agent
 * Epic 005: Act 2 - Character Arc Iteration System
 *
 * Implements P4-P6 prompt chain:
 * P4: Focus on character contradiction
 * P5: Generate solution proposals
 * P6: Execute "Show, Don't Tell" transformation
 */

import { DeepSeekClient } from '@/lib/api/deepseek/client';
import { DeepSeekChatRequest } from '@/lib/api/deepseek/types';
import { PromptBuilder } from './prompts/character-architect-prompts';

// Type definitions
export interface FocusContext {
  character: string;
  contradiction: string;
  analysis: {
    essence: string;
    rootCause: string;
    manifestation: string;
    impact: string;
    dramaticPotential: string;
  };
  relatedScenes: string[];
  keyMoments: string[];
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  approach: string;
  pros: string[];
  cons: string[];
  dramaticImpact: string;
}

export interface ProposalSet {
  proposals: Proposal[];
  recommendation: string;
}

export interface DramaticAction {
  sequence: number;
  scene: string;
  action: string;
  reveals: string;
  dramaticFunction: string;
}

export interface ShowDontTellResult {
  dramaticActions: DramaticAction[];
  overallArc: string;
  integrationNotes: string;
}

export interface CharacterArchitectConfig {
  apiKey: string;
  apiEndpoint?: string;
  timeout?: number;
  maxRetries?: number;
  temperature?: number;
}

/**
 * CharacterArchitect - AI agent for character arc analysis and revision
 */
export class CharacterArchitect {
  private client: DeepSeekClient;
  private config: CharacterArchitectConfig;

  constructor(config: CharacterArchitectConfig) {
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
   * P4: Focus on character contradiction
   * Analyzes a character contradiction in depth
   */
  async focusCharacter(
    characterName: string,
    contradiction: string,
    scriptContext: string
  ): Promise<FocusContext> {
    const prompts = PromptBuilder.buildP4Focus(
      characterName,
      contradiction,
      scriptContext
    );

    const request: DeepSeekChatRequest = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user }
      ],
      temperature: this.config.temperature,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    };

    try {
      const response = await this.client.chat(request);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from AI');
      }

      const result = this.parseJSON<FocusContext>(content);
      this.validateFocusContext(result);

      return result;
    } catch (error) {
      throw new Error(
        `P4 Focus analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * P5: Generate solution proposals
   * Creates exactly 2 structured proposals for addressing the contradiction
   */
  async proposeSolutions(focusContext: FocusContext): Promise<ProposalSet> {
    const prompts = PromptBuilder.buildP5Proposal(focusContext);

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

      const result = this.parseJSON<ProposalSet>(content);
      this.validateProposalSet(result);

      // Ensure exactly 2 proposals
      if (result.proposals.length !== 2) {
        throw new Error(`Expected exactly 2 proposals, got ${result.proposals.length}`);
      }

      return result;
    } catch (error) {
      throw new Error(
        `P5 Proposal generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * P6: Execute "Show, Don't Tell" transformation
   * Converts selected proposal into concrete dramatic actions
   */
  async executeShowDontTell(
    selectedProposal: Proposal,
    focusContext: FocusContext
  ): Promise<ShowDontTellResult> {
    const prompts = PromptBuilder.buildP6ShowDontTell(
      selectedProposal,
      focusContext
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

      const result = this.parseJSON<ShowDontTellResult>(content);
      this.validateShowDontTellResult(result);

      return result;
    } catch (error) {
      throw new Error(
        `P6 Show Don't Tell transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Complete workflow: P4 → P5 → P6
   * Returns all results from the full character iteration process
   */
  async completeCharacterIteration(
    characterName: string,
    contradiction: string,
    scriptContext: string,
    proposalChoice: 0 | 1 // User selects first (0) or second (1) proposal
  ): Promise<{
    focus: FocusContext;
    proposals: ProposalSet;
    dramaticActions: ShowDontTellResult;
  }> {
    // P4: Focus
    const focus = await this.focusCharacter(
      characterName,
      contradiction,
      scriptContext
    );

    // P5: Proposals
    const proposals = await this.proposeSolutions(focus);

    // P6: Show Don't Tell (using selected proposal)
    const selectedProposal = proposals.proposals[proposalChoice];
    const dramaticActions = await this.executeShowDontTell(
      selectedProposal,
      focus
    );

    return {
      focus,
      proposals,
      dramaticActions
    };
  }

  // ========== Validation Methods ==========

  private validateFocusContext(context: any): asserts context is FocusContext {
    if (!context.character || typeof context.character !== 'string') {
      throw new Error('Invalid FocusContext: missing or invalid character');
    }

    if (!context.contradiction || typeof context.contradiction !== 'string') {
      throw new Error('Invalid FocusContext: missing or invalid contradiction');
    }

    if (
      !context.analysis ||
      typeof context.analysis !== 'object' ||
      !context.analysis.essence ||
      !context.analysis.rootCause ||
      !context.analysis.manifestation
    ) {
      throw new Error('Invalid FocusContext: missing or invalid analysis');
    }

    if (!Array.isArray(context.relatedScenes)) {
      throw new Error('Invalid FocusContext: relatedScenes must be an array');
    }

    if (!Array.isArray(context.keyMoments)) {
      throw new Error('Invalid FocusContext: keyMoments must be an array');
    }
  }

  private validateProposalSet(proposalSet: any): asserts proposalSet is ProposalSet {
    if (!Array.isArray(proposalSet.proposals)) {
      throw new Error('Invalid ProposalSet: proposals must be an array');
    }

    proposalSet.proposals.forEach((proposal: any, index: number) => {
      if (!proposal.id || typeof proposal.id !== 'string') {
        throw new Error(`Invalid Proposal ${index}: missing or invalid id`);
      }

      if (!proposal.title || typeof proposal.title !== 'string') {
        throw new Error(`Invalid Proposal ${index}: missing or invalid title`);
      }

      if (!proposal.description || typeof proposal.description !== 'string') {
        throw new Error(`Invalid Proposal ${index}: missing or invalid description`);
      }

      if (!Array.isArray(proposal.pros) || proposal.pros.length === 0) {
        throw new Error(`Invalid Proposal ${index}: pros must be a non-empty array`);
      }

      if (!Array.isArray(proposal.cons) || proposal.cons.length === 0) {
        throw new Error(`Invalid Proposal ${index}: cons must be a non-empty array`);
      }
    });

    if (!proposalSet.recommendation || typeof proposalSet.recommendation !== 'string') {
      throw new Error('Invalid ProposalSet: missing or invalid recommendation');
    }
  }

  private validateShowDontTellResult(
    result: any
  ): asserts result is ShowDontTellResult {
    if (!Array.isArray(result.dramaticActions) || result.dramaticActions.length === 0) {
      throw new Error('Invalid ShowDontTellResult: dramaticActions must be a non-empty array');
    }

    result.dramaticActions.forEach((action: any, index: number) => {
      if (typeof action.sequence !== 'number') {
        throw new Error(`Invalid DramaticAction ${index}: missing or invalid sequence`);
      }

      if (!action.scene || typeof action.scene !== 'string') {
        throw new Error(`Invalid DramaticAction ${index}: missing or invalid scene`);
      }

      if (!action.action || typeof action.action !== 'string') {
        throw new Error(`Invalid DramaticAction ${index}: missing or invalid action`);
      }

      if (!action.reveals || typeof action.reveals !== 'string') {
        throw new Error(`Invalid DramaticAction ${index}: missing or invalid reveals`);
      }

      if (!action.dramaticFunction || typeof action.dramaticFunction !== 'string') {
        throw new Error(`Invalid DramaticAction ${index}: missing or invalid dramaticFunction`);
      }
    });

    if (!result.overallArc || typeof result.overallArc !== 'string') {
      throw new Error('Invalid ShowDontTellResult: missing or invalid overallArc');
    }

    if (!result.integrationNotes || typeof result.integrationNotes !== 'string') {
      throw new Error('Invalid ShowDontTellResult: missing or invalid integrationNotes');
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
 * Factory function to create CharacterArchitect instance
 */
export function createCharacterArchitect(
  config?: Partial<CharacterArchitectConfig>
): CharacterArchitect {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required');
  }

  return new CharacterArchitect({
    apiKey,
    ...config
  });
}
