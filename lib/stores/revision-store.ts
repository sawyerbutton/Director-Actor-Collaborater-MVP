import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { LogicError } from '@/types/analysis';

export type RevisionStatus = 'pending' | 'accepted' | 'rejected';

export interface RevisionAction {
  id: string;
  action: 'accept' | 'reject' | 'undo' | 'redo';
  suggestionId: string;
  timestamp: Date;
  previousStatus: RevisionStatus;
  newStatus: RevisionStatus;
}

export interface RevisionError extends LogicError {
  status: RevisionStatus;
  appliedAt?: Date;
}

interface RevisionState {
  // Error states
  errors: RevisionError[];
  
  // History management
  history: RevisionAction[];
  historyIndex: number;
  
  // Actions
  setErrors: (errors: LogicError[]) => void;
  acceptSuggestion: (errorId: string) => void;
  rejectSuggestion: (errorId: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Bulk actions
  acceptAll: () => void;
  rejectAll: () => void;
  resetAll: () => void;
  
  // Getters
  getAcceptedSuggestions: () => RevisionError[];
  getRejectedSuggestions: () => RevisionError[];
  getPendingSuggestions: () => RevisionError[];
}

export const useRevisionStore = create<RevisionState>()(
  devtools(
    immer((set, get) => ({
      errors: [],
      history: [],
      historyIndex: -1,

      setErrors: (errors) => set((state) => {
        state.errors = errors.map(error => ({
          ...error,
          status: 'pending' as RevisionStatus
        }));
        state.history = [];
        state.historyIndex = -1;
      }),

      acceptSuggestion: (errorId) => set((state) => {
        const errorIndex = state.errors.findIndex(e => e.id === errorId);
        if (errorIndex === -1) return;
        
        const error = state.errors[errorIndex];
        if (error.status !== 'pending') return;

        // Record action
        const action: RevisionAction = {
          id: `action-${Date.now()}`,
          action: 'accept',
          suggestionId: errorId,
          timestamp: new Date(),
          previousStatus: error.status,
          newStatus: 'accepted'
        };

        // Update error status
        state.errors[errorIndex].status = 'accepted';
        state.errors[errorIndex].appliedAt = new Date();

        // Update history
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(action);
        state.historyIndex++;
      }),

      rejectSuggestion: (errorId) => set((state) => {
        const errorIndex = state.errors.findIndex(e => e.id === errorId);
        if (errorIndex === -1) return;
        
        const error = state.errors[errorIndex];
        if (error.status !== 'pending') return;

        // Record action
        const action: RevisionAction = {
          id: `action-${Date.now()}`,
          action: 'reject',
          suggestionId: errorId,
          timestamp: new Date(),
          previousStatus: error.status,
          newStatus: 'rejected'
        };

        // Update error status
        state.errors[errorIndex].status = 'rejected';
        state.errors[errorIndex].appliedAt = new Date();

        // Update history
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(action);
        state.historyIndex++;
      }),

      undo: () => set((state) => {
        if (state.historyIndex < 0) return;

        const action = state.history[state.historyIndex];
        const errorIndex = state.errors.findIndex(e => e.id === action.suggestionId);
        
        if (errorIndex !== -1) {
          state.errors[errorIndex].status = action.previousStatus;
          if (action.previousStatus === 'pending') {
            delete state.errors[errorIndex].appliedAt;
          }
        }

        state.historyIndex--;
      }),

      redo: () => set((state) => {
        if (state.historyIndex >= state.history.length - 1) return;

        state.historyIndex++;
        const action = state.history[state.historyIndex];
        const errorIndex = state.errors.findIndex(e => e.id === action.suggestionId);
        
        if (errorIndex !== -1) {
          state.errors[errorIndex].status = action.newStatus;
          state.errors[errorIndex].appliedAt = new Date();
        }
      }),

      canUndo: () => {
        const state = get();
        return state.historyIndex >= 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      acceptAll: () => set((state) => {
        const pendingErrors = state.errors.filter(e => e.status === 'pending');
        const timestamp = new Date();

        pendingErrors.forEach(error => {
          const errorIndex = state.errors.findIndex(e => e.id === error.id);
          if (errorIndex !== -1) {
            state.errors[errorIndex].status = 'accepted';
            state.errors[errorIndex].appliedAt = timestamp;

            const action: RevisionAction = {
              id: `action-${Date.now()}-${error.id}`,
              action: 'accept',
              suggestionId: error.id,
              timestamp,
              previousStatus: 'pending',
              newStatus: 'accepted'
            };

            state.history.push(action);
          }
        });

        state.historyIndex = state.history.length - 1;
      }),

      rejectAll: () => set((state) => {
        const pendingErrors = state.errors.filter(e => e.status === 'pending');
        const timestamp = new Date();

        pendingErrors.forEach(error => {
          const errorIndex = state.errors.findIndex(e => e.id === error.id);
          if (errorIndex !== -1) {
            state.errors[errorIndex].status = 'rejected';
            state.errors[errorIndex].appliedAt = timestamp;

            const action: RevisionAction = {
              id: `action-${Date.now()}-${error.id}`,
              action: 'reject',
              suggestionId: error.id,
              timestamp,
              previousStatus: 'pending',
              newStatus: 'rejected'
            };

            state.history.push(action);
          }
        });

        state.historyIndex = state.history.length - 1;
      }),

      resetAll: () => set((state) => {
        state.errors.forEach(error => {
          error.status = 'pending';
          delete error.appliedAt;
        });
        state.history = [];
        state.historyIndex = -1;
      }),

      getAcceptedSuggestions: () => {
        const state = get();
        return state.errors.filter(e => e.status === 'accepted');
      },

      getRejectedSuggestions: () => {
        const state = get();
        return state.errors.filter(e => e.status === 'rejected');
      },

      getPendingSuggestions: () => {
        const state = get();
        return state.errors.filter(e => e.status === 'pending');
      }
    })),
    {
      name: 'revision-store'
    }
  )
);