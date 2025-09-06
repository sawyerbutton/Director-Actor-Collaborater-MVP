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
      ['timeline']: 0,
      ['character']: 0,
      ['plot']: 0,
      ['dialogue']: 0,
      ['scene']: 0
    },
    errorsBySeverity: {
      ['critical']: 0,
      ['high']: 0,
      ['medium']: 0,
      ['low']: 0
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
          ['critical']: 0,
          ['high']: 1,
          ['medium']: 1,
          ['low']: 1
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
          ['critical']: 1,
          ['high']: 3,
          ['medium']: 2,
          ['low']: 2
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
          ['critical']: 3,
          ['high']: 6,
          ['medium']: 4,
          ['low']: 2
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
          ['timeline']: 6,
          ['character']: 2,
          ['plot']: 1,
          ['dialogue']: 1,
          ['scene']: 0
        },
        errorsBySeverity: {
          ['critical']: 2,
          ['high']: 3,
          ['medium']: 3,
          ['low']: 2
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
          ['timeline']: 2,
          ['character']: 8,
          ['plot']: 1,
          ['dialogue']: 1,
          ['scene']: 0
        },
        errorsBySeverity: {
          ['critical']: 1,
          ['high']: 4,
          ['medium']: 4,
          ['low']: 3
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
            type: 'timeline',
            severity: 'high',
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
            type: 'timeline',
            severity: 'high',
            location: { sceneNumber: 1 },
            description: 'Time inconsistency detected',
            suggestion: 'Fix the timeline'
          }
        ],
        errorsByType: {
          ['timeline']: 1,
          ['character']: 1,
          ['plot']: 1,
          ['dialogue']: 0,
          ['scene']: 0
        },
        errorsBySeverity: {
          ['critical']: 0,
          ['high']: 1,
          ['medium']: 1,
          ['low']: 1
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
          ['timeline']: 2,
          ['character']: 3,
          ['plot']: 0,
          ['dialogue']: 0,
          ['scene']: 0
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
            type: 'timeline',
            severity: 'critical',
            location: {},
            description: 'Critical error'
          },
          {
            id: '2',
            type: 'character',
            severity: 'high',
            location: {},
            description: 'High error'
          },
          {
            id: '3',
            type: 'plot',
            severity: 'medium',
            location: {},
            description: 'Medium error'
          },
          {
            id: '4',
            type: 'dialogue',
            severity: 'low',
            location: {},
            description: 'Low error'
          }
        ],
        errorsBySeverity: {
          ['critical']: 1,
          ['high']: 1,
          ['medium']: 1,
          ['low']: 1
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
            type: 'timeline',
            severity: 'high',
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
            type: 'character',
            severity: 'high',
            location: { sceneNumber: 2, characterName: 'John' },
            description: 'Character inconsistency',
            suggestion: 'Review character knowledge'
          }
        ],
        errorsBySeverity: {
          ['critical']: 0,
          ['high']: 1,
          ['medium']: 1,
          ['low']: 1
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
            type: 'timeline',
            severity: 'critical',
            location: {},
            description: 'Critical'
          },
          {
            id: '2',
            type: 'character',
            severity: 'high',
            location: {},
            description: 'High'
          },
          {
            id: '3',
            type: 'plot',
            severity: 'medium',
            location: {},
            description: 'Medium'
          },
          {
            id: '4',
            type: 'dialogue',
            severity: 'low',
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
            type: 'timeline',
            severity: 'high',
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