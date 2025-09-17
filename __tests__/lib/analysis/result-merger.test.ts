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
      description: `Error ${id}`,
      location: sceneId ? { sceneId } : {},
      suggestion: `Fix error ${id}`
    });

    oldResults = new Map([
      ['element-1', {
        summary: {
          overallConsistency: 'good',
          criticalIssues: 0,
          totalIssues: 3,
          primaryConcerns: []
        },
        detailedAnalysis: {
          scriptId: 'script-1',
          analyzedAt: new Date(),
          totalErrors: 3,
          errors: [
            createError('error-1', 'character', 'high', 'scene-1'),
            createError('error-2', 'plot', 'medium', 'scene-1'),
            createError('error-3', 'timeline', 'low', 'scene-2')
          ],
          errorsByType: {
            ['character']: 1,
            ['plot']: 1,
            ['timeline']: 1,
            ['dialogue']: 0,
            ['scene']: 0
          },
          errorsBySeverity: {
            ['critical']: 0,
            ['high']: 1,
            ['medium']: 1,
            ['low']: 1
          },
          analysisMetadata: {
            processingTime: 0,
            modelUsed: 'test',
            version: '1.0.0'
          }
        },
        recommendations: [],
        confidence: 0.95
      }]
    ]);

    newResults = new Map([
      ['element-1', {
        summary: {
          overallConsistency: 'fair',
          criticalIssues: 1,
          totalIssues: 2,
          primaryConcerns: []
        },
        detailedAnalysis: {
          scriptId: 'script-1',
          analyzedAt: new Date(),
          totalErrors: 2,
          errors: [
            createError('error-1', 'character', 'critical', 'scene-1'),
            createError('error-4', 'dialogue', 'high', 'scene-1')
          ],
          errorsByType: {
            ['character']: 1,
            ['dialogue']: 1,
            ['plot']: 0,
            ['timeline']: 0,
            ['scene']: 0
          },
          errorsBySeverity: {
            ['critical']: 1,
            ['high']: 1,
            ['medium']: 0,
            ['low']: 0
          },
          analysisMetadata: {
            processingTime: 0,
            modelUsed: 'test',
            version: '1.0.0'
          }
        },
        recommendations: [],
        confidence: 0.95
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
      
      expect(merged.detailedAnalysis.errors).toBeDefined();
      expect(merged.summary).toBeDefined();
      expect(merged.detailedAnalysis.analysisMetadata).toBeDefined();
    });

    it('should preserve unaffected errors from old results', () => {
      changes[0].affectedElements = ['element-999'];
      
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      const error3 = merged.detailedAnalysis.errors?.find((e: any) => e.id === 'error-3');
      expect(error3).toBeDefined();
    });

    it('should include new errors from updated elements', () => {
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      const error4 = merged.detailedAnalysis.errors?.find((e: any) => e.id === 'error-4');
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
      
      const errorIds = merged.detailedAnalysis.errors?.map((e: any) => e.id) || [];
      const uniqueIds = [...new Set(errorIds)];
      expect(errorIds.length).toBe(uniqueIds.length);
    });

    it('should update summary correctly', () => {
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      expect(merged.detailedAnalysis.totalErrors).toBe(merged.detailedAnalysis.errors?.length);
      expect(merged.summary.criticalIssues).toBeGreaterThanOrEqual(0);
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
        type: 'character',
        severity: 'high',
        description: 'Duplicate error message',
        location: { sceneId: 'scene-99', lineNumber: 100 },
        suggestion: 'Fix duplicate'
      };
      
      // Add the same logical error to both old and new results (same key and message)
      oldResults.get('element-1')!.detailedAnalysis.errors.push(duplicateError);
      newResults.get('element-1')!.detailedAnalysis.errors = [
        { ...duplicateError, id: 'error-dup-new' }
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
    it.skip('should filter resolved errors', () => {
      // TODO: Implement when isResolved property is added to LogicError
      const resolvedError = oldResults.get('element-1')!.detailedAnalysis.errors[0];
      // resolvedError.isResolved = true;
      
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      const resolved = merged.detailedAnalysis.errors?.find((e: any) => e.id === resolvedError.id);
      // expect(resolved).toBeUndefined();
    });

    it.skip('should filter expired errors', () => {
      // TODO: Implement when metadata.expires property is added to LogicError
      const expiredError = oldResults.get('element-1')!.detailedAnalysis.errors[0];
      // expiredError.metadata = {
      //   expires: new Date(Date.now() - 1000).toISOString()
      // };
      
      const merged = merger.mergeResults(oldResults, newResults, changes);
      
      const expired = merged.detailedAnalysis.errors?.find((e: any) => e.id === expiredError.id);
      // expect(expired).toBeUndefined();
    });
  });
});