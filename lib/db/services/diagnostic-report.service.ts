import { prisma } from '../client';
import { DiagnosticReport, Prisma } from '@prisma/client';
import { BaseService } from './base.service';
import {
  DiagnosticFindings,
  InternalFinding,
  CrossFileFinding,
  DiagnosticSummary,
  InternalFindingType,
  CrossFileFindingType,
  FindingSeverity,
  isExtendedFindings,
  createEmptyFindings,
  calculateSummary,
} from '@/types/diagnostic-report';

/**
 * Legacy finding type (for backward compatibility)
 * @deprecated Use InternalFinding from types/diagnostic-report.ts instead
 */
export interface DiagnosticFinding {
  type: 'character' | 'timeline' | 'scene' | 'plot' | 'dialogue';
  severity: 'critical' | 'warning' | 'info';
  location: {
    act?: number;
    scene?: number;
    line?: number;
    character?: string;
    content?: string;
  };
  description: string;
  suggestion?: string;
  confidence: number;
}

/**
 * Legacy report data structure (for backward compatibility)
 * @deprecated Use DiagnosticFindings from types/diagnostic-report.ts instead
 */
export interface DiagnosticReportData {
  findings: DiagnosticFinding[];
  summary: string;
  overallConfidence: number;
  metadata?: {
    analysisTime?: number;
    modelUsed?: string;
    version?: string;
  };
}

/**
 * Extended diagnostic report service with multi-file support
 */
export class DiagnosticReportService extends BaseService {
  /**
   * Create or update a diagnostic report (extended structure)
   */
  async upsertExtended(
    projectId: string,
    findings: DiagnosticFindings,
    analyzedFileIds: string[],
    checkType: 'internal_only' | 'cross_file' | 'both',
    summary?: string,
    confidence?: number
  ): Promise<DiagnosticReport> {
    const internalErrorCount = findings.internalFindings.length;
    const crossFileErrorCount = findings.crossFileFindings.length;

    return await prisma.diagnosticReport.upsert({
      where: { projectId },
      create: {
        projectId,
        findings: findings as any,
        summary,
        confidence,
        analyzedFileIds,
        checkType,
        internalErrorCount,
        crossFileErrorCount,
      },
      update: {
        findings: findings as any,
        summary,
        confidence,
        analyzedFileIds,
        checkType,
        internalErrorCount,
        crossFileErrorCount,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Create or update a diagnostic report (legacy structure)
   * @deprecated Use upsertExtended for multi-file support
   */
  async upsert(
    projectId: string,
    data: DiagnosticReportData
  ): Promise<DiagnosticReport> {
    const confidence = data.overallConfidence;

    return await prisma.diagnosticReport.upsert({
      where: { projectId },
      create: {
        projectId,
        findings: data.findings as any,
        summary: data.summary,
        confidence,
        analyzedFileIds: [],
        checkType: 'internal_only',
        internalErrorCount: data.findings.length,
        crossFileErrorCount: 0,
      },
      update: {
        findings: data.findings as any,
        summary: data.summary,
        confidence,
        internalErrorCount: data.findings.length,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get report by project ID
   */
  async getByProjectId(projectId: string): Promise<DiagnosticReport | null> {
    return await prisma.diagnosticReport.findUnique({
      where: { projectId },
    });
  }

  /**
   * Get report with parsed findings (extended structure)
   */
  async getParsedExtendedReport(
    projectId: string
  ): Promise<
    (DiagnosticReport & { parsedFindings: DiagnosticFindings }) | null
  > {
    const report = await this.getByProjectId(projectId);

    if (!report) {
      return null;
    }

    // Validate and parse findings
    const parsedFindings = isExtendedFindings(report.findings)
      ? (report.findings as unknown as DiagnosticFindings)
      : createEmptyFindings();

    return {
      ...report,
      parsedFindings,
    };
  }

  /**
   * Get report with parsed findings (legacy structure)
   * @deprecated Use getParsedExtendedReport for multi-file support
   */
  async getParsedReport(
    projectId: string
  ): Promise<(DiagnosticReport & { parsedFindings: DiagnosticFinding[] }) | null> {
    const report = await this.getByProjectId(projectId);

    if (!report) {
      return null;
    }

    return {
      ...report,
      parsedFindings: report.findings as unknown as DiagnosticFinding[],
    };
  }

  /**
   * Get internal findings by file ID
   */
  async getInternalFindingsByFile(
    projectId: string,
    fileId: string
  ): Promise<InternalFinding[]> {
    const report = await this.getParsedExtendedReport(projectId);

    if (!report) {
      return [];
    }

    return report.parsedFindings.internalFindings.filter(
      (finding) => finding.fileId === fileId
    );
  }

  /**
   * Get internal findings by type
   */
  async getInternalFindingsByType(
    projectId: string,
    type: InternalFindingType
  ): Promise<InternalFinding[]> {
    const report = await this.getParsedExtendedReport(projectId);

    if (!report) {
      return [];
    }

    return report.parsedFindings.internalFindings.filter(
      (finding) => finding.type === type
    );
  }

  /**
   * Get cross-file findings by type
   */
  async getCrossFileFindingsByType(
    projectId: string,
    type: CrossFileFindingType
  ): Promise<CrossFileFinding[]> {
    const report = await this.getParsedExtendedReport(projectId);

    if (!report) {
      return [];
    }

    return report.parsedFindings.crossFileFindings.filter(
      (finding) => finding.type === type
    );
  }

  /**
   * Get all findings by severity (both internal and cross-file)
   */
  async getFindingsBySeverity(
    projectId: string,
    severity: FindingSeverity
  ): Promise<{
    internal: InternalFinding[];
    crossFile: CrossFileFinding[];
  }> {
    const report = await this.getParsedExtendedReport(projectId);

    if (!report) {
      return { internal: [], crossFile: [] };
    }

    const internal = report.parsedFindings.internalFindings.filter(
      (finding) => finding.severity === severity
    );
    const crossFile = report.parsedFindings.crossFileFindings.filter(
      (finding) => finding.severity === severity
    );

    return { internal, crossFile };
  }

  /**
   * Get critical findings (both internal and cross-file)
   */
  async getCriticalFindings(projectId: string): Promise<{
    internal: InternalFinding[];
    crossFile: CrossFileFinding[];
  }> {
    return await this.getFindingsBySeverity(projectId, 'critical');
  }

  /**
   * Add internal finding to existing report
   */
  async addInternalFinding(
    projectId: string,
    finding: InternalFinding
  ): Promise<DiagnosticReport> {
    const report = await this.getParsedExtendedReport(projectId);

    if (!report) {
      throw new Error('Report not found');
    }

    const updatedFindings: DiagnosticFindings = {
      ...report.parsedFindings,
      internalFindings: [...report.parsedFindings.internalFindings, finding],
    };

    // Recalculate summary
    updatedFindings.summary = calculateSummary(
      updatedFindings,
      updatedFindings.summary.totalFiles
    );

    return await prisma.diagnosticReport.update({
      where: { projectId },
      data: {
        findings: updatedFindings as any,
        internalErrorCount: updatedFindings.internalFindings.length,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Add cross-file finding to existing report
   */
  async addCrossFileFinding(
    projectId: string,
    finding: CrossFileFinding
  ): Promise<DiagnosticReport> {
    const report = await this.getParsedExtendedReport(projectId);

    if (!report) {
      throw new Error('Report not found');
    }

    const updatedFindings: DiagnosticFindings = {
      ...report.parsedFindings,
      crossFileFindings: [
        ...report.parsedFindings.crossFileFindings,
        finding,
      ],
    };

    // Recalculate summary
    updatedFindings.summary = calculateSummary(
      updatedFindings,
      updatedFindings.summary.totalFiles
    );

    return await prisma.diagnosticReport.update({
      where: { projectId },
      data: {
        findings: updatedFindings as any,
        crossFileErrorCount: updatedFindings.crossFileFindings.length,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Remove internal findings by file ID (useful when a file is deleted)
   */
  async removeInternalFindingsByFile(
    projectId: string,
    fileId: string
  ): Promise<DiagnosticReport> {
    const report = await this.getParsedExtendedReport(projectId);

    if (!report) {
      throw new Error('Report not found');
    }

    const updatedFindings: DiagnosticFindings = {
      ...report.parsedFindings,
      internalFindings: report.parsedFindings.internalFindings.filter(
        (finding) => finding.fileId !== fileId
      ),
    };

    // Recalculate summary
    updatedFindings.summary = calculateSummary(
      updatedFindings,
      updatedFindings.summary.totalFiles - 1
    );

    return await prisma.diagnosticReport.update({
      where: { projectId },
      data: {
        findings: updatedFindings as any,
        internalErrorCount: updatedFindings.internalFindings.length,
        analyzedFileIds: report.analyzedFileIds.filter((id) => id !== fileId),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Calculate extended statistics for a report
   */
  async getExtendedStatistics(projectId: string): Promise<{
    internal: {
      total: number;
      byType: Record<InternalFindingType, number>;
      bySeverity: Record<FindingSeverity, number>;
    };
    crossFile: {
      total: number;
      byType: Record<CrossFileFindingType, number>;
      bySeverity: Record<FindingSeverity, number>;
    };
    overall: {
      totalErrors: number;
      criticalCount: number;
      averageConfidence: number;
    };
  } | null> {
    const report = await this.getParsedExtendedReport(projectId);

    if (!report) {
      return null;
    }

    const { internalFindings, crossFileFindings } = report.parsedFindings;

    // Internal statistics
    const internalByType: Record<string, number> = {};
    const internalBySeverity: Record<string, number> = {};
    let internalConfidence = 0;

    internalFindings.forEach((finding) => {
      internalByType[finding.type] = (internalByType[finding.type] || 0) + 1;
      internalBySeverity[finding.severity] =
        (internalBySeverity[finding.severity] || 0) + 1;
      internalConfidence += finding.confidence;
    });

    // Cross-file statistics
    const crossFileByType: Record<string, number> = {};
    const crossFileBySeverity: Record<string, number> = {};
    let crossFileConfidence = 0;

    crossFileFindings.forEach((finding) => {
      crossFileByType[finding.type] = (crossFileByType[finding.type] || 0) + 1;
      crossFileBySeverity[finding.severity] =
        (crossFileBySeverity[finding.severity] || 0) + 1;
      crossFileConfidence += finding.confidence;
    });

    const totalErrors = internalFindings.length + crossFileFindings.length;
    const totalConfidence = internalConfidence + crossFileConfidence;

    return {
      internal: {
        total: internalFindings.length,
        byType: internalByType as Record<InternalFindingType, number>,
        bySeverity: internalBySeverity as Record<FindingSeverity, number>,
      },
      crossFile: {
        total: crossFileFindings.length,
        byType: crossFileByType as Record<CrossFileFindingType, number>,
        bySeverity: crossFileBySeverity as Record<FindingSeverity, number>,
      },
      overall: {
        totalErrors,
        criticalCount:
          (internalBySeverity['critical'] || 0) +
          (crossFileBySeverity['critical'] || 0),
        averageConfidence: totalErrors > 0 ? totalConfidence / totalErrors : 0,
      },
    };
  }

  /**
   * Calculate statistics for a report (legacy method for backward compatibility)
   * @deprecated Use getExtendedStatistics for multi-file support
   */
  async getStatistics(projectId: string): Promise<{
    total: number;
    byType: Record<DiagnosticFinding['type'], number>;
    bySeverity: Record<DiagnosticFinding['severity'], number>;
    averageConfidence: number;
  } | null> {
    const report = await this.getParsedReport(projectId);

    if (!report) {
      return null;
    }

    const findings = report.parsedFindings;

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let totalConfidence = 0;

    findings.forEach((finding) => {
      // Count by type
      byType[finding.type] = (byType[finding.type] || 0) + 1;

      // Count by severity
      bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;

      // Sum confidence
      totalConfidence += finding.confidence;
    });

    return {
      total: findings.length,
      byType: byType as Record<DiagnosticFinding['type'], number>,
      bySeverity: bySeverity as Record<DiagnosticFinding['severity'], number>,
      averageConfidence: findings.length > 0 ? totalConfidence / findings.length : 0,
    };
  }

  /**
   * Delete a report
   */
  async delete(projectId: string): Promise<DiagnosticReport> {
    return await prisma.diagnosticReport.delete({
      where: { projectId },
    });
  }

  /**
   * Check if report exists
   */
  async exists(projectId: string): Promise<boolean> {
    const count = await prisma.diagnosticReport.count({
      where: { projectId },
    });
    return count > 0;
  }

  /**
   * Check if a file has been analyzed
   */
  async isFileAnalyzed(
    projectId: string,
    fileId: string
  ): Promise<boolean> {
    const report = await this.getByProjectId(projectId);

    if (!report) {
      return false;
    }

    return report.analyzedFileIds.includes(fileId);
  }

  /**
   * Mark file as analyzed
   */
  async markFileAsAnalyzed(
    projectId: string,
    fileId: string
  ): Promise<DiagnosticReport> {
    const report = await this.getByProjectId(projectId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.analyzedFileIds.includes(fileId)) {
      return report; // Already marked
    }

    return await prisma.diagnosticReport.update({
      where: { projectId },
      data: {
        analyzedFileIds: [...report.analyzedFileIds, fileId],
        updatedAt: new Date(),
      },
    });
  }
}

export const diagnosticReportService = new DiagnosticReportService();
