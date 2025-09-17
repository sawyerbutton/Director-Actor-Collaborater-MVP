import { GET } from '@/app/api/v1/export/[projectId]/route';
import { projectService } from '@/lib/db/services/project.service';
import { analysisService } from '@/lib/db/services/analysis.service';
import { HTTP_STATUS } from '@/lib/config/constants';
import { createMockRequest } from './test-helpers';

// Mock dependencies
jest.mock('@/lib/db/services/project.service');
jest.mock('@/lib/db/services/analysis.service');

describe('GET /api/v1/export/[projectId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProject = {
    id: 'project-123',
    userId: 'mock-user-id',
    title: 'Test Script',
    description: 'A test script',
    content: 'FADE IN...\n\nINT. OFFICE - DAY\n\nScript content here.',
    status: 'active',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02')
  };

  const mockAnalysis = {
    id: 'analysis-123',
    projectId: 'project-123',
    status: 'completed',
    result: {
      errors: [{ type: 'format', line: 10 }],
      statistics: { totalLines: 100 }
    },
    suggestions: [
      { id: '1', description: 'Fix format' }
    ],
    createdAt: new Date('2025-01-03'),
    completedAt: new Date('2025-01-03')
  };

  it('should export project as JSON', async () => {
    (projectService.findById as jest.Mock).mockResolvedValue(mockProject);

    const request = createMockRequest('/api/v1/export/project-123', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      },
      searchParams: {
        format: 'json'
      }
    });

    const response = await GET(request, { params: { projectId: 'project-123' } });
    const data = await response.text();
    const parsed = JSON.parse(data);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Content-Disposition')).toContain('Test_Script.json');
    expect(parsed.project.id).toBe('project-123');
    expect(parsed.project.title).toBe('Test Script');
    expect(parsed.project.content).toBe(mockProject.content);
  });

  it('should export project as Markdown', async () => {
    (projectService.findById as jest.Mock).mockResolvedValue(mockProject);

    const request = createMockRequest('/api/v1/export/project-123', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      },
      searchParams: {
        format: 'markdown'
      }
    });

    const response = await GET(request, { params: { projectId: 'project-123' } });
    const markdown = await response.text();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.headers.get('Content-Type')).toContain('text/markdown');
    expect(response.headers.get('Content-Disposition')).toContain('Test_Script.md');
    expect(markdown).toContain('# Test Script');
    expect(markdown).toContain('## Description');
    expect(markdown).toContain('A test script');
    expect(markdown).toContain('## Script Content');
    expect(markdown).toContain(mockProject.content);
  });

  it('should export project as plain text', async () => {
    (projectService.findById as jest.Mock).mockResolvedValue(mockProject);

    const request = createMockRequest('/api/v1/export/project-123', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      },
      searchParams: {
        format: 'txt'
      }
    });

    const response = await GET(request, { params: { projectId: 'project-123' } });
    const text = await response.text();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(response.headers.get('Content-Disposition')).toContain('Test_Script.txt');
    expect(text).toBe(mockProject.content);
  });

  it('should include analysis when requested', async () => {
    (projectService.findById as jest.Mock).mockResolvedValue(mockProject);
    (analysisService.getLatestForProject as jest.Mock).mockResolvedValue(mockAnalysis);

    const request = createMockRequest('/api/v1/export/project-123', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      },
      searchParams: {
        format: 'json',
        includeAnalysis: 'true'
      }
    });

    const response = await GET(request, { params: { projectId: 'project-123' } });
    const data = await response.text();
    const parsed = JSON.parse(data);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(parsed.project).toBeDefined();
    expect(parsed.analysis).toBeDefined();
    expect(parsed.analysis.id).toBe('analysis-123');
    expect(parsed.analysis.result).toBeDefined();
    expect(parsed.analysis.suggestions).toBeDefined();
  });

  it('should export markdown with analysis', async () => {
    (projectService.findById as jest.Mock).mockResolvedValue(mockProject);
    (analysisService.getLatestForProject as jest.Mock).mockResolvedValue(mockAnalysis);

    const request = createMockRequest('/api/v1/export/project-123', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      },
      searchParams: {
        format: 'markdown',
        includeAnalysis: 'true'
      }
    });

    const response = await GET(request, { params: { projectId: 'project-123' } });
    const markdown = await response.text();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(markdown).toContain('## Latest Analysis');
    expect(markdown).toContain('### Results');
    expect(markdown).toContain('### Suggestions');
  });

  it('should return 404 for non-existent project', async () => {
    (projectService.findById as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest('/api/v1/export/non-existent', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      }
    });

    const response = await GET(request, { params: { projectId: 'non-existent' } });
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('should return 403 for unauthorized project access', async () => {
    const unauthorizedProject = {
      ...mockProject,
      userId: 'different-user'
    };

    (projectService.findById as jest.Mock).mockResolvedValue(unauthorizedProject);

    const request = createMockRequest('/api/v1/export/project-123', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      }
    });

    const response = await GET(request, { params: { projectId: 'project-123' } });
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createMockRequest('/api/v1/export/project-123', {
      method: 'GET'
    });

    const response = await GET(request, { params: { projectId: 'project-123' } });
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('AUTH_001');
  });
});