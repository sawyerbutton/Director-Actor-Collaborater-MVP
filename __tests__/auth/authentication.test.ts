import { authenticateRequest } from '@/lib/auth/middleware';
import { getServerSession } from 'next-auth/next';
import { UnauthorizedError } from '@/lib/api/errors';

jest.mock('next-auth/next');

describe('Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateRequest', () => {
    it('should return user data for authenticated session', async () => {
      const mockSession = {
        user: {
          id: 'user-id',
          email: 'user@example.com',
          name: 'Test User'
        }
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await authenticateRequest();

      expect(result).toEqual({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User'
      });
    });

    it('should throw UnauthorizedError when no session exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      await expect(authenticateRequest()).rejects.toThrow(UnauthorizedError);
      await expect(authenticateRequest()).rejects.toThrow('Authentication required');
    });

    it('should throw UnauthorizedError when session has no user', async () => {
      const mockSession = {};
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      await expect(authenticateRequest()).rejects.toThrow(UnauthorizedError);
    });
  });
});