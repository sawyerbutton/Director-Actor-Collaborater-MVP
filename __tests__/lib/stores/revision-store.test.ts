import { renderHook, act } from '@testing-library/react';
import { useRevisionStore } from '@/lib/stores/revision-store';
import type { AnalysisError } from '@/types/analysis';

describe('RevisionStore', () => {
  const mockErrors: AnalysisError[] = [
    {
      id: 'error-1',
      category: 'logic',
      severity: 'high',
      message: 'Error 1',
      suggestion: 'Fix 1',
      context: {
        line: 1,
        snippet: 'text 1'
      }
    },
    {
      id: 'error-2',
      category: 'consistency',
      severity: 'medium',
      message: 'Error 2',
      suggestion: 'Fix 2',
      context: {
        line: 2,
        snippet: 'text 2'
      }
    }
  ];

  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useRevisionStore());
    act(() => {
      result.current.setErrors([]);
    });
  });

  describe('setErrors', () => {
    it('should initialize errors with pending status', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
      });

      expect(result.current.errors).toHaveLength(2);
      expect(result.current.errors[0].status).toBe('pending');
      expect(result.current.errors[1].status).toBe('pending');
    });

    it('should clear history when setting new errors', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptSuggestion('error-1');
      });

      expect(result.current.history).toHaveLength(1);

      act(() => {
        result.current.setErrors(mockErrors);
      });

      expect(result.current.history).toHaveLength(0);
    });
  });

  describe('acceptSuggestion', () => {
    it('should change error status to accepted', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptSuggestion('error-1');
      });

      const acceptedError = result.current.errors.find(e => e.id === 'error-1');
      expect(acceptedError?.status).toBe('accepted');
      expect(acceptedError?.appliedAt).toBeDefined();
    });

    it('should add action to history', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptSuggestion('error-1');
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].action).toBe('accept');
      expect(result.current.history[0].suggestionId).toBe('error-1');
    });

    it('should not accept already accepted suggestion', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptSuggestion('error-1');
      });

      const historyLength = result.current.history.length;

      act(() => {
        result.current.acceptSuggestion('error-1');
      });

      expect(result.current.history.length).toBe(historyLength);
    });
  });

  describe('rejectSuggestion', () => {
    it('should change error status to rejected', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.rejectSuggestion('error-2');
      });

      const rejectedError = result.current.errors.find(e => e.id === 'error-2');
      expect(rejectedError?.status).toBe('rejected');
    });
  });

  describe('undo/redo', () => {
    it('should undo last action', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptSuggestion('error-1');
      });

      expect(result.current.errors[0].status).toBe('accepted');

      act(() => {
        result.current.undo();
      });

      expect(result.current.errors[0].status).toBe('pending');
    });

    it('should redo undone action', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptSuggestion('error-1');
        result.current.undo();
      });

      expect(result.current.errors[0].status).toBe('pending');

      act(() => {
        result.current.redo();
      });

      expect(result.current.errors[0].status).toBe('accepted');
    });

    it('should handle multiple undo/redo operations', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptSuggestion('error-1');
        result.current.rejectSuggestion('error-2');
      });

      expect(result.current.errors[0].status).toBe('accepted');
      expect(result.current.errors[1].status).toBe('rejected');

      act(() => {
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.errors[0].status).toBe('pending');
      expect(result.current.errors[1].status).toBe('pending');

      act(() => {
        result.current.redo();
      });

      expect(result.current.errors[0].status).toBe('accepted');
      expect(result.current.errors[1].status).toBe('pending');
    });

    it('canUndo should return correct state', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
      });

      expect(result.current.canUndo()).toBe(false);

      act(() => {
        result.current.acceptSuggestion('error-1');
      });

      expect(result.current.canUndo()).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canUndo()).toBe(false);
    });

    it('canRedo should return correct state', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptSuggestion('error-1');
      });

      expect(result.current.canRedo()).toBe(false);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo()).toBe(true);

      act(() => {
        result.current.redo();
      });

      expect(result.current.canRedo()).toBe(false);
    });
  });

  describe('bulk operations', () => {
    it('should accept all pending suggestions', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptAll();
      });

      expect(result.current.getAcceptedSuggestions()).toHaveLength(2);
      expect(result.current.getPendingSuggestions()).toHaveLength(0);
    });

    it('should reject all pending suggestions', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.rejectAll();
      });

      expect(result.current.getRejectedSuggestions()).toHaveLength(2);
      expect(result.current.getPendingSuggestions()).toHaveLength(0);
    });

    it('should reset all suggestions to pending', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors(mockErrors);
        result.current.acceptSuggestion('error-1');
        result.current.rejectSuggestion('error-2');
        result.current.resetAll();
      });

      expect(result.current.getPendingSuggestions()).toHaveLength(2);
      expect(result.current.getAcceptedSuggestions()).toHaveLength(0);
      expect(result.current.getRejectedSuggestions()).toHaveLength(0);
    });
  });

  describe('getters', () => {
    it('should return correct counts for each status', () => {
      const { result } = renderHook(() => useRevisionStore());
      
      act(() => {
        result.current.setErrors([
          ...mockErrors,
          {
            id: 'error-3',
            category: 'style',
            severity: 'low',
            message: 'Error 3'
          }
        ]);
        result.current.acceptSuggestion('error-1');
        result.current.rejectSuggestion('error-2');
      });

      expect(result.current.getAcceptedSuggestions()).toHaveLength(1);
      expect(result.current.getRejectedSuggestions()).toHaveLength(1);
      expect(result.current.getPendingSuggestions()).toHaveLength(1);
    });
  });
});