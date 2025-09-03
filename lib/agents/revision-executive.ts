import { LogicError, LogicErrorType, ErrorSeverity } from '@/types/analysis';
import { RevisionSuggestion, SuggestionPriority, RevisionContext } from '@/types/revision';
import { DeepSeekClient } from '@/lib/api/deepseek/client';
import { ConsistencyAgentConfig, AgentResponse, DEFAULT_AGENT_CONFIG } from './types';
import { AIOutputValidator } from './ai-output-validator';

export interface RevisionExecutiveConfig extends ConsistencyAgentConfig {
  maxSuggestionsPerError: number;
  enableContextAnalysis: boolean;
  suggestionDepth: 'basic' | 'detailed' | 'comprehensive';
}

export const DEFAULT_REVISION_CONFIG: RevisionExecutiveConfig = {
  ...DEFAULT_AGENT_CONFIG,
  maxSuggestionsPerError: 3,
  enableContextAnalysis: true,
  suggestionDepth: 'detailed'
};

interface SuggestionTemplate {
  type: LogicErrorType;
  promptTemplate: string;
  contextRequirements: string[];
}

export class RevisionExecutive {
  private client: DeepSeekClient;
  private config: RevisionExecutiveConfig;
  private templates: Map<LogicErrorType, SuggestionTemplate>;

  constructor(config: Partial<RevisionExecutiveConfig> = {}) {
    this.config = { ...DEFAULT_REVISION_CONFIG, ...config };
    this.client = new DeepSeekClient({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      apiEndpoint: process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com'
    });
    this.templates = this.initializeTemplates();
  }

  private initializeTemplates(): Map<LogicErrorType, SuggestionTemplate> {
    const templates = new Map<LogicErrorType, SuggestionTemplate>();

    templates.set(LogicErrorType.TIMELINE, {
      type: LogicErrorType.TIMELINE,
      promptTemplate: `Analyze this timeline error and provide specific fixes:
Error: {error_description}
Location: {location}
Context: {context}

Generate {max_suggestions} concrete modifications that:
1. Resolve the temporal inconsistency
2. Maintain story flow
3. Preserve character actions
4. Include specific text replacements`,
      contextRequirements: ['previous_events', 'current_scene', 'time_markers']
    });

    templates.set(LogicErrorType.CHARACTER, {
      type: LogicErrorType.CHARACTER,
      promptTemplate: `Analyze this character consistency error and provide fixes:
Error: {error_description}
Character: {character_name}
Location: {location}
Context: {context}

Generate {max_suggestions} modifications that:
1. Align with character personality/knowledge
2. Maintain story continuity
3. Fix the inconsistency
4. Provide exact text changes`,
      contextRequirements: ['character_profile', 'character_history', 'scene_context']
    });

    templates.set(LogicErrorType.PLOT, {
      type: LogicErrorType.PLOT,
      promptTemplate: `Analyze this plot logic error and provide solutions:
Error: {error_description}
Location: {location}
Context: {context}

Generate {max_suggestions} fixes that:
1. Resolve the plot hole
2. Maintain narrative coherence
3. Preserve story arc
4. Include specific modifications`,
      contextRequirements: ['plot_summary', 'story_arc', 'causal_chain']
    });

    templates.set(LogicErrorType.DIALOGUE, {
      type: LogicErrorType.DIALOGUE,
      promptTemplate: `Analyze this dialogue error and provide corrections:
Error: {error_description}
Location: {location}
Speakers: {speakers}
Context: {context}

Generate {max_suggestions} dialogue fixes that:
1. Maintain conversation flow
2. Fix information consistency
3. Preserve character voice
4. Provide exact dialogue replacements`,
      contextRequirements: ['conversation_history', 'speaker_profiles', 'dialogue_context']
    });

    templates.set(LogicErrorType.SCENE, {
      type: LogicErrorType.SCENE,
      promptTemplate: `Analyze this scene transition error and provide fixes:
Error: {error_description}
Location: {location}
Scene Info: {scene_info}
Context: {context}

Generate {max_suggestions} scene corrections that:
1. Fix spatial/transition issues
2. Maintain logical flow
3. Clarify movements
4. Include specific text changes`,
      contextRequirements: ['scene_layout', 'character_positions', 'transition_points']
    });

    return templates;
  }

  /**
   * Generates suggestions for fixing a logic error
   * @param error The logic error to generate suggestions for
   * @param context Additional context for suggestion generation
   * @returns Array of revision suggestions
   */
  async generateSuggestions(
    error: LogicError,
    context: RevisionContext
  ): Promise<RevisionSuggestion[]> {
    try {
      const template = this.templates.get(error.type);
      if (!template) {
        throw new Error(`No template found for error type: ${error.type}`);
      }

      const prompt = this.buildPrompt(error, context, template);
      const response = await this.callAI(prompt);
      
      return this.parseSuggestions(response, error);
    } catch (error) {
      // Don't log sensitive error details that might contain API keys
      console.error('Failed to generate suggestions');
      return [];
    }
  }

  /**
   * Builds a safe prompt by sanitizing all parameters
   */
  private buildPrompt(
    error: LogicError,
    context: RevisionContext,
    template: SuggestionTemplate
  ): string {
    // Validate and sanitize all parameters
    const params = AIOutputValidator.validatePromptParams({
      error_description: error.description,
      location: JSON.stringify(error.location),
      max_suggestions: this.config.maxSuggestionsPerError.toString(),
      context: this.formatContext(context),
      character_name: context.characterName || 'Unknown',
      speakers: context.speakers?.join(', ') || 'Unknown',
      scene_info: context.sceneInfo || 'Not provided'
    });

    let prompt = template.promptTemplate;
    
    // Safe parameter replacement
    for (const [key, value] of Object.entries(params)) {
      prompt = prompt.replace(new RegExp(`\{${key}\}`, 'g'), value);
    }

    return prompt;
  }

  private formatContext(context: RevisionContext): string {
    const parts: string[] = [];
    
    if (context.scriptContent) {
      parts.push(`Script excerpt: ${context.scriptContent.substring(0, 500)}`);
    }
    
    if (context.previousEvents && context.previousEvents.length > 0) {
      parts.push(`Previous events: ${context.previousEvents.slice(0, 3).join(', ')}`);
    }
    
    if (context.affectedElements && context.affectedElements.length > 0) {
      parts.push(`Affected elements: ${context.affectedElements.join(', ')}`);
    }

    return parts.join('\n');
  }

  private async callAI(prompt: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.chat({
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: `You are a revision expert that generates specific, actionable modifications to fix script logic errors.
Output format: JSON array of suggestions, each with:
- modification: exact text change
- location: where to apply
- rationale: why this fixes the issue
- impact: expected outcome`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const responseContent = response.choices[0].message.content;
      return {
        raw: responseContent,
        parsed: this.parseJSON(responseContent),
        tokensUsed: response.usage?.total_tokens,
        processingTime: Date.now() - startTime,
        success: true
      };
    } catch (error) {
      return {
        raw: '',
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private parseJSON(content: string): unknown {
    // Check for security risks before parsing
    if (AIOutputValidator.containsSecurityRisk(content)) {
      console.warn('Security risk detected in AI output');
      return null;
    }
    
    return AIOutputValidator.safeJSONParse(content);
  }

  private parseSuggestions(response: AgentResponse, error: LogicError): RevisionSuggestion[] {
    if (!response.success) {
      return this.generateFallbackSuggestion(error);
    }

    // Validate AI output
    const validatedSuggestions = AIOutputValidator.validateSuggestions(response.parsed);
    
    if (!validatedSuggestions || validatedSuggestions.length === 0) {
      return this.generateFallbackSuggestion(error);
    }

    const suggestions: RevisionSuggestion[] = [];
    
    for (const item of validatedSuggestions.slice(0, this.config.maxSuggestionsPerError)) {
      suggestions.push({
        id: `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        errorId: error.id,
        modification: item.modification || '',
        location: item.location || error.location,
        rationale: item.rationale || 'Generated fix',
        priority: this.calculatePriority(error.severity),
        impact: item.impact || 'Resolves the detected inconsistency',
        confidence: this.calculateConfidence(item),
        createdAt: new Date().toISOString()
      });
    }

    return suggestions;
  }

  private generateFallbackSuggestion(error: LogicError): RevisionSuggestion[] {
    return [{
      id: `sug_fallback_${Date.now()}`,
      errorId: error.id,
      modification: `Review and fix: ${error.description}`,
      location: error.location,
      rationale: 'Manual review required',
      priority: SuggestionPriority.MEDIUM,
      impact: 'Requires manual intervention',
      confidence: 0.3,
      createdAt: new Date().toISOString()
    }];
  }

  private calculatePriority(severity: ErrorSeverity): SuggestionPriority {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return SuggestionPriority.CRITICAL;
      case ErrorSeverity.HIGH:
        return SuggestionPriority.HIGH;
      case ErrorSeverity.MEDIUM:
        return SuggestionPriority.MEDIUM;
      case ErrorSeverity.LOW:
        return SuggestionPriority.LOW;
      default:
        return SuggestionPriority.MEDIUM;
    }
  }

  private calculateConfidence(item: any): number {
    let confidence = 0.5;
    
    if (item.modification && item.modification.length > 10) confidence += 0.2;
    if (item.rationale && item.rationale.length > 20) confidence += 0.15;
    if (item.impact) confidence += 0.15;
    
    return Math.min(confidence, 1.0);
  }

  async evaluateSuggestionFeasibility(
    suggestion: RevisionSuggestion,
    context: RevisionContext
  ): Promise<{ feasible: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (!suggestion.modification || suggestion.modification.trim().length === 0) {
      issues.push('No modification provided');
    }
    
    if (suggestion.confidence < 0.4) {
      issues.push('Low confidence suggestion');
    }
    
    if (this.config.enableContextAnalysis && context.affectedElements) {
      const affectedCount = context.affectedElements.length;
      if (affectedCount > 5) {
        issues.push(`High impact change affecting ${affectedCount} elements`);
      }
    }
    
    return {
      feasible: issues.length === 0,
      issues
    };
  }

  async prioritizeSuggestions(
    suggestions: RevisionSuggestion[]
  ): Promise<RevisionSuggestion[]> {
    return suggestions.sort((a, b) => {
      const priorityOrder = {
        [SuggestionPriority.CRITICAL]: 0,
        [SuggestionPriority.HIGH]: 1,
        [SuggestionPriority.MEDIUM]: 2,
        [SuggestionPriority.LOW]: 3
      };
      
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.confidence - a.confidence;
    });
  }
}