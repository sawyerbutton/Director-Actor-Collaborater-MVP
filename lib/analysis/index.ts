import { ChangeTracker } from './change-tracker';
import { ImpactAnalyzer } from './impact-analyzer';
import { IncrementalAnalysisEngine } from './incremental-engine';
import { ResultMerger } from './result-merger';
import { DiffReportGenerator, DiffReportOptions, EnhancedDiffReport } from './diff-reporter';
import { 
  ChangeEvent,
  ImpactAnalysis,
  DiffReport,
  VersionedAnalysisResult
} from '@/types/change-tracking';
import { 
  Script 
} from '@/types/script';
import { 
  AnalysisReport,
  ConsistencyCheckRequest,
  LogicErrorType,
  ErrorSeverity
} from '@/types/analysis';

export interface ContinuousAnalysisConfig {
  apiKey: string;
  enableCaching?: boolean;
  cacheExpirationMs?: number;
  maxConcurrentAnalyses?: number;
  enableSmartBatching?: boolean;
  performanceMode?: 'aggressive' | 'balanced' | 'conservative';
}

export class ContinuousAnalysisSystem {
  private changeTracker: ChangeTracker;
  private impactAnalyzer: ImpactAnalyzer;
  private incrementalEngine: IncrementalAnalysisEngine;
  private resultMerger: ResultMerger;
  private diffReporter: DiffReportGenerator;
  
  private analysisCache: Map<string, { 
    result: AnalysisReport; 
    expires: number;
    version: string;
  }> = new Map();
  
  private performanceMetrics = {
    totalAnalyses: 0,
    cacheHits: 0,
    averageAnalysisTime: 0,
    lastAnalysisTime: 0
  };

  private config: ContinuousAnalysisConfig;

  constructor(config: ContinuousAnalysisConfig) {
    this.config = {
      enableCaching: true,
      cacheExpirationMs: 30 * 60 * 1000,
      maxConcurrentAnalyses: 3,
      enableSmartBatching: true,
      performanceMode: 'balanced',
      ...config
    };

    this.changeTracker = new ChangeTracker();
    this.impactAnalyzer = new ImpactAnalyzer();
    this.incrementalEngine = new IncrementalAnalysisEngine(config.apiKey);
    this.resultMerger = new ResultMerger();
    this.diffReporter = new DiffReportGenerator();
  }

  public async analyzeChanges(
    scriptId: string,
    oldScript: Script | null,
    newScript: Script,
    options?: {
      userId?: string;
      checkTypes?: LogicErrorType[];
      severityThreshold?: ErrorSeverity;
      maxErrors?: number;
      generateReport?: boolean;
      reportFormat?: DiffReportOptions['format'];
    }
  ): Promise<{
    analysis: AnalysisReport;
    changes: ChangeEvent[];
    impact: ImpactAnalysis;
    diffReport?: EnhancedDiffReport;
    performance: typeof this.performanceMetrics;
  }> {
    const startTime = Date.now();

    const changes = this.changeTracker.trackChange(
      scriptId, 
      oldScript, 
      newScript, 
      options?.userId
    );

    if (changes.length === 0 && oldScript) {
      const cached = this.getCachedAnalysis(scriptId);
      if (cached) {
        this.performanceMetrics.cacheHits++;
        return {
          analysis: cached.result,
          changes: [],
          impact: {
            directImpact: [],
            indirectImpact: [],
            propagationPath: [],
            estimatedAnalysisTime: 0,
            impactLevel: 'low'
          },
          performance: { ...this.performanceMetrics }
        };
      }
    }

    const impact = this.impactAnalyzer.analyzeImpact(changes, newScript);

    const shouldOptimize = this.shouldOptimizeAnalysis(impact, changes);
    
    let newResults: Map<string, AnalysisReport>;
    
    if (shouldOptimize && oldScript) {
      newResults = await this.incrementalEngine.analyzeChanges(
        changes,
        newScript,
        {
          checkTypes: options?.checkTypes,
          severityThreshold: options?.severityThreshold,
          maxErrors: options?.maxErrors
        }
      );
    } else {
      const fullAnalysis = await this.performFullAnalysis(
        newScript,
        options
      );
      newResults = new Map([['full', fullAnalysis]]);
    }

    const oldResults = this.getOldAnalysisResults(scriptId, oldScript);

    const mergedAnalysis = this.resultMerger.mergeResults(
      oldResults,
      newResults,
      changes
    );

    if (this.config.enableCaching) {
      this.cacheAnalysis(scriptId, mergedAnalysis);
    }

    let diffReport: EnhancedDiffReport | undefined;
    if (options?.generateReport && oldScript) {
      const beforeVersion = this.createVersionedResult(oldResults.get('full') || mergedAnalysis);
      const afterVersion = this.createVersionedResult(mergedAnalysis);
      
      diffReport = this.diffReporter.generateDiffReport(
        scriptId,
        beforeVersion,
        afterVersion,
        changes,
        {
          format: options.reportFormat || 'detailed',
          includeMetrics: true,
          groupByType: true
        }
      );
    }

    const analysisTime = Date.now() - startTime;
    this.updatePerformanceMetrics(analysisTime);

    if (this.config.enableSmartBatching && impact.impactLevel !== 'critical') {
      this.preloadFutureAnalyses(newScript, impact);
    }

    return {
      analysis: mergedAnalysis,
      changes,
      impact,
      diffReport,
      performance: { ...this.performanceMetrics }
    };
  }

  private shouldOptimizeAnalysis(
    impact: ImpactAnalysis,
    changes: ChangeEvent[]
  ): boolean {
    if (this.config.performanceMode === 'conservative') {
      return false;
    }

    if (this.config.performanceMode === 'aggressive') {
      return true;
    }

    const totalImpact = impact.directImpact.length + impact.indirectImpact.length;
    const isMinorChange = totalImpact < 5 && changes.length < 3;
    const isStructuralChange = changes.some(c => c.type === 'structure');

    return !isStructuralChange && (isMinorChange || impact.impactLevel === 'low');
  }

  private async performFullAnalysis(
    script: Script,
    options?: {
      checkTypes?: LogicErrorType[];
      severityThreshold?: ErrorSeverity;
      maxErrors?: number;
    }
  ): Promise<AnalysisReport> {
    const guardian = new ConsistencyGuardian(this.config.apiKey, {
      enableCaching: true,
      timeout: 30000
    });

    const request: ConsistencyCheckRequest = {
      script: {
        title: script.title,
        metadata: script.metadata || {},
        scenes: script.scenes,
        characters: script.characters || []
      },
      checkTypes: options?.checkTypes,
      severityThreshold: options?.severityThreshold,
      maxErrors: options?.maxErrors,
      enableCaching: true
    };

    return await guardian.analyzeScript(request);
  }

  private getOldAnalysisResults(
    scriptId: string,
    oldScript: Script | null
  ): Map<string, AnalysisReport> {
    const results = new Map<string, AnalysisReport>();
    
    if (!oldScript) {
      return results;
    }

    const cached = this.getCachedAnalysis(scriptId);
    if (cached) {
      results.set('full', cached.result);
    }

    return results;
  }

  private getCachedAnalysis(
    scriptId: string
  ): { result: AnalysisReport; version: string } | null {
    const cached = this.analysisCache.get(scriptId);
    
    if (cached && cached.expires > Date.now()) {
      return { result: cached.result, version: cached.version };
    }

    if (cached) {
      this.analysisCache.delete(scriptId);
    }

    return null;
  }

  private cacheAnalysis(scriptId: string, analysis: AnalysisReport): void {
    this.analysisCache.set(scriptId, {
      result: analysis,
      expires: Date.now() + (this.config.cacheExpirationMs || 30 * 60 * 1000),
      version: analysis.id
    });

    if (this.analysisCache.size > 100) {
      const oldestKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(oldestKey);
    }
  }

  private createVersionedResult(analysis: AnalysisReport): VersionedAnalysisResult {
    return {
      version: analysis.id,
      timestamp: new Date(analysis.timestamp),
      result: analysis,
      isValid: true,
      affectedBy: []
    };
  }

  private updatePerformanceMetrics(analysisTime: number): void {
    this.performanceMetrics.totalAnalyses++;
    this.performanceMetrics.lastAnalysisTime = analysisTime;
    
    const currentAvg = this.performanceMetrics.averageAnalysisTime;
    const totalAnalyses = this.performanceMetrics.totalAnalyses;
    
    this.performanceMetrics.averageAnalysisTime = 
      (currentAvg * (totalAnalyses - 1) + analysisTime) / totalAnalyses;
  }

  private async preloadFutureAnalyses(
    script: Script,
    impact: ImpactAnalysis
  ): Promise<void> {
    const adjacentElements = new Set<string>();
    
    for (const sceneId of impact.directImpact) {
      const sceneIndex = script.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex > 0) {
        adjacentElements.add(script.scenes[sceneIndex - 1].id);
      }
      if (sceneIndex < script.scenes.length - 1) {
        adjacentElements.add(script.scenes[sceneIndex + 1].id);
      }
    }

    const elementsToPreload = Array.from(adjacentElements)
      .filter(id => !impact.directImpact.includes(id))
      .slice(0, 3);

    if (elementsToPreload.length > 0) {
      setTimeout(() => {
        this.incrementalEngine.preloadAnalysis(script, elementsToPreload)
          .catch(error => {
            console.warn('Preload analysis failed:', error);
          });
      }, 1000);
    }
  }

  public getChangeHistory(scriptId: string): ChangeEvent[] {
    return this.changeTracker.getRecentChanges(scriptId, 50);
  }

  public getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  public clearCache(scriptId?: string): void {
    if (scriptId) {
      this.analysisCache.delete(scriptId);
      this.incrementalEngine.clearCache(scriptId);
    } else {
      this.analysisCache.clear();
      this.incrementalEngine.clearCache();
    }
  }

  public getTrendAnalysis(scriptId: string): ReturnType<DiffReportGenerator['generateTrendAnalysis']> {
    const reports = this.diffReporter.getReportHistory(scriptId);
    return this.diffReporter.generateTrendAnalysis(reports);
  }
}

export {
  ChangeTracker,
  ImpactAnalyzer,
  IncrementalAnalysisEngine,
  ResultMerger,
  DiffReportGenerator,
  EnhancedDiffReport,
  DiffReportOptions
};

import { ConsistencyGuardian } from '@/lib/agents/consistency-guardian';