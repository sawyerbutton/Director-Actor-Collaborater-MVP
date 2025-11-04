/**
 * Batch Analyzer for Multi-File Script Analysis
 *
 * Handles batch processing of multiple script files through ConsistencyGuardian
 */

import { ConsistencyGuardian } from '@/lib/agents/consistency-guardian';
import { ScriptFile } from '@prisma/client';
import {
  InternalFinding,
  InternalFindingType,
  FindingSeverity,
  FindingLocation,
} from '@/types/diagnostic-report';
import { LogicErrorType, ErrorSeverity, AnalysisReport } from '@/types/analysis';

/**
 * Configuration for batch analysis
 */
export interface BatchAnalysisConfig {
  /**
   * Maximum number of files to process in parallel
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
   * @default 60000 (60 seconds)
   */
  timeoutPerFile?: number;

  /**
   * Error types to check for
   * @default ['timeline', 'character', 'plot', 'dialogue', 'scene']
   */
  checkTypes?: LogicErrorType[];

  /**
   * Whether to continue on file failure
   * @default true
   */
  continueOnError?: boolean;
}

/**
 * Result of analyzing a single file
 */
export interface FileAnalysisResult {
  fileId: string;
  filename: string;
  episodeNumber: number | null;
  status: 'success' | 'error' | 'skipped';
  findings: InternalFinding[];
  error?: string;
  processingTime: number;
  tokensUsed: number;
}

/**
 * Result of batch analysis
 */
export interface BatchAnalysisResult {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  totalFindings: number;
  totalProcessingTime: number;
  totalTokensUsed: number;
  fileResults: FileAnalysisResult[];
}

/**
 * Batch analyzer for processing multiple script files
 */
export class BatchAnalyzer {
  private guardian: ConsistencyGuardian;
  private config: Required<BatchAnalysisConfig>;

  constructor(apiKey: string, config?: BatchAnalysisConfig) {
    this.guardian = new ConsistencyGuardian(apiKey);
    this.config = {
      maxParallel: config?.maxParallel ?? 3,
      maxErrorsPerFile: config?.maxErrorsPerFile ?? 50,
      timeoutPerFile: config?.timeoutPerFile ?? 60000,
      checkTypes: config?.checkTypes ?? ['timeline', 'character', 'plot', 'dialogue', 'scene'],
      continueOnError: config?.continueOnError ?? true,
    };
  }

  /**
   * Analyze multiple script files in batch
   */
  async analyzeBatch(files: ScriptFile[]): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    const fileResults: FileAnalysisResult[] = [];

    // Filter files that have rawContent
    const validFiles = files.filter((file) => file.rawContent && file.rawContent.trim().length > 0);
    const skippedCount = files.length - validFiles.length;

    console.log(`[BatchAnalyzer] Starting batch analysis: ${validFiles.length} valid files, ${skippedCount} skipped`);

    // Process files in parallel batches
    for (let i = 0; i < validFiles.length; i += this.config.maxParallel) {
      const batch = validFiles.slice(i, i + this.config.maxParallel);
      const batchPromises = batch.map((file) => this.analyzeFile(file));

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          fileResults.push(result.value);
        } else {
          console.error('[BatchAnalyzer] Batch promise rejected:', result.reason);
        }
      }
    }

    const successCount = fileResults.filter((r) => r.status === 'success').length;
    const errorCount = fileResults.filter((r) => r.status === 'error').length;
    const totalFindings = fileResults.reduce((sum, r) => sum + r.findings.length, 0);
    const totalProcessingTime = Date.now() - startTime;
    const totalTokensUsed = fileResults.reduce((sum, r) => sum + r.tokensUsed, 0);

    console.log(`[BatchAnalyzer] Batch completed: ${successCount} success, ${errorCount} errors, ${totalFindings} findings`);

    return {
      totalFiles: files.length,
      successCount,
      errorCount,
      skippedCount,
      totalFindings,
      totalProcessingTime,
      totalTokensUsed,
      fileResults,
    };
  }

  /**
   * Analyze a single file with timeout
   */
  private async analyzeFile(file: ScriptFile): Promise<FileAnalysisResult> {
    const startTime = Date.now();
    const fileId = file.id;
    const filename = file.filename;
    const episodeNumber = file.episodeNumber;

    try {
      console.log(`[BatchAnalyzer] Analyzing file: ${filename} (${fileId})`);

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout')), this.config.timeoutPerFile);
      });

      // Race between analysis and timeout
      const analysisPromise = this.guardian.analyzeScriptText(
        file.rawContent,
        fileId,
        this.config.checkTypes,
        this.config.maxErrorsPerFile
      );

      const report = await Promise.race([analysisPromise, timeoutPromise]);

      // Convert AnalysisReport to InternalFindings
      const findings = this.convertToInternalFindings(report, file);

      const processingTime = Date.now() - startTime;
      const tokensUsed = report.detailedAnalysis.analysisMetadata?.tokensUsed || 0;

      console.log(`[BatchAnalyzer] File analyzed: ${filename} - ${findings.length} findings in ${processingTime}ms`);

      return {
        fileId,
        filename,
        episodeNumber,
        status: 'success',
        findings,
        processingTime,
        tokensUsed,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[BatchAnalyzer] Error analyzing file ${filename}:`, errorMessage);

      if (!this.config.continueOnError) {
        throw error;
      }

      return {
        fileId,
        filename,
        episodeNumber,
        status: 'error',
        findings: [],
        error: errorMessage,
        processingTime,
        tokensUsed: 0,
      };
    }
  }

  /**
   * Convert AnalysisReport errors to InternalFindings
   */
  private convertToInternalFindings(
    report: AnalysisReport,
    file: ScriptFile
  ): InternalFinding[] {
    return report.detailedAnalysis.errors.map((error: any) => {
      const finding: InternalFinding = {
        fileId: file.id,
        filename: file.filename,
        episodeNumber: file.episodeNumber,
        type: this.mapErrorType(error.type),
        severity: this.mapSeverity(error.severity),
        location: this.mapLocation(error.location),
        description: error.description,
        suggestion: error.suggestion || '',
        confidence: error.confidence || 0.8,
      };

      return finding;
    });
  }

  /**
   * Map LogicErrorType to InternalFindingType
   */
  private mapErrorType(type: LogicErrorType): InternalFindingType {
    // Direct mapping for common types
    const directMappings: Partial<Record<LogicErrorType, InternalFindingType>> = {
      timeline: 'timeline',
      character: 'character',
      plot: 'plot',
      dialogue: 'dialogue',
      scene: 'scene',
    };

    return directMappings[type] || 'plot';
  }

  /**
   * Map ErrorSeverity to FindingSeverity
   */
  private mapSeverity(severity: ErrorSeverity): FindingSeverity {
    const severityMap: Record<ErrorSeverity, FindingSeverity> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };

    return severityMap[severity] || 'medium';
  }

  /**
   * Map error location to FindingLocation
   */
  private mapLocation(location: any): FindingLocation {
    return {
      sceneNumber: location.scene,
      sceneId: location.sceneId,
      line: location.line || 0,
      content: location.content,
    };
  }

  /**
   * Analyze files sequentially (for debugging or rate limiting)
   */
  async analyzeSequential(files: ScriptFile[]): Promise<BatchAnalysisResult> {
    const originalMaxParallel = this.config.maxParallel;
    this.config.maxParallel = 1; // Force sequential
    const result = await this.analyzeBatch(files);
    this.config.maxParallel = originalMaxParallel; // Restore
    return result;
  }

  /**
   * Get analysis summary statistics
   */
  static getStatistics(result: BatchAnalysisResult): {
    averageTimePerFile: number;
    averageTokensPerFile: number;
    averageFindingsPerFile: number;
    successRate: number;
  } {
    const successfulFiles = result.fileResults.filter((r) => r.status === 'success');

    return {
      averageTimePerFile:
        successfulFiles.length > 0
          ? result.totalProcessingTime / successfulFiles.length
          : 0,
      averageTokensPerFile:
        successfulFiles.length > 0
          ? result.totalTokensUsed / successfulFiles.length
          : 0,
      averageFindingsPerFile:
        successfulFiles.length > 0
          ? result.totalFindings / successfulFiles.length
          : 0,
      successRate:
        result.totalFiles > 0
          ? (result.successCount / result.totalFiles) * 100
          : 0,
    };
  }
}

/**
 * Factory function to create a batch analyzer
 */
export function createBatchAnalyzer(
  apiKey: string,
  config?: BatchAnalysisConfig
): BatchAnalyzer {
  return new BatchAnalyzer(apiKey, config);
}
