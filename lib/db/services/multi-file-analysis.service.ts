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
import { DefaultCrossFileAnalyzer, CrossFileCheckConfig } from '@/lib/analysis/cross-file-analyzer';
import { createAICrossFileAnalyzer } from '@/lib/analysis/ai-cross-file-analyzer';
import {
  DiagnosticFindings,
  InternalFinding,
  CrossFileFinding,
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

  /**
   * Whether to run cross-file consistency checks
   * @default false
   */
  runCrossFileChecks?: boolean;

  /**
   * Cross-file analyzer configuration
   */
  crossFileConfig?: CrossFileCheckConfig;
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

    // Run cross-file checks if requested
    let crossFileFindings: CrossFileFinding[] = [];
    if (options?.runCrossFileChecks) {
      console.log(`[MultiFileAnalysis] Running cross-file consistency checks...`);
      crossFileFindings = await this.runCrossFileAnalysis(files, options.crossFileConfig);
      console.log(`[MultiFileAnalysis] Found ${crossFileFindings.length} cross-file issues`);
    }

    // Merge with existing findings if incremental
    let finalFindings: DiagnosticFindings;
    if (!options?.forceReAnalysis && existingReport) {
      const existingFindings = existingReport.findings as any as DiagnosticFindings;
      finalFindings = {
        internalFindings: [
          ...(existingFindings.internalFindings || []),
          ...internalFindings,
        ],
        crossFileFindings: options?.runCrossFileChecks
          ? crossFileFindings
          : existingFindings.crossFileFindings || [],
        summary: calculateSummary(
          {
            internalFindings: [
              ...(existingFindings.internalFindings || []),
              ...internalFindings,
            ],
            crossFileFindings: options?.runCrossFileChecks
              ? crossFileFindings
              : existingFindings.crossFileFindings || [],
          },
          files.length
        ),
      };
    } else {
      finalFindings = {
        internalFindings,
        crossFileFindings,
        summary: calculateSummary({ internalFindings, crossFileFindings }, files.length),
      };
    }

    // Determine check type based on what was analyzed
    const checkType = options?.runCrossFileChecks
      ? (internalFindings.length > 0 ? 'both' : 'cross_file')
      : 'internal_only';

    // Store diagnostic report
    const analyzedFileIds = [
      ...((existingReport?.analyzedFileIds as string[]) || []),
      ...filesToAnalyze.map((f) => f.id),
    ];

    const summaryText = options?.runCrossFileChecks
      ? `分析了 ${files.length} 个剧本文件，发现 ${finalFindings.summary.totalInternalErrors} 个内部问题，${finalFindings.summary.totalCrossFileErrors} 个跨文件问题`
      : `分析了 ${files.length} 个剧本文件，发现 ${finalFindings.summary.totalInternalErrors} 个内部问题`;

    const report = await diagnosticReportService.upsertExtended(
      projectId,
      finalFindings,
      analyzedFileIds,
      checkType as any,
      summaryText,
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
   * Run cross-file consistency analysis
   */
  async runCrossFileAnalysis(
    files: any[],
    config?: CrossFileCheckConfig
  ): Promise<CrossFileFinding[]> {
    if (files.length < 2) {
      console.log(`[MultiFileAnalysis] Skipping cross-file analysis: less than 2 files`);
      return [];
    }

    // Create AI-powered cross-file analyzer (falls back to rule-based if no API key or useAI=false)
    const analyzer = createAICrossFileAnalyzer({
      ...config,
      useAI: config?.useAI !== false  // Default to true (AI-powered)
    });

    console.log(`[MultiFileAnalysis] Using ${analyzer.constructor.name} for cross-file analysis`);

    // Run all cross-file checks (analyzer handles parsing internally)
    const result = await analyzer.analyze(files);

    // Add unique IDs to findings if they don't have one
    const findingsWithIds = result.findings.map((finding, index) => ({
      ...finding,
      id: finding.id || `cross-file-${Date.now()}-${index}`
    }));

    return findingsWithIds;
  }

  /**
   * Run only cross-file checks on existing project
   */
  async analyzeCrossFileIssues(
    projectId: string,
    config?: CrossFileCheckConfig
  ): Promise<{
    findings: CrossFileFinding[];
    reportId: string;
  }> {
    const files = await scriptFileService.getFilesByProjectId(projectId);

    // Filter out files that haven't been converted to JSON yet
    const convertedFiles = files.filter(f => f.jsonContent !== null);

    if (convertedFiles.length < 2) {
      throw new Error(`Cross-file analysis requires at least 2 converted files. Found ${convertedFiles.length} out of ${files.length} total files.`);
    }

    console.log(`[MultiFileAnalysis] Running cross-file analysis for project ${projectId}: ${convertedFiles.length} converted files (${files.length} total)`);

    // Run cross-file analysis on converted files only
    const crossFileFindings = await this.runCrossFileAnalysis(convertedFiles, config);

    // Get existing report
    const existingReport = await diagnosticReportService.getByProjectId(projectId);
    const existingFindings = existingReport
      ? (existingReport.findings as any as DiagnosticFindings)
      : createEmptyFindings();

    // Update findings with cross-file results
    const updatedFindings: DiagnosticFindings = {
      internalFindings: existingFindings.internalFindings || [],
      crossFileFindings,
      summary: calculateSummary(
        {
          internalFindings: existingFindings.internalFindings || [],
          crossFileFindings,
        },
        files.length,
        convertedFiles.length  // Pass the number of analyzed files
      ),
    };

    // Determine check type
    const checkType =
      existingFindings.internalFindings && existingFindings.internalFindings.length > 0
        ? 'both'
        : 'cross_file';

    // Update report
    const report = await diagnosticReportService.upsertExtended(
      projectId,
      updatedFindings,
      files.map((f) => f.id),
      checkType as any,
      `跨文件一致性分析发现 ${crossFileFindings.length} 个问题`,
      undefined
    );

    console.log(`[MultiFileAnalysis] Cross-file analysis completed: ${crossFileFindings.length} findings`);

    return {
      findings: crossFileFindings,
      reportId: report.id,
    };
  }

  /**
   * Get cross-file findings for a project
   */
  async getCrossFileFindings(projectId: string): Promise<CrossFileFinding[]> {
    const report = await diagnosticReportService.getParsedExtendedReport(projectId);

    if (!report) {
      return [];
    }

    return report.parsedFindings.crossFileFindings || [];
  }

  /**
   * Get cross-file findings grouped by type
   */
  async getGroupedCrossFileFindings(
    projectId: string
  ): Promise<Record<string, CrossFileFinding[]>> {
    const findings = await this.getCrossFileFindings(projectId);

    const grouped: Record<string, CrossFileFinding[]> = {};

    for (const finding of findings) {
      if (!grouped[finding.type]) {
        grouped[finding.type] = [];
      }
      grouped[finding.type].push(finding);
    }

    return grouped;
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
