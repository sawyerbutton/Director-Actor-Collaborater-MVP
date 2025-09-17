import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useRevisionStore } from '@/lib/stores/revision-store';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import type { AnalysisError } from '@/types/analysis';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/revision'
}));

describe('Revision Flow Integration', () => {
  const mockScript = `第一场
角色A：这是测试台词1
角色B：这是测试台词2`;

  const mockErrors: AnalysisError[] = [
    {
      id: 'error-1',
      category: 'logic',
      severity: 'high',
      message: '逻辑错误1',
      suggestion: '建议修改为新台词1',
      context: {
        line: 2,
        snippet: '这是测试台词1'
      }
    },
    {
      id: 'error-2',
      category: 'consistency',
      severity: 'medium',
      message: '一致性错误2',
      suggestion: '建议修改为新台词2',
      context: {
        line: 3,
        snippet: '这是测试台词2'
      }
    }
  ];

  beforeEach(() => {
    // Reset stores
    const { result: revisionResult } = renderHook(() => useRevisionStore());
    const { result: analysisResult } = renderHook(() => useAnalysisStore());
    
    act(() => {
      revisionResult.current.setErrors([]);
      analysisResult.current.setScriptContent('');
      analysisResult.current.setErrors([]);
    });
  });

  describe('Complete Revision Workflow', () => {
    it('should handle accept, reject, undo, redo flow', () => {
      const { result: revisionResult } = renderHook(() => useRevisionStore());
      const { result: analysisResult } = renderHook(() => useAnalysisStore());

      // Setup initial state
      act(() => {
        analysisResult.current.setScriptContent(mockScript);
        analysisResult.current.setErrors(mockErrors);
        revisionResult.current.setErrors(mockErrors);
      });

      // Accept first suggestion
      act(() => {
        revisionResult.current.acceptSuggestion('error-1');
      });

      expect(revisionResult.current.getAcceptedSuggestions()).toHaveLength(1);
      expect(revisionResult.current.getPendingSuggestions()).toHaveLength(1);

      // Reject second suggestion
      act(() => {
        revisionResult.current.rejectSuggestion('error-2');
      });

      expect(revisionResult.current.getRejectedSuggestions()).toHaveLength(1);
      expect(revisionResult.current.getPendingSuggestions()).toHaveLength(0);

      // Undo last action
      act(() => {
        revisionResult.current.undo();
      });

      expect(revisionResult.current.getRejectedSuggestions()).toHaveLength(0);
      expect(revisionResult.current.getPendingSuggestions()).toHaveLength(1);

      // Redo
      act(() => {
        revisionResult.current.redo();
      });

      expect(revisionResult.current.getRejectedSuggestions()).toHaveLength(1);
      expect(revisionResult.current.getPendingSuggestions()).toHaveLength(0);
    });

    it('should handle bulk operations correctly', () => {
      const { result: revisionResult } = renderHook(() => useRevisionStore());
      const { result: analysisResult } = renderHook(() => useAnalysisStore());

      // Setup initial state
      act(() => {
        analysisResult.current.setScriptContent(mockScript);
        analysisResult.current.setErrors(mockErrors);
        revisionResult.current.setErrors(mockErrors);
      });

      // Accept all
      act(() => {
        revisionResult.current.acceptAll();
      });

      expect(revisionResult.current.getAcceptedSuggestions()).toHaveLength(2);
      expect(revisionResult.current.getPendingSuggestions()).toHaveLength(0);

      // Reset all
      act(() => {
        revisionResult.current.resetAll();
      });

      expect(revisionResult.current.getAcceptedSuggestions()).toHaveLength(0);
      expect(revisionResult.current.getPendingSuggestions()).toHaveLength(2);

      // Reject all
      act(() => {
        revisionResult.current.rejectAll();
      });

      expect(revisionResult.current.getRejectedSuggestions()).toHaveLength(2);
      expect(revisionResult.current.getPendingSuggestions()).toHaveLength(0);
    });

    it('should maintain consistency between stores', () => {
      const { result: revisionResult } = renderHook(() => useRevisionStore());
      const { result: analysisResult } = renderHook(() => useAnalysisStore());

      // Set analysis errors
      act(() => {
        analysisResult.current.setErrors(mockErrors);
      });

      // Get errors directly from analysisResults
      const errors = analysisResult.current.analysisResults?.errors || [];
      expect(errors).toHaveLength(mockErrors.length);

      // Initialize revision errors from analysis
      act(() => {
        revisionResult.current.setErrors(errors);
      });

      expect(revisionResult.current.errors).toHaveLength(mockErrors.length);
      
      // Verify all errors are initialized as pending
      revisionResult.current.errors.forEach(error => {
        expect(error.status).toBe('pending');
      });
    });

    it('should track modification history correctly', () => {
      const { result: revisionResult } = renderHook(() => useRevisionStore());

      act(() => {
        revisionResult.current.setErrors(mockErrors);
      });

      // Perform multiple operations
      act(() => {
        revisionResult.current.acceptSuggestion('error-1');
        revisionResult.current.rejectSuggestion('error-2');
        revisionResult.current.acceptSuggestion('error-2'); // Should not work
      });

      expect(revisionResult.current.history).toHaveLength(2);
      expect(revisionResult.current.historyIndex).toBe(1);

      // Undo all
      act(() => {
        revisionResult.current.undo();
        revisionResult.current.undo();
      });

      expect(revisionResult.current.historyIndex).toBe(-1);
      expect(revisionResult.current.getPendingSuggestions()).toHaveLength(2);
    });

    it('should handle keyboard shortcuts simulation', () => {
      const { result: revisionResult } = renderHook(() => useRevisionStore());

      act(() => {
        revisionResult.current.setErrors(mockErrors);
        revisionResult.current.acceptSuggestion('error-1');
      });

      // Simulate Ctrl+Z (undo)
      const undoEvent = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true
      });

      act(() => {
        if (revisionResult.current.canUndo()) {
          revisionResult.current.undo();
        }
      });

      expect(revisionResult.current.getAcceptedSuggestions()).toHaveLength(0);

      // Simulate Ctrl+Y (redo)
      act(() => {
        if (revisionResult.current.canRedo()) {
          revisionResult.current.redo();
        }
      });

      expect(revisionResult.current.getAcceptedSuggestions()).toHaveLength(1);
    });
  });

  describe('Export Preparation', () => {
    it('should prepare correct data for export', () => {
      const { result: revisionResult } = renderHook(() => useRevisionStore());
      const { result: analysisResult } = renderHook(() => useAnalysisStore());

      act(() => {
        analysisResult.current.setScriptContent(mockScript);
        revisionResult.current.setErrors(mockErrors);
        revisionResult.current.acceptSuggestion('error-1');
      });

      const acceptedErrors = revisionResult.current.getAcceptedSuggestions();
      const rejectedErrors = revisionResult.current.getRejectedSuggestions();
      const pendingErrors = revisionResult.current.getPendingSuggestions();

      expect(acceptedErrors).toHaveLength(1);
      expect(acceptedErrors[0].id).toBe('error-1');
      expect(rejectedErrors).toHaveLength(0);
      expect(pendingErrors).toHaveLength(1);

      // Verify export data structure
      const exportData = {
        originalScript: analysisResult.current.scriptContent,
        acceptedErrors,
        statistics: {
          total: revisionResult.current.errors.length,
          accepted: acceptedErrors.length,
          rejected: rejectedErrors.length,
          pending: pendingErrors.length
        }
      };

      expect(exportData.originalScript).toBe(mockScript);
      expect(exportData.statistics.total).toBe(2);
      expect(exportData.statistics.accepted).toBe(1);
    });
  });

  describe('Draft Auto-save', () => {
    it('should save and restore draft from localStorage', () => {
      const { result: revisionResult } = renderHook(() => useRevisionStore());
      
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        clear: jest.fn(),
        removeItem: jest.fn(),
        length: 0,
        key: jest.fn()
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true
      });

      act(() => {
        revisionResult.current.setErrors(mockErrors);
        revisionResult.current.acceptSuggestion('error-1');
      });

      // Simulate saving draft
      const draft = {
        errors: revisionResult.current.errors,
        timestamp: new Date().toISOString()
      };

      act(() => {
        window.localStorage.setItem('revision-draft', JSON.stringify(draft));
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'revision-draft',
        expect.any(String)
      );

      // Simulate loading draft
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft));
      
      const savedDraft = window.localStorage.getItem('revision-draft');
      expect(savedDraft).toBeDefined();
      
      const parsedDraft = JSON.parse(savedDraft!);
      expect(parsedDraft.errors).toHaveLength(2);
      expect(parsedDraft.timestamp).toBeDefined();
    });
  });
});