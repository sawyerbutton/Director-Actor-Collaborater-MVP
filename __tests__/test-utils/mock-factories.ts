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
  type: LogicErrorType.PLOT,
  severity: ErrorSeverity.MEDIUM,
  location: {},
  description: 'Test error description',
  ...overrides
});

// Helper to create legacy enum mappings for tests
export const TestLogicErrorType = {
  PLOT_HOLE: LogicErrorType.PLOT,
  CHARACTER_INCONSISTENCY: LogicErrorType.CHARACTER,
  DIALOGUE_INCONSISTENCY: LogicErrorType.DIALOGUE,
  TIMELINE_CONFLICT: LogicErrorType.TIMELINE
};