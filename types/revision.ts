export enum SuggestionPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface RevisionSuggestion {
  id: string;
  errorId: string;
  modification: string;
  location: {
    sceneId?: string;
    lineNumber?: number;
    characterName?: string;
    timelinePoint?: string;
  };
  rationale: string;
  priority: SuggestionPriority;
  impact: string;
  confidence: number;
  createdAt: string;
  appliedAt?: string;
  conflictsWith?: string[];
}

export interface RevisionContext {
  scriptContent?: string;
  characterName?: string;
  speakers?: string[];
  sceneInfo?: string;
  previousEvents?: string[];
  affectedElements?: string[];
  timelineContext?: {
    before: string;
    current: string;
    after: string;
  };
  characterProfiles?: Map<string, any>;
  sceneDescriptions?: Map<string, string>;
}

export interface RevisionBatch {
  id: string;
  suggestions: RevisionSuggestion[];
  scriptId: string;
  createdAt: string;
  status: 'pending' | 'applied' | 'rejected';
}

export interface SuggestionConflict {
  suggestionIds: string[];
  type: 'location' | 'content' | 'logic';
  description: string;
  resolution?: 'merge' | 'priority' | 'manual';
}