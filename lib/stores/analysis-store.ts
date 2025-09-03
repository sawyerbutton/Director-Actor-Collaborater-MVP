import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LogicError } from '@/types/analysis';
import { Suggestion } from '@/types/revision';

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
  
  // Analysis status
  analysisStatus: AnalysisStatus;
  taskId: string | null;
  
  // Analysis results
  analysisResults: AnalysisResults | null;
  
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
  
  setAnalysisStatus: (status: AnalysisStatus) => void;
  setTaskId: (taskId: string | null) => void;
  
  setAnalysisResults: (results: AnalysisResults) => void;
  clearAnalysisResults: () => void;
  
  addToHistory: (entry: {
    id: string;
    fileName: string;
    errorCount: number;
    status: AnalysisStatus;
  }) => void;
  clearHistory: () => void;
  
  resetAnalysis: () => void;
  resetAll: () => void;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      // Initial state
      scriptContent: null,
      scriptFileName: null,
      analysisStatus: 'idle',
      taskId: null,
      analysisResults: null,
      analysisHistory: [],
      
      // Actions
      setScriptContent: (content, fileName) => {
        set({
          scriptContent: content,
          scriptFileName: fileName,
          analysisStatus: 'idle',
          analysisResults: null,
          taskId: null
        });
      },
      
      clearScriptContent: () => {
        set({
          scriptContent: null,
          scriptFileName: null
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
        set({ analysisResults: results });
        
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
        set({ analysisResults: null });
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
          analysisResults: null
        });
      },
      
      resetAll: () => {
        set({
          scriptContent: null,
          scriptFileName: null,
          analysisStatus: 'idle',
          taskId: null,
          analysisResults: null,
          analysisHistory: []
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