import { DeepSeekClient } from '@/lib/api/deepseek/client';
import { DeepSeekChatRequest } from '@/lib/api/deepseek/types';
import {
  ParsedScript,
  ConsistencyAnalysisResult,
  ConsistencyCheckRequest,
  LogicError,
  LogicErrorType,
  ErrorSeverity,
  AnalysisReport
} from '@/types/analysis';
import {
  ConsistencyAgentConfig,
  DEFAULT_AGENT_CONFIG,
  AgentResponse,
  AnalysisChunk
} from './types';
import { PromptBuilder } from './prompts/consistency-prompts';
import { v4 as uuidv4 } from 'uuid';
import { CACHE_CONFIG, PERFORMANCE_CONFIG, CONSISTENCY_THRESHOLDS } from './constants';

export class ConsistencyGuardian {
  private client: DeepSeekClient;
  private config: ConsistencyAgentConfig;
  private cache: Map<string, { result: ConsistencyAnalysisResult; expires: number }>;

  constructor(apiKey: string, config?: Partial<ConsistencyAgentConfig>) {
    this.client = new DeepSeekClient({
      apiKey,
      apiEndpoint: process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com',
      timeout: config?.timeout || DEFAULT_AGENT_CONFIG.timeout,
      maxRetries: 3
    });
    
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.cache = new Map();
  }

  async analyzeScript(
    request: ConsistencyCheckRequest
  ): Promise<AnalysisReport> {
    const startTime = Date.now();
    
    const cacheKey = this.generateCacheKey(request);
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return this.generateReport(cached.result);
      } else if (cached) {
        // Remove expired entry
        this.cache.delete(cacheKey);
      }
    }

    try {
      const scriptContent = this.preprocessScript(request.script);
      const chunks = this.createAnalysisChunks(scriptContent, request.script);
      
      const allErrors: LogicError[] = [];
      let totalTokensUsed = 0;

      // Process chunks in parallel batches for better performance
      const processBatch = async (batchChunks: AnalysisChunk[], startIndex: number) => {
        const promises = batchChunks.map((chunk, localIndex) => {
          const globalIndex = startIndex + localIndex;
          return this.analyzeChunk(
            chunk,
            globalIndex,
            chunks.length,
            request.checkTypes || Object.values(LogicErrorType),
            request.severityThreshold,
            globalIndex > 0 ? this.getChunkContext(chunks[globalIndex - 1]) : undefined
          );
        });
        
        return Promise.allSettled(promises);
      };

      // Process chunks in batches with concurrency control
      for (let i = 0; i < chunks.length; i += PERFORMANCE_CONFIG.MAX_CONCURRENT_CHUNKS) {
        const batch = chunks.slice(i, Math.min(i + PERFORMANCE_CONFIG.MAX_CONCURRENT_CHUNKS, chunks.length));
        const results = await processBatch(batch, i);
        
        for (const result of results) {
          if (result.status === 'fulfilled') {
            allErrors.push(...result.value.errors);
            totalTokensUsed += result.value.tokensUsed || 0;
          } else {
            // Log error but continue with other chunks
            if (process.env.NODE_ENV !== 'production') {
              console.error('Chunk analysis failed:', result.reason);
            }
          }
        }

        if (request.maxErrors && allErrors.length >= request.maxErrors) {
          break;
        }
      }

      const filteredErrors = this.filterAndDeduplicateErrors(
        allErrors,
        request.severityThreshold,
        request.maxErrors
      );

      const analysisResult: ConsistencyAnalysisResult = {
        scriptId: request.script.id,
        analyzedAt: new Date(),
        totalErrors: filteredErrors.length,
        errors: filteredErrors,
        errorsByType: this.groupErrorsByType(filteredErrors),
        errorsBySeverity: this.groupErrorsBySeverity(filteredErrors),
        analysisMetadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: totalTokensUsed,
          modelUsed: this.config.modelName,
          version: '1.0.0'
        }
      };

      if (this.config.enableCaching) {
        this.maintainCacheSize();
        this.cache.set(cacheKey, {
          result: analysisResult,
          expires: Date.now() + CACHE_CONFIG.TTL_MS
        });
      }

      return this.generateReport(analysisResult);
    } catch (error) {
      // Sanitize error logging to prevent information leakage
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (process.env.NODE_ENV !== 'production') {
        console.error('Script analysis failed:', errorMessage);
      }
      throw new Error(`Consistency analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeChunk(
    chunk: AnalysisChunk,
    chunkIndex: number,
    totalChunks: number,
    checkTypes: LogicErrorType[],
    severityThreshold?: ErrorSeverity,
    previousContext?: string
  ): Promise<{ errors: LogicError[]; tokensUsed?: number }> {
    const promptBuilder = new PromptBuilder(
      chunk.content,
      checkTypes,
      this.config.chunkSize * 5
    );
    
    const prompt = promptBuilder.buildFullPrompt();
    
    const request: DeepSeekChatRequest = {
      model: this.config.modelName,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    };

    const response = await this.client.chat(request);
    
    const errors = this.parseAIResponse(response.choices[0].message.content);
    
    return {
      errors: errors.map(error => ({
        ...error,
        id: uuidv4()
      })),
      tokensUsed: response.usage?.total_tokens
    };
  }

  private preprocessScript(script: ParsedScript): string {
    const sections: string[] = [];
    
    sections.push(`TITLE: ${script.title}`);
    
    if (script.metadata) {
      sections.push(`\nMETADATA:`);
      if (script.metadata.genre) sections.push(`Genre: ${script.metadata.genre}`);
      if (script.metadata.setting) sections.push(`Setting: ${script.metadata.setting}`);
      if (script.metadata.timespan) sections.push(`Timespan: ${script.metadata.timespan}`);
    }
    
    sections.push(`\nCHARACTERS:`);
    script.characters.forEach(char => {
      sections.push(`- ${char.name}${char.description ? `: ${char.description}` : ''}`);
      if (char.traits && char.traits.length > 0) {
        sections.push(`  Traits: ${char.traits.join(', ')}`);
      }
    });
    
    sections.push(`\nSCENES:`);
    script.scenes.forEach(scene => {
      sections.push(`\n--- SCENE ${scene.number} ---`);
      sections.push(`Location: ${scene.location}`);
      if (scene.time) sections.push(`Time: ${scene.time}`);
      if (scene.description) sections.push(`Description: ${scene.description}`);
      
      if (scene.actions && scene.actions.length > 0) {
        scene.actions.forEach(action => {
          sections.push(`[Action] ${action.description}`);
        });
      }
      
      scene.dialogues.forEach(dialogue => {
        const emotion = dialogue.emotion ? ` (${dialogue.emotion})` : '';
        const direction = dialogue.direction ? ` [${dialogue.direction}]` : '';
        sections.push(`${dialogue.character}${emotion}${direction}: "${dialogue.text}"`);
      });
    });
    
    return sections.join('\n');
  }

  private createAnalysisChunks(
    scriptContent: string,
    script: ParsedScript
  ): AnalysisChunk[] {
    const chunks: AnalysisChunk[] = [];
    const scenesPerChunk = this.config.chunkSize;
    
    for (let i = 0; i < script.scenes.length; i += scenesPerChunk) {
      const endIndex = Math.min(i + scenesPerChunk, script.scenes.length);
      const chunkScenes = script.scenes.slice(i, endIndex);
      
      const characterContext = new Set<string>();
      chunkScenes.forEach(scene => {
        scene.dialogues.forEach(d => characterContext.add(d.character));
      });
      
      const chunkContent = this.preprocessScript({
        ...script,
        scenes: chunkScenes
      });
      
      chunks.push({
        startScene: i + 1,
        endScene: endIndex,
        content: chunkContent,
        characterContext
      });
    }
    
    return chunks;
  }

  private getChunkContext(previousChunk: AnalysisChunk): string {
    const lines = previousChunk.content.split('\n');
    const contextLines = lines.slice(-20);
    return contextLines.join('\n');
  }

  private parseAIResponse(response: string): LogicError[] {
    try {
      const parsed = JSON.parse(response);
      
      if (Array.isArray(parsed)) {
        return parsed.map(error => this.validateAndNormalizeError(error));
      } else if (parsed.errors && Array.isArray(parsed.errors)) {
        return parsed.errors.map((error: any) => this.validateAndNormalizeError(error));
      }
      
      return [];
    } catch (error) {
      // Sanitize error logging to prevent information leakage
      if (process.env.NODE_ENV !== 'production') {
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse response';
        console.error('Failed to parse AI response:', errorMessage);
      }
      return [];
    }
  }

  private validateAndNormalizeError(error: any): LogicError {
    return {
      id: error.id || uuidv4(),
      type: this.normalizeErrorType(error.type),
      severity: this.normalizeSeverity(error.severity),
      location: error.location || {},
      description: error.description || 'Unspecified error',
      suggestion: error.suggestion,
      context: error.context,
      relatedElements: error.relatedElements
    };
  }

  private normalizeErrorType(type: string): LogicErrorType {
    const normalized = type?.toLowerCase();
    return Object.values(LogicErrorType).find(t => t === normalized) || LogicErrorType.PLOT;
  }

  private normalizeSeverity(severity: string): ErrorSeverity {
    const normalized = severity?.toLowerCase();
    return Object.values(ErrorSeverity).find(s => s === normalized) || ErrorSeverity.MEDIUM;
  }

  private filterAndDeduplicateErrors(
    errors: LogicError[],
    severityThreshold?: ErrorSeverity,
    maxErrors?: number
  ): LogicError[] {
    let filtered = errors;
    
    if (severityThreshold) {
      const severityOrder = [ErrorSeverity.LOW, ErrorSeverity.MEDIUM, ErrorSeverity.HIGH, ErrorSeverity.CRITICAL];
      const thresholdIndex = severityOrder.indexOf(severityThreshold);
      filtered = errors.filter(error => 
        severityOrder.indexOf(error.severity) >= thresholdIndex
      );
    }
    
    const uniqueErrors = this.deduplicateErrors(filtered);
    
    uniqueErrors.sort((a, b) => {
      const severityOrder = [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH, ErrorSeverity.MEDIUM, ErrorSeverity.LOW];
      return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
    });
    
    if (maxErrors && uniqueErrors.length > maxErrors) {
      return uniqueErrors.slice(0, maxErrors);
    }
    
    return uniqueErrors;
  }

  private deduplicateErrors(errors: LogicError[]): LogicError[] {
    const seen = new Map<string, LogicError>();
    
    errors.forEach(error => {
      const key = `${error.type}-${error.description}-${JSON.stringify(error.location)}`;
      if (!seen.has(key)) {
        seen.set(key, error);
      }
    });
    
    return Array.from(seen.values());
  }

  private groupErrorsByType(errors: LogicError[]): Record<LogicErrorType, number> {
    const grouped = Object.values(LogicErrorType).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<LogicErrorType, number>);
    
    errors.forEach(error => {
      grouped[error.type]++;
    });
    
    return grouped;
  }

  private groupErrorsBySeverity(errors: LogicError[]): Record<ErrorSeverity, number> {
    const grouped = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = 0;
      return acc;
    }, {} as Record<ErrorSeverity, number>);
    
    errors.forEach(error => {
      grouped[error.severity]++;
    });
    
    return grouped;
  }

  private generateReport(result: ConsistencyAnalysisResult): AnalysisReport {
    const criticalCount = result.errorsBySeverity[ErrorSeverity.CRITICAL] || 0;
    const highCount = result.errorsBySeverity[ErrorSeverity.HIGH] || 0;
    
    let overallConsistency: 'excellent' | 'good' | 'fair' | 'poor';
    if (result.totalErrors === 0) {
      overallConsistency = 'excellent';
    } else if (criticalCount <= CONSISTENCY_THRESHOLDS.GOOD.critical && 
               highCount <= CONSISTENCY_THRESHOLDS.GOOD.high) {
      overallConsistency = 'good';
    } else if (criticalCount <= CONSISTENCY_THRESHOLDS.FAIR.critical && 
               highCount <= CONSISTENCY_THRESHOLDS.FAIR.high) {
      overallConsistency = 'fair';
    } else {
      overallConsistency = 'poor';
    }
    
    const primaryConcerns = this.identifyPrimaryConcerns(result);
    const recommendations = this.generateRecommendations(result);
    
    return {
      summary: {
        overallConsistency,
        criticalIssues: criticalCount,
        totalIssues: result.totalErrors,
        primaryConcerns
      },
      detailedAnalysis: result,
      recommendations,
      confidence: this.calculateConfidence(result)
    };
  }

  private identifyPrimaryConcerns(result: ConsistencyAnalysisResult): string[] {
    const concerns: string[] = [];
    
    Object.entries(result.errorsByType).forEach(([type, count]) => {
      if (count > 0) {
        const percentage = (count / result.totalErrors) * 100;
        if (percentage > 30) {
          concerns.push(`High concentration of ${type} errors (${count} issues)`);
        }
      }
    });
    
    if (result.errorsBySeverity[ErrorSeverity.CRITICAL] > 0) {
      concerns.unshift(`${result.errorsBySeverity[ErrorSeverity.CRITICAL]} critical issues requiring immediate attention`);
    }
    
    return concerns.slice(0, 3);
  }

  private generateRecommendations(result: ConsistencyAnalysisResult): string[] {
    const recommendations: string[] = [];
    
    if (result.errorsBySeverity[ErrorSeverity.CRITICAL] > 0) {
      recommendations.push('Priority: Address all critical errors before proceeding with production');
    }
    
    const dominantErrorType = this.findDominantErrorType(result.errorsByType);
    if (dominantErrorType) {
      const typeRecommendations: Record<LogicErrorType, string> = {
        [LogicErrorType.TIMELINE]: 'Create a detailed timeline document to track all temporal references',
        [LogicErrorType.CHARACTER]: 'Develop character bibles with consistent traits and knowledge states',
        [LogicErrorType.PLOT]: 'Review plot structure and ensure all setups have payoffs',
        [LogicErrorType.DIALOGUE]: 'Conduct dialogue passes to ensure natural conversation flow',
        [LogicErrorType.SCENE]: 'Map out location geography and movement logistics'
      };
      recommendations.push(typeRecommendations[dominantErrorType]);
    }
    
    if (result.totalErrors > 10) {
      recommendations.push('Consider a comprehensive script review with focus on internal consistency');
    }
    
    return recommendations;
  }

  private findDominantErrorType(
    errorsByType: Record<LogicErrorType, number>
  ): LogicErrorType | null {
    let maxCount = 0;
    let dominantType: LogicErrorType | null = null;
    
    Object.entries(errorsByType).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type as LogicErrorType;
      }
    });
    
    return dominantType;
  }

  private calculateConfidence(result: ConsistencyAnalysisResult): number {
    const baseConfidence = 0.85;
    
    let confidence = baseConfidence;
    
    if (result.analysisMetadata.tokensUsed && result.analysisMetadata.tokensUsed > 3000) {
      confidence += 0.05;
    }
    
    if (result.totalErrors > 0 && result.errors.every(e => e.context)) {
      confidence += 0.05;
    }
    
    if (result.analysisMetadata.processingTime < 5000) {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 1.0);
  }

  private generateCacheKey(request: ConsistencyCheckRequest): string {
    const checkTypes = request.checkTypes?.sort().join(',') || 'all';
    const threshold = request.severityThreshold || 'none';
    return `${request.script.id}-${checkTypes}-${threshold}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private maintainCacheSize(): void {
    // Remove expired entries first
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
      }
    }

    // If still over limit, remove oldest entries (FIFO)
    if (this.cache.size >= CACHE_CONFIG.MAX_SIZE) {
      const entriesToRemove = this.cache.size - CACHE_CONFIG.MAX_SIZE + 1;
      const keys = Array.from(this.cache.keys());
      for (let i = 0; i < entriesToRemove; i++) {
        this.cache.delete(keys[i]);
      }
    }
  }
}