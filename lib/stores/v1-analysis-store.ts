import { create } from 'zustand';
import { LogicError, ParsedScript } from '@/types/analysis';
import { Suggestion } from '@/types/revision';
import { v1ApiService, ProjectData, WorkflowStatusData } from '@/lib/services/v1-api-service';
import { ScriptParser } from '@/lib/services/script-parser';

type AnalysisStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'failed' | 'cancelled';
type WorkflowStatus = 'INITIALIZED' | 'ACT1_RUNNING' | 'ACT1_COMPLETE' | 'ITERATING' | 'SYNTHESIZING' | 'COMPLETED';

interface AnalysisResults {
  errors: LogicError[];
  suggestions: Suggestion[];
  metadata?: {
    analysisTime?: number;
    scriptLength?: number;
    errorCount?: number;
    confidence?: number;
  };
}

interface V1AnalysisState {
  // Project data
  currentProject: ProjectData | null;
  projects: ProjectData[];

  // Script content
  scriptContent: string | null;
  scriptFileName: string | null;
  parsedScript: ParsedScript | null;

  // Analysis status
  analysisStatus: AnalysisStatus;
  workflowStatus: WorkflowStatus;
  jobId: string | null;

  // Progress tracking
  analysisProgress: number;

  // Analysis results
  analysisResults: AnalysisResults | null;

  // Workflow data
  workflowData: WorkflowStatusData | null;

  // Selection state
  selectedError: LogicError | null;

  // Error state
  errorMessage: string | null;

  // Actions - Project management
  createProject: (title: string, scriptContent: string, description?: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  loadProjects: () => Promise<void>;

  // Actions - Script management
  setScriptContent: (content: string, fileName: string) => void;
  clearScriptContent: () => void;
  parseScript: () => void;

  // Actions - Analysis
  startAnalysis: () => Promise<void>;
  pollJobStatus: () => Promise<void>;
  cancelAnalysis: () => void;
  loadAnalysisResults: () => Promise<void>;

  // Actions - State management
  setAnalysisStatus: (status: AnalysisStatus) => void;
  setWorkflowStatus: (status: WorkflowStatus) => void;
  setAnalysisProgress: (progress: number) => void;
  setSelectedError: (error: LogicError | null) => void;
  setErrorMessage: (message: string | null) => void;
  clearAnalysisResults: () => void;
  resetAll: () => void;

  // Actions - Workflow
  updateWorkflowStatus: () => Promise<void>;
}

export const useV1AnalysisStore = create<V1AnalysisState>((set, get) => ({
  // Initial state
  currentProject: null,
  projects: [],
  scriptContent: null,
  scriptFileName: null,
  parsedScript: null,
  analysisStatus: 'idle',
  workflowStatus: 'INITIALIZED',
  jobId: null,
  analysisProgress: 0,
  analysisResults: null,
  workflowData: null,
  selectedError: null,
  errorMessage: null,

  // Project management
  createProject: async (title: string, scriptContent: string, description?: string) => {
    try {
      set({ errorMessage: null });
      const project = await v1ApiService.createProject(title, scriptContent, description);
      set({
        currentProject: project,
        workflowStatus: project.workflowStatus as WorkflowStatus
      });
    } catch (error) {
      set({ errorMessage: error instanceof Error ? error.message : 'Failed to create project' });
      throw error;
    }
  },

  loadProject: async (projectId: string) => {
    try {
      set({ errorMessage: null });
      const project = await v1ApiService.getProject(projectId);
      set({
        currentProject: project,
        workflowStatus: project.workflowStatus as WorkflowStatus,
        scriptContent: null // Will need to fetch from backend if needed
      });
    } catch (error) {
      set({ errorMessage: error instanceof Error ? error.message : 'Failed to load project' });
      throw error;
    }
  },

  loadProjects: async () => {
    try {
      set({ errorMessage: null });
      const response = await v1ApiService.listProjects();
      set({ projects: response.items });
    } catch (error) {
      set({ errorMessage: error instanceof Error ? error.message : 'Failed to load projects' });
      throw error;
    }
  },

  // Script management
  setScriptContent: (content: string, fileName: string) => {
    set({
      scriptContent: content,
      scriptFileName: fileName,
      errorMessage: null
    });
  },

  clearScriptContent: () => {
    set({
      scriptContent: null,
      scriptFileName: null,
      parsedScript: null
    });
  },

  parseScript: () => {
    const { scriptContent } = get();
    if (!scriptContent) return;

    try {
      const parser = new ScriptParser();
      const parsed = parser.parseScript(scriptContent);
      set({ parsedScript: parsed, errorMessage: null });
    } catch (error) {
      set({
        parsedScript: null,
        errorMessage: error instanceof Error ? error.message : 'Failed to parse script'
      });
    }
  },

  // Analysis
  startAnalysis: async () => {
    const state = get();

    // Create project if not exists
    if (!state.currentProject) {
      if (!state.scriptContent || !state.scriptFileName) {
        set({ errorMessage: 'Please upload a script first' });
        return;
      }

      try {
        await state.createProject(
          state.scriptFileName,
          state.scriptContent,
          'Analysis project'
        );
      } catch (error) {
        return; // Error already handled in createProject
      }
    }

    const project = get().currentProject;
    if (!project) return;

    try {
      set({
        analysisStatus: 'starting',
        analysisProgress: 0,
        errorMessage: null
      });

      const job = await v1ApiService.startAnalysis(project.id, state.scriptContent || undefined);

      set({
        jobId: job.jobId,
        analysisStatus: 'processing'
      });

      // Start polling
      await get().pollJobStatus();
    } catch (error) {
      set({
        analysisStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Failed to start analysis'
      });
    }
  },

  pollJobStatus: async () => {
    const { jobId } = get();
    if (!jobId) return;

    try {
      const finalStatus = await v1ApiService.pollJobStatus(
        jobId,
        (status) => {
          // Update progress
          const progress = status.progress || 50;
          set({ analysisProgress: progress });

          // Update status
          if (status.status === 'PROCESSING') {
            set({ analysisStatus: 'processing' });
          }
        }
      );

      if (finalStatus.status === 'COMPLETED') {
        set({
          analysisStatus: 'completed',
          analysisProgress: 100
        });

        // Load results
        await get().loadAnalysisResults();
        await get().updateWorkflowStatus();
      } else if (finalStatus.status === 'FAILED') {
        set({
          analysisStatus: 'failed',
          errorMessage: finalStatus.error || 'Analysis failed'
        });
      }
    } catch (error) {
      set({
        analysisStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Failed to get job status'
      });
    }
  },

  cancelAnalysis: () => {
    v1ApiService.cancelPolling();
    set({
      analysisStatus: 'cancelled',
      jobId: null
    });
  },

  loadAnalysisResults: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      const report = await v1ApiService.getDiagnosticReport(currentProject.id);
      const results = v1ApiService.transformReportToResults(report);

      if (results) {
        set({
          analysisResults: results,
          errorMessage: null
        });
      } else {
        set({
          analysisResults: null,
          errorMessage: 'No analysis results available'
        });
      }
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Failed to load results'
      });
    }
  },

  // State management
  setAnalysisStatus: (status: AnalysisStatus) => {
    set({ analysisStatus: status });
  },

  setWorkflowStatus: (status: WorkflowStatus) => {
    set({ workflowStatus: status });
  },

  setAnalysisProgress: (progress: number) => {
    set({ analysisProgress: progress });
  },

  setSelectedError: (error: LogicError | null) => {
    set({ selectedError: error });
  },

  setErrorMessage: (message: string | null) => {
    set({ errorMessage: message });
  },

  clearAnalysisResults: () => {
    set({
      analysisResults: null,
      selectedError: null
    });
  },

  resetAll: () => {
    v1ApiService.clearState();
    set({
      currentProject: null,
      projects: [],
      scriptContent: null,
      scriptFileName: null,
      parsedScript: null,
      analysisStatus: 'idle',
      workflowStatus: 'INITIALIZED',
      jobId: null,
      analysisProgress: 0,
      analysisResults: null,
      workflowData: null,
      selectedError: null,
      errorMessage: null
    });
  },

  // Workflow
  updateWorkflowStatus: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      const status = await v1ApiService.getWorkflowStatus(currentProject.id);
      set({
        workflowData: status,
        workflowStatus: status.workflowStatus as WorkflowStatus,
        errorMessage: null
      });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Failed to update workflow status'
      });
    }
  }
}));