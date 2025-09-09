import { POST } from '@/app/api/auth/register/route';
import { userService } from '@/lib/db/services/user.service';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db/services/user.service');

describe('User Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        password: null,
        image: null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (userService.findByEmail as jest.Mock).mockResolvedValue(null);
      (userService.create as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Test123456',
          name: 'Test User'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User'
      });
      expect(userService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Test123456',
        name: 'Test User'
      });
    });

    it('should reject registration with existing email', async () => {
      const existingUser = {
        id: 'existing-id',
        email: 'existing@example.com',
        name: 'Existing User'
      };

      (userService.findByEmail as jest.Mock).mockResolvedValue(existingUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'Test123456',
          name: 'New User'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BIZ_001');
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should reject registration with invalid email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'Test123456',
          name: 'Test User'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VAL_001');
      expect(userService.findByEmail).not.toHaveBeenCalled();
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should reject registration with short password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VAL_001');
      expect(userService.findByEmail).not.toHaveBeenCalled();
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should register user without name field', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: null,
        password: null,
        image: null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (userService.findByEmail as jest.Mock).mockResolvedValue(null);
      (userService.create as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Test123456'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(userService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Test123456',
        name: null
      });
    });
  });
});