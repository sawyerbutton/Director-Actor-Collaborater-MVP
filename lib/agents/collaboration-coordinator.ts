import { ConsistencyGuardian } from './consistency-guardian';
import { RevisionExecutive } from './revision-executive';
import { IncrementalAnalysisEngine } from './incremental-analysis-engine';
import {
  CollaborationFramework,
  CollaborationPipeline,
  AgentRole,
  MessageType,
  AgentMessage
} from './collaboration-framework';
import {
  ConsistencyCheckRequest,
  ConsistencyAnalysisResult,
  LogicError,
  AnalysisReport
} from '@/types/analysis';
import {
  RevisionSuggestion,
  RevisionContext,
  RevisionBatch,
  SuggestionConflict
} from '@/types/revision';

export interface CollaborationConfig {
  enableBatchProcessing: boolean;
  maxBatchSize: number;
  suggestionTimeout: number;
  enableConflictResolution: boolean;
  enableIncrementalAnalysis: boolean;
}

const DEFAULT_COLLABORATION_CONFIG: CollaborationConfig = {
  enableBatchProcessing: true,
  maxBatchSize: 10,
  suggestionTimeout: 10000,
  enableConflictResolution: true,
  enableIncrementalAnalysis: true
};

export class CollaborationCoordinator {
  private framework: CollaborationFramework;
  private pipeline: CollaborationPipeline;
  private consistencyGuardian: ConsistencyGuardian | null = null;
  private revisionExecutive: RevisionExecutive | null = null;
  private incrementalAnalyzer: IncrementalAnalysisEngine | null = null;
  private config: CollaborationConfig;

  constructor(
    apiKey: string,
    config: Partial<CollaborationConfig> = {}
  ) {
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config };
    this.framework = new CollaborationFramework();
    this.pipeline = new CollaborationPipeline(this.framework);
    this.initializeAgents(apiKey);
  }

  private initializeAgents(apiKey: string): void {
    this.consistencyGuardian = new ConsistencyGuardian(apiKey);
    this.revisionExecutive = new RevisionExecutive();
    
    if (this.config.enableIncrementalAnalysis) {
      this.incrementalAnalyzer = new IncrementalAnalysisEngine();
    }

    this.registerAgents();
    this.setupMessageHandlers();
  }

  private registerAgents(): void {
    if (this.consistencyGuardian) {
      this.framework.registerAgent(
        AgentRole.CONSISTENCY_GUARDIAN,
        'ConsistencyGuardian',
        this.consistencyGuardian,
        ['error_detection', 'script_analysis']
      );
    }

    if (this.revisionExecutive) {
      this.framework.registerAgent(
        AgentRole.REVISION_EXECUTIVE,
        'RevisionExecutive',
        this.revisionExecutive,
        ['suggestion_generation', 'error_fixing']
      );
    }

    if (this.incrementalAnalyzer) {
      this.framework.registerAgent(
        AgentRole.INCREMENTAL_ANALYZER,
        'IncrementalAnalyzer',
        this.incrementalAnalyzer,
        ['impact_analysis', 'change_validation']
      );
    }
  }

  private setupMessageHandlers(): void {
    if (this.revisionExecutive) {
      const executive = this.revisionExecutive as RevisionExecutive & { handleMessage: (msg: AgentMessage) => Promise<void> };
      executive.handleMessage = async (message: AgentMessage) => {
        if (message.type === MessageType.ERROR_DETECTED) {
          const error = message.payload as LogicError;
          const context = await this.buildRevisionContext(error);
          const suggestions = await this.revisionExecutive!.generateSuggestions(error, context);
          
          await this.framework.sendMessage({
            type: MessageType.SUGGESTION_GENERATED,
            from: AgentRole.REVISION_EXECUTIVE,
            to: message.from,
            payload: { errorId: error.id, suggestions },
            sessionId: message.sessionId,
            replyTo: message.id
          });
          
          // Emit event for suggestion completion
          this.framework.emit(`suggestion_${error.id}`, suggestions);
        }
      };
    }

    if (this.incrementalAnalyzer) {
      const analyzer = this.incrementalAnalyzer as typeof this.incrementalAnalyzer & { handleMessage: (msg: AgentMessage) => Promise<void> };
      analyzer.handleMessage = async (message: AgentMessage) => {
        if (message.type === MessageType.VALIDATION_REQUEST) {
          const suggestion = message.payload as RevisionSuggestion;
          const impact = await this.incrementalAnalyzer!.analyzeChange({
            changeId: suggestion.id,
            type: 'content',
            description: suggestion.modification,
            timestamp: new Date(),
            affectedElements: []
          });
          
          await this.framework.sendMessage({
            type: MessageType.VALIDATION_RESPONSE,
            from: AgentRole.INCREMENTAL_ANALYZER,
            to: message.from,
            payload: { suggestionId: suggestion.id, impact },
            sessionId: message.sessionId,
            replyTo: message.id
          });
        }
      };
    }
  }

  async analyzeAndSuggest(
    request: ConsistencyCheckRequest
  ): Promise<{
    analysis: AnalysisReport;
    suggestions: Map<string, RevisionSuggestion[]>;
    conflicts?: SuggestionConflict[];
  }> {
    if (!this.consistencyGuardian) {
      throw new Error('ConsistencyGuardian not initialized');
    }

    const analysis = await this.consistencyGuardian.analyzeScript(request);
    
    const errors = analysis.detailedAnalysis.errors;
    
    if (errors.length === 0) {
      return { analysis, suggestions: new Map() };
    }

    const sessionId = await this.framework.createSession([
      AgentRole.CONSISTENCY_GUARDIAN,
      AgentRole.REVISION_EXECUTIVE,
      ...(this.config.enableIncrementalAnalysis ? [AgentRole.INCREMENTAL_ANALYZER] : [])
    ]);

    try {
      let suggestions: Map<string, RevisionSuggestion[]>;
      
      if (this.config.enableBatchProcessing && errors.length > this.config.maxBatchSize) {
        suggestions = await this.processBatchedErrors(errors, sessionId);
      } else {
        suggestions = await this.processErrors(errors, sessionId);
      }

      const conflicts = this.config.enableConflictResolution
        ? await this.detectConflicts(suggestions)
        : undefined;

      await this.framework.endSession(sessionId);

      return { analysis, suggestions, conflicts };
    } catch (error) {
      await this.framework.endSession(sessionId);
      throw error;
    }
  }

  /**
   * Processes errors with true parallel execution
   */
  private async processErrors(
    errors: LogicError[],
    sessionId: string
  ): Promise<Map<string, RevisionSuggestion[]>> {
    const suggestions = new Map<string, RevisionSuggestion[]>();

    // Send all error messages in parallel
    const messagePromises = errors.map(error => 
      this.framework.sendMessage({
        type: MessageType.ERROR_DETECTED,
        from: AgentRole.CONSISTENCY_GUARDIAN,
        to: AgentRole.REVISION_EXECUTIVE,
        payload: error,
        sessionId
      })
    );
    
    await Promise.all(messagePromises);

    // Wait for all suggestions in parallel
    const suggestionPromises = errors.map(async error => {
      const errorSuggestions = await this.waitForSuggestions(
        error.id,
        sessionId
      );
      
      return { errorId: error.id, suggestions: errorSuggestions };
    });
    
    const results = await Promise.all(suggestionPromises);
    
    // Process validation requests in parallel if needed
    if (this.config.enableIncrementalAnalysis && this.incrementalAnalyzer) {
      const validationPromises: Promise<void>[] = [];
      
      for (const result of results) {
        if (result.suggestions.length > 0) {
          suggestions.set(result.errorId, result.suggestions);
          
          for (const suggestion of result.suggestions) {
            validationPromises.push(
              this.framework.sendMessage({
                type: MessageType.VALIDATION_REQUEST,
                from: AgentRole.REVISION_EXECUTIVE,
                to: AgentRole.INCREMENTAL_ANALYZER,
                payload: suggestion,
                sessionId
              })
            );
          }
        }
      }
      
      await Promise.all(validationPromises);
    } else {
      // Just store the suggestions
      for (const result of results) {
        if (result.suggestions.length > 0) {
          suggestions.set(result.errorId, result.suggestions);
        }
      }
    }

    return suggestions;
  }

  /**
   * Processes errors in batches with true parallel execution within each batch
   */
  private async processBatchedErrors(
    errors: LogicError[],
    sessionId: string
  ): Promise<Map<string, RevisionSuggestion[]>> {
    const suggestions = new Map<string, RevisionSuggestion[]>();
    const batches = this.createBatches(errors);

    // Process batches sequentially but items within batch in parallel
    for (const batch of batches) {
      // Send all messages in the batch in parallel
      const messagePromises = batch.map(error => 
        this.framework.sendMessage({
          type: MessageType.ERROR_DETECTED,
          from: AgentRole.CONSISTENCY_GUARDIAN,
          to: AgentRole.REVISION_EXECUTIVE,
          payload: error,
          sessionId
        })
      );
      
      await Promise.all(messagePromises);
      
      // Wait for all suggestions in the batch in parallel
      const batchPromises = batch.map(async (error) => ({
        errorId: error.id,
        suggestions: await this.waitForSuggestions(error.id, sessionId)
      }));

      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        if (result.suggestions.length > 0) {
          suggestions.set(result.errorId, result.suggestions);
        }
      }
    }

    return suggestions;
  }

  private createBatches(errors: LogicError[]): LogicError[][] {
    const batches: LogicError[][] = [];
    
    for (let i = 0; i < errors.length; i += this.config.maxBatchSize) {
      batches.push(errors.slice(i, i + this.config.maxBatchSize));
    }
    
    return batches;
  }

  /**
   * Waits for suggestions using event-driven approach instead of polling
   */
  private async waitForSuggestions(
    errorId: string,
    sessionId: string
  ): Promise<RevisionSuggestion[]> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.framework.removeAllListeners(`suggestion_${errorId}`);
        resolve([]);
      }, this.config.suggestionTimeout);

      // Listen for specific suggestion event
      this.framework.once(`suggestion_${errorId}`, (suggestions: RevisionSuggestion[]) => {
        clearTimeout(timeout);
        resolve(suggestions);
      });
      
      // Also check if message already exists (race condition protection)
      const messages = this.framework.getMessageHistory(sessionId);
      const existingMessage = messages.find(
        m => m.type === MessageType.SUGGESTION_GENERATED &&
             (m.payload as any).errorId === errorId
      );
      
      if (existingMessage) {
        clearTimeout(timeout);
        this.framework.removeAllListeners(`suggestion_${errorId}`);
        resolve((existingMessage.payload as any).suggestions || []);
      }
    });
  }

  private async buildRevisionContext(error: LogicError): Promise<RevisionContext> {
    const context: RevisionContext = {
      previousEvents: [],
      affectedElements: []
    };

    if (error.location.sceneId) {
      context.sceneInfo = `Scene ${error.location.sceneId}`;
    }

    if (error.location.characterName) {
      context.characterName = error.location.characterName;
    }

    if (error.context) {
      context.scriptContent = error.context;
    }

    if (error.relatedElements) {
      context.affectedElements = error.relatedElements;
    }

    return context;
  }

  private async detectConflicts(
    suggestions: Map<string, RevisionSuggestion[]>
  ): Promise<SuggestionConflict[]> {
    const conflicts: SuggestionConflict[] = [];
    const allSuggestions: RevisionSuggestion[] = [];
    
    suggestions.forEach(sugs => allSuggestions.push(...sugs));

    for (let i = 0; i < allSuggestions.length; i++) {
      for (let j = i + 1; j < allSuggestions.length; j++) {
        const conflict = this.checkConflict(allSuggestions[i], allSuggestions[j]);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  private checkConflict(
    sug1: RevisionSuggestion,
    sug2: RevisionSuggestion
  ): SuggestionConflict | null {
    if (this.isSameLocation(sug1.location, sug2.location)) {
      return {
        suggestionIds: [sug1.id, sug2.id],
        type: 'location',
        description: 'Both suggestions modify the same location',
        resolution: 'priority'
      };
    }

    if (sug1.conflictsWith?.includes(sug2.id) || sug2.conflictsWith?.includes(sug1.id)) {
      return {
        suggestionIds: [sug1.id, sug2.id],
        type: 'logic',
        description: 'Suggestions have logical conflicts',
        resolution: 'manual'
      };
    }

    return null;
  }

  private isSameLocation(
    loc1: RevisionSuggestion['location'],
    loc2: RevisionSuggestion['location']
  ): boolean {
    return loc1.sceneId === loc2.sceneId &&
           loc1.lineNumber === loc2.lineNumber &&
           loc1.characterName === loc2.characterName;
  }

  async validateSuggestions(
    suggestions: RevisionSuggestion[]
  ): Promise<Map<string, { feasible: boolean; issues: string[] }>> {
    if (!this.revisionExecutive) {
      throw new Error('RevisionExecutive not initialized');
    }

    const validations = new Map<string, { feasible: boolean; issues: string[] }>();
    
    for (const suggestion of suggestions) {
      const context = await this.buildRevisionContext({
        id: suggestion.errorId,
        type: 'plot' as any,
        severity: 'medium' as any,
        location: suggestion.location,
        description: suggestion.modification
      });
      
      const validation = await this.revisionExecutive.evaluateSuggestionFeasibility(
        suggestion,
        context
      );
      
      validations.set(suggestion.id, validation);
    }
    
    return validations;
  }

  async createRevisionBatch(
    scriptId: string,
    suggestions: RevisionSuggestion[]
  ): Promise<RevisionBatch> {
    if (!this.revisionExecutive) {
      throw new Error('RevisionExecutive not initialized');
    }

    const prioritized = await this.revisionExecutive.prioritizeSuggestions(suggestions);
    
    return {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      suggestions: prioritized,
      scriptId,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
  }

  getCollaborationMetrics(): {
    activeSessions: number;
    queueStatus: { pending: number; processing: number; processed: number; failed: number };
    agentStatus: { role: AgentRole; status: string }[];
  } {
    const agents = this.framework.discoverAgents();
    
    return {
      activeSessions: this.framework.getActiveSessionCount(),
      queueStatus: this.framework.getQueueStatus(),
      agentStatus: agents.map(a => ({ role: a.role, status: a.status }))
    };
  }

  cleanup(): void {
    this.framework.cleanupOldSessions();
    if (this.consistencyGuardian) {
      this.consistencyGuardian.clearCache();
    }
  }
}