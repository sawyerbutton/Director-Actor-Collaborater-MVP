import { DiffReportGenerator } from '@/lib/analysis/diff-reporter';
import { VersionedAnalysisResult, ChangeEvent } from '@/types/change-tracking';
import { AnalysisReport, LogicError, ErrorSeverity, LogicErrorType } from '@/types/analysis';

describe('DiffReportGenerator', () => {
  let reporter: DiffReportGenerator;
  let beforeAnalysis: VersionedAnalysisResult;
  let afterAnalysis: VersionedAnalysisResult;
  let changes: ChangeEvent[];
  let createError: any;

  beforeEach(() => {
    reporter = new DiffReportGenerator();
    
    createError = (
      id: string,
      severity: ErrorSeverity,
      type: LogicErrorType = 'plot',
      sceneId: string = 'scene-1',
      lineNumber: number = 10
    ): LogicError => ({
      id,
      type,
      severity,
      description: `Error message ${id}`,
      location: { sceneId, lineNumber },
      suggestion: `Fix suggestion for ${id}`
    });

    const beforeReport: AnalysisReport = {
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
          createError('error-1', 'high', 'plot', 'scene-1', 10),
          createError('error-2', 'medium', 'plot', 'scene-1', 20),
          createError('error-3', 'low', 'plot', 'scene-1', 30)
        ],
        errorsByType: { ['plot']: 3, ['character']: 0, ['dialogue']: 0, ['timeline']: 0, ['scene']: 0 },
        errorsBySeverity: { ['critical']: 0, ['high']: 1, ['medium']: 1, ['low']: 1 },
        analysisMetadata: {
          processingTime: 0,
          modelUsed: 'test',
          version: '1.0.0'
        }
      },
      recommendations: [],
      confidence: 0.95
    };

    const afterReport: AnalysisReport = {
      summary: {
        overallConsistency: 'fair',
        criticalIssues: 1,
        totalIssues: 3,
        primaryConcerns: []
      },
      detailedAnalysis: {
        scriptId: 'script-1',
        analyzedAt: new Date(),
        totalErrors: 3,
        errors: [
          createError('error-1', 'critical', 'plot', 'scene-1', 10),
          createError('error-4', 'high', 'plot', 'scene-2', 10),
          createError('error-5', 'medium', 'plot', 'scene-2', 20)
        ],
        errorsByType: { ['plot']: 3, ['character']: 0, ['dialogue']: 0, ['timeline']: 0, ['scene']: 0 },
        errorsBySeverity: { ['critical']: 1, ['high']: 1, ['medium']: 1, ['low']: 0 },
        analysisMetadata: {
          processingTime: 0,
          modelUsed: 'test',
          version: '1.0.0'
        }
      },
      recommendations: [],
      confidence: 0.95
    };

    beforeAnalysis = {
      version: 'v1',
      timestamp: new Date(),
      result: beforeReport,
      isValid: true,
      affectedBy: []
    };

    afterAnalysis = {
      version: 'v2',
      timestamp: new Date(),
      result: afterReport,
      isValid: true,
      affectedBy: ['change-1']
    };

    changes = [
      {
        id: 'change-1',
        timestamp: new Date(),
        type: 'content',
        location: { sceneId: 'scene-1', path: [] },
        oldValue: 'old',
        newValue: 'new',
        affectedElements: ['scene-1']
      }
    ];
  });

  describe('generateDiffReport', () => {
    it('should generate a basic diff report', () => {
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis,
        changes
      );
      
      expect(report.changeId).toBe('change-1');
      expect(report.beforeAnalysis).toBe(beforeAnalysis);
      expect(report.afterAnalysis).toBe(afterAnalysis);
      expect(report.addedIssues).toBeDefined();
      expect(report.resolvedIssues).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    it('should identify added issues', () => {
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis
      );
      
      const addedIds = report.addedIssues.map(e => e.id);
      expect(addedIds).toContain('error-4');
      expect(addedIds).toContain('error-5');
    });

    it('should identify resolved issues', () => {
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis
      );
      
      const resolvedIds = report.resolvedIssues.map(e => e.id);
      expect(resolvedIds).toContain('error-2');
      expect(resolvedIds).toContain('error-3');
    });

    it('should track unchanged issues when requested', () => {
      // Create a scenario where error-1 is unchanged (modified severity counts as modified, not unchanged)
      const afterWithUnchanged = {
        ...afterAnalysis,
        result: {
          ...(afterAnalysis.result as AnalysisReport),
          errors: [
            // Keep error-1 exactly the same
            (beforeAnalysis.result as AnalysisReport).detailedAnalysis.errors[0],
            createError('error-4', 'high', 'plot', 'scene-2', 10),
          ]
        }
      };
      
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterWithUnchanged,
        undefined,
        { includeUnchanged: true }
      );
      
      expect(report.unchangedIssues.length).toBeGreaterThan(0);
    });

    it('should generate visual diff', () => {
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis
      );
      
      expect(report.visualDiff).toBeDefined();
      expect(report.visualDiff?.added).toBeDefined();
      expect(report.visualDiff?.removed).toBeDefined();
      expect(report.visualDiff?.modified).toBeDefined();
    });

    it('should generate recommendations', () => {
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis,
        changes
      );
      
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should calculate metrics when requested', () => {
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis,
        undefined,
        { includeMetrics: true }
      );
      
      expect(report.metrics).toBeDefined();
      expect(report.metrics?.improvementScore).toBeDefined();
      expect(report.metrics?.regressionScore).toBeDefined();
      expect(report.metrics?.stabilityIndex).toBeDefined();
    });
  });

  describe('report formatting', () => {
    it('should format report as minimal', () => {
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis,
        undefined,
        { format: 'minimal' }
      );
      
      expect(report.addedIssues).toEqual([]);
      expect(report.resolvedIssues).toEqual([]);
      expect(report.visualDiff).toBeUndefined();
    });

    it('should format report as summary', () => {
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis,
        undefined,
        { format: 'summary' }
      );
      
      expect(report.addedIssues.length).toBeLessThanOrEqual(5);
      expect(report.resolvedIssues.length).toBeLessThanOrEqual(5);
      expect(report.visualDiff).toBeUndefined();
    });

    it('should format report as detailed by default', () => {
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis
      );
      
      expect(report.addedIssues).toBeDefined();
      expect(report.visualDiff).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('report history', () => {
    it('should store report history', () => {
      reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        afterAnalysis
      );
      
      const history = reporter.getReportHistory('change-1');
      expect(history.length).toBe(1);
    });

    it('should limit history size', () => {
      for (let i = 0; i < 15; i++) {
        reporter.generateDiffReport(
          'change-1',
          beforeAnalysis,
          afterAnalysis
        );
      }
      
      const history = reporter.getReportHistory('change-1');
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('compareMultipleVersions', () => {
    it('should compare multiple versions sequentially', () => {
      const versions: VersionedAnalysisResult[] = [
        beforeAnalysis,
        afterAnalysis,
        { ...afterAnalysis, version: 'v3' }
      ];
      
      const reports = reporter.compareMultipleVersions(versions);
      
      expect(reports.length).toBe(2);
      expect(reports[0].changeId).toContain('comparison_1');
      expect(reports[1].changeId).toContain('comparison_2');
    });
  });

  describe('generateTrendAnalysis', () => {
    it('should analyze trends from multiple reports', () => {
      const reports = [];
      for (let i = 0; i < 5; i++) {
        const report = reporter.generateDiffReport(
          `change-${i}`,
          beforeAnalysis,
          afterAnalysis
        );
        reports.push(report);
      }
      
      const trend = reporter.generateTrendAnalysis(reports);
      
      expect(trend.trend).toMatch(/improving|degrading|stable/);
      expect(trend.averageImprovements).toBeDefined();
      expect(trend.averageDegradations).toBeDefined();
      expect(trend.volatility).toBeDefined();
    });

    it('should handle insufficient data for trend analysis', () => {
      const trend = reporter.generateTrendAnalysis([]);
      
      expect(trend.trend).toBe('stable');
      expect(trend.averageImprovements).toBe(0);
      expect(trend.averageDegradations).toBe(0);
      expect(trend.volatility).toBe(0);
    });
  });

  describe('recommendations generation', () => {
    it('should generate critical issue warnings', () => {
      const criticalAfter = { ...afterAnalysis };
      (criticalAfter.result as AnalysisReport).detailedAnalysis.errors = [
        {
          id: 'critical-1',
          type: 'plot',
          severity: 'critical',
          description: 'Critical issue',
          location: {}
        }
      ];
      
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        criticalAfter,
        changes
      );
      
      const criticalRec = report.recommendations?.find(r => 
        r.includes('critical') && r.includes('⚠️')
      );
      expect(criticalRec).toBeDefined();
    });

    it('should recognize improvements', () => {
      const improvedAfter = { ...afterAnalysis };
      (improvedAfter.result as AnalysisReport).detailedAnalysis.errors = [];
      
      const report = reporter.generateDiffReport(
        'change-1',
        beforeAnalysis,
        improvedAfter
      );
      
      const improvementRec = report.recommendations?.find(r => 
        r.includes('✨') || r.includes('✅')
      );
      expect(improvementRec).toBeDefined();
    });
  });
});