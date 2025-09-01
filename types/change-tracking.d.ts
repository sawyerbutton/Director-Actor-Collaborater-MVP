import { AnalysisReport, LogicError } from './analysis';

export type ChangeType = 'content' | 'structure' | 'relationship';

export interface ScriptLocation {
  sceneId?: string;
  characterId?: string;
  dialogueId?: string;
  lineNumber?: number;
  path: string[];
}

export interface ChangeEvent {
  id: string;
  timestamp: Date;
  type: ChangeType;
  location: ScriptLocation;
  oldValue: unknown;
  newValue: unknown;
  affectedElements: string[];
  userId?: string;
  description?: string;
}

export interface ChangeHistory {
  events: ChangeEvent[];
  currentVersion: string;
  previousVersion: string;
  createdAt: Date;
}

export interface ImpactAnalysis {
  directImpact: string[];
  indirectImpact: string[];
  propagationPath: string[][];
  estimatedAnalysisTime: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface VersionedAnalysisResult {
  version: string;
  timestamp: Date;
  result: AnalysisReport;
  isValid: boolean;
  affectedBy: string[];
}

export interface DiffReport {
  changeId: string;
  beforeAnalysis: VersionedAnalysisResult;
  afterAnalysis: VersionedAnalysisResult;
  addedIssues: LogicError[];
  resolvedIssues: LogicError[];
  unchangedIssues: LogicError[];
  summary: {
    totalChanges: number;
    criticalChanges: number;
    improvements: number;
    degradations: number;
  };
}

export interface IncrementalAnalysisTask {
  id: string;
  priority: number;
  targetElement: string;
  analysisType: string;
  dependencies: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: AnalysisReport;
  error?: Error;
}