import { 
  ChangeEvent, 
  ImpactAnalysis,
  IncrementalAnalysisTask,
  VersionedAnalysisResult
} from '@/types/change-tracking';
import { 
  ConsistencyCheckRequest,
  AnalysisReport,
  LogicErrorType,
  ErrorSeverity,
  ParsedScript
} from '@/types/analysis';
import { Script } from '@/types/script';
import { ConsistencyGuardian } from '@/lib/agents/consistency-guardian';
import { ImpactAnalyzer } from './impact-analyzer';
import { v4 as uuidv4 } from 'uuid';

interface AnalysisQueueItem {
  task: IncrementalAnalysisTask;
  promise?: Promise<any>;
  retryCount: number;
}

interface CachedAnalysis {
  elementId: string;
  result: VersionedAnalysisResult;
  expires: number;
}

export class IncrementalAnalysisEngine {
  private consistencyGuardian: ConsistencyGuardian;
  private impactAnalyzer: ImpactAnalyzer;
  private analysisQueue: Map<string, AnalysisQueueItem> = new Map();
  private analysisCache: Map<string, CachedAnalysis> = new Map();
  private maxConcurrentAnalyses = 3;
  private maxRetries = 2;
  private cacheExpirationMs = 30 * 60 * 1000; // 30 minutes
  private maxCacheSize = 100; // Maximum cached analyses

  constructor(apiKey: string) {
    this.consistencyGuardian = new ConsistencyGuardian(apiKey, {
      enableCaching: true,
      timeout: 30000,
      maxConcurrentRequests: 3
    });
    this.impactAnalyzer = new ImpactAnalyzer();
  }

  public async analyzeChanges(
    changes: ChangeEvent[],
    script: Script,
    options?: {
      checkTypes?: LogicErrorType[];
      severityThreshold?: ErrorSeverity;
      maxErrors?: number;
    }
  ): Promise<Map<string, AnalysisReport>> {
    const impact = this.impactAnalyzer.analyzeImpact(changes, script);
    
    const tasks = this.createAnalysisTasks(impact, script);
    
    this.queueTasks(tasks);
    
    const results = await this.executeAnalysisQueue(script, options);
    
    return results;
  }

  private createAnalysisTasks(
    impact: ImpactAnalysis,
    script: Script
  ): IncrementalAnalysisTask[] {
    const tasks: IncrementalAnalysisTask[] = [];
    const processedElements = new Set<string>();

    for (const elementId of impact.directImpact) {
      if (!processedElements.has(elementId)) {
        tasks.push({
          id: uuidv4(),
          priority: 1,
          targetElement: elementId,
          analysisType: 'full',
          dependencies: [],
          status: 'pending'
        });
        processedElements.add(elementId);
      }
    }

    for (const elementId of impact.indirectImpact) {
      if (!processedElements.has(elementId)) {
        const dependencies = this.identifyDependencies(elementId, impact);
        tasks.push({
          id: uuidv4(),
          priority: 2,
          targetElement: elementId,
          analysisType: 'incremental',
          dependencies,
          status: 'pending'
        });
        processedElements.add(elementId);
      }
    }

    tasks.sort((a, b) => a.priority - b.priority);

    return tasks;
  }

  private identifyDependencies(
    elementId: string,
    impact: ImpactAnalysis
  ): string[] {
    const dependencies: string[] = [];
    
    for (const path of impact.propagationPath) {
      const index = path.indexOf(elementId);
      if (index > 0) {
        dependencies.push(path[index - 1]);
      }
    }

    return [...new Set(dependencies)];
  }

  private queueTasks(tasks: IncrementalAnalysisTask[]): void {
    for (const task of tasks) {
      this.analysisQueue.set(task.id, {
        task,
        retryCount: 0
      });
    }
  }

  /**
   * Executes queued analysis tasks with concurrency control and dependency management.
   * Uses a work-stealing algorithm to process tasks efficiently while respecting
   * dependencies and concurrency limits.
   * 
   * Algorithm:
   * 1. Process pending tasks when dependencies are satisfied
   * 2. Limit concurrent executions to maxConcurrentAnalyses
   * 3. Retry failed tasks up to maxRetries times
   * 4. Continue until all tasks are complete or failed
   * 
   * @param script - Script to analyze
   * @param options - Analysis options
   * @returns Map of element IDs to analysis reports
   */
  private async executeAnalysisQueue(
    script: Script,
    options?: {
      checkTypes?: LogicErrorType[];
      severityThreshold?: ErrorSeverity;
      maxErrors?: number;
    }
  ): Promise<Map<string, AnalysisReport>> {
    const results = new Map<string, AnalysisReport>();
    const activeTasks = new Map<string, Promise<void>>();

    const processTasks = async () => {
      for (const [taskId, item] of this.analysisQueue) {
        if (item.task.status === 'pending' && activeTasks.size < this.maxConcurrentAnalyses) {
          const allDependenciesComplete = item.task.dependencies.every(dep => {
            const depTask = Array.from(this.analysisQueue.values())
              .find(i => i.task.targetElement === dep);
            return !depTask || depTask.task.status === 'completed';
          });

          if (allDependenciesComplete) {
            item.task.status = 'processing';
            
            const taskPromise = this.analyzeElement(
              item.task,
              script,
              options
            ).then(report => {
              if (report) {
                results.set(item.task.targetElement, report);
                item.task.status = 'completed';
                item.task.result = report;
              } else {
                item.task.status = 'failed';
              }
              activeTasks.delete(taskId);
            }).catch(error => {
              console.error(`Analysis failed for ${item.task.targetElement}:`, error);
              item.task.status = 'failed';
              item.task.error = error;
              activeTasks.delete(taskId);
              
              if (item.retryCount < this.maxRetries) {
                item.retryCount++;
                item.task.status = 'pending';
              }
            });

            activeTasks.set(taskId, taskPromise);
          }
        }
      }

      if (activeTasks.size > 0) {
        await Promise.race(activeTasks.values());
      }
    };

    while (
      Array.from(this.analysisQueue.values()).some(
        item => item.task.status === 'pending' || item.task.status === 'processing'
      )
    ) {
      await processTasks();
    }

    this.analysisQueue.clear();

    return results;
  }

  private async analyzeElement(
    task: IncrementalAnalysisTask,
    script: Script,
    options?: {
      checkTypes?: LogicErrorType[];
      severityThreshold?: ErrorSeverity;
      maxErrors?: number;
    }
  ): Promise<AnalysisReport | null> {
    const cached = this.getCachedResult(task.targetElement);
    if (cached && task.analysisType === 'incremental') {
      return cached.result as AnalysisReport;
    }

    const elementScript = this.extractElementScript(task.targetElement, script);
    if (!elementScript) {
      return null;
    }

    try {
      const request: ConsistencyCheckRequest = {
        script: elementScript,
        checkTypes: options?.checkTypes || Object.values(LogicErrorType),
        severityThreshold: options?.severityThreshold,
        maxErrors: options?.maxErrors,
        enableCaching: true
      };

      const report = await this.consistencyGuardian.analyzeScript(request);

      this.cacheResult(task.targetElement, report);

      return report;
    } catch (error) {
      console.error(`Failed to analyze element ${task.targetElement}:`, error);
      throw error;
    }
  }

  private extractElementScript(elementId: string, script: Script): ParsedScript | null {
    if (elementId.startsWith('scene_') || script.scenes.some(s => s.id === elementId)) {
      const scene = script.scenes.find(s => s.id === elementId);
      if (!scene) return null;

      return {
        title: script.title,
        metadata: script.metadata || {},
        scenes: [scene],
        characters: script.characters?.filter(c => 
          scene.dialogues?.some(d => d.character === c.id)
        ) || []
      };
    }

    if (script.characters?.some(c => c.id === elementId)) {
      const character = script.characters.find(c => c.id === elementId);
      if (!character) return null;

      const characterScenes = script.scenes.filter(scene =>
        scene.dialogues?.some(d => d.character === elementId)
      );

      return {
        title: script.title,
        metadata: script.metadata || {},
        scenes: characterScenes,
        characters: [character]
      };
    }

    return {
      title: script.title,
      metadata: script.metadata || {},
      scenes: script.scenes,
      characters: script.characters || []
    };
  }

  private getCachedResult(elementId: string): VersionedAnalysisResult | null {
    const cached = this.analysisCache.get(elementId);
    
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }

    if (cached) {
      this.analysisCache.delete(elementId);
    }

    return null;
  }

  private cacheResult(elementId: string, report: AnalysisReport): void {
    const result: VersionedAnalysisResult = {
      version: uuidv4(),
      timestamp: new Date(),
      result: report,
      isValid: true,
      affectedBy: []
    };

    this.analysisCache.set(elementId, {
      elementId,
      result,
      expires: Date.now() + this.cacheExpirationMs
    });
    
    // Enforce cache size limits
    if (this.analysisCache.size > this.maxCacheSize) {
      // Remove expired entries first
      const now = Date.now();
      for (const [key, value] of this.analysisCache) {
        if (value.expires < now) {
          this.analysisCache.delete(key);
        }
      }
      
      // If still over limit, remove oldest entries
      if (this.analysisCache.size > this.maxCacheSize) {
        const sortedEntries = Array.from(this.analysisCache.entries())
          .sort((a, b) => a[1].expires - b[1].expires);
        
        const toRemove = sortedEntries.slice(0, this.analysisCache.size - this.maxCacheSize);
        for (const [key] of toRemove) {
          this.analysisCache.delete(key);
        }
      }
    }
  }

  public clearCache(elementId?: string): void {
    if (elementId) {
      this.analysisCache.delete(elementId);
    } else {
      this.analysisCache.clear();
    }
  }

  public getAnalysisStatus(): {
    queueSize: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const tasks = Array.from(this.analysisQueue.values()).map(item => item.task);
    
    return {
      queueSize: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };
  }

  public async preloadAnalysis(
    script: Script,
    elementIds: string[]
  ): Promise<void> {
    const tasks = elementIds.map(elementId => ({
      id: uuidv4(),
      priority: 3,
      targetElement: elementId,
      analysisType: 'full' as const,
      dependencies: [],
      status: 'pending' as const
    }));

    this.queueTasks(tasks);
    await this.executeAnalysisQueue(script);
  }
}