import { v1ApiService } from '../../lib/services/v1-api-service';

// Mock fetch
global.fetch = jest.fn();

describe('V1 API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockProject = {
        id: 'test-id',
        title: 'Test Project',
        status: 'active',
        workflowStatus: 'INITIALIZED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockProject })
      });

      const result = await v1ApiService.createProject(
        'Test Project',
        'Test content',
        'Test description'
      );

      expect(result).toEqual(mockProject);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/projects'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should handle errors when creating project', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Error creating project'
      });

      await expect(
        v1ApiService.createProject('Test', 'Content', 'Desc')
      ).rejects.toThrow('Error creating project');
    });
  });

  describe('pollJobStatus', () => {
    it('should poll until job completes', async () => {
      const jobId = 'test-job-id';

      // First call returns PROCESSING
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { jobId, status: 'PROCESSING', progress: 50 }
        })
      });

      // Second call returns COMPLETED
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { jobId, status: 'COMPLETED', progress: 100 }
        })
      });

      const onProgress = jest.fn();
      const result = await v1ApiService.pollJobStatus(jobId, onProgress);

      expect(result.status).toBe('COMPLETED');
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle job failure', async () => {
      const jobId = 'test-job-id';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            jobId,
            status: 'FAILED',
            error: 'Job failed'
          }
        })
      });

      const result = await v1ApiService.pollJobStatus(jobId);
      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Job failed');
    });
  });

  describe('transformReportToResults', () => {
    it('should transform diagnostic report to analysis results', () => {
      const mockReport = {
        projectId: 'test-project',
        report: {
          id: 'report-id',
          findings: [
            {
              type: 'character',
              severity: 'critical',
              location: { scene: 1, line: 10 },
              description: 'Character inconsistency',
              suggestion: 'Fix the character',
              confidence: 0.9
            }
          ],
          summary: 'Test summary',
          confidence: 0.85,
          statistics: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      const result = v1ApiService.transformReportToResults(mockReport);

      expect(result).not.toBeNull();
      expect(result?.errors).toHaveLength(1);
      expect(result?.suggestions).toHaveLength(1);
      expect(result?.errors[0].type).toBeDefined();
      expect(result?.errors[0].severity).toBe('high');
    });

    it('should return null for empty report', () => {
      const mockReport = {
        projectId: 'test-project',
        report: null
      };

      const result = v1ApiService.transformReportToResults(mockReport);
      expect(result).toBeNull();
    });
  });
});