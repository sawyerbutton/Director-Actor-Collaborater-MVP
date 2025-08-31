export enum LogicErrorType {
  TIMELINE = 'timeline',
  CHARACTER = 'character',
  PLOT = 'plot',
  DIALOGUE = 'dialogue',
  SCENE = 'scene'
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface ErrorLocation {
  sceneId?: string;
  sceneNumber?: number;
  characterName?: string;
  dialogueIndex?: number;
  lineNumber?: number;
  timeReference?: string;
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
  summary: {
    overallConsistency: 'excellent' | 'good' | 'fair' | 'poor';
    criticalIssues: number;
    totalIssues: number;
    primaryConcerns: string[];
  };
  detailedAnalysis: ConsistencyAnalysisResult;
  recommendations: string[];
  confidence: number;
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