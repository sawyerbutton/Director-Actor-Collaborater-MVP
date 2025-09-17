import { act, renderHook } from '@testing-library/react';
import { useAnalysisStore } from '@/lib/stores/analysis-store';

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  persist: jest.fn((config) => config),
  createJSONStorage: jest.fn(() => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

describe('AnalysisStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAnalysisStore());
    act(() => {
      result.current.resetAll();
    });
  });

  describe('Script Content Management', () => {
    it('sets script content and filename', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        result.current.setScriptContent('Test content', 'test.txt');
      });
      
      expect(result.current.scriptContent).toBe('Test content');
      expect(result.current.scriptFileName).toBe('test.txt');
      expect(result.current.analysisStatus).toBe('idle');
    });

    it('clears script content', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        result.current.setScriptContent('Test content', 'test.txt');
        result.current.clearScriptContent();
      });
      
      expect(result.current.scriptContent).toBeNull();
      expect(result.current.scriptFileName).toBeNull();
    });
  });

  describe('Analysis Status Management', () => {
    it('updates analysis status', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        result.current.setAnalysisStatus('processing');
      });
      
      expect(result.current.analysisStatus).toBe('processing');
    });

    it('sets task ID', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        result.current.setTaskId('task-123');
      });
      
      expect(result.current.taskId).toBe('task-123');
    });
  });

  describe('Analysis Results Management', () => {
    it('sets analysis results', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      const mockResults = {
        errors: [
          {
            id: 'error-1',
            type: 'timeline' as const,
            severity: 'high' as const,
            location: {},
            description: 'Test error',
          },
        ],
        suggestions: [],
      };
      
      act(() => {
        result.current.setScriptContent('content', 'test.txt');
        result.current.setAnalysisResults(mockResults);
      });
      
      expect(result.current.analysisResults).toEqual(mockResults);
    });

    it('adds to history when results are set', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      const mockResults = {
        errors: [
          {
            id: 'error-1',
            type: 'timeline' as const,
            severity: 'high' as const,
            location: {},
            description: 'Test error',
          },
        ],
        suggestions: [],
      };
      
      act(() => {
        result.current.setScriptContent('content', 'test.txt');
        result.current.setAnalysisResults(mockResults);
      });
      
      expect(result.current.analysisHistory).toHaveLength(1);
      expect(result.current.analysisHistory[0].fileName).toBe('test.txt');
      expect(result.current.analysisHistory[0].errorCount).toBe(1);
      expect(result.current.analysisHistory[0].status).toBe('completed');
    });

    it('clears analysis results', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        result.current.setAnalysisResults({ errors: [], suggestions: [] });
        result.current.clearAnalysisResults();
      });
      
      expect(result.current.analysisResults).toBeNull();
    });
  });

  describe('History Management', () => {
    it('adds entries to history', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        result.current.addToHistory({
          id: 'history-1',
          fileName: 'script1.txt',
          errorCount: 5,
          status: 'completed',
        });
      });
      
      expect(result.current.analysisHistory).toHaveLength(1);
      expect(result.current.analysisHistory[0].id).toBe('history-1');
    });

    it('limits history to 10 entries', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.addToHistory({
            id: `history-${i}`,
            fileName: `script${i}.txt`,
            errorCount: i,
            status: 'completed',
          });
        }
      });
      
      expect(result.current.analysisHistory).toHaveLength(10);
      expect(result.current.analysisHistory[0].id).toBe('history-14');
    });

    it('clears history', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        result.current.addToHistory({
          id: 'history-1',
          fileName: 'script1.txt',
          errorCount: 5,
          status: 'completed',
        });
        result.current.clearHistory();
      });
      
      expect(result.current.analysisHistory).toHaveLength(0);
    });
  });

  describe('Reset Functions', () => {
    it('resets analysis state', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        result.current.setAnalysisStatus('processing');
        result.current.setTaskId('task-123');
        result.current.setAnalysisResults({ errors: [], suggestions: [] });
        result.current.resetAnalysis();
      });
      
      expect(result.current.analysisStatus).toBe('idle');
      expect(result.current.taskId).toBeNull();
      expect(result.current.analysisResults).toBeNull();
    });

    it('resets all state', () => {
      const { result } = renderHook(() => useAnalysisStore());
      
      act(() => {
        result.current.setScriptContent('content', 'test.txt');
        result.current.setAnalysisStatus('processing');
        result.current.setTaskId('task-123');
        result.current.addToHistory({
          id: 'history-1',
          fileName: 'script.txt',
          errorCount: 5,
          status: 'completed',
        });
        result.current.resetAll();
      });
      
      expect(result.current.scriptContent).toBeNull();
      expect(result.current.scriptFileName).toBeNull();
      expect(result.current.analysisStatus).toBe('idle');
      expect(result.current.taskId).toBeNull();
      expect(result.current.analysisResults).toBeNull();
      expect(result.current.analysisHistory).toHaveLength(0);
    });
  });
});