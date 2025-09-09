import { analysisService } from '@/lib/db/services/analysis.service';

/**
 * Simple in-memory job queue for async analysis processing
 * In production, this should be replaced with a proper queue service like Bull, BullMQ, or AWS SQS
 */
export interface AnalysisJob {
  id: string;
  analysisId: string;
  scriptContent: string;
  createdAt: Date;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class AnalysisJobQueue {
  private static instance: AnalysisJobQueue;
  private jobs: Map<string, AnalysisJob> = new Map();
  private processing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start processing jobs every 2 seconds
    this.processInterval = setInterval(() => {
      this.processNext();
    }, 2000);
  }

  static getInstance(): AnalysisJobQueue {
    if (!AnalysisJobQueue.instance) {
      AnalysisJobQueue.instance = new AnalysisJobQueue();
    }
    return AnalysisJobQueue.instance;
  }

  /**
   * Add a job to the queue
   */
  async addJob(analysisId: string, scriptContent: string): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job: AnalysisJob = {
      id: jobId,
      analysisId,
      scriptContent,
      createdAt: new Date(),
      attempts: 0,
      status: 'pending'
    };
    
    this.jobs.set(jobId, job);
    
    // Trigger processing immediately if not already processing
    if (!this.processing) {
      setImmediate(() => this.processNext());
    }
    
    return jobId;
  }

  /**
   * Process the next job in the queue
   */
  private async processNext(): Promise<void> {
    if (this.processing) {
      return; // Already processing a job
    }

    // Find next pending job
    const pendingJob = Array.from(this.jobs.values()).find(
      job => job.status === 'pending'
    );

    if (!pendingJob) {
      return; // No jobs to process
    }

    this.processing = true;
    pendingJob.status = 'processing';
    pendingJob.attempts++;

    try {
      // Start processing
      await analysisService.startAnalysis(pendingJob.analysisId);
      
      // Simulate AI processing (mock implementation)
      await this.performAnalysis(pendingJob);
      
      // Mark job as completed
      pendingJob.status = 'completed';
      
      // Clean up completed job after 5 minutes
      setTimeout(() => {
        this.jobs.delete(pendingJob.id);
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error(`Failed to process job ${pendingJob.id}:`, error);
      
      // Retry logic
      if (pendingJob.attempts < 3) {
        pendingJob.status = 'pending'; // Retry
      } else {
        pendingJob.status = 'failed';
        
        // Update analysis as failed
        await analysisService.failAnalysis(pendingJob.analysisId, {
          message: 'Analysis failed after 3 attempts',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Clean up failed job after 1 hour
        setTimeout(() => {
          this.jobs.delete(pendingJob.id);
        }, 60 * 60 * 1000);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Perform the actual analysis (mock implementation)
   */
  private async performAnalysis(job: AnalysisJob): Promise<void> {
    // Simulate processing time (2-5 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Mock analysis result
    const mockResult = {
      errors: [
        {
          type: 'format',
          line: Math.floor(Math.random() * 100) + 1,
          severity: 'high',
          message: '场景标题格式不正确',
          suggestion: '应该使用 INT. 或 EXT. 开头'
        },
        {
          type: 'character',
          line: Math.floor(Math.random() * 100) + 1,
          severity: 'medium',
          message: '角色名称不一致',
          suggestion: '保持角色名称的一致性'
        }
      ],
      statistics: {
        totalLines: job.scriptContent.split('\n').length,
        totalScenes: Math.floor(Math.random() * 10) + 1,
        totalCharacters: Math.floor(Math.random() * 5) + 1,
        errorCount: 2
      }
    };
    
    const mockSuggestions = [
      {
        id: `sug-${Date.now()}-1`,
        type: 'format',
        description: '修正场景标题格式',
        original: '室内 - 办公室 - 日',
        suggested: 'INT. 办公室 - 日'
      },
      {
        id: `sug-${Date.now()}-2`,
        type: 'character',
        description: '统一角色名称',
        original: '小明/XIAOMING',
        suggested: 'XIAOMING'
      }
    ];
    
    // Complete analysis
    await analysisService.completeAnalysis(job.analysisId, mockResult, mockSuggestions);
  }

  /**
   * Get job status
   */
  getJob(jobId: string): AnalysisJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length
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
    this.jobs.clear();
  }
}

export const analysisQueue = AnalysisJobQueue.getInstance();