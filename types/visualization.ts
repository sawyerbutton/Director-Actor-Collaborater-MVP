import { LogicErrorType, ErrorSeverity, LogicError } from './analysis';

export interface ErrorDistributionData {
  type: LogicErrorType;
  count: number;
  percentage: number;
  color?: string;
}

export interface SeverityDistributionData {
  severity: ErrorSeverity;
  count: number;
  percentage: number;
  color?: string;
}

export interface TimelineDistributionData {
  scene: number;
  errors: number;
  severity: ErrorSeverity[];
}

export interface HeatmapData {
  sceneNumber: number;
  severity: ErrorSeverity;
  count: number;
  intensity: number;
}

export interface ErrorContext {
  before: string[];
  after: string[];
  scene?: string;
  characters?: string[];
  lineNumber: number;
  columnNumber?: number;
}

export interface ErrorRelationship {
  sourceId: string;
  targetId: string;
  type: 'causes' | 'related' | 'conflicts';
  strength: number;
}

export interface ErrorNode {
  id: string;
  error: LogicError;
  x?: number;
  y?: number;
  connections: string[];
}

export interface FilterCriteria {
  types?: LogicErrorType[];
  severities?: ErrorSeverity[];
  scenes?: number[];
  characters?: string[];
  searchText?: string;
}

export interface VisualizationTheme {
  colors: {
    critical: string;
    high: string;
    medium: string;
    low: string;
    timeline: string;
    character: string;
    plot: string;
    dialogue: string;
    scene: string;
  };
  animation: {
    duration: number;
    easing: string;
  };
}

export const DEFAULT_THEME: VisualizationTheme = {
  colors: {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#84cc16',
    timeline: '#3b82f6',
    character: '#8b5cf6',
    plot: '#ec4899',
    dialogue: '#14b8a6',
    scene: '#f59e0b'
  },
  animation: {
    duration: 300,
    easing: 'ease-in-out'
  }
};