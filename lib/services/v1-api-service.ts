import { LogicError } from '@/types/analysis';
import { Suggestion } from '@/types/revision';

// Get base URL for client-side requests
const getBaseUrl = () => {
  // Server-side (build time or SSR)
  if (typeof window === 'undefined') {
    // During build, use environment variable or return empty to skip API calls
    return process.env.NEXT_PUBLIC_APP_URL || '';
  }
  // Client-side
  return '';
};

const API_BASE_URL = `${getBaseUrl()}/api/v1`;
const DEFAULT_TIMEOUT = 30000;
const POLL_INTERVAL = 5000; // 5 seconds - reduced API call frequency
const MAX_POLL_ATTEMPTS = 60; // 5 minutes max

export interface ProjectData {
  id: string;
  title: string;
  description?: string;
  status: string;
  workflowStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisJobData {
  jobId: string;
  projectId: string;
  status: 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface JobStatusData {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress?: number;
  result?: any;
  error?: string;
}

export interface DiagnosticReportData {
  projectId: string;
  report: {
    id: string;
    findings: Array<{
      type: string;
      severity: string;
      location: any;
      description: string;
      suggestion?: string;
      confidence: number;
    }>;
    summary: string;
    confidence: number;
    statistics: any;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface WorkflowStatusData {
  projectId: string;
  workflowStatus: string;
  scriptVersions: number;
  diagnosticReport: {
    id: string;
    createdAt: string;
  } | null;
  latestJob: {
    id: string;
    type: string;
    status: string;
    createdAt: string;
  } | null;
  statistics: {
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
  updatedAt: string;
}

class V1ApiService {
  private currentProjectId: string | null = null;
  private currentJobId: string | null = null;
  private pollingAbortController: AbortController | null = null;

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<Response> {
    // Skip API calls during build time - return empty response
    if (typeof window === 'undefined' && (!url || url.startsWith('/api/'))) {
      // Return a mock response during build time to prevent errors
      return new Response(JSON.stringify({ data: [], error: 'Build time - no API available' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Create a new project with script content
   */
  async createProject(
    title: string,
    scriptContent: string,
    description?: string
  ): Promise<ProjectData> {
    const response = await this.fetchWithTimeout(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content: scriptContent,
        description
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create project');
    }

    const data = await response.json();
    this.currentProjectId = data.data.id;
    return data.data;
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<ProjectData> {
    const response = await this.fetchWithTimeout(
      `${API_BASE_URL}/projects/${projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to get project');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * List all projects
   */
  async listProjects(page = 1, limit = 20): Promise<{
    items: ProjectData[];
    pagination: any;
  }> {
    const response = await this.fetchWithTimeout(
      `${API_BASE_URL}/projects?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to list projects');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Start Act 1 analysis for a project
   */
  async startAnalysis(
    projectId: string,
    scriptContent?: string
  ): Promise<AnalysisJobData> {
    const response = await this.fetchWithTimeout(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        scriptContent
      }),
    });

    if (!response.ok && response.status !== 202) {
      const error = await response.text();
      throw new Error(error || 'Failed to start analysis');
    }

    const data = await response.json();
    this.currentJobId = data.data.jobId;
    return data.data;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatusData> {
    const response = await this.fetchWithTimeout(
      `${API_BASE_URL}/analyze/jobs/${jobId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      10000 // Shorter timeout for status checks
    );

    if (!response.ok) {
      // Handle rate limiting gracefully
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before polling again.');
      }
      const error = await response.text();
      throw new Error(error || 'Failed to get job status');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Poll job status until completion
   */
  async pollJobStatus(
    jobId: string,
    onProgress?: (status: JobStatusData) => void
  ): Promise<JobStatusData> {
    this.pollingAbortController = new AbortController();
    let attempts = 0;
    let delay = POLL_INTERVAL;

    while (attempts < MAX_POLL_ATTEMPTS) {
      if (this.pollingAbortController?.signal.aborted) {
        throw new Error('Polling cancelled');
      }

      try {
        const status = await this.getJobStatus(jobId);

        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'COMPLETED' || status.status === 'FAILED' || status.status === 'CANCELLED') {
          this.pollingAbortController = null;
          return status;
        }

        // Wait before next poll with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));

        // Increase delay with backoff (max 10 seconds)
        delay = Math.min(delay * 1.5, 10000);
        attempts++;
      } catch (error) {
        // If rate limited, wait longer
        if (error instanceof Error && error.message.includes('Rate limit')) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          attempts++;
          continue;
        }
        throw error;
      }
    }

    throw new Error('Analysis timeout - job is taking too long');
  }

  /**
   * Cancel polling
   */
  cancelPolling() {
    if (this.pollingAbortController) {
      this.pollingAbortController.abort();
      this.pollingAbortController = null;
    }
  }

  /**
   * Get project workflow status
   */
  async getWorkflowStatus(projectId: string): Promise<WorkflowStatusData> {
    const response = await this.fetchWithTimeout(
      `${API_BASE_URL}/projects/${projectId}/status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to get workflow status');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get diagnostic report for a project
   */
  async getDiagnosticReport(projectId: string): Promise<DiagnosticReportData> {
    const response = await this.fetchWithTimeout(
      `${API_BASE_URL}/projects/${projectId}/report`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // No report available yet
        return {
          projectId,
          report: null
        };
      }
      const error = await response.text();
      throw new Error(error || 'Failed to get diagnostic report');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Transform diagnostic report to analysis results format
   */
  transformReportToResults(report: DiagnosticReportData): {
    errors: LogicError[];
    suggestions: Suggestion[];
    metadata: any;
  } | null {
    if (!report.report) {
      return null;
    }

    // Transform findings to LogicError format
    const errors: LogicError[] = report.report.findings.map((finding, index) => ({
      id: `error-${index}`,
      type: finding.type as any, // Cast to LogicErrorType
      severity: finding.severity === 'critical' ? 'high' :
               finding.severity === 'warning' ? 'medium' : 'low',
      location: finding.location || {},
      description: finding.description,
      suggestion: finding.suggestion,
      confidence: finding.confidence,
      context: undefined
    }));

    // Generate suggestions from findings
    const suggestions: Suggestion[] = report.report.findings
      .filter(finding => finding.suggestion)
      .map((finding, index) => ({
        id: `sug-${index}`,
        errorId: `error-${index}`,
        type: 'correction' as const,
        description: finding.suggestion!,
        modification: finding.suggestion!,
        location: finding.location || {},
        impact: 'medium' as const,
        confidence: finding.confidence,
        rationale: finding.suggestion!,
        priority: 'medium' as const,
        createdAt: new Date().toISOString()
      } as Suggestion));

    return {
      errors,
      suggestions,
      metadata: {
        analysisTime: Date.now(),
        errorCount: errors.length,
        confidence: report.report.confidence,
        statistics: report.report.statistics
      }
    };
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Get current job ID
   */
  getCurrentJobId(): string | null {
    return this.currentJobId;
  }

  /**
   * Clear current state
   */
  clearState() {
    this.currentProjectId = null;
    this.currentJobId = null;
    this.cancelPolling();
  }
}

export const v1ApiService = new V1ApiService();