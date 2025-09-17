import { ParsedScript } from '@/types/script';
import { AnalysisReport, LogicErrorType, ErrorSeverity, LogicError } from '@/types/analysis';

export const createMockParsedScript = (overrides?: Partial<ParsedScript>): ParsedScript => ({
  metadata: {
    parseVersion: '1.0.0',
    parseTime: new Date(),
    language: 'en',
    originalLength: 0
  },
  scenes: [],
  characters: [],
  dialogues: [],
  actions: [],
  totalDialogues: 0,
  totalActions: 0,
  ...overrides
});

export const createMockAnalysisReport = (overrides?: Partial<AnalysisReport>): AnalysisReport => ({
  summary: {
    overallConsistency: 'good',
    criticalIssues: 0,
    totalIssues: 0,
    primaryConcerns: []
  },
  detailedAnalysis: {
    scriptId: 'test-id',
    analyzedAt: new Date(),
    totalErrors: 0,
    errors: [],
    errorsByType: {
      'timeline': 0,
      'character': 0,
      'plot': 0,
      'dialogue': 0,
      'scene': 0
    } as Record<LogicErrorType, number>,
    errorsBySeverity: {
      'critical': 0,
      'high': 0,
      'medium': 0,
      'low': 0
    } as Record<ErrorSeverity, number>,
    analysisMetadata: {
      processingTime: 0,
      modelUsed: 'test',
      version: '1.0.0'
    }
  },
  recommendations: [],
  confidence: 0.95,
  ...overrides
});

export const createMockLogicError = (overrides?: Partial<LogicError>): LogicError => ({
  id: 'error-' + Math.random().toString(36).substr(2, 9),
  type: 'plot',
  severity: 'medium',
  location: {},
  description: 'Test error description',
  ...overrides
});

// Helper to create legacy enum mappings for tests
export const TestLogicErrorType = {
  PLOT_HOLE: 'plot',
  CHARACTER_INCONSISTENCY: 'character',
  DIALOGUE_INCONSISTENCY: 'dialogue',
  TIMELINE_CONFLICT: 'timeline'
};