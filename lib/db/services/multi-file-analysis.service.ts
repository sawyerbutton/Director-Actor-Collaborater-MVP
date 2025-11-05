/**
 * Multi-File Analysis Service
 *
 * Orchestrates batch analysis of multiple script files and stores results
 */

import { prisma } from '../client';
import { BaseService } from './base.service';
import { scriptFileService } from './script-file.service';
import { diagnosticReportService } from './diagnostic-report.service';
import { BatchAnalyzer, BatchAnalysisResult, FileAnalysisResult } from '@/lib/analysis/batch-analyzer';
import { FindingsMerger, MergedFinding, MergeStatistics } from '@/lib/analysis/findings-merger';
import {
  DiagnosticFindings,
  InternalFinding,
  createEmptyFindings,
  calculateSummary,
} from '@/types/diagnostic-report';

/**
 * Options for multi-file analysis
 */
export interface MultiFileAnalysisOptions {
  /**
   * Maximum files to process in parallel
   * @default 3
   */
  maxParallel?: number;

  /**
   * Maximum errors to detect per file
   * @default 50
   */
  maxErrorsPerFile?: number;

  /**
   * Timeout per file in milliseconds
   * @default 60000
   */
  timeoutPerFile?: number;

  /**
   * Whether to continue on file failure
   * @default true
   */
  continueOnError?: boolean;

  /**
   * Force re-analysis of already analyzed files
   * @default false
   */
  forceReAnalysis?: boolean;
}

/**
 * Multi-file analysis progress callback
 */
export interface AnalysisProgressCallback {
  (progress: {
    currentFile: number;
    totalFiles: number;
    currentFilename: string;
    status: 'analyzing' | 'completed' | 'failed';
  }): void;
}

/**
 * Service for multi-file script analysis
 */
export class MultiFileAnalysisService extends BaseService {
  /**
   * Analyze all script files in a project
   */
  async analyzeProject(
    projectId: string,
    options?: MultiFileAnalysisOptions,
    progressCallback?: AnalysisProgressCallback
  ): Promise<{
    batchResult: BatchAnalysisResult;
    reportId: string;
  }> {
    // Get all script files for the project
    const files = await scriptFileService.getFilesByProjectId(projectId);

    if (files.length === 0) {
      throw new Error('No script files found for project');
    }

    console.log(`[MultiFileAnalysis] Starting analysis for project ${projectId}: ${files.length} files`);

    // Check existing report for incremental analysis
    const existingReport = await diagnosticReportService.getByProjectId(projectId);
    let filesToAnalyze = files;

    if (!options?.forceReAnalysis && existingReport) {
      // Filter out already analyzed files
      const analyzedFileIds = existingReport.analyzedFileIds || [];
      filesToAnalyze = files.filter((file) => !analyzedFileIds.includes(file.id));

      console.log(`[MultiFileAnalysis] Incremental mode: ${filesToAnalyze.length} new files to analyze`);

      if (filesToAnalyze.length === 0) {
        console.log(`[MultiFileAnalysis] All files already analyzed, using cached results`);

        // Return existing results
        return {
          batchResult: {
            totalFiles: files.length,
            successCount: files.length,
            errorCount: 0,
            skippedCount: 0,
            totalFindings: existingReport.internalErrorCount,
            totalProcessingTime: 0,
            totalTokensUsed: 0,
            fileResults: [],
          },
          reportId: existingReport.id,
        };
      }
    }

    // Create batch analyzer
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const analyzer = new BatchAnalyzer(apiKey, {
      maxParallel: options?.maxParallel,
      maxErrorsPerFile: options?.maxErrorsPerFile,
      timeoutPerFile: options?.timeoutPerFile,
      continueOnError: options?.continueOnError,
    });

    // Perform batch analysis
    const batchResult = await analyzer.analyzeBatch(filesToAnalyze);

    console.log(`[MultiFileAnalysis] Batch analysis completed:`, {
      success: batchResult.successCount,
      errors: batchResult.errorCount,
      findings: batchResult.totalFindings,
    });

    // Convert batch results to DiagnosticFindings format
    const internalFindings = this.aggregateInternalFindings(batchResult);

    // Merge with existing findings if incremental
    let finalFindings: DiagnosticFindings;
    if (!options?.forceReAnalysis && existingReport) {
      const existingFindings = existingReport.findings as any as DiagnosticFindings;
      finalFindings = {
        internalFindings: [
          ...(existingFindings.internalFindings || []),
          ...internalFindings,
        ],
        crossFileFindings: existingFindings.crossFileFindings || [],
        summary: calculateSummary(
          {
            internalFindings: [
              ...(existingFindings.internalFindings || []),
              ...internalFindings,
            ],
            crossFileFindings: existingFindings.crossFileFindings || [],
          },
          files.length
        ),
      };
    } else {
      finalFindings = {
        internalFindings,
        crossFileFindings: [],
        summary: calculateSummary({ internalFindings, crossFileFindings: [] }, files.length),
      };
    }

    // Store diagnostic report
    const analyzedFileIds = [
      ...((existingReport?.analyzedFileIds as string[]) || []),
      ...filesToAnalyze.map((f) => f.id),
    ];

    const report = await diagnosticReportService.upsertExtended(
      projectId,
      finalFindings,
      analyzedFileIds,
      'internal_only', // Single-file check only
      `分析了 ${files.length} 个剧本文件，发现 ${finalFindings.summary.totalInternalErrors} 个内部问题`,
      batchResult.successCount / files.length // Confidence based on success rate
    );

    console.log(`[MultiFileAnalysis] Diagnostic report created/updated: ${report.id}`);

    return {
      batchResult,
      reportId: report.id,
    };
  }

  /**
   * Analyze specific files (for incremental updates)
   */
  async analyzeFiles(
    projectId: string,
    fileIds: string[],
    options?: MultiFileAnalysisOptions
  ): Promise<{
    batchResult: BatchAnalysisResult;
    reportId: string;
  }> {
    // Get specified files
    const files = await Promise.all(
      fileIds.map((id) => scriptFileService.getFileById(id))
    );

    const validFiles = files.filter((f) => f !== null) as any[];

    if (validFiles.length === 0) {
      throw new Error('No valid files found');
    }

    console.log(`[MultiFileAnalysis] Analyzing ${validFiles.length} specific files for project ${projectId}`);

    // Create batch analyzer
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const analyzer = new BatchAnalyzer(apiKey, {
      maxParallel: options?.maxParallel,
      maxErrorsPerFile: options?.maxErrorsPerFile,
      timeoutPerFile: options?.timeoutPerFile,
      continueOnError: options?.continueOnError,
    });

    // Perform analysis
    const batchResult = await analyzer.analyzeBatch(validFiles);

    // Get existing report
    const existingReport = await diagnosticReportService.getByProjectId(projectId);
    if (!existingReport) {
      throw new Error('No existing diagnostic report found. Run full project analysis first.');
    }

    // Update findings for these files
    const existingFindings = existingReport.findings as any as DiagnosticFindings;

    // Remove old findings for these files
    const otherFindings = existingFindings.internalFindings.filter(
      (f) => !fileIds.includes(f.fileId)
    );

    // Add new findings
    const newFindings = this.aggregateInternalFindings(batchResult);
    const updatedInternalFindings = [...otherFindings, ...newFindings];

    const updatedFindings: DiagnosticFindings = {
      internalFindings: updatedInternalFindings,
      crossFileFindings: existingFindings.crossFileFindings || [],
      summary: calculateSummary(
        {
          internalFindings: updatedInternalFindings,
          crossFileFindings: existingFindings.crossFileFindings || [],
        },
        (existingReport.analyzedFileIds as string[]).length
      ),
    };

    // Update report
    const report = await diagnosticReportService.upsertExtended(
      projectId,
      updatedFindings,
      Array.from(new Set([...(existingReport.analyzedFileIds as string[]), ...fileIds])),
      existingReport.checkType as any,
      existingReport.summary || undefined,
      existingReport.confidence || undefined
    );

    console.log(`[MultiFileAnalysis] Report updated for specific files`);

    return {
      batchResult,
      reportId: report.id,
    };
  }

  /**
   * Get analysis status for a project
   */
  async getAnalysisStatus(projectId: string): Promise<{
    totalFiles: number;
    analyzedFiles: number;
    pendingFiles: number;
    lastAnalyzedAt: Date | null;
    hasReport: boolean;
  }> {
    const files = await scriptFileService.getFilesByProjectId(projectId);
    const report = await diagnosticReportService.getByProjectId(projectId);

    const analyzedFileIds = (report?.analyzedFileIds as string[]) || [];

    return {
      totalFiles: files.length,
      analyzedFiles: analyzedFileIds.length,
      pendingFiles: files.length - analyzedFileIds.length,
      lastAnalyzedAt: report?.updatedAt || null,
      hasReport: report !== null,
    };
  }

  /**
   * Aggregate internal findings from batch result with intelligent merging
   */
  private aggregateInternalFindings(batchResult: BatchAnalysisResult): InternalFinding[] {
    const allFindings: InternalFinding[] = [];

    for (const fileResult of batchResult.fileResults) {
      if (fileResult.status === 'success') {
        allFindings.push(...fileResult.findings);
      }
    }

    // Use FindingsMerger to deduplicate and prioritize
    const merger = new FindingsMerger({
      similarityThreshold: 0.80,
      deduplicate: true,
      sortByPriority: true,
    });

    const merged = merger.merge(allFindings);

    // Log merge statistics
    const stats = merger.getStatistics(allFindings, merged);
    console.log(`[MultiFileAnalysis] Merge statistics:`, {
      input: stats.totalInput,
      output: stats.totalOutput,
      deduplicationRate: `${stats.deduplicationRate.toFixed(1)}%`,
      averagePriority: stats.averagePriority.toFixed(1),
    });

    // Convert MergedFinding back to InternalFinding
    // (strip merge metadata for storage)
    return merged.map((mf) => {
      const { duplicateCount, priorityScore, relatedFileIds, ...internalFinding } = mf;
      return internalFinding as InternalFinding;
    });
  }

  /**
   * Get merged findings with metadata (for reporting/UI)
   */
  async getMergedFindings(projectId: string): Promise<{
    findings: MergedFinding[];
    statistics: MergeStatistics;
  }> {
    const report = await diagnosticReportService.getParsedExtendedReport(projectId);

    if (!report) {
      throw new Error('No diagnostic report found');
    }

    const internalFindings = report.parsedFindings.internalFindings;

    const merger = new FindingsMerger({
      similarityThreshold: 0.80,
      deduplicate: true,
      sortByPriority: true,
    });

    const merged = merger.merge(internalFindings);
    const statistics = merger.getStatistics(internalFindings, merged);

    return {
      findings: merged,
      statistics,
    };
  }

  /**
   * Get grouped findings for reporting
   */
  async getGroupedFindings(
    projectId: string,
    groupBy: 'type' | 'severity' | 'file' | 'episode'
  ): Promise<Record<string, MergedFinding[]>> {
    const { findings } = await this.getMergedFindings(projectId);

    const merger = new FindingsMerger();
    return merger.groupBy(findings, groupBy);
  }

  /**
   * Get top priority findings
   */
  async getTopPriorityFindings(
    projectId: string,
    limit: number = 10
  ): Promise<MergedFinding[]> {
    const { findings } = await this.getMergedFindings(projectId);

    const merger = new FindingsMerger();
    return merger.getTopPriority(findings, limit);
  }

  /**
   * Clear analysis results for a project
   */
  async clearAnalysis(projectId: string): Promise<void> {
    const report = await diagnosticReportService.getByProjectId(projectId);
    if (report) {
      await diagnosticReportService.delete(projectId);
      console.log(`[MultiFileAnalysis] Cleared analysis for project ${projectId}`);
    }
  }

  /**
   * Re-analyze a single file
   */
  async reAnalyzeFile(projectId: string, fileId: string): Promise<void> {
    await this.analyzeFiles(projectId, [fileId], { forceReAnalysis: true });
  }
}

export const multiFileAnalysisService = new MultiFileAnalysisService();
