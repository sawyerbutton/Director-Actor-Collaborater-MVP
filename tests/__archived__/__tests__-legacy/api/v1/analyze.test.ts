import { POST } from '@/app/api/v1/analyze/route';
import { GET, PATCH } from '@/app/api/v1/analyze/[id]/route';
import { projectService } from '@/lib/db/services/project.service';
import { analysisService } from '@/lib/db/services/analysis.service';
import { HTTP_STATUS } from '@/lib/config/constants';
import { createMockRequest } from './test-helpers';

// Mock dependencies
jest.mock('@/lib/db/services/project.service');
jest.mock('@/lib/db/services/analysis.service');

describe('POST /api/v1/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create analysis for valid project', async () => {
    const mockProject = {
      id: 'project-123',
      userId: 'mock-user-id',
      title: 'Test Script',
      content: 'FADE IN...',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockAnalysis = {
      id: 'analysis-123',
      projectId: 'project-123',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (projectService.findById as jest.Mock).mockResolvedValue(mockProject);
    (analysisService.create as jest.Mock).mockResolvedValue(mockAnalysis);

    const request = createMockRequest('/api/v1/analyze', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        projectId: 'project-123'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.ACCEPTED);
    expect(data.success).toBe(true);
    expect(data.data.analysisId).toBe('analysis-123');
    expect(data.data.status).toBe('processing');
    expect(analysisService.create).toHaveBeenCalledWith({
      projectId: 'project-123',
      status: 'pending'
    });
  });

  it('should return 404 for non-existent project', async () => {
    (projectService.findById as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest('/api/v1/analyze', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        projectId: 'non-existent'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('should return 403 for unauthorized project access', async () => {
    const mockProject = {
      id: 'project-123',
      userId: 'different-user',
      title: 'Test Script',
      content: 'FADE IN...',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (projectService.findById as jest.Mock).mockResolvedValue(mockProject);

    const request = createMockRequest('/api/v1/analyze', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        projectId: 'project-123'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/v1/analyze/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return analysis status and results', async () => {
    const mockAnalysis = {
      id: 'analysis-123',
      projectId: 'project-123',
      status: 'completed',
      result: {
        errors: [
          { type: 'format', line: 10, message: 'Format error' }
        ],
        statistics: { totalLines: 100 }
      },
      suggestions: [
        { id: '1', description: 'Fix format' }
      ],
      project: {
        id: 'project-123',
        userId: 'mock-user-id'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date()
    };

    (analysisService.findById as jest.Mock).mockResolvedValue(mockAnalysis);

    const request = createMockRequest('/api/v1/analyze/analysis-123', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      }
    });

    const response = await GET(request, { params: { id: 'analysis-123' } });
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('analysis-123');
    expect(data.data.status).toBe('completed');
    expect(data.data.result).toBeDefined();
    expect(data.data.suggestions).toBeDefined();
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });

  it('should return 404 for non-existent analysis', async () => {
    (analysisService.findById as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest('/api/v1/analyze/non-existent', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      }
    });

    const response = await GET(request, { params: { id: 'non-existent' } });
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('should not cache pending/processing analyses', async () => {
    const mockAnalysis = {
      id: 'analysis-123',
      projectId: 'project-123',
      status: 'processing',
      project: {
        id: 'project-123',
        userId: 'mock-user-id'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date()
    };

    (analysisService.findById as jest.Mock).mockResolvedValue(mockAnalysis);

    const request = createMockRequest('/api/v1/analyze/analysis-123', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      }
    });

    const response = await GET(request, { params: { id: 'analysis-123' } });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });
});

describe('PATCH /api/v1/analyze/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update analysis suggestions', async () => {
    const mockAnalysis = {
      id: 'analysis-123',
      projectId: 'project-123',
      status: 'completed',
      suggestions: [
        { id: '1', description: 'Fix format', accepted: undefined },
        { id: '2', description: 'Fix character', accepted: undefined }
      ],
      project: {
        id: 'project-123',
        userId: 'mock-user-id'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedAnalysis = {
      ...mockAnalysis,
      suggestions: [
        { id: '1', description: 'Fix format', accepted: true },
        { id: '2', description: 'Fix character', accepted: false }
      ]
    };

    (analysisService.findById as jest.Mock).mockResolvedValue(mockAnalysis);
    (analysisService.update as jest.Mock).mockResolvedValue(updatedAnalysis);

    const request = createMockRequest('/api/v1/analyze/analysis-123', {
      method: 'PATCH',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        action: 'accept',
        suggestions: [
          { id: '1', accepted: true },
          { id: '2', accepted: false }
        ]
      }
    });

    const response = await PATCH(request, { params: { id: 'analysis-123' } });
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(data.success).toBe(true);
    expect(data.data.suggestions).toBeDefined();
    expect(analysisService.update).toHaveBeenCalled();
  });

  it('should return error for incomplete analysis', async () => {
    const mockAnalysis = {
      id: 'analysis-123',
      projectId: 'project-123',
      status: 'processing',
      project: {
        id: 'project-123',
        userId: 'mock-user-id'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (analysisService.findById as jest.Mock).mockResolvedValue(mockAnalysis);

    const request = createMockRequest('/api/v1/analyze/analysis-123', {
      method: 'PATCH',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        action: 'accept',
        suggestions: []
      }
    });

    const response = await PATCH(request, { params: { id: 'analysis-123' } });
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('completed');
  });
});