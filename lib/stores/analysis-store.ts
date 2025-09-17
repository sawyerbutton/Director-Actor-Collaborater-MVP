import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LogicError, ParsedScript } from '@/types/analysis';
import { Suggestion } from '@/types/revision';
import { ErrorContext, ErrorRelationship, FilterCriteria } from '@/types/visualization';
import { ScriptParser } from '@/lib/services/script-parser';

type AnalysisStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface AnalysisResults {
  errors: LogicError[];
  suggestions: Suggestion[];
  metadata?: {
    analysisTime?: number;
    scriptLength?: number;
    errorCount?: number;
  };
}

interface AnalysisState {
  // Script content
  scriptContent: string | null;
  scriptFileName: string | null;
  parsedScript: ParsedScript | null;
  
  // Analysis status
  analysisStatus: AnalysisStatus;
  taskId: string | null;
  
  // Analysis results
  analysisResults: AnalysisResults | null;
  
  // Context and relationships
  errorContexts: Map<string, ErrorContext>;
  errorRelationships: ErrorRelationship[];
  
  // Filtering
  activeFilter: FilterCriteria | null;
  filteredErrors: LogicError[];
  
  // Selection state
  selectedError: LogicError | null;
  
  // History
  analysisHistory: Array<{
    id: string;
    fileName: string;
    timestamp: Date;
    errorCount: number;
    status: AnalysisStatus;
  }>;
  
  // Actions
  setScriptContent: (content: string, fileName: string) => void;
  clearScriptContent: () => void;
  parseScript: () => void;
  
  setAnalysisStatus: (status: AnalysisStatus) => void;
  setTaskId: (taskId: string | null) => void;
  
  setAnalysisResults: (results: AnalysisResults) => void;
  clearAnalysisResults: () => void;
  
  // Context actions
  setSelectedError: (error: LogicError | null) => void;
  generateErrorContexts: () => void;
  generateErrorRelationships: () => void;
  
  // Filter actions
  setActiveFilter: (filter: FilterCriteria | null) => void;
  applyFilter: () => void;
  
  addToHistory: (entry: {
    id: string;
    fileName: string;
    errorCount: number;
    status: AnalysisStatus;
  }) => void;
  clearHistory: () => void;
  
  resetAnalysis: () => void;
  resetAll: () => void;
  
  // Convenience getters
  errors: LogicError[];
  setErrors: (errors: LogicError[]) => void;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      // Initial state
      scriptContent: null,
      scriptFileName: null,
      parsedScript: null,
      analysisStatus: 'idle',
      taskId: null,
      analysisResults: null,
      errorContexts: new Map(),
      errorRelationships: [],
      activeFilter: null,
      filteredErrors: [],
      selectedError: null,
      analysisHistory: [],
      
      // Actions
      setScriptContent: (content, fileName) => {
        set({
          scriptContent: content,
          scriptFileName: fileName,
          analysisStatus: 'idle',
          analysisResults: null,
          taskId: null,
          parsedScript: null,
          errorContexts: new Map(),
          errorRelationships: []
        });
        get().parseScript();
      },
      
      parseScript: () => {
        const { scriptContent, scriptFileName } = get();
        if (!scriptContent) return;
        
        const parser = ScriptParser.getInstance();
        const parsed = parser.parseScript(scriptContent, scriptFileName || undefined);
        set({ parsedScript: parsed });
      },
      
      clearScriptContent: () => {
        set({
          scriptContent: null,
          scriptFileName: null,
          parsedScript: null
        });
      },
      
      setAnalysisStatus: (status) => {
        set({ analysisStatus: status });
      },
      
      setTaskId: (taskId) => {
        set({ taskId });
      },
      
      setAnalysisResults: (results) => {
        const { scriptFileName } = get();
        set({ 
          analysisResults: results,
          filteredErrors: results?.errors || []
        });
        
        // Generate contexts and relationships when results are set
        if (results) {
          get().generateErrorContexts();
          get().generateErrorRelationships();
        }
        
        // Add to history when analysis completes
        if (results && scriptFileName) {
          get().addToHistory({
            id: Date.now().toString(),
            fileName: scriptFileName,
            errorCount: results.errors.length,
            status: 'completed'
          });
        }
      },
      
      clearAnalysisResults: () => {
        set({ 
          analysisResults: null,
          errorContexts: new Map(),
          errorRelationships: [],
          filteredErrors: []
        });
      },
      
      // Context methods
      setSelectedError: (error) => {
        set({ selectedError: error });
      },
      
      generateErrorContexts: () => {
        const { scriptContent, analysisResults } = get();
        if (!scriptContent || !analysisResults) return;
        
        const parser = ScriptParser.getInstance();
        const contexts = new Map<string, ErrorContext>();
        
        analysisResults.errors.forEach(error => {
          const context = parser.getContextAroundError(
            scriptContent,
            error.location,
            5
          );
          
          contexts.set(error.id, {
            before: context.before,
            after: context.after,
            scene: error.location.sceneId,
            characters: error.location.characterName ? [error.location.characterName] : [],
            lineNumber: error.location.lineNumber || 0,
            columnNumber: error.location.column
          });
        });
        
        set({ errorContexts: contexts });
      },
      
      generateErrorRelationships: () => {
        const { analysisResults } = get();
        if (!analysisResults) return;
        
        const relationships: ErrorRelationship[] = [];
        const errors = analysisResults.errors;
        
        errors.forEach((error1, i) => {
          errors.slice(i + 1).forEach(error2 => {
            let strength = 0;
            let type: ErrorRelationship['type'] = 'related';
            
            // Same scene relationship
            if (error1.location.sceneNumber === error2.location.sceneNumber) {
              strength += 0.3;
            }
            
            // Same character relationship
            if (error1.location.characterName === error2.location.characterName && 
                error1.location.characterName) {
              strength += 0.4;
            }
            
            // Same error type
            if (error1.type === error2.type) {
              strength += 0.2;
            }
            
            // Close proximity
            const lineDiff = Math.abs(
              (error1.location.lineNumber || 0) - (error2.location.lineNumber || 0)
            );
            if (lineDiff < 10 && lineDiff > 0) {
              strength += 0.3;
              type = 'causes';
            }
            
            // Conflicting error types
            if ((error1.type === 'timeline' && error2.type === 'plot') ||
                (error1.type === 'plot' && error2.type === 'timeline')) {
              type = 'conflicts';
              strength += 0.2;
            }
            
            if (strength > 0.3) {
              relationships.push({
                sourceId: error1.id,
                targetId: error2.id,
                type,
                strength: Math.min(strength, 1)
              });
            }
          });
        });
        
        set({ errorRelationships: relationships });
      },
      
      // Filter methods
      setActiveFilter: (filter) => {
        set({ activeFilter: filter });
        get().applyFilter();
      },
      
      applyFilter: () => {
        const { analysisResults, activeFilter } = get();
        if (!analysisResults) {
          set({ filteredErrors: [] });
          return;
        }
        
        let filtered = [...analysisResults.errors];
        
        if (activeFilter) {
          // Apply type filter
          if (activeFilter.types && activeFilter.types.length > 0) {
            filtered = filtered.filter(error => 
              activeFilter.types!.includes(error.type)
            );
          }
          
          // Apply severity filter
          if (activeFilter.severities && activeFilter.severities.length > 0) {
            filtered = filtered.filter(error => 
              activeFilter.severities!.includes(error.severity)
            );
          }
          
          // Apply scene filter
          if (activeFilter.scenes && activeFilter.scenes.length > 0) {
            filtered = filtered.filter(error =>
              error.location.sceneNumber && 
              activeFilter.scenes!.includes(error.location.sceneNumber)
            );
          }
          
          // Apply character filter
          if (activeFilter.characters && activeFilter.characters.length > 0) {
            filtered = filtered.filter(error =>
              error.location.characterName && 
              activeFilter.characters!.includes(error.location.characterName)
            );
          }
          
          // Apply text search
          if (activeFilter.searchText) {
            const searchLower = activeFilter.searchText.toLowerCase();
            filtered = filtered.filter(error =>
              error.description.toLowerCase().includes(searchLower) ||
              error.suggestion?.toLowerCase().includes(searchLower) ||
              error.context?.toLowerCase().includes(searchLower)
            );
          }
        }
        
        set({ filteredErrors: filtered });
      },
      
      addToHistory: (entry) => {
        set((state) => ({
          analysisHistory: [
            {
              ...entry,
              timestamp: new Date()
            },
            ...state.analysisHistory.slice(0, 9) // Keep last 10 entries
          ]
        }));
      },
      
      clearHistory: () => {
        set({ analysisHistory: [] });
      },
      
      resetAnalysis: () => {
        set({
          analysisStatus: 'idle',
          taskId: null,
          analysisResults: null,
          errorContexts: new Map(),
          errorRelationships: [],
          filteredErrors: [],
          selectedError: null,
          activeFilter: null
        });
      },
      
      resetAll: () => {
        set({
          scriptContent: null,
          scriptFileName: null,
          parsedScript: null,
          analysisStatus: 'idle',
          taskId: null,
          analysisResults: null,
          errorContexts: new Map(),
          errorRelationships: [],
          filteredErrors: [],
          selectedError: null,
          activeFilter: null,
          analysisHistory: []
        });
      },
      
      // Convenience getters
      get errors() {
        return get().analysisResults?.errors || [];
      },
      
      setErrors: (errors: LogicError[]) => {
        const currentResults = get().analysisResults;
        set({
          analysisResults: {
            errors,
            suggestions: currentResults?.suggestions || [],
            metadata: currentResults?.metadata
          },
          filteredErrors: errors
        });
      }
    }),
    {
      name: 'analysis-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist history, not current analysis state
        analysisHistory: state.analysisHistory
      })
    }
  )
);