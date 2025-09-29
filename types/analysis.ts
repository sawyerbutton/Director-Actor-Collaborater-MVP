export type LogicErrorType =
  | 'timeline'
  | 'character'
  | 'plot'
  | 'dialogue'
  | 'scene'
  | 'timeline_consistency'
  | 'character_consistency'
  | 'plot_consistency'
  | 'dialogue_consistency'
  | 'scene_consistency';

export const LogicErrorType = {
  TIMELINE: 'timeline' as LogicErrorType,
  CHARACTER: 'character' as LogicErrorType,
  PLOT: 'plot' as LogicErrorType,
  DIALOGUE: 'dialogue' as LogicErrorType,
  SCENE: 'scene' as LogicErrorType,
  TIMELINE_CONSISTENCY: 'timeline_consistency' as LogicErrorType,
  CHARACTER_CONSISTENCY: 'character_consistency' as LogicErrorType,
  PLOT_CONSISTENCY: 'plot_consistency' as LogicErrorType,
  DIALOGUE_CONSISTENCY: 'dialogue_consistency' as LogicErrorType,
  SCENE_CONSISTENCY: 'scene_consistency' as LogicErrorType
} as const;

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';

export const ErrorSeverity = {
  CRITICAL: 'critical' as ErrorSeverity,
  HIGH: 'high' as ErrorSeverity,
  MEDIUM: 'medium' as ErrorSeverity,
  LOW: 'low' as ErrorSeverity
} as const;

export interface ErrorLocation {
  sceneId?: string;
  sceneNumber?: number;
  scene?: number;
  characterName?: string;
  dialogueIndex?: number;
  lineNumber?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  timeReference?: string;
  page?: number;
  timelinePoint?: string;
}

export interface LogicError {
  id: string;
  type: LogicErrorType;
  severity: ErrorSeverity;
  location: ErrorLocation;
  description: string;
  suggestion?: string;
  context?: string;
  relatedElements?: string[];
  confidence?: number;
}

export interface ConsistencyAnalysisResult {
  scriptId: string;
  analyzedAt: Date;
  totalErrors: number;
  errors: LogicError[];
  errorsByType: Record<LogicErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  analysisMetadata: {
    processingTime: number;
    tokensUsed?: number;
    modelUsed: string;
    version: string;
  };
}

export interface AnalysisReport {
  errors: LogicError[];
  summary: string | {
    overallConsistency: 'excellent' | 'good' | 'fair' | 'poor';
    criticalIssues: number;
    totalIssues: number;
    primaryConcerns: string[];
  };
  detailedAnalysis: ConsistencyAnalysisResult;
  recommendations: string[];
  confidence?: number;
  processingTime?: number;
}

export interface ConsistencyCheckRequest {
  script: ParsedScript;
  checkTypes?: LogicErrorType[];
  severityThreshold?: ErrorSeverity;
  maxErrors?: number;
}

export interface ParsedScript {
  id: string;
  title: string;
  scenes: Scene[];
  characters: Character[];
  metadata?: ScriptMetadata;
}

export interface Scene {
  id: string;
  number: number;
  location: string;
  time?: string;
  description?: string;
  dialogues: Dialogue[];
  actions?: Action[];
}

export interface Character {
  name: string;
  description?: string;
  traits?: string[];
  relationships?: Record<string, string>;
}

export interface Dialogue {
  character: string;
  text: string;
  emotion?: string;
  direction?: string;
}

export interface Action {
  description: string;
  characters?: string[];
  type?: 'movement' | 'interaction' | 'environmental';
}

export interface ScriptMetadata {
  genre?: string;
  setting?: string;
  timespan?: string;
  themes?: string[];
}