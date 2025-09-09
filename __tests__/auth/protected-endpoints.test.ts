import { GET as getProjects, POST as createProject } from '@/app/api/v1/projects/route';
import { POST as analyzeProject } from '@/app/api/v1/analyze/route';
import { authenticateRequest } from '@/lib/auth/middleware';
import { NextRequest } from 'next/server';
import { projectService } from '@/lib/db/services/project.service';
import { analysisService } from '@/lib/db/services/analysis.service';

jest.mock('@/lib/auth/middleware');
jest.mock('@/lib/db/services/project.service');
jest.mock('@/lib/db/services/analysis.service');
jest.mock('@/lib/api/job-queue', () => ({
  analysisQueue: {
    enqueue: jest.fn()
  }
}));

describe('Protected API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Projects API', () => {
    it('should reject unauthenticated request to GET /api/v1/projects', async () => {
      const error = new Error('Authentication required');
      error.name = 'UnauthorizedError';
      (authenticateRequest as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/v1/projects');
      const response = await getProjects(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_001');
    });

    it('should allow authenticated request to GET /api/v1/projects', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User'
      };

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);
      (projectService.findByUser as jest.Mock).mockResolvedValue([]);
      (projectService.countByUser as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/v1/projects');
      const response = await getProjects(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(projectService.findByUser).toHaveBeenCalledWith('user-id', expect.any(Object));
    });

    it('should reject unauthenticated request to POST /api/v1/projects', async () => {
      const error = new Error('Authentication required');
      error.name = 'UnauthorizedError';
      (authenticateRequest as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Project',
          content: 'Test content'
        })
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_001');
    });
  });

  describe('Analysis API', () => {
    it('should reject unauthenticated request to POST /api/v1/analyze', async () => {
      const error = new Error('Authentication required');
      error.name = 'UnauthorizedError';
      (authenticateRequest as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/v1/analyze', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-id'
        })
      });

      const response = await analyzeProject(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_001');
    });

    it('should verify project ownership for authenticated requests', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User'
      };

      const mockProject = {
        id: 'project-id',
        userId: 'other-user-id',
        title: 'Test Project',
        content: 'Test content'
      };

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);
      (projectService.findById as jest.Mock).mockResolvedValue(mockProject);

      const request = new NextRequest('http://localhost:3000/api/v1/analyze', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-id'
        })
      });

      const response = await analyzeProject(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_002');
    });
  });
});