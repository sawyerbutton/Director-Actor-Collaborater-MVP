import { JobType, JobStatus, WorkflowStatus, PrismaClient } from '@prisma/client';
import {
  analysisJobService,
  projectService,
  scriptVersionService,
  diagnosticReportService,
  type DiagnosticReportData
} from '@/lib/db/services';
import { ConsistencyGuardian } from '@/lib/agents/consistency-guardian';
import { parseScriptClient } from '@/lib/parser/script-parser';
import { ConsistencyCheckRequest, LogicError } from '@/types/analysis';

const prisma = new PrismaClient();

/**
 * Workflow Queue for managing Act 1 analysis and other workflow jobs
 * Uses database-backed job queue with in-memory processing
 */
class WorkflowQueue {
  private static instance: WorkflowQueue;
  private processing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;
  private consistencyGuardian: ConsistencyGuardian;

  private constructor() {
    // Initialize ConsistencyGuardian with API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required');
    }
    this.consistencyGuardian = new ConsistencyGuardian(apiKey);

    // Start processing jobs every 3 seconds
    this.processInterval = setInterval(() => {
      this.processNext();
    }, 3000);
  }

  static getInstance(): WorkflowQueue {
    if (!WorkflowQueue.instance) {
      WorkflowQueue.instance = new WorkflowQueue();
    }
    return WorkflowQueue.instance;
  }

  /**
   * Submit Act 1 analysis job
   */
  async submitAct1Analysis(projectId: string, scriptContent: string): Promise<string> {
    // Update workflow status
    await projectService.updateWorkflowStatus(projectId, WorkflowStatus.ACT1_RUNNING);

    // Save script version
    await scriptVersionService.create({
      projectId,
      content: scriptContent,
      changeLog: 'Initial script for Act 1 analysis'
    });

    // Create analysis job
    const job = await analysisJobService.create({
      projectId,
      type: JobType.ACT1_ANALYSIS,
      metadata: {
        scriptLength: scriptContent.length,
        submittedAt: new Date().toISOString()
      }
    });

    // Trigger processing immediately
    if (!this.processing) {
      setImmediate(() => this.processNext());
    }

    return job.id;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: JobStatus;
    progress?: number;
    result?: any;
    error?: string;
  }> {
    const job = await analysisJobService.getById(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    // Calculate progress based on status
    let progress = 0;
    switch (job.status) {
      case JobStatus.QUEUED:
        progress = 0;
        break;
      case JobStatus.PROCESSING:
        progress = 50;
        break;
      case JobStatus.COMPLETED:
        progress = 100;
        break;
      case JobStatus.FAILED:
      case JobStatus.CANCELLED:
        progress = 0;
        break;
    }

    return {
      status: job.status,
      progress,
      result: job.result,
      error: job.error ?? undefined
    };
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }

    try {
      // Get next queued job
      const job = await analysisJobService.getNextQueued();

      if (!job) {
        return; // No jobs to process
      }

      this.processing = true;

      // Start processing
      await analysisJobService.startProcessing(job.id);

      // Process based on job type
      switch (job.type) {
        case JobType.ACT1_ANALYSIS:
          await this.processAct1Analysis(job.id, job.projectId);
          break;
        case JobType.SYNTHESIS:
          // TODO: Implement synthesis processing
          await this.processSynthesis(job.id, job.projectId);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      console.error('Error processing job:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process Act 1 Analysis
   */
  private async processAct1Analysis(jobId: string, projectId: string): Promise<void> {
    try {
      // Get project and latest script version
      const [project, scriptVersion] = await Promise.all([
        projectService.findById(projectId),
        scriptVersionService.getLatest(projectId)
      ]);

      if (!project || !scriptVersion) {
        throw new Error('Project or script version not found');
      }

      // Parse the script
      const parsedScript = parseScriptClient(scriptVersion.content);

      // Map the parsed script to the expected format for ConsistencyCheckRequest
      // Convert 'index' to 'number' for Scene objects
      const mappedScenes = parsedScript.scenes.map(scene => ({
        ...scene,
        number: (scene as any).index || (scene as any).number || 0
      }));

      // Map metadata to the analysis format
      const mappedMetadata = {
        genre: undefined,
        setting: undefined,
        timespan: undefined,
        themes: undefined
      };

      // Create analysis request
      const analysisRequest: ConsistencyCheckRequest = {
        script: {
          id: `script-${projectId}`,
          title: project.title || 'Untitled Script',
          scenes: mappedScenes as any, // Type assertion needed due to interface mismatch
          characters: parsedScript.characters,
          metadata: mappedMetadata
        } as any
      };

      // Run ConsistencyGuardian analysis
      const analysisReport = await this.consistencyGuardian.analyzeScript(analysisRequest);

      // Transform to diagnostic report format
      // Handle summary that could be either a string or an object
      let summaryText: string;
      const reportSummary = (analysisReport as any).summary;
      if (typeof reportSummary === 'string') {
        summaryText = reportSummary;
      } else if (reportSummary && typeof reportSummary === 'object') {
        // Convert object summary to string
        summaryText = `Overall Consistency: ${reportSummary.overallConsistency || 'unknown'}. ` +
                     `Total Issues: ${reportSummary.totalIssues || 0}, ` +
                     `Critical Issues: ${reportSummary.criticalIssues || 0}`;
      } else {
        summaryText = `Detected ${(analysisReport.errors || []).length} logic errors in the script`;
      }

      const diagnosticData: DiagnosticReportData = {
        findings: (analysisReport.errors || []).map((error: LogicError) => ({
          type: this.mapErrorType(error.type),
          severity: error.severity === 'high' ? 'critical' :
                   error.severity === 'medium' ? 'warning' : 'info',
          location: {
            scene: error.location?.sceneId ? parseInt(error.location.sceneId) : undefined,
            line: error.location?.lineNumber,
            character: error.location?.characterName
          },
          description: error.description,
          suggestion: error.suggestion,
          confidence: (error as any).confidence || 0.8
        })),
        summary: summaryText,
        overallConfidence: (analysisReport as any).confidence || 0.85,
        metadata: {
          analysisTime: (analysisReport as any).processingTime || Date.now(),
          modelUsed: 'ConsistencyGuardian-v1',
          version: '1.0.0'
        }
      };

      // Debug log to verify summary is a string
      console.log('DiagnosticData summary type:', typeof diagnosticData.summary);
      console.log('DiagnosticData summary value:', diagnosticData.summary);

      // Save diagnostic report
      await diagnosticReportService.upsert(projectId, diagnosticData);

      // Complete the job
      await analysisJobService.complete(jobId, {
        errorCount: analysisReport.errors.length,
        confidence: analysisReport.confidence,
        completedAt: new Date().toISOString()
      });

      // Update workflow status
      await projectService.updateWorkflowStatus(projectId, WorkflowStatus.ACT1_COMPLETE);

    } catch (error) {
      console.error(`Failed to process Act 1 analysis for job ${jobId}:`, error);

      // Fail the job
      await analysisJobService.fail(
        jobId,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );

      // Reset workflow status
      await projectService.updateWorkflowStatus(projectId, WorkflowStatus.INITIALIZED);

      throw error;
    }
  }

  /**
   * Process Synthesis (Epic 007)
   */
  private async processSynthesis(jobId: string, projectId: string): Promise<void> {
    try {
      // Get project and all its data
      const [project, scriptVersions, decisions] = await Promise.all([
        projectService.findById(projectId),
        scriptVersionService.getByProjectId(projectId),
        // Get revision decisions via raw query since we don't have a service yet
        prisma.revisionDecision.findMany({ where: { projectId } })
      ]);

      if (!project || scriptVersions.length === 0) {
        throw new Error('Project or script versions not found');
      }

      // Get V1 (original script)
      const v1 = scriptVersions.find(v => v.version === 1);
      if (!v1) {
        throw new Error('Original script (V1) not found');
      }

      // Get synthesis options from job metadata
      const job = await analysisJobService.getById(jobId);
      const options = (job?.metadata as any)?.options || {};

      // Import and run synthesis engine
      const { SynthesisEngine } = await import('@/lib/synthesis/synthesis-engine');
      const { VersionManager } = await import('@/lib/synthesis/version-manager');

      const synthesisEngine = new SynthesisEngine();
      const versionManager = new VersionManager();

      // Run synthesis
      const result = await synthesisEngine.synthesizeScript(
        projectId,
        v1.content,
        decisions,
        options
      );

      // Save V2 (synthesized version)
      const v2 = await versionManager.createVersion(
        projectId,
        result.synthesizedScript,
        {
          synthesisLog: result.changeLog,
          decisionsApplied: result.metadata.decisionsApplied,
          confidence: result.confidence,
          timestamp: new Date()
        }
      );

      // Complete the job
      await analysisJobService.complete(jobId, {
        versionId: v2.id,
        version: v2.version,
        confidence: result.confidence,
        conflicts: result.conflicts.length,
        completedAt: new Date().toISOString()
      });

      // Update workflow status
      await projectService.updateWorkflowStatus(projectId, WorkflowStatus.COMPLETED);

    } catch (error) {
      console.error(`Failed to process synthesis for job ${jobId}:`, error);

      await analysisJobService.fail(
        jobId,
        error instanceof Error ? error.message : 'Synthesis failed'
      );

      // Reset workflow status
      await projectService.updateWorkflowStatus(projectId, WorkflowStatus.ITERATING);

      throw error;
    }
  }

  /**
   * Map error types from ConsistencyGuardian to diagnostic finding types
   */
  private mapErrorType(errorType: string): 'character' | 'timeline' | 'scene' | 'plot' | 'dialogue' {
    const typeMap: Record<string, 'character' | 'timeline' | 'scene' | 'plot' | 'dialogue'> = {
      'character_inconsistency': 'character',
      'timeline_error': 'timeline',
      'scene_continuity': 'scene',
      'plot_hole': 'plot',
      'dialogue_inconsistency': 'dialogue'
    };

    return typeMap[errorType] || 'plot';
  }

  /**
   * Get queue statistics
   */
  async getStatistics(): Promise<{
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    // Get aggregated stats from all projects
    const jobs = await analysisJobService.getByProjectId('', {
      orderBy: 'desc'
    });

    const stats = {
      total: jobs.length,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    jobs.forEach(job => {
      switch (job.status) {
        case JobStatus.QUEUED:
          stats.queued++;
          break;
        case JobStatus.PROCESSING:
          stats.processing++;
          break;
        case JobStatus.COMPLETED:
          stats.completed++;
          break;
        case JobStatus.FAILED:
          stats.failed++;
          break;
        case JobStatus.CANCELLED:
          stats.cancelled++;
          break;
      }
    });

    return {
      total: stats.total,
      queued: stats.queued,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed
    };
  }

  /**
   * Cleanup and destroy the queue
   */
  destroy(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }
}

export const workflowQueue = WorkflowQueue.getInstance();