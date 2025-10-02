/**
 * Integration test for V1 API flow
 * Tests the complete flow from project creation to analysis
 */

import { v1ApiService } from '../../lib/services/v1-api-service';

// Mock fetch globally
global.fetch = jest.fn();

describe('V1 API Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    v1ApiService.clearState();
  });

  describe('Complete Analysis Flow', () => {
    it('should complete full project creation and analysis flow', async () => {
      jest.setTimeout(10000);

      const testScript = `
        Scene 1 - Office
        Characters: Alice, Bob

        Alice: Good morning!
        Bob: Hi Alice!
      `;

      // Step 1: Create project
      const mockProject = {
        id: 'project-123',
        title: 'Integration Test Project',
        status: 'active',
        workflowStatus: 'INITIALIZED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockProject })
      });

      const project = await v1ApiService.createProject(
        'Integration Test Project',
        testScript,
        'Test description'
      );

      expect(project.id).toBe('project-123');
      expect(project.workflowStatus).toBe('INITIALIZED');

      // Step 2: Start analysis
      const mockJob = {
        jobId: 'job-456',
        projectId: 'project-123',
        status: 'processing',
        message: 'Analysis started'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ data: mockJob })
      });

      const job = await v1ApiService.startAnalysis(project.id, testScript);
      expect(job.jobId).toBe('job-456');

      // Step 3: Check job status - return COMPLETED immediately
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            jobId: 'job-456',
            status: 'COMPLETED',
            progress: 100,
            result: { findings: [] }
          }
        })
      });

      const progressUpdates: any[] = [];
      const finalStatus = await v1ApiService.pollJobStatus(
        job.jobId,
        (status) => progressUpdates.push(status)
      );

      expect(finalStatus.status).toBe('COMPLETED');
      expect(progressUpdates.length).toBeGreaterThanOrEqual(1);

      // Step 4: Get diagnostic report
      const mockReport = {
        projectId: 'project-123',
        report: {
          id: 'report-789',
          findings: [
            {
              type: 'character',
              severity: 'warning',
              location: { scene: 1, line: 3 },
              description: 'Potential character inconsistency',
              suggestion: 'Review character dialogue',
              confidence: 0.75
            }
          ],
          summary: 'Analysis complete with 1 finding',
          confidence: 0.85,
          statistics: { total: 1, critical: 0, warnings: 1 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockReport })
      });

      const report = await v1ApiService.getDiagnosticReport(project.id);
      expect(report.report).toBeDefined();
      expect(report.report?.findings).toHaveLength(1);

      // Step 5: Transform report to results
      const results = v1ApiService.transformReportToResults(report);
      expect(results).not.toBeNull();
      expect(results?.errors).toHaveLength(1);
      expect(results?.errors[0].severity).toBe('medium');
      expect(results?.suggestions).toHaveLength(1);
    }, 10000);

    it('should handle analysis failure gracefully', async () => {
      jest.setTimeout(10000);

      // Create project
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'project-fail',
            title: 'Fail Test',
            workflowStatus: 'INITIALIZED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });

      const project = await v1ApiService.createProject('Fail Test', 'content');

      // Start analysis
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          data: { jobId: 'job-fail', projectId: project.id }
        })
      });

      const job = await v1ApiService.startAnalysis(project.id);

      // Job fails - return FAILED status immediately
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            jobId: 'job-fail',
            status: 'FAILED',
            error: 'Analysis engine error'
          }
        })
      });

      const finalStatus = await v1ApiService.pollJobStatus(job.jobId);
      expect(finalStatus.status).toBe('FAILED');
      expect(finalStatus.error).toBe('Analysis engine error');
    }, 10000);

    it('should handle rate limiting during polling', async () => {
      jest.setTimeout(15000);

      // Start with a job
      const jobId = 'job-rate-limit';

      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First attempt - rate limited
          return {
            ok: false,
            status: 429,
            text: async () => 'Rate limit exceeded'
          };
        } else {
          // Subsequent attempts - successful
          return {
            ok: true,
            json: async () => ({
              data: {
                jobId,
                status: 'COMPLETED',
                progress: 100
              }
            })
          };
        }
      });

      // Should retry after rate limit
      const result = await v1ApiService.pollJobStatus(jobId);
      expect(result.status).toBe('COMPLETED');
      expect(callCount).toBeGreaterThanOrEqual(2);
    }, 15000);
  });

  describe('Workflow Status', () => {
    it('should retrieve workflow status', async () => {
      const mockStatus = {
        projectId: 'project-123',
        workflowStatus: 'ACT1_RUNNING',
        scriptVersions: 1,
        diagnosticReport: null,
        latestJob: {
          id: 'job-123',
          type: 'ACT1_ANALYSIS',
          status: 'PROCESSING',
          createdAt: new Date().toISOString()
        },
        statistics: {
          total: 1,
          queued: 0,
          processing: 1,
          completed: 0,
          failed: 0
        },
        updatedAt: new Date().toISOString()
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStatus })
      });

      const status = await v1ApiService.getWorkflowStatus('project-123');
      expect(status.workflowStatus).toBe('ACT1_RUNNING');
      expect(status.statistics.processing).toBe(1);
    });
  });

  describe('Project Management', () => {
    it('should list projects with pagination', async () => {
      const mockResponse = {
        items: [
          {
            id: 'proj-1',
            title: 'Project 1',
            workflowStatus: 'COMPLETED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'proj-2',
            title: 'Project 2',
            workflowStatus: 'ACT1_RUNNING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      });

      const projects = await v1ApiService.listProjects(1, 20);
      expect(projects.items).toHaveLength(2);
      expect(projects.items[0].title).toBe('Project 1');
      expect(projects.pagination.total).toBe(2);
    });
  });
});