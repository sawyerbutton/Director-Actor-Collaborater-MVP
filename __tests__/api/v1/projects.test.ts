import { POST, GET } from '@/app/api/v1/projects/route';
import { projectService } from '@/lib/db/services/project.service';
import { HTTP_STATUS } from '@/lib/config/constants';
import { createMockRequest } from './test-helpers';

// Mock dependencies
jest.mock('@/lib/db/services/project.service');

describe('POST /api/v1/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a project with valid data', async () => {
    const mockProject = {
      id: 'project-123',
      title: 'Test Script',
      description: 'A test script',
      content: 'FADE IN...',
      status: 'draft',
      userId: 'mock-user-id',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (projectService.create as jest.Mock).mockResolvedValue(mockProject);

    const request = createMockRequest('/api/v1/projects', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        title: 'Test Script',
        description: 'A test script',
        content: 'FADE IN...'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('project-123');
    expect(data.data.title).toBe('Test Script');
    expect(projectService.create).toHaveBeenCalledWith({
      title: 'Test Script',
      description: 'A test script',
      content: 'FADE IN...',
      userId: 'mock-user-id'
    });
  });

  it('should return 400 for invalid input', async () => {
    const request = createMockRequest('/api/v1/projects', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        // Missing required title
        description: 'A test script'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VAL_001');
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createMockRequest('/api/v1/projects', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: {
        title: 'Test Script',
        content: 'FADE IN...'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('AUTH_001');
  });
});

describe('GET /api/v1/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user projects with pagination', async () => {
    const mockProjects = [
      {
        id: 'project-1',
        title: 'Script 1',
        description: 'First script',
        status: 'draft',
        userId: 'mock-user-id',
        content: 'Content 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { analyses: 2 }
      },
      {
        id: 'project-2',
        title: 'Script 2',
        description: 'Second script',
        status: 'active',
        userId: 'mock-user-id',
        content: 'Content 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { analyses: 1 }
      }
    ];

    (projectService.findByUser as jest.Mock).mockResolvedValue(mockProjects);
    (projectService.countByUser as jest.Mock).mockResolvedValue(2);

    const request = createMockRequest('/api/v1/projects', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      },
      searchParams: {
        page: '1',
        limit: '20'
      }
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(data.success).toBe(true);
    expect(data.data.items).toHaveLength(2);
    expect(data.data.pagination.total).toBe(2);
    expect(data.data.pagination.page).toBe(1);
    expect(data.data.pagination.limit).toBe(20);
    expect(projectService.findByUser).toHaveBeenCalledWith('mock-user-id', {
      limit: 20,
      offset: 0
    });
  });

  it('should handle pagination parameters', async () => {
    (projectService.findByUser as jest.Mock).mockResolvedValue([]);
    (projectService.countByUser as jest.Mock).mockResolvedValue(50);

    const request = createMockRequest('/api/v1/projects', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      },
      searchParams: {
        page: '2',
        limit: '10'
      }
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(data.data.pagination.page).toBe(2);
    expect(data.data.pagination.limit).toBe(10);
    expect(data.data.pagination.totalPages).toBe(5);
    expect(data.data.pagination.hasNext).toBe(true);
    expect(data.data.pagination.hasPrevious).toBe(true);
    expect(projectService.findByUser).toHaveBeenCalledWith('mock-user-id', {
      limit: 10,
      offset: 10
    });
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createMockRequest('/api/v1/projects', {
      method: 'GET'
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('AUTH_001');
  });
});