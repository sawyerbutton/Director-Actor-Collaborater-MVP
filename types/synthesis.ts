/**
 * Epic 007: Synthesis Engine Type Definitions
 *
 * Comprehensive type system for script synthesis, conflict resolution,
 * style preservation, and version management.
 */

import { ActType } from '@prisma/client';
import { LogicErrorType } from './analysis';

// ============================================================================
// Core Synthesis Types
// ============================================================================

/**
 * Result of a complete synthesis operation
 */
export interface SynthesisResult {
  synthesizedScript: string;
  changeLog: ChangeEntry[];
  conflicts: ConflictReport[];
  confidence: number;
  metadata: SynthesisMetadata;
}

/**
 * Metadata tracked during synthesis
 */
export interface SynthesisMetadata {
  decisionsApplied: string[];
  styleProfile: StyleProfile;
  processingTime: number;
  tokenUsage: number;
  version: number;
  createdAt: Date;
}

/**
 * Individual change entry in the synthesis log
 */
export interface ChangeEntry {
  id: string;
  decisionId: string;
  act: ActType;
  focusName: string;
  changeType: 'addition' | 'modification' | 'deletion';
  originalText?: string;
  modifiedText: string;
  location: {
    scene?: number;
    line?: number;
    characterName?: string;
  };
  rationale: string;
  appliedAt: Date;
}

// ============================================================================
// Conflict Detection and Resolution
// ============================================================================

/**
 * Detected conflict between decisions
 */
export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  decision1: {
    id: string;
    act: ActType;
    focusName: string;
  };
  decision2: {
    id: string;
    act: ActType;
    focusName: string;
  };
  description: string;
  suggestedResolution: string;
}

export type ConflictType =
  | 'character_contradiction'
  | 'timeline_overlap'
  | 'setting_inconsistency'
  | 'plot_conflict'
  | 'dialogue_mismatch'
  | 'theme_divergence';

export type ConflictSeverity = 'high' | 'medium' | 'low';

/**
 * Comprehensive conflict report
 */
export interface ConflictReport {
  totalConflicts: number;
  conflicts: Conflict[];
  resolutions: ConflictResolution[];
  unresolvedConflicts: Conflict[];
}

/**
 * Resolution applied to a conflict
 */
export interface ConflictResolution {
  conflictId: string;
  strategy: ResolutionStrategy;
  appliedChanges: string[];
  confidence: number;
  manual: boolean;
}

export type ResolutionStrategy =
  | 'latest_takes_precedence'
  | 'merge_compatible'
  | 'prioritize_by_severity'
  | 'manual_review_required'
  | 'auto_reconcile';

// ============================================================================
// Style Analysis and Preservation
// ============================================================================

/**
 * Analyzed style profile of the original script
 */
export interface StyleProfile {
  tone: string;
  vocabulary: string[];
  sentencePatterns: SentencePattern[];
  dialogueStyle: DialogueStyle;
  narrativeVoice: NarrativeVoice;
  pacing: PacingProfile;
}

export interface SentencePattern {
  pattern: string;
  frequency: number;
  examples: string[];
}

export interface DialogueStyle {
  formalityLevel: 'formal' | 'casual' | 'mixed';
  averageLength: number;
  commonPhrases: string[];
  characterDistinction: boolean;
}

export interface NarrativeVoice {
  perspective: '第一人称' | '第三人称' | '混合';
  tenseUsage: '现在时' | '过去时' | '混合';
  descriptiveLevel: 'minimal' | 'moderate' | 'rich';
}

export interface PacingProfile {
  averageSceneLength: number;
  actionDensity: number;
  dialogueRatio: number;
  descriptionRatio: number;
}

// ============================================================================
// Synthesis Prompting System
// ============================================================================

/**
 * Context for building synthesis prompts
 */
export interface SynthesisContext {
  originalScript: string;
  decisions: GroupedDecisions;
  resolutions: ConflictResolution[];
  styleProfile: StyleProfile;
  options: SynthesisOptions;
}

/**
 * Decisions grouped by act and focus area
 */
export interface GroupedDecisions {
  [key: string]: DecisionGroup; // Key format: "ACT2_CHARACTER:focusName"
}

export interface DecisionGroup {
  act: ActType;
  focusName: string;
  decisions: SynthesisDecision[];
  priority: number;
}

export interface SynthesisDecision {
  id: string;
  focusContext: any;
  proposals: any;
  userChoice: string;
  generatedChanges: any;
}

/**
 * User-configurable synthesis options
 */
export interface SynthesisOptions {
  preserveOriginalStyle: boolean;
  conflictResolution: 'auto' | 'manual';
  changeIntegrationMode: 'conservative' | 'balanced' | 'aggressive';
  includeChangeLog: boolean;
  validateCoherence: boolean;
}

/**
 * Master synthesis prompt structure
 */
export interface SynthesisPrompt {
  systemPrompt: string;
  scriptContext: string;
  changeInstructions: ChangeInstruction[];
  styleGuidelines: string;
  conflictResolutions: string[];
}

export interface ChangeInstruction {
  act: ActType;
  focus: string;
  changes: string[];
  priority: number;
  rationale: string;
}

// ============================================================================
// Script Chunking for Long Scripts
// ============================================================================

/**
 * Chunked section of script for processing
 */
export interface ScriptChunk {
  id: string;
  chunk: string;
  sceneRange: {
    start: number;
    end: number;
  };
  overlaps: {
    previous?: string;
    next?: string;
  };
  affectedDecisions: string[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  characterNames: string[];
  settings: string[];
  tokenCount: number;
}

// ============================================================================
// Version Management
// ============================================================================

/**
 * Version metadata for storage
 */
export interface VersionMetadata {
  synthesisLog: ChangeEntry[];
  decisionsApplied: string[];
  confidence: number;
  timestamp: Date;
  previousVersion?: number;
  styleProfile?: StyleProfile;
  processingTime?: number;
  tokenUsage?: number;
}

/**
 * Diff result between two script versions
 */
export interface DiffResult {
  additions: DiffEntry[];
  deletions: DiffEntry[];
  modifications: DiffEntry[];
  stats: DiffStats;
}

export interface DiffEntry {
  lineNumber: number;
  content: string;
  type: 'added' | 'deleted' | 'modified';
  sceneNumber?: number;
  characterName?: string;
}

export interface DiffStats {
  linesAdded: number;
  linesDeleted: number;
  linesModified: number;
  scenesAffected: number;
  charactersAffected: string[];
}

/**
 * Version comparison result
 */
export interface VersionComparison {
  v1Id: string;
  v2Id: string;
  diff: DiffResult;
  summary: string;
  changeAttribution: Map<string, string>; // lineNumber -> decisionId
}

// ============================================================================
// Export System
// ============================================================================

export enum ExportFormat {
  TXT = 'txt',
  MD = 'md',
  DOCX = 'docx',
  PDF = 'pdf',
  JSON = 'json',
  ZIP = 'zip'
}

/**
 * Export job tracking
 */
export interface ExportJob {
  id: string;
  versionId: string;
  format: ExportFormat;
  status: ExportStatus;
  options: ExportOptions;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  error?: string;
}

export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ExportOptions {
  includeChangeLog: boolean;
  includeMetadata: boolean;
  formatting: FormattingOptions;
}

export interface FormattingOptions {
  fontSize?: number;
  fontFamily?: string;
  lineSpacing?: number;
  pageMargins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// ============================================================================
// Validation and Quality Assurance
// ============================================================================

/**
 * Result of synthesis validation
 */
export interface ValidationReport {
  isValid: boolean;
  coherenceScore: number;
  styleConsistencyScore: number;
  completenessScore: number;
  issues: ValidationIssue[];
  warnings: string[];
}

export interface ValidationIssue {
  type: 'coherence' | 'style' | 'completeness' | 'conflict';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  location?: {
    scene?: number;
    line?: number;
  };
  suggestedFix?: string;
}

// ============================================================================
// Synthesis Agent Configuration
// ============================================================================

export interface SynthesisConfig {
  maxTokensPerChunk: number;
  chunkOverlapTokens: number;
  stylePreservationWeight: number; // 0-1
  conflictResolutionStrategy: ResolutionStrategy;
  minimumConfidenceThreshold: number; // 0-1
  enableMultiPass: boolean;
  maxRetries: number;
}

export const DEFAULT_SYNTHESIS_CONFIG: SynthesisConfig = {
  maxTokensPerChunk: 6000,
  chunkOverlapTokens: 500,
  stylePreservationWeight: 0.8,
  conflictResolutionStrategy: 'auto_reconcile',
  minimumConfidenceThreshold: 0.7,
  enableMultiPass: true,
  maxRetries: 3
};
