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

    // In Serverless environments (like Vercel), setInterval doesn't work
    // because the function terminates after each request.
    // We'll rely on manual processing via API calls instead.
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (!isServerless) {
      // Only start interval in traditional server environments
      this.processInterval = setInterval(() => {
        this.processNext();
      }, 3000);
      console.log('✅ WorkflowQueue: Started background processing (traditional server)');
    } else {
      console.log('⚡ WorkflowQueue: Serverless mode - use manual processing');
    }
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
   * Manually process next job (for Serverless environments)
   *
   * In Serverless, we must process synchronously because:
   * 1. Async operations are killed when the function returns
   * 2. We need to ensure the job completes before the container freezes
   *
   * This endpoint should have a 60s timeout configured in vercel.json
   */
  async processNextManually(): Promise<{ processed: boolean; message: string; jobId?: string }> {
    if (this.processing) {
      return { processed: false, message: 'Already processing a job' };
    }

    const job = await analysisJobService.getNextQueued();

    if (!job) {
      return { processed: false, message: 'No jobs in queue' };
    }

    try {
      this.processing = true;
      await analysisJobService.startProcessing(job.id);

      // Process based on job type (synchronously to ensure completion)
      switch (job.type) {
        case JobType.ACT1_ANALYSIS:
          await this.processAct1Analysis(job.id, job.projectId);
          break;
        case JobType.ITERATION:
          await this.processIteration(job.id, job.projectId);
          break;
        case JobType.SYNTHESIS:
          await this.processSynthesis(job.id, job.projectId);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      console.log(`✅ Successfully processed job ${job.id}`);
      return {
        processed: true,
        message: `Successfully processed job ${job.id}`,
        jobId: job.id
      };
    } catch (error) {
      console.error(`❌ Error processing job ${job.id}:`, error);
      return {
        processed: false,
        message: `Failed to process job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        jobId: job.id
      };
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process next job in queue (used by setInterval in traditional servers)
   */
  private async processNext(): Promise<void> {
    await this.processNextManually();
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

      // Use raw script text directly instead of parsing (avoids parser artifacts)
      console.log('🚀 [ACT1 DEBUG] Starting AI analysis...');
      console.log('🔑 [ACT1 DEBUG] API Key status:', {
        exists: !!process.env.DEEPSEEK_API_KEY,
        length: process.env.DEEPSEEK_API_KEY?.length || 0,
        firstChars: process.env.DEEPSEEK_API_KEY?.substring(0, 10) || 'N/A'
      });
      console.log('📊 [ACT1 DEBUG] Script stats:', {
        contentLength: scriptVersion.content.length,
        lineCount: scriptVersion.content.split('\n').length
      });

      // Call new analyzeScriptText method that bypasses parser
      const analysisReport = await this.consistencyGuardian.analyzeScriptText(
        scriptVersion.content,
        `script-${projectId}`,
        ['timeline', 'character', 'plot', 'dialogue', 'scene'],
        50
      );

      // DEBUG: Log analysis results
      console.log('🔍 [ACT1 DEBUG] Analysis report:', {
        totalErrors: (analysisReport.errors || []).length,
        errorTypes: (analysisReport.errors || []).map(e => e.type),
        firstError: analysisReport.errors?.[0] ? {
          type: analysisReport.errors[0].type,
          severity: analysisReport.errors[0].severity,
          hasContent: !!analysisReport.errors[0].location?.content,
          hasSuggestion: !!analysisReport.errors[0].suggestion
        } : null
      });

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
          // Map AI severity (critical/high/medium/low) to frontend format (high/medium/low)
          severity: (error.severity === 'critical' || error.severity === 'high') ? 'critical' :
                   error.severity === 'medium' ? 'warning' : 'info',
          location: {
            scene: error.location?.sceneNumber || (error.location?.sceneId ? parseInt(error.location.sceneId) : undefined),
            line: error.location?.line || error.location?.lineNumber,
            character: error.location?.characterName,
            content: error.location?.content  // Include original text content
          },
          description: error.description,
          suggestion: error.suggestion,
          // Normalize confidence to 0-1 range (AI might return 0-100 percentage)
          confidence: ((error as any).confidence || 80) > 1
            ? ((error as any).confidence || 80) / 100
            : (error as any).confidence || 0.8
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

      // Create detailed error message for frontend
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Add timeout hint if error suggests timeout
        if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          errorMessage = `分析超时：剧本可能过长或API响应缓慢。请稍后重试或联系技术支持。(${errorMessage})`;
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorMessage = `API调用频率超限，请稍后重试。(${errorMessage})`;
        } else if (errorMessage.includes('API') || errorMessage.includes('network')) {
          errorMessage = `API连接失败，请检查网络或稍后重试。(${errorMessage})`;
        }
      }

      // Fail the job with detailed message
      await analysisJobService.fail(jobId, errorMessage);

      // Reset workflow status
      await projectService.updateWorkflowStatus(projectId, WorkflowStatus.INITIALIZED);

      throw error;
    }
  }

  /**
   * Process Iteration Job (Epic 005 & 006)
   * Executes ACT2-5 propose logic in background
   */
  private async processIteration(jobId: string, projectId: string): Promise<void> {
    try {
      // Get job metadata
      const job = await analysisJobService.getById(jobId);
      if (!job || !job.metadata) {
        throw new Error('Job or metadata not found');
      }

      const metadata = job.metadata as any;
      const { act, focusName, contradiction, scriptContext: providedContext, userId } = metadata;

      console.log('[Iteration Process] Starting:', {
        jobId,
        act,
        focusName
      });

      // Get script context from latest version (for gradual iteration)
      let scriptContext = providedContext;
      if (!scriptContext) {
        const { VersionManager } = await import('@/lib/synthesis/version-manager');
        const versionManager = new VersionManager();
        const latestVersion = await versionManager.getLatestVersion(projectId);
        scriptContext = latestVersion?.content || (await projectService.findById(projectId))?.content;

        // For ACT2_CHARACTER, also fetch diagnostic report for character issues
        if (act === 'ACT2_CHARACTER') {
          const report = await diagnosticReportService.getParsedReport(projectId);
          if (report) {
            const characterFindings = report.parsedFindings.filter(
              (f: any) => f.type === 'character'
            );
            if (characterFindings.length > 0) {
              scriptContext += '\n\n## 相关诊断发现:\n' +
                characterFindings
                  .map((f: any) => `- ${f.description}`)
                  .join('\n');
            }
          }
        }
      }

      if (!scriptContext) {
        throw new Error('Script context is required');
      }

      // Execute act-specific agent logic
      let focusContext: any;
      let proposals: any[];
      let recommendation: string;

      switch (act) {
        case 'ACT2_CHARACTER': {
          const { createCharacterArchitect } = await import('@/lib/agents/character-architect');
          const agent = createCharacterArchitect();
          const focus = await agent.focusCharacter(
            focusName,
            contradiction,
            scriptContext
          );
          const proposalSet = await agent.proposeSolutions(focus);
          focusContext = focus;
          proposals = proposalSet.proposals;
          recommendation = proposalSet.recommendation;
          break;
        }

        case 'ACT3_WORLDBUILDING': {
          const { createRulesAuditor } = await import('@/lib/agents/rules-auditor');
          const agent = createRulesAuditor();
          const auditResult = await agent.auditWorldRules(
            focusName, // setting description
            scriptContext
          );
          let verificationResult;
          if (auditResult.inconsistencies.length > 0) {
            verificationResult = await agent.verifyDynamicConsistency(
              auditResult.inconsistencies
            );
          } else {
            verificationResult = {
              solutions: [],
              recommendation: '未发现设定矛盾'
            };
          }
          focusContext = auditResult;
          proposals = verificationResult.solutions;
          recommendation = verificationResult.recommendation;
          break;
        }

        case 'ACT4_PACING': {
          const { createPacingStrategist } = await import('@/lib/agents/pacing-strategist');
          const agent = createPacingStrategist();
          const analysisResult = await agent.analyzePacing(
            scriptContext,
            focusName // time range
          );
          let restructureResult;
          if (analysisResult.pacingIssues.length > 0) {
            restructureResult = await agent.restructureConflicts(
              analysisResult.pacingIssues
            );
          } else {
            restructureResult = {
              strategies: [],
              recommendedSequence: '未发现节奏问题',
              continuityChecks: []
            };
          }
          focusContext = analysisResult;
          proposals = restructureResult.strategies;
          recommendation = restructureResult.recommendedSequence;
          break;
        }

        case 'ACT5_THEME': {
          const { createThematicPolisher } = await import('@/lib/agents/thematic-polisher');
          const agent = createThematicPolisher();
          const enhanced = await agent.enhanceCharacterDepth(
            focusName, // character name
            contradiction, // theme
            scriptContext // style reference
          );
          focusContext = enhanced;
          proposals = [enhanced.characterProfile];
          recommendation = `建议采用增强后的角色设定以深化主题表达`;
          break;
        }

        default:
          throw new Error(`Unsupported act type: ${act}`);
      }

      console.log('[Iteration Process] AI analysis complete:', {
        jobId,
        proposalsCount: proposals.length
      });

      // Store decision in database
      const { revisionDecisionService } = await import('@/lib/db/services/revision-decision.service');
      const decision = await revisionDecisionService.create({
        projectId,
        act: act as any,
        focusName,
        focusContext: focusContext as any,
        proposals: proposals as any
      });

      console.log('[Iteration Process] Decision created:', {
        jobId,
        decisionId: decision.id
      });

      // Complete the job with decision data
      await analysisJobService.complete(jobId, {
        decisionId: decision.id,
        focusContext,
        proposals,
        recommendation,
        completedAt: new Date().toISOString()
      });

      console.log('[Iteration Process] Job completed successfully:', jobId);

    } catch (error) {
      console.error(`Failed to process iteration for job ${jobId}:`, error);

      // Create detailed error message
      let errorMessage = 'Iteration processing failed';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          errorMessage = `AI分析超时：问题可能过于复杂或API响应缓慢。请稍后重试。(${errorMessage})`;
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorMessage = `API调用频率超限，请稍后重试。(${errorMessage})`;
        } else if (errorMessage.includes('API') || errorMessage.includes('network')) {
          errorMessage = `API连接失败，请检查网络或稍后重试。(${errorMessage})`;
        }
      }

      await analysisJobService.fail(jobId, errorMessage);
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

      // Create detailed error message for frontend
      let errorMessage = 'Synthesis failed';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Add timeout hint if error suggests timeout
        if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          errorMessage = `合成超时：剧本可能过长或决策过多。请稍后重试或联系技术支持。(${errorMessage})`;
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorMessage = `API调用频率超限，请稍后重试。(${errorMessage})`;
        } else if (errorMessage.includes('API') || errorMessage.includes('network')) {
          errorMessage = `API连接失败，请检查网络或稍后重试。(${errorMessage})`;
        }
      }

      await analysisJobService.fail(jobId, errorMessage);

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