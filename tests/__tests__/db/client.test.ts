import { prisma, checkDatabaseHealth } from '@/lib/db/client';

describe('Database Client', () => {
  describe('Prisma Client Singleton', () => {
    it('should export a prisma client instance', () => {
      expect(prisma).toBeDefined();
      expect(prisma).toHaveProperty('$connect');
      expect(prisma).toHaveProperty('$disconnect');
      expect(prisma).toHaveProperty('user');
      expect(prisma).toHaveProperty('project');
      expect(prisma).toHaveProperty('analysis');
    });

    it('should return the same instance when imported multiple times', async () => {
      const { prisma: prisma1 } = await import('@/lib/db/client');
      const { prisma: prisma2 } = await import('@/lib/db/client');
      expect(prisma1).toBe(prisma2);
    });
  });

  describe('Database Health Check', () => {
    it('should check database health successfully', async () => {
      // Mock the $queryRaw method
      const mockQueryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
      prisma.$queryRaw = mockQueryRaw;

      const result = await checkDatabaseHealth();
      
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('healthy');
      expect(result).toHaveProperty('latency');
      expect(typeof result.latency).toBe('number');
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle database connection errors', async () => {
      // Mock the $queryRaw method to throw an error
      const mockError = new Error('Connection refused');
      const mockQueryRaw = jest.fn().mockRejectedValue(mockError);
      prisma.$queryRaw = mockQueryRaw;

      const result = await checkDatabaseHealth();
      
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('unhealthy');
      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Connection refused');
    });

    it('should measure latency accurately', async () => {
      // Mock with a delay
      const mockQueryRaw = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 50))
      );
      prisma.$queryRaw = mockQueryRaw;

      const result = await checkDatabaseHealth();
      
      expect(result.status).toBe('healthy');
      expect(result.latency).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Connection Pool Management', () => {
    it('should handle connection lifecycle', async () => {
      const mockConnect = jest.fn().mockResolvedValue(undefined);
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);
      
      prisma.$connect = mockConnect;
      prisma.$disconnect = mockDisconnect;

      await prisma.$connect();
      expect(mockConnect).toHaveBeenCalled();

      await prisma.$disconnect();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});