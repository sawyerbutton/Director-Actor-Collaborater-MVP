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
          oldReport.errors || [],
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
          newReport.errors || [],
          processedErrorIds
        );
        mergedErrors.push(...validErrors);
      }
      
      this.recordVersion(elementId, newReport, 'updated');
    }

    const deduplicatedErrors = this.deduplicateErrors(mergedErrors);
    
    const finalReport: AnalysisReport = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      errors: deduplicatedErrors,
      summary: this.generateSummary(deduplicatedErrors),
      metadata: {
        totalElementsAnalyzed: oldResults.size + newResults.size,
        elementsUpdated: newResults.size,
        elementsPreserved: oldResults.size - affectedElements.size,
        mergeConflicts: this.mergeConflicts.length,
        changes: changes.length
      }
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
    const oldErrors = oldReport.errors || [];
    const newErrors = newReport.errors || [];

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
      if (!newErrorMap.has(key) && oldError.isResolved !== true) {
        merged.push({
          ...oldError,
          metadata: {
            ...oldError.metadata,
            preservedFromPrevious: true
          }
        });
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
    if (oldError.message === newError.message && 
        oldError.severity === newError.severity) {
      return 'duplicate';
    }
    
    if (oldError.severity !== newError.severity) {
      return 'version_mismatch';
    }
    
    if (oldError.message !== newError.message) {
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
        return newError.timestamp > oldError.timestamp ? 'keep_new' : 'keep_old';
      
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
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.INFO]: 0
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
      
      if (error.isResolved) {
        return false;
      }
      
      if (error.metadata?.expires && 
          new Date(error.metadata.expires) < new Date()) {
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
      
      if (!existing || error.timestamp > existing.timestamp) {
        uniqueErrors.set(key, error);
      }
    }
    
    return Array.from(uniqueErrors.values());
  }

  private generateSummary(errors: LogicError[]): AnalysisReport['summary'] {
    const summary: AnalysisReport['summary'] = {
      totalErrors: errors.length,
      criticalErrors: 0,
      highErrors: 0,
      mediumErrors: 0,
      lowErrors: 0,
      byType: {}
    };

    for (const error of errors) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          summary.criticalErrors++;
          break;
        case ErrorSeverity.HIGH:
          summary.highErrors++;
          break;
        case ErrorSeverity.MEDIUM:
          summary.mediumErrors++;
          break;
        case ErrorSeverity.LOW:
          summary.lowErrors++;
          break;
      }

      summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;
    }

    return summary;
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