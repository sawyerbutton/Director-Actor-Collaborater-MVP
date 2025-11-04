/**
 * Diagnostic Report Types for Multi-File Analysis
 *
 * Supports both single-file (internal) and cross-file findings
 */

/**
 * Error types for single-file analysis
 */
export type InternalFindingType =
  | 'timeline'
  | 'character'
  | 'plot'
  | 'dialogue'
  | 'scene';

/**
 * Error types for cross-file analysis
 */
export type CrossFileFindingType =
  | 'cross_file_timeline'
  | 'cross_file_character'
  | 'cross_file_plot'
  | 'cross_file_setting';

/**
 * Severity levels for all findings
 */
export type FindingSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Location information for a finding within a script
 */
export interface FindingLocation {
  sceneNumber?: number;
  sceneId?: string;
  line: number;
  content?: string; // 原文摘录
}

/**
 * Single file finding (internal check result)
 */
export interface InternalFinding {
  fileId: string;
  filename: string;
  episodeNumber: number | null;
  type: InternalFindingType;
  severity: FindingSeverity;
  location: FindingLocation;
  description: string;
  suggestion: string;
  confidence: number; // 0-1
}

/**
 * Affected file information in cross-file finding
 */
export interface AffectedFile {
  fileId: string;
  filename: string;
  episodeNumber: number | null;
  location: FindingLocation;
}

/**
 * Cross-file finding (cross-file check result)
 */
export interface CrossFileFinding {
  id: string;
  type: CrossFileFindingType;
  severity: FindingSeverity;
  affectedFiles: AffectedFile[];
  description: string;
  suggestion: string;
  confidence: number; // 0-1
  evidence: string[]; // 证据摘录
}

/**
 * Summary statistics for diagnostic report
 */
export interface DiagnosticSummary {
  totalFiles: number;
  totalInternalErrors: number;
  totalCrossFileErrors: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

/**
 * Complete diagnostic findings structure
 */
export interface DiagnosticFindings {
  internalFindings: InternalFinding[];
  crossFileFindings: CrossFileFinding[];
  summary: DiagnosticSummary;
}

/**
 * Complete diagnostic report (matches DiagnosticReport Prisma model)
 */
export interface DiagnosticReportData {
  id: string;
  projectId: string;
  findings: DiagnosticFindings;
  summary: string | null; // 文本摘要
  confidence: number | null; // 整体置信度
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper type for creating new diagnostic report
 */
export type CreateDiagnosticReportInput = Omit<
  DiagnosticReportData,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Helper type for updating diagnostic report
 */
export type UpdateDiagnosticReportInput = Partial<
  Omit<DiagnosticReportData, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Type guard: Check if findings follow the new structure
 */
export function isExtendedFindings(
  findings: any
): findings is DiagnosticFindings {
  return (
    findings &&
    typeof findings === 'object' &&
    Array.isArray(findings.internalFindings) &&
    Array.isArray(findings.crossFileFindings) &&
    typeof findings.summary === 'object'
  );
}

/**
 * Helper: Create empty diagnostic findings
 */
export function createEmptyFindings(): DiagnosticFindings {
  return {
    internalFindings: [],
    crossFileFindings: [],
    summary: {
      totalFiles: 0,
      totalInternalErrors: 0,
      totalCrossFileErrors: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    },
  };
}

/**
 * Helper: Calculate summary statistics from findings
 */
export function calculateSummary(
  findings: Pick<DiagnosticFindings, 'internalFindings' | 'crossFileFindings'>,
  totalFiles: number
): DiagnosticSummary {
  const allFindings = [
    ...findings.internalFindings,
    ...findings.crossFileFindings,
  ];

  const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
  const highCount = allFindings.filter((f) => f.severity === 'high').length;
  const mediumCount = allFindings.filter((f) => f.severity === 'medium').length;
  const lowCount = allFindings.filter((f) => f.severity === 'low').length;

  return {
    totalFiles,
    totalInternalErrors: findings.internalFindings.length,
    totalCrossFileErrors: findings.crossFileFindings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
  };
}
