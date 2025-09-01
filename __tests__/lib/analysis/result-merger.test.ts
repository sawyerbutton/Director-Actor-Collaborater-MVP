import { ResultMerger } from '@/lib/analysis/result-merger';
import { AnalysisReport, LogicError, ErrorSeverity, LogicErrorType } from '@/types/analysis';
import { ChangeEvent } from '@/types/change-tracking';

describe('ResultMerger', () => {
  let merger: ResultMerger;
  let oldResults: Map<string, AnalysisReport>;
  let newResults: Map<string, AnalysisReport>;
  let changes: ChangeEvent[];

  beforeEach(() => {
    merger = new ResultMerger();
    
    const createError = (
      id: string,
      type: LogicErrorType,
      severity: ErrorSeverity,
      sceneId?: string
    ): LogicError => ({
      id,
      type,
      severity,
      message: `Error ${id}`,
      location: sceneId ? { sceneId } : undefined,
      timestamp: new Date().toISOString(),
      suggestion: `Fix error ${id}`
    });

    oldResults = new Map([
      ['element-1', {
        id: 'report-1',
        timestamp: new Date().toISOString(),
        errors: [
          createError('error-1', LogicErrorType.CHARACTER_INCONSISTENCY, ErrorSeverity.HIGH, 'scene-1'),
          createError('error-2', LogicErrorType.PLOT_HOLE, ErrorSeverity.MEDIUM, 'scene-1'),
          createError('error-3', LogicErrorType.TIMELINE_CONFLICT, ErrorSeverity.LOW, 'scene-2')
        ],
        summary: {
          totalErrors: 3,
          criticalErrors: 0,
          highErrors: 1,
          mediumErrors: 1,
          lowErrors: 1,
          byType: {
            [LogicErrorType.CHARACTER_INCONSISTENCY]: 1,
            [LogicErrorType.PLOT_HOLE]: 1,
            [LogicErrorType.TIMELINE_CONFLICT]: 1
          }
        }
      }]
    ]);

    newResults = new Map([
      ['element-1', {
        id: 'report-2',
        timestamp: new Date().toISOString(),
        errors: [
          createError('error-1', LogicErrorType.CHARACTER_INCONSISTENCY, ErrorSeverity.CRITICAL, 'scene-1'),
          createError('error-4', LogicErrorType.DIALOGUE_INCONSISTENCY, ErrorSeverity.HIGH, 'scene-1')
        ],
        summary: {
          totalErrors: 2,
          criticalErrors: 1,
          highErrors: 1,
          mediumErrors: 0,
          lowErrors: 0,
          byType: {
            [LogicErrorType.CHARACTER_INCONSISTENCY]: 1,
            [LogicErrorType.DIALOGUE_INCONSISTENCY]: 1
          }
        }
      }]
    ]);

    changes = [
      {
        id: 'change-1',
        timestamp: new Date(),
        type: 'content',
        location: { sceneId: 'scene-1', path: [] },
        oldValue: 'old',
        newValue: 'new',
        affectedElements: ['element-1']
      }
    ];
  });

  describe('mergeResults', () => {
    it('should merge old and new results correctly', () => {
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      expect(merged.errors).toBeDefined();
      expect(merged.summary).toBeDefined();
      expect(merged.metadata).toBeDefined();
    });

    it('should preserve unaffected errors from old results', () => {
      changes[0].affectedElements = ['element-999'];
      
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      const error3 = merged.errors?.find(e => e.id === 'error-3');
      expect(error3).toBeDefined();
    });

    it('should include new errors from updated elements', () => {
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      const error4 = merged.errors?.find(e => e.id === 'error-4');
      expect(error4).toBeDefined();
    });

    it('should handle conflicts between old and new errors', () => {
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      const conflicts = merger.getMergeConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should deduplicate errors correctly', () => {
      const duplicateResults = new Map(newResults);
      duplicateResults.set('element-2', newResults.get('element-1')!);
      
      const merged = merger.mergeResults(oldResults, duplicateResults, changes);
      
      const errorIds = merged.errors?.map(e => e.id) || [];
      const uniqueIds = [...new Set(errorIds)];
      expect(errorIds.length).toBe(uniqueIds.length);
    });

    it('should update summary correctly', () => {
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      expect(merged.summary.totalErrors).toBe(merged.errors?.length);
      expect(merged.summary.criticalErrors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('version history', () => {
    it('should record version history', () => {
      merger.mergeResults(oldResults, newResults, changes);
      
      const history = merger.getVersionHistory('element-1');
      expect(history.length).toBeGreaterThan(0);
    });

    it('should get latest version', () => {
      merger.mergeResults(oldResults, newResults, changes);
      
      const latest = merger.getLatestVersion('element-1');
      expect(latest).toBeDefined();
      expect(latest?.isValid).toBe(true);
    });

    it('should invalidate versions', () => {
      merger.mergeResults(oldResults, newResults, changes);
      const history = merger.getVersionHistory('element-1');
      const version = history[0].version;
      
      merger.invalidateVersion('element-1', version);
      
      const updated = merger.getVersionHistory('element-1');
      expect(updated[0].isValid).toBe(false);
    });
  });

  describe('conflict resolution', () => {
    it('should detect duplicate conflicts', () => {
      // Create a true duplicate - same type, location, message, and severity
      const duplicateError: LogicError = {
        id: 'error-dup',
        type: LogicErrorType.CHARACTER_INCONSISTENCY,
        severity: ErrorSeverity.HIGH,
        message: 'Duplicate error message',
        location: { sceneId: 'scene-99', lineNumber: 100 },
        timestamp: new Date().toISOString(),
        suggestion: 'Fix duplicate'
      };
      
      // Add the same logical error to both old and new results (same key and message)
      oldResults.get('element-1')!.errors!.push(duplicateError);
      newResults.get('element-1')!.errors = [
        { ...duplicateError, id: 'error-dup-new', timestamp: new Date().toISOString() }
      ];
      
      merger.mergeResults(oldResults, newResults, changes);
      const conflicts = merger.getMergeConflicts();
      
      const duplicateConflict = conflicts.find(c => c.conflictType === 'duplicate');
      expect(duplicateConflict).toBeDefined();
    });

    it('should detect version mismatch conflicts', () => {
      merger.mergeResults(oldResults, newResults, changes);
      const conflicts = merger.getMergeConflicts();
      
      const versionConflict = conflicts.find(c => c.conflictType === 'version_mismatch');
      expect(versionConflict).toBeDefined();
    });

    it('should clear conflicts', () => {
      merger.mergeResults(oldResults, newResults, changes);
      merger.clearConflicts();
      
      const conflicts = merger.getMergeConflicts();
      expect(conflicts).toEqual([]);
    });
  });

  describe('error filtering', () => {
    it('should filter resolved errors', () => {
      const resolvedError = oldResults.get('element-1')!.errors![0];
      resolvedError.isResolved = true;
      
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      const resolved = merged.errors?.find(e => e.id === resolvedError.id);
      expect(resolved).toBeUndefined();
    });

    it('should filter expired errors', () => {
      const expiredError = oldResults.get('element-1')!.errors![0];
      expiredError.metadata = {
        expires: new Date(Date.now() - 1000).toISOString()
      };
      
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      const expired = merged.errors?.find(e => e.id === expiredError.id);
      expect(expired).toBeUndefined();
    });
  });
});