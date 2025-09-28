import { 
  createProjectWithAnalysis,
  deleteUserWithAllData,
  bulkCreateProjects
} from '@/lib/db/transactions';
import { prisma } from '@/lib/db/client';

// Mock Prisma client
jest.mock('@/lib/db/client', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe('Database Transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProjectWithAnalysis', () => {
    it('should create a project and analysis in a transaction', async () => {
      const projectData = {
        userId: 'user1',
        title: 'Test Project',
        description: 'Test Description',
        content: 'Test Content',
        status: 'active',
      };

      const mockProject = { id: 'project1', ...projectData };
      const mockAnalysis = { id: 'analysis1', projectId: 'project1', status: 'pending' };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn().mockResolvedValue(mockProject),
          },
          analysis: {
            create: jest.fn().mockResolvedValue(mockAnalysis),
          },
        };
        return callback(tx);
      });

      const result = await createProjectWithAnalysis(projectData);

      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('analysis');
      expect(result.project).toEqual(mockProject);
      expect(result.analysis).toEqual(mockAnalysis);
    });

    it('should use default status if not provided', async () => {
      const projectData = {
        userId: 'user1',
        title: 'Test Project',
        content: 'Test Content',
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn().mockImplementation(({ data }) => {
              expect(data.status).toBe('draft');
              return Promise.resolve({ id: 'project1', ...data });
            }),
          },
          analysis: {
            create: jest.fn().mockResolvedValue({ id: 'analysis1' }),
          },
        };
        return callback(tx);
      });

      await createProjectWithAnalysis(projectData);
    });
  });

  describe('deleteUserWithAllData', () => {
    it('should delete user and all related data', async () => {
      const userId = 'user1';
      const mockProjects = [{ id: 'project1' }, { id: 'project2' }];
      const mockUser = { id: userId, email: 'test@example.com' };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          project: {
            findMany: jest.fn().mockResolvedValue(mockProjects),
            deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
          analysis: {
            deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
          },
          user: {
            delete: jest.fn().mockResolvedValue(mockUser),
          },
        };
        return callback(tx);
      });

      const result = await deleteUserWithAllData(userId);

      expect(result).toEqual({
        user: mockUser,
        projectsDeleted: 2,
        analysesDeleted: 5,
      });
    });

    it('should handle users with no projects', async () => {
      const userId = 'user1';
      const mockUser = { id: userId, email: 'test@example.com' };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          project: {
            findMany: jest.fn().mockResolvedValue([]),
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          analysis: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          user: {
            delete: jest.fn().mockResolvedValue(mockUser),
          },
        };
        return callback(tx);
      });

      const result = await deleteUserWithAllData(userId);

      expect(result).toEqual({
        user: mockUser,
        projectsDeleted: 0,
        analysesDeleted: 0,
      });
    });
  });

  describe('bulkCreateProjects', () => {
    it('should create multiple projects in a transaction', async () => {
      const userId = 'user1';
      const projectsData = [
        { title: 'Project 1', content: 'Content 1' },
        { title: 'Project 2', content: 'Content 2', status: 'active' },
        { title: 'Project 3', content: 'Content 3', description: 'Desc 3' },
      ];

      const mockProjects = projectsData.map((data, index) => ({
        id: `project${index + 1}`,
        userId,
        ...data,
        status: data.status || 'draft',
      }));

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn().mockImplementation(({ data }) => 
              Promise.resolve({ id: `project_${Math.random()}`, ...data })
            ),
          },
        };
        
        const result = await callback(tx);
        return mockProjects;
      });

      const result = await bulkCreateProjects(userId, projectsData);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('userId', userId);
      expect(result[1]).toHaveProperty('status', 'active');
      expect(result[2]).toHaveProperty('description', 'Desc 3');
    });

    it('should apply default status to all projects without status', async () => {
      const userId = 'user1';
      const projectsData = [
        { title: 'Project 1', content: 'Content 1' },
        { title: 'Project 2', content: 'Content 2' },
      ];

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn().mockImplementation(({ data }) => {
              expect(data.status).toBe('draft');
              return Promise.resolve({ id: 'project1', ...data });
            }),
          },
        };
        
        return await callback(tx);
      });

      await bulkCreateProjects(userId, projectsData);
    });

    it('should handle empty array', async () => {
      const userId = 'user1';
      const projectsData: any[] = [];

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn(),
          },
        };
        return await callback(tx);
      });

      const result = await bulkCreateProjects(userId, projectsData);

      expect(result).toEqual([]);
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback on error', async () => {
      const projectData = {
        userId: 'user1',
        title: 'Test Project',
        content: 'Test Content',
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          project: {
            create: jest.fn().mockResolvedValue({ id: 'project1' }),
          },
          analysis: {
            create: jest.fn().mockRejectedValue(new Error('Database error')),
          },
        };
        return callback(tx);
      });

      await expect(createProjectWithAnalysis(projectData)).rejects.toThrow('Database error');
    });
  });
});