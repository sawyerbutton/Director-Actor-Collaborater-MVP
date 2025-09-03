import { 
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

interface MergeConflict {
  elementId: string;
  conflictType: 'duplicate' | 'contradiction' | 'version_mismatch';
  oldError?: LogicError;
  newError?: LogicError;
  resolution: 'keep_old' | 'keep_new' | 'merge' | 'discard';
}

export class ResultMerger {
  private resultHistory: Map<string, VersionedAnalysisResult[]> = new Map();
  private mergeConflicts: MergeConflict[] = [];

  constructor() {
    this.resultHistory = new Map();
    this.mergeConflicts = [];
  }

  public mergeResults(
    oldResults: Map<string, AnalysisReport>,
    newResults: Map<string, AnalysisReport>,
    changes: ChangeEvent[]
  ): AnalysisReport {
    const mergedErrors: LogicError[] = [];
    const processedErrorIds = new Set<string>();
    const affectedElements = new Set<string>(
      changes.flatMap(c => c.affectedElements)
    );

    for (const [elementId, oldReport] of oldResults) {
      if (!affectedElements.has(elementId)) {
        const validErrors = this.filterValidErrors(
          oldReport.detailedAnalysis?.errors || [],
          processedErrorIds
        );
        mergedErrors.push(...validErrors);
        
        this.recordVersion(elementId, oldReport, 'preserved');
      }
    }

    for (const [elementId, newReport] of newResults) {
      const oldReport = oldResults.get(elementId);
      
      if (oldReport) {
        const merged = this.mergeReports(
          elementId,
          oldReport,
          newReport,
          processedErrorIds
        );
        mergedErrors.push(...merged);
      } else {
        const validErrors = this.filterValidErrors(
          newReport.detailedAnalysis?.errors || [],
          processedErrorIds
        );
        mergedErrors.push(...validErrors);
      }
      
      this.recordVersion(elementId, newReport, 'updated');
    }

    const deduplicatedErrors = this.deduplicateErrors(mergedErrors);
    
    const finalReport: AnalysisReport = {
      summary: this.generateSummary(deduplicatedErrors),
      detailedAnalysis: {
        scriptId: uuidv4(),
        analyzedAt: new Date(),
        totalErrors: deduplicatedErrors.length,
        errors: deduplicatedErrors,
        errorsByType: this.groupErrorsByType(deduplicatedErrors),
        errorsBySeverity: this.groupErrorsBySeverity(deduplicatedErrors),
        analysisMetadata: {
          processingTime: 0,
          modelUsed: 'merged',
          version: '1.0.0'
        }
      },
      recommendations: this.generateRecommendations(deduplicatedErrors),
      confidence: 0.95
    };

    return finalReport;
  }

  private mergeReports(
    elementId: string,
    oldReport: AnalysisReport,
    newReport: AnalysisReport,
    processedIds: Set<string>
  ): LogicError[] {
    const merged: LogicError[] = [];
    const oldErrors = oldReport.detailedAnalysis?.errors || [];
    const newErrors = newReport.detailedAnalysis?.errors || [];

    const oldErrorMap = new Map(
      oldErrors.map(e => [this.getErrorKey(e), e])
    );
    const newErrorMap = new Map(
      newErrors.map(e => [this.getErrorKey(e), e])
    );

    for (const [key, newError] of newErrorMap) {
      const oldError = oldErrorMap.get(key);
      
      if (oldError) {
        const conflict = this.detectConflict(oldError, newError);
        
        if (conflict) {
          const resolution = this.resolveConflict(conflict, oldError, newError);
          
          this.mergeConflicts.push({
            elementId,
            conflictType: conflict,
            oldError,
            newError,
            resolution
          });
          
          if (resolution === 'keep_new' || resolution === 'merge') {
            if (!processedIds.has(newError.id)) {
              merged.push(newError);
              processedIds.add(newError.id);
            }
          } else if (resolution === 'keep_old') {
            if (!processedIds.has(oldError.id)) {
              merged.push(oldError);
              processedIds.add(oldError.id);
            }
          }
        } else {
          if (!processedIds.has(newError.id)) {
            merged.push(newError);
            processedIds.add(newError.id);
          }
        }
      } else {
        if (!processedIds.has(newError.id)) {
          merged.push(newError);
          processedIds.add(newError.id);
        }
      }
    }

    for (const [key, oldError] of oldErrorMap) {
      if (!newErrorMap.has(key)) {
        merged.push(oldError);
      }
    }

    return merged;
  }

  private getErrorKey(error: LogicError): string {
    return `${error.type}_${error.location?.sceneId || ''}_${error.location?.lineNumber || ''}`;
  }

  private detectConflict(
    oldError: LogicError,
    newError: LogicError
  ): 'duplicate' | 'contradiction' | 'version_mismatch' | null {
    // Check if they have the same key (type, scene, line)
    const sameKey = 
      oldError.type === newError.type &&
      oldError.location?.sceneId === newError.location?.sceneId &&
      oldError.location?.lineNumber === newError.location?.lineNumber;
    
    if (!sameKey) {
      return null;
    }
    
    // Now they have the same key, determine the type of conflict
    if (oldError.description === newError.description && 
        oldError.severity === newError.severity) {
      return 'duplicate';
    }
    
    if (oldError.severity !== newError.severity) {
      return 'version_mismatch';
    }
    
    if (oldError.description !== newError.description) {
      return 'contradiction';
    }
    
    return null;
  }

  private resolveConflict(
    conflictType: 'duplicate' | 'contradiction' | 'version_mismatch',
    oldError: LogicError,
    newError: LogicError
  ): 'keep_old' | 'keep_new' | 'merge' | 'discard' {
    switch (conflictType) {
      case 'duplicate':
        return 'keep_new';
      
      case 'version_mismatch':
        return this.getSeverityPriority(newError.severity) > 
               this.getSeverityPriority(oldError.severity)
               ? 'keep_new' 
               : 'keep_old';
      
      case 'contradiction':
        return 'keep_new';
      
      default:
        return 'keep_new';
    }
  }

  private getSeverityPriority(severity: ErrorSeverity): number {
    const priorities: Record<ErrorSeverity, number> = {
      [ErrorSeverity.CRITICAL]: 4,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.LOW]: 1
    };
    
    return priorities[severity] || 0;
  }

  private filterValidErrors(
    errors: LogicError[],
    processedIds: Set<string>
  ): LogicError[] {
    return errors.filter(error => {
      if (processedIds.has(error.id)) {
        return false;
      }
      
      
      processedIds.add(error.id);
      return true;
    });
  }

  private deduplicateErrors(errors: LogicError[]): LogicError[] {
    const uniqueErrors = new Map<string, LogicError>();
    
    for (const error of errors) {
      const key = this.getErrorKey(error);
      const existing = uniqueErrors.get(key);
      
      if (!existing) {
        uniqueErrors.set(key, error);
      }
    }
    
    return Array.from(uniqueErrors.values());
  }

  private generateSummary(errors: LogicError[]): AnalysisReport['summary'] {
    const criticalCount = errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;
    const highCount = errors.filter(e => e.severity === ErrorSeverity.HIGH).length;
    
    return {
      overallConsistency: 
        errors.length === 0 ? 'excellent' :
        criticalCount > 0 ? 'poor' :
        highCount > 2 ? 'fair' : 'good',
      criticalIssues: criticalCount,
      totalIssues: errors.length,
      primaryConcerns: errors.slice(0, 3).map(e => e.description)
    };
  }

  private groupErrorsByType(errors: LogicError[]): Record<LogicErrorType, number> {
    const grouped: Record<string, number> = {};
    for (const error of errors) {
      grouped[error.type] = (grouped[error.type] || 0) + 1;
    }
    return grouped as Record<LogicErrorType, number>;
  }

  private groupErrorsBySeverity(errors: LogicError[]): Record<ErrorSeverity, number> {
    const grouped: Record<string, number> = {};
    for (const error of errors) {
      grouped[error.severity] = (grouped[error.severity] || 0) + 1;
    }
    return grouped as Record<ErrorSeverity, number>;
  }

  private generateRecommendations(errors: LogicError[]): string[] {
    const recommendations: string[] = [];
    
    if (errors.length === 0) {
      recommendations.push('Script appears consistent. Continue development.');
    } else {
      const critical = errors.filter(e => e.severity === ErrorSeverity.CRITICAL);
      if (critical.length > 0) {
        recommendations.push(`Address ${critical.length} critical issues immediately.`);
      }
      
      const byType = this.groupErrorsByType(errors);
      for (const [type, count] of Object.entries(byType)) {
        if (count > 2) {
          recommendations.push(`Review ${type} consistency across the script.`);
        }
      }
    }
    
    return recommendations.slice(0, 5);
  }

  private recordVersion(
    elementId: string,
    report: AnalysisReport,
    changeType: 'preserved' | 'updated'
  ): void {
    const version: VersionedAnalysisResult = {
      version: uuidv4(),
      timestamp: new Date(),
      result: report,
      isValid: true,
      affectedBy: changeType === 'updated' ? ['change'] : []
    };

    let history = this.resultHistory.get(elementId);
    if (!history) {
      history = [];
      this.resultHistory.set(elementId, history);
    }
    
    history.push(version);
    
    if (history.length > 10) {
      history.shift();
    }
  }

  public getVersionHistory(elementId: string): VersionedAnalysisResult[] {
    return this.resultHistory.get(elementId) || [];
  }

  public getLatestVersion(elementId: string): VersionedAnalysisResult | null {
    const history = this.resultHistory.get(elementId);
    return history ? history[history.length - 1] : null;
  }

  public getMergeConflicts(): MergeConflict[] {
    return [...this.mergeConflicts];
  }

  public clearConflicts(): void {
    this.mergeConflicts = [];
  }

  public invalidateVersion(elementId: string, version: string): void {
    const history = this.resultHistory.get(elementId);
    if (history) {
      const versionIndex = history.findIndex(v => v.version === version);
      if (versionIndex !== -1) {
        history[versionIndex].isValid = false;
      }
    }
  }
}