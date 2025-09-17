import { userService } from '@/lib/db/services/user.service';
import { prisma } from '@/lib/db/client';
import { ValidationError, NotFoundError } from '@/lib/db/services/base.service';

// Mock Prisma client
jest.mock('@/lib/db/client', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      count: jest.fn(),
    },
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockUser = { id: '1', ...userData, createdAt: new Date(), updatedAt: new Date() };
      
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.create(userData);

      expect(prisma.user.create).toHaveBeenCalledWith({ data: userData });
      expect(result).toEqual(mockUser);
    });

    it('should handle unique constraint violations', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Test User',
      };
      
      const prismaError = {
        code: 'P2002',
        clientVersion: '5.0.0',
      };
      
      (prisma.user.create as jest.Mock).mockRejectedValue(prismaError);

      await expect(userService.create(userData)).rejects.toThrow(ValidationError);
      await expect(userService.create(userData)).rejects.toThrow('Unique constraint violation');
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      const mockUser = { 
        id: '1', 
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findById('1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const mockUser = { 
        id: '1', 
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findByEmail('test@example.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ 
        where: { email: 'test@example.com' } 
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', name: 'User 1' },
        { id: '2', email: 'user2@example.com', name: 'User 2' },
      ];
      
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userService.findAll({ limit: 10, offset: 0 });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockUsers);
    });

    it('should use default pagination', async () => {
      const mockUsers = [];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      await userService.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateData = { name: 'Updated Name' };
      const mockUser = { 
        id: '1', 
        email: 'test@example.com',
        name: 'Updated Name',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.update('1', updateData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle not found errors', async () => {
      const updateData = { name: 'Updated Name' };
      const prismaError = {
        code: 'P2025',
        clientVersion: '5.0.0',
      };
      
      (prisma.user.update as jest.Mock).mockRejectedValue(prismaError);

      await expect(userService.update('nonexistent', updateData)).rejects.toThrow(NotFoundError);
      await expect(userService.update('nonexistent', updateData)).rejects.toThrow('Record not found');
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: '1' });

      await userService.delete('1');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should handle not found errors on delete', async () => {
      const prismaError = {
        code: 'P2025',
        clientVersion: '5.0.0',
      };
      
      (prisma.user.delete as jest.Mock).mockRejectedValue(prismaError);

      await expect(userService.delete('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('countProjects', () => {
    it('should count user projects', async () => {
      (prisma.project.count as jest.Mock).mockResolvedValue(5);

      const result = await userService.countProjects('user1');

      expect(prisma.project.count).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });
      expect(result).toBe(5);
    });
  });
});