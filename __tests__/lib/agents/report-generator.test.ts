import { ReportGenerator } from '@/lib/agents/report-generator';
import {
  ConsistencyAnalysisResult,
  LogicErrorType,
  ErrorSeverity
} from '@/types/analysis';

describe('ReportGenerator', () => {
  let generator: ReportGenerator;
  
  const createMockResult = (overrides?: Partial<ConsistencyAnalysisResult>): ConsistencyAnalysisResult => ({
    scriptId: 'test-script',
    analyzedAt: new Date('2024-01-01'),
    totalErrors: 0,
    errors: [],
    errorsByType: {
      [LogicErrorType.TIMELINE]: 0,
      [LogicErrorType.CHARACTER]: 0,
      [LogicErrorType.PLOT]: 0,
      [LogicErrorType.DIALOGUE]: 0,
      [LogicErrorType.SCENE]: 0
    },
    errorsBySeverity: {
      [ErrorSeverity.CRITICAL]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.LOW]: 0
    },
    analysisMetadata: {
      processingTime: 1500,
      tokensUsed: 2500,
      modelUsed: 'deepseek-chat',
      version: '1.0.0'
    },
    ...overrides
  });

  describe('generateFullReport', () => {
    it('should generate excellent consistency for error-free script', () => {
      const result = createMockResult();
      generator = new ReportGenerator(result);
      
      const report = generator.generateFullReport();
      
      expect(report.summary.overallConsistency).toBe('excellent');
      expect(report.summary.totalIssues).toBe(0);
      expect(report.summary.criticalIssues).toBe(0);
      expect(report.confidence).toBeGreaterThan(0.7);
    });

    it('should generate good consistency for minor issues', () => {
      const result = createMockResult({
        totalErrors: 3,
        errorsBySeverity: {
          [ErrorSeverity.CRITICAL]: 0,
          [ErrorSeverity.HIGH]: 1,
          [ErrorSeverity.MEDIUM]: 1,
          [ErrorSeverity.LOW]: 1
        }
      });
      generator = new ReportGenerator(result);
      
      const report = generator.generateFullReport();
      
      expect(report.summary.overallConsistency).toBe('good');
    });

    it('should generate fair consistency for moderate issues', () => {
      const result = createMockResult({
        totalErrors: 8,
        errorsBySeverity: {
          [ErrorSeverity.CRITICAL]: 1,
          [ErrorSeverity.HIGH]: 3,
          [ErrorSeverity.MEDIUM]: 2,
          [ErrorSeverity.LOW]: 2
        }
      });
      generator = new ReportGenerator(result);
      
      const report = generator.generateFullReport();
      
      expect(report.summary.overallConsistency).toBe('fair');
    });

    it('should generate poor consistency for severe issues', () => {
      const result = createMockResult({
        totalErrors: 15,
        errorsBySeverity: {
          [ErrorSeverity.CRITICAL]: 3,
          [ErrorSeverity.HIGH]: 6,
          [ErrorSeverity.MEDIUM]: 4,
          [ErrorSeverity.LOW]: 2
        }
      });
      generator = new ReportGenerator(result);
      
      const report = generator.generateFullReport();
      
      expect(report.summary.overallConsistency).toBe('poor');
    });

    it('should identify primary concerns', () => {
      const result = createMockResult({
        totalErrors: 10,
        errorsByType: {
          [LogicErrorType.TIMELINE]: 6,
          [LogicErrorType.CHARACTER]: 2,
          [LogicErrorType.PLOT]: 1,
          [LogicErrorType.DIALOGUE]: 1,
          [LogicErrorType.SCENE]: 0
        },
        errorsBySeverity: {
          [ErrorSeverity.CRITICAL]: 2,
          [ErrorSeverity.HIGH]: 3,
          [ErrorSeverity.MEDIUM]: 3,
          [ErrorSeverity.LOW]: 2
        }
      });
      generator = new ReportGenerator(result);
      
      const report = generator.generateFullReport();
      
      expect(report.summary.primaryConcerns.length).toBeGreaterThan(0);
      expect(report.summary.primaryConcerns[0]).toContain('critical');
      expect(report.summary.primaryConcerns.some(c => c.includes('Timeline'))).toBe(true);
    });

    it('should generate appropriate recommendations', () => {
      const result = createMockResult({
        totalErrors: 12,
        errorsByType: {
          [LogicErrorType.TIMELINE]: 2,
          [LogicErrorType.CHARACTER]: 8,
          [LogicErrorType.PLOT]: 1,
          [LogicErrorType.DIALOGUE]: 1,
          [LogicErrorType.SCENE]: 0
        },
        errorsBySeverity: {
          [ErrorSeverity.CRITICAL]: 1,
          [ErrorSeverity.HIGH]: 4,
          [ErrorSeverity.MEDIUM]: 4,
          [ErrorSeverity.LOW]: 3
        }
      });
      generator = new ReportGenerator(result);
      
      const report = generator.generateFullReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0]).toContain('Priority');
      expect(report.recommendations.some(r => r.includes('character'))).toBe(true);
    });

    it('should calculate confidence score', () => {
      const result = createMockResult({
        totalErrors: 5,
        errors: [
          {
            id: '1',
            type: LogicErrorType.TIMELINE,
            severity: ErrorSeverity.HIGH,
            location: {},
            description: 'Test error',
            context: 'Some context',
            suggestion: 'Fix it'
          }
        ],
        analysisMetadata: {
          processingTime: 3000,
          tokensUsed: 3500,
          modelUsed: 'deepseek-chat',
          version: '1.0.0'
        }
      });
      generator = new ReportGenerator(result);
      
      const report = generator.generateFullReport();
      
      expect(report.confidence).toBeGreaterThan(0.8);
      expect(report.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('generateMarkdownReport', () => {
    it('should generate valid markdown', () => {
      const result = createMockResult({
        totalErrors: 3,
        errors: [
          {
            id: '1',
            type: LogicErrorType.TIMELINE,
            severity: ErrorSeverity.HIGH,
            location: { sceneNumber: 1 },
            description: 'Time inconsistency detected',
            suggestion: 'Fix the timeline'
          }
        ],
        errorsByType: {
          [LogicErrorType.TIMELINE]: 1,
          [LogicErrorType.CHARACTER]: 1,
          [LogicErrorType.PLOT]: 1,
          [LogicErrorType.DIALOGUE]: 0,
          [LogicErrorType.SCENE]: 0
        },
        errorsBySeverity: {
          [ErrorSeverity.CRITICAL]: 0,
          [ErrorSeverity.HIGH]: 1,
          [ErrorSeverity.MEDIUM]: 1,
          [ErrorSeverity.LOW]: 1
        }
      });
      generator = new ReportGenerator(result);
      
      const markdown = generator.generateMarkdownReport();
      
      expect(markdown).toContain('# Script Consistency Analysis Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('## Error Distribution');
      expect(markdown).toContain('## Detailed Findings');
      expect(markdown).toContain('## Recommendations');
      expect(markdown).toContain('## Metadata');
      expect(markdown).toContain('Time inconsistency detected');
      expect(markdown).toContain('Fix the timeline');
    });

    it('should format tables correctly', () => {
      const result = createMockResult({
        totalErrors: 5,
        errorsByType: {
          [LogicErrorType.TIMELINE]: 2,
          [LogicErrorType.CHARACTER]: 3,
          [LogicErrorType.PLOT]: 0,
          [LogicErrorType.DIALOGUE]: 0,
          [LogicErrorType.SCENE]: 0
        }
      });
      generator = new ReportGenerator(result);
      
      const markdown = generator.generateMarkdownReport();
      
      expect(markdown).toContain('| Error Type | Count | Percentage |');
      expect(markdown).toContain('|------------|-------|------------|');
      expect(markdown).toContain('| Timeline | 2 | 40.0% |');
      expect(markdown).toContain('| Character | 3 | 60.0% |');
    });

    it('should group errors by severity', () => {
      const result = createMockResult({
        totalErrors: 4,
        errors: [
          {
            id: '1',
            type: LogicErrorType.TIMELINE,
            severity: ErrorSeverity.CRITICAL,
            location: {},
            description: 'Critical error'
          },
          {
            id: '2',
            type: LogicErrorType.CHARACTER,
            severity: ErrorSeverity.HIGH,
            location: {},
            description: 'High error'
          },
          {
            id: '3',
            type: LogicErrorType.PLOT,
            severity: ErrorSeverity.MEDIUM,
            location: {},
            description: 'Medium error'
          },
          {
            id: '4',
            type: LogicErrorType.DIALOGUE,
            severity: ErrorSeverity.LOW,
            location: {},
            description: 'Low error'
          }
        ],
        errorsBySeverity: {
          [ErrorSeverity.CRITICAL]: 1,
          [ErrorSeverity.HIGH]: 1,
          [ErrorSeverity.MEDIUM]: 1,
          [ErrorSeverity.LOW]: 1
        }
      });
      generator = new ReportGenerator(result);
      
      const markdown = generator.generateMarkdownReport();
      
      expect(markdown).toContain('### Critical Issues (1)');
      expect(markdown).toContain('### High Issues (1)');
      expect(markdown).toContain('### Medium Issues (1)');
      expect(markdown).toContain('### Low Issues (1)');
    });
  });

  describe('generateJSONReport', () => {
    it('should generate valid JSON', () => {
      const result = createMockResult({
        totalErrors: 2,
        errors: [
          {
            id: '1',
            type: LogicErrorType.TIMELINE,
            severity: ErrorSeverity.HIGH,
            location: {},
            description: 'Test error'
          }
        ]
      });
      generator = new ReportGenerator(result);
      
      const json = generator.generateJSONReport();
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('detailedAnalysis');
      expect(parsed).toHaveProperty('recommendations');
      expect(parsed).toHaveProperty('confidence');
      expect(parsed.summary.totalIssues).toBe(2);
    });
  });

  describe('generateHTMLReport', () => {
    it('should generate valid HTML', () => {
      const result = createMockResult({
        totalErrors: 3,
        errors: [
          {
            id: '1',
            type: LogicErrorType.CHARACTER,
            severity: ErrorSeverity.HIGH,
            location: { sceneNumber: 2, characterName: 'John' },
            description: 'Character inconsistency',
            suggestion: 'Review character knowledge'
          }
        ],
        errorsBySeverity: {
          [ErrorSeverity.CRITICAL]: 0,
          [ErrorSeverity.HIGH]: 1,
          [ErrorSeverity.MEDIUM]: 1,
          [ErrorSeverity.LOW]: 1
        }
      });
      generator = new ReportGenerator(result);
      
      const html = generator.generateHTMLReport();
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('Script Consistency Analysis Report');
      expect(html).toContain('Character inconsistency');
      expect(html).toContain('error-high');
    });

    it('should apply correct CSS classes for severity', () => {
      const result = createMockResult({
        totalErrors: 4,
        errors: [
          {
            id: '1',
            type: LogicErrorType.TIMELINE,
            severity: ErrorSeverity.CRITICAL,
            location: {},
            description: 'Critical'
          },
          {
            id: '2',
            type: LogicErrorType.CHARACTER,
            severity: ErrorSeverity.HIGH,
            location: {},
            description: 'High'
          },
          {
            id: '3',
            type: LogicErrorType.PLOT,
            severity: ErrorSeverity.MEDIUM,
            location: {},
            description: 'Medium'
          },
          {
            id: '4',
            type: LogicErrorType.DIALOGUE,
            severity: ErrorSeverity.LOW,
            location: {},
            description: 'Low'
          }
        ]
      });
      generator = new ReportGenerator(result);
      
      const html = generator.generateHTMLReport();
      
      expect(html).toContain('error-critical');
      expect(html).toContain('error-high');
      expect(html).toContain('error-medium');
      expect(html).toContain('error-low');
      expect(html).toContain('severity-critical');
      expect(html).toContain('severity-high');
      expect(html).toContain('severity-medium');
      expect(html).toContain('severity-low');
    });

    it('should display confidence bar', () => {
      const result = createMockResult();
      generator = new ReportGenerator(result);
      
      const html = generator.generateHTMLReport();
      
      expect(html).toContain('confidence-bar');
      expect(html).toContain('confidence-fill');
      expect(html).toMatch(/width:\s*\d+(\.\d+)?%/);
    });

    it('should format location information correctly', () => {
      const result = createMockResult({
        totalErrors: 1,
        errors: [
          {
            id: '1',
            type: LogicErrorType.TIMELINE,
            severity: ErrorSeverity.HIGH,
            location: {
              sceneNumber: 3,
              characterName: 'Alice',
              dialogueIndex: 2,
              timeReference: 'morning'
            },
            description: 'Test'
          }
        ]
      });
      generator = new ReportGenerator(result);
      
      const html = generator.generateHTMLReport();
      
      expect(html).toContain('Scene 3');
      expect(html).toContain('Character: Alice');
      expect(html).toContain('Dialogue #3');
      expect(html).toContain('Time: morning');
    });
  });
});