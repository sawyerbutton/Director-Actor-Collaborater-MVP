import { 
  DiffReport,
  VersionedAnalysisResult,
  ChangeEvent
} from '@/types/change-tracking';
import { 
  AnalysisReport,
  LogicError,
  ErrorSeverity,
  LogicErrorType
} from '@/types/analysis';
import { v4 as uuidv4 } from 'uuid';

export interface DiffReportOptions {
  includeUnchanged?: boolean;
  groupByType?: boolean;
  includeMetrics?: boolean;
  format?: 'detailed' | 'summary' | 'minimal';
}

export interface EnhancedDiffReport extends DiffReport {
  visualDiff?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  recommendations?: string[];
  metrics?: {
    improvementScore: number;
    regressionScore: number;
    stabilityIndex: number;
  };
}

export class DiffReportGenerator {
  private reportHistory: Map<string, DiffReport[]> = new Map();

  constructor() {
    this.reportHistory = new Map();
  }

  public generateDiffReport(
    changeId: string,
    beforeAnalysis: VersionedAnalysisResult,
    afterAnalysis: VersionedAnalysisResult,
    changes?: ChangeEvent[],
    options: DiffReportOptions = {}
  ): EnhancedDiffReport {
    const beforeErrors = (beforeAnalysis.result as AnalysisReport).errors || [];
    const afterErrors = (afterAnalysis.result as AnalysisReport).errors || [];

    const { added, removed, unchanged, modified } = this.categorizeErrors(
      beforeErrors,
      afterErrors
    );

    const summary = this.calculateSummary(added, removed, modified, unchanged);

    const baseReport: DiffReport = {
      changeId,
      beforeAnalysis,
      afterAnalysis,
      addedIssues: added,
      resolvedIssues: removed,
      unchangedIssues: options.includeUnchanged ? unchanged : [],
      summary
    };

    const enhancedReport: EnhancedDiffReport = {
      ...baseReport,
      visualDiff: this.generateVisualDiff(added, removed, modified),
      recommendations: this.generateRecommendations(added, removed, modified, changes),
      metrics: options.includeMetrics 
        ? this.calculateMetrics(beforeErrors, afterErrors, summary)
        : undefined
    };

    this.storeReport(changeId, baseReport);

    return this.formatReport(enhancedReport, options.format || 'detailed');
  }

  private categorizeErrors(
    beforeErrors: LogicError[],
    afterErrors: LogicError[]
  ): {
    added: LogicError[];
    removed: LogicError[];
    unchanged: LogicError[];
    modified: LogicError[];
  } {
    const beforeMap = new Map<string, LogicError>();
    const afterMap = new Map<string, LogicError>();

    for (const error of beforeErrors) {
      beforeMap.set(this.getErrorIdentifier(error), error);
    }

    for (const error of afterErrors) {
      afterMap.set(this.getErrorIdentifier(error), error);
    }

    const added: LogicError[] = [];
    const removed: LogicError[] = [];
    const unchanged: LogicError[] = [];
    const modified: LogicError[] = [];

    for (const [id, afterError] of afterMap) {
      const beforeError = beforeMap.get(id);
      if (!beforeError) {
        added.push(afterError);
      } else if (this.hasErrorChanged(beforeError, afterError)) {
        modified.push(afterError);
      } else {
        unchanged.push(afterError);
      }
    }

    for (const [id, beforeError] of beforeMap) {
      if (!afterMap.has(id)) {
        removed.push(beforeError);
      }
    }

    return { added, removed, unchanged, modified };
  }

  private getErrorIdentifier(error: LogicError): string {
    return `${error.type}_${error.location?.sceneId || 'global'}_${
      error.location?.lineNumber || 0
    }`;
  }

  private hasErrorChanged(before: LogicError, after: LogicError): boolean {
    return (
      before.severity !== after.severity ||
      before.message !== after.message ||
      before.suggestion !== after.suggestion
    );
  }

  private calculateSummary(
    added: LogicError[],
    removed: LogicError[],
    modified: LogicError[],
    unchanged: LogicError[]
  ): DiffReport['summary'] {
    const criticalChanges = [
      ...added.filter(e => e.severity === ErrorSeverity.CRITICAL),
      ...removed.filter(e => e.severity === ErrorSeverity.CRITICAL),
      ...modified.filter(e => e.severity === ErrorSeverity.CRITICAL)
    ].length;

    const improvements = removed.filter(
      e => e.severity === ErrorSeverity.HIGH || e.severity === ErrorSeverity.CRITICAL
    ).length;

    const degradations = added.filter(
      e => e.severity === ErrorSeverity.HIGH || e.severity === ErrorSeverity.CRITICAL
    ).length;

    return {
      totalChanges: added.length + removed.length + modified.length,
      criticalChanges,
      improvements,
      degradations
    };
  }

  private generateVisualDiff(
    added: LogicError[],
    removed: LogicError[],
    modified: LogicError[]
  ): EnhancedDiffReport['visualDiff'] {
    return {
      added: added.map(e => this.formatErrorForVisual(e, '+')),
      removed: removed.map(e => this.formatErrorForVisual(e, '-')),
      modified: modified.map(e => this.formatErrorForVisual(e, '~'))
    };
  }

  private formatErrorForVisual(error: LogicError, prefix: string): string {
    const location = error.location 
      ? `Scene ${error.location.sceneId || 'unknown'}, Line ${error.location.lineNumber || 'N/A'}`
      : 'Global';
    
    return `${prefix} [${error.severity}] ${error.type}: ${error.message} (${location})`;
  }

  private generateRecommendations(
    added: LogicError[],
    removed: LogicError[],
    modified: LogicError[],
    changes?: ChangeEvent[]
  ): string[] {
    const recommendations: string[] = [];

    const criticalAdded = added.filter(e => e.severity === ErrorSeverity.CRITICAL);
    if (criticalAdded.length > 0) {
      recommendations.push(
        `⚠️ ${criticalAdded.length} critical issue(s) introduced. Immediate attention required.`
      );
    }

    const highAdded = added.filter(e => e.severity === ErrorSeverity.HIGH);
    if (highAdded.length > 0) {
      recommendations.push(
        `Review ${highAdded.length} high-severity issue(s) before proceeding.`
      );
    }

    const resolvedCritical = removed.filter(e => e.severity === ErrorSeverity.CRITICAL);
    if (resolvedCritical.length > 0) {
      recommendations.push(
        `✅ Successfully resolved ${resolvedCritical.length} critical issue(s).`
      );
    }

    if (changes && changes.length > 0) {
      const structuralChanges = changes.filter(c => c.type === 'structure');
      if (structuralChanges.length > 0) {
        recommendations.push(
          `Structural changes detected. Consider reviewing scene flow and character continuity.`
        );
      }

      const relationshipChanges = changes.filter(c => c.type === 'relationship');
      if (relationshipChanges.length > 0) {
        recommendations.push(
          `Character relationship changes detected. Verify dialogue consistency.`
        );
      }
    }

    if (modified.length > 5) {
      recommendations.push(
        `Multiple issues modified (${modified.length}). Review changes for unintended side effects.`
      );
    }

    if (added.length === 0 && removed.length > 0) {
      recommendations.push(
        `✨ Excellent! Only improvements made with no new issues introduced.`
      );
    }

    return recommendations;
  }

  private calculateMetrics(
    beforeErrors: LogicError[],
    afterErrors: LogicError[],
    summary: DiffReport['summary']
  ): EnhancedDiffReport['metrics'] {
    const severityScore = (errors: LogicError[]): number => {
      return errors.reduce((score, error) => {
        const weights: Record<ErrorSeverity, number> = {
          [ErrorSeverity.CRITICAL]: 10,
          [ErrorSeverity.HIGH]: 5,
          [ErrorSeverity.MEDIUM]: 3,
          [ErrorSeverity.LOW]: 1,
          [ErrorSeverity.INFO]: 0.5
        };
        return score + (weights[error.severity] || 0);
      }, 0);
    };

    const beforeScore = severityScore(beforeErrors);
    const afterScore = severityScore(afterErrors);

    const improvementScore = Math.max(0, beforeScore - afterScore) / Math.max(beforeScore, 1) * 100;
    const regressionScore = Math.max(0, afterScore - beforeScore) / Math.max(beforeScore, 1) * 100;
    
    const changeRate = summary.totalChanges / Math.max(beforeErrors.length, 1);
    const stabilityIndex = Math.max(0, 100 - (changeRate * 50));

    return {
      improvementScore: Math.round(improvementScore),
      regressionScore: Math.round(regressionScore),
      stabilityIndex: Math.round(stabilityIndex)
    };
  }

  private formatReport(
    report: EnhancedDiffReport,
    format: 'detailed' | 'summary' | 'minimal'
  ): EnhancedDiffReport {
    switch (format) {
      case 'minimal':
        return {
          changeId: report.changeId,
          beforeAnalysis: report.beforeAnalysis,
          afterAnalysis: report.afterAnalysis,
          addedIssues: [],
          resolvedIssues: [],
          unchangedIssues: [],
          summary: report.summary
        };

      case 'summary':
        return {
          ...report,
          addedIssues: report.addedIssues.slice(0, 5),
          resolvedIssues: report.resolvedIssues.slice(0, 5),
          unchangedIssues: [],
          visualDiff: undefined
        };

      case 'detailed':
      default:
        return report;
    }
  }

  private storeReport(changeId: string, report: DiffReport): void {
    let history = this.reportHistory.get(changeId);
    if (!history) {
      history = [];
      this.reportHistory.set(changeId, history);
    }
    
    history.push(report);
    
    if (history.length > 10) {
      history.shift();
    }
  }

  public getReportHistory(changeId: string): DiffReport[] {
    return this.reportHistory.get(changeId) || [];
  }

  public compareMultipleVersions(
    versions: VersionedAnalysisResult[],
    options: DiffReportOptions = {}
  ): EnhancedDiffReport[] {
    const reports: EnhancedDiffReport[] = [];
    
    for (let i = 1; i < versions.length; i++) {
      const report = this.generateDiffReport(
        `comparison_${i}`,
        versions[i - 1],
        versions[i],
        undefined,
        options
      );
      reports.push(report);
    }
    
    return reports;
  }

  public generateTrendAnalysis(
    reports: DiffReport[]
  ): {
    trend: 'improving' | 'degrading' | 'stable';
    averageImprovements: number;
    averageDegradations: number;
    volatility: number;
  } {
    if (reports.length < 2) {
      return {
        trend: 'stable',
        averageImprovements: 0,
        averageDegradations: 0,
        volatility: 0
      };
    }

    const improvements = reports.map(r => r.summary.improvements);
    const degradations = reports.map(r => r.summary.degradations);
    
    const avgImprovements = improvements.reduce((a, b) => a + b, 0) / reports.length;
    const avgDegradations = degradations.reduce((a, b) => a + b, 0) / reports.length;
    
    const changes = reports.map(r => r.summary.totalChanges);
    const avgChanges = changes.reduce((a, b) => a + b, 0) / reports.length;
    const volatility = Math.sqrt(
      changes.reduce((sum, c) => sum + Math.pow(c - avgChanges, 2), 0) / reports.length
    );

    let trend: 'improving' | 'degrading' | 'stable';
    if (avgImprovements > avgDegradations * 1.2) {
      trend = 'improving';
    } else if (avgDegradations > avgImprovements * 1.2) {
      trend = 'degrading';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      averageImprovements: Math.round(avgImprovements * 10) / 10,
      averageDegradations: Math.round(avgDegradations * 10) / 10,
      volatility: Math.round(volatility * 10) / 10
    };
  }
}