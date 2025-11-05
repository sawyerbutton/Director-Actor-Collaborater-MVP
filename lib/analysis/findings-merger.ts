/**
 * Findings Merger for Multi-File Analysis
 *
 * Intelligently merges, deduplicates, and prioritizes findings from multiple files
 */

import {
  InternalFinding,
  InternalFindingType,
  FindingSeverity,
} from '@/types/diagnostic-report';

/**
 * Similarity threshold for deduplication (0-1)
 */
const DEFAULT_SIMILARITY_THRESHOLD = 0.80;

/**
 * Merged finding with metadata
 */
export interface MergedFinding extends InternalFinding {
  /**
   * Number of similar findings merged
   */
  duplicateCount: number;

  /**
   * Priority score (0-100)
   */
  priorityScore: number;

  /**
   * Related file IDs (if merged from multiple files)
   */
  relatedFileIds: string[];
}

/**
 * Merge options
 */
export interface MergeOptions {
  /**
   * Similarity threshold for deduplication (0-1)
   * @default 0.80
   */
  similarityThreshold?: number;

  /**
   * Whether to remove duplicates
   * @default true
   */
  deduplicate?: boolean;

  /**
   * Whether to sort by priority
   * @default true
   */
  sortByPriority?: boolean;
}

/**
 * Merge statistics
 */
export interface MergeStatistics {
  totalInput: number;
  totalOutput: number;
  duplicatesRemoved: number;
  deduplicationRate: number;
  bySeverity: Record<FindingSeverity, number>;
  byType: Record<InternalFindingType, number>;
  averagePriority: number;
}

/**
 * Findings merger for multi-file analysis results
 */
export class FindingsMerger {
  private options: Required<MergeOptions>;

  constructor(options?: MergeOptions) {
    this.options = {
      similarityThreshold: options?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD,
      deduplicate: options?.deduplicate ?? true,
      sortByPriority: options?.sortByPriority ?? true,
    };
  }

  /**
   * Merge findings from multiple files
   */
  merge(findings: InternalFinding[]): MergedFinding[] {
    if (findings.length === 0) {
      return [];
    }

    console.log(`[FindingsMerger] Merging ${findings.length} findings...`);

    let merged: MergedFinding[] = findings.map((f) => ({
      ...f,
      duplicateCount: 1,
      priorityScore: this.calculatePriorityScore(f),
      relatedFileIds: [f.fileId],
    }));

    // Deduplicate if enabled
    if (this.options.deduplicate) {
      merged = this.deduplicateFindings(merged);
    }

    // Sort by priority if enabled
    if (this.options.sortByPriority) {
      merged.sort((a, b) => b.priorityScore - a.priorityScore);
    }

    console.log(
      `[FindingsMerger] Merged ${findings.length} → ${merged.length} findings (${findings.length - merged.length} duplicates removed)`
    );

    return merged;
  }

  /**
   * Deduplicate similar findings
   */
  private deduplicateFindings(findings: MergedFinding[]): MergedFinding[] {
    const deduplicated: MergedFinding[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < findings.length; i++) {
      if (processed.has(i)) continue;

      const current = findings[i];
      const similarIndices: number[] = [i];
      const relatedFileIds = new Set<string>([current.fileId]);

      // Find similar findings
      for (let j = i + 1; j < findings.length; j++) {
        if (processed.has(j)) continue;

        const similarity = this.calculateSimilarity(current, findings[j]);

        if (similarity >= this.options.similarityThreshold) {
          similarIndices.push(j);
          relatedFileIds.add(findings[j].fileId);
          processed.add(j);
        }
      }

      // Create merged finding
      const merged: MergedFinding = {
        ...current,
        duplicateCount: similarIndices.length,
        relatedFileIds: Array.from(relatedFileIds),
        priorityScore: this.calculatePriorityScore(current, similarIndices.length),
      };

      deduplicated.push(merged);
      processed.add(i);
    }

    return deduplicated;
  }

  /**
   * Calculate similarity between two findings (0-1)
   */
  private calculateSimilarity(a: InternalFinding, b: InternalFinding): number {
    let score = 0;

    // Type match (weight: 25%)
    if (a.type === b.type) {
      score += 0.25;
    }

    // Severity match (weight: 15%)
    if (a.severity === b.severity) {
      score += 0.15;
    }

    // Description similarity (weight: 50%)
    const descSim = this.textSimilarity(a.description, b.description);
    score += descSim * 0.5;

    // Suggestion similarity (weight: 10%)
    const suggSim = this.textSimilarity(a.suggestion, b.suggestion);
    score += suggSim * 0.1;

    return score;
  }

  /**
   * Calculate text similarity using Jaccard index
   */
  private textSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.tokenize(text1));
    const words2 = new Set(this.tokenize(text2));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Tokenize text for similarity calculation
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, '') // Keep Chinese, letters, numbers
      .split(/\s+/)
      .filter((w) => w.length > 1); // Filter single chars
  }

  /**
   * Calculate priority score for a finding
   */
  private calculatePriorityScore(finding: InternalFinding, duplicateCount: number = 1): number {
    // Severity base score (0-60)
    const severityScores: Record<FindingSeverity, number> = {
      critical: 60,
      high: 45,
      medium: 30,
      low: 15,
    };
    const severityScore = severityScores[finding.severity] || 0;

    // Confidence bonus (0-30)
    const confidenceBonus = finding.confidence * 30;

    // Duplicate bonus (indicates widespread issue) (0-10)
    const duplicateBonus = Math.min((duplicateCount - 1) * 2, 10);

    return Math.min(severityScore + confidenceBonus + duplicateBonus, 100);
  }

  /**
   * Group findings by criteria
   */
  groupBy(
    findings: MergedFinding[],
    criteria: 'type' | 'severity' | 'file' | 'episode'
  ): Record<string, MergedFinding[]> {
    const groups: Record<string, MergedFinding[]> = {};

    for (const finding of findings) {
      let key: string;

      switch (criteria) {
        case 'type':
          key = finding.type;
          break;
        case 'severity':
          key = finding.severity;
          break;
        case 'file':
          key = finding.filename;
          break;
        case 'episode':
          key = finding.episodeNumber?.toString() || 'unknown';
          break;
        default:
          key = 'other';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(finding);
    }

    return groups;
  }

  /**
   * Filter findings
   */
  filter(
    findings: MergedFinding[],
    criteria: {
      types?: InternalFindingType[];
      severities?: FindingSeverity[];
      minConfidence?: number;
      minPriority?: number;
      fileIds?: string[];
    }
  ): MergedFinding[] {
    return findings.filter((f) => {
      if (criteria.types && !criteria.types.includes(f.type)) return false;
      if (criteria.severities && !criteria.severities.includes(f.severity)) return false;
      if (criteria.minConfidence && f.confidence < criteria.minConfidence) return false;
      if (criteria.minPriority && f.priorityScore < criteria.minPriority) return false;
      if (criteria.fileIds && !criteria.fileIds.includes(f.fileId)) return false;
      return true;
    });
  }

  /**
   * Get merge statistics
   */
  getStatistics(
    originalFindings: InternalFinding[],
    mergedFindings: MergedFinding[]
  ): MergeStatistics {
    const duplicatesRemoved = originalFindings.length - mergedFindings.length;
    const deduplicationRate =
      originalFindings.length > 0 ? (duplicatesRemoved / originalFindings.length) * 100 : 0;

    // Count by severity
    const bySeverity: Record<FindingSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    // Count by type
    const byType: Record<string, number> = {};

    let totalPriority = 0;

    for (const finding of mergedFindings) {
      bySeverity[finding.severity]++;
      byType[finding.type] = (byType[finding.type] || 0) + 1;
      totalPriority += finding.priorityScore;
    }

    return {
      totalInput: originalFindings.length,
      totalOutput: mergedFindings.length,
      duplicatesRemoved,
      deduplicationRate,
      bySeverity,
      byType: byType as Record<InternalFindingType, number>,
      averagePriority: mergedFindings.length > 0 ? totalPriority / mergedFindings.length : 0,
    };
  }

  /**
   * Get top priority findings
   */
  getTopPriority(findings: MergedFinding[], limit: number = 10): MergedFinding[] {
    return [...findings].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, limit);
  }

  /**
   * Get critical findings (priority >= 80)
   */
  getCriticalFindings(findings: MergedFinding[]): MergedFinding[] {
    return findings.filter((f) => f.priorityScore >= 80);
  }
}

/**
 * Factory function
 */
export function createFindingsMerger(options?: MergeOptions): FindingsMerger {
  return new FindingsMerger(options);
}
