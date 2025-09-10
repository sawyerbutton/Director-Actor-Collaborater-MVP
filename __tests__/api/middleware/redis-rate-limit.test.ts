import { NextRequest } from 'next/server';
import { createRedisRateLimiter } from '@/lib/api/middleware/redis-rate-limit';
import { HTTP_STATUS } from '@/lib/config/constants';

// Mock Redis client
jest.mock('ioredis', () => {
  const mockRedis = {
    pipeline: jest.fn(() => ({
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 1],
        [null, 0], // Count starts at 0
        [null, 1],
        [null, 1]
      ])
    })),
    zrange: jest.fn().mockResolvedValue([]),
    on: jest.fn()
  };
  
  return jest.fn(() => mockRedis);
});

describe('Redis Rate Limiter', () => {
  const mockIp = '192.168.1.1';
  
  function createMockRequest(ip: string = mockIp) {
    return new NextRequest(new URL('http://localhost:3000/api/test'), {
      method: 'POST',
      headers: {
        'x-forwarded-for': ip
      }
    });
  }
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    delete process.env.REDIS_URL;
  });
  
  describe('with Redis available', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
    });
    
    it('should allow requests within rate limit', async () => {
      const rateLimiter = createRedisRateLimiter('test', {
        windowMs: 60000,
        max: 5
      });
      
      const request = createMockRequest();
      const response = await rateLimiter(request);
      
      expect(response).not.toBeNull();
      expect(response?.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response?.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    });
    
    it('should block requests exceeding rate limit', async () => {
      const Redis = require('ioredis');
      const mockRedisInstance = Redis.mock.results[0].value;
      
      // Mock pipeline to return count exceeding limit
      mockRedisInstance.pipeline.mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 6], // Count exceeds limit of 5
          [null, 1],
          [null, 1]
        ])
      });
      
      const rateLimiter = createRedisRateLimiter('test', {
        windowMs: 60000,
        max: 5
      });
      
      const request = createMockRequest();
      const response = await rateLimiter(request);
      
      expect(response).not.toBeNull();
      expect(response?.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response?.headers.get('Retry-After')).toBeTruthy();
    });
  });
  
  describe('fallback to in-memory', () => {
    beforeEach(() => {
      // No REDIS_URL set, should use in-memory
      delete process.env.REDIS_URL;
    });
    
    it('should use in-memory storage when Redis is not available', async () => {
      const rateLimiter = createRedisRateLimiter('test', {
        windowMs: 60000,
        max: 2
      });
      
      // First request should pass
      const request1 = createMockRequest();
      const response1 = await rateLimiter(request1);
      expect(response1?.headers.get('X-RateLimit-Remaining')).toBe('1');
      
      // Second request should pass
      const request2 = createMockRequest();
      const response2 = await rateLimiter(request2);
      expect(response2?.headers.get('X-RateLimit-Remaining')).toBe('0');
      
      // Third request should be blocked
      const request3 = createMockRequest();
      const response3 = await rateLimiter(request3);
      expect(response3?.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
    });
    
    it('should track rate limits per IP address', async () => {
      const rateLimiter = createRedisRateLimiter('test', {
        windowMs: 60000,
        max: 1
      });
      
      // First IP - first request should pass
      const request1 = createMockRequest('10.0.0.1');
      const response1 = await rateLimiter(request1);
      expect(response1?.headers.get('X-RateLimit-Remaining')).toBe('0');
      
      // First IP - second request should be blocked
      const request2 = createMockRequest('10.0.0.1');
      const response2 = await rateLimiter(request2);
      expect(response2?.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      
      // Second IP - first request should pass
      const request3 = createMockRequest('10.0.0.2');
      const response3 = await rateLimiter(request3);
      expect(response3?.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });
  
  describe('configuration options', () => {
    it('should use custom key generator', async () => {
      const customKeyGen = jest.fn((req: NextRequest) => {
        const url = new URL(req.url);
        return url.pathname;
      });
      
      const rateLimiter = createRedisRateLimiter('test', {
        windowMs: 60000,
        max: 5,
        keyGenerator: customKeyGen
      });
      
      const request = createMockRequest();
      await rateLimiter(request);
      
      expect(customKeyGen).toHaveBeenCalledWith(request);
    });
    
    it('should use custom error message', async () => {
      const customMessage = 'Custom rate limit message';
      
      const rateLimiter = createRedisRateLimiter('test', {
        windowMs: 60000,
        max: 0, // Force rate limit
        message: customMessage
      });
      
      const request = createMockRequest();
      const response = await rateLimiter(request);
      
      if (response?.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
        const body = await response.json();
        expect(body.error.message).toBe(customMessage);
      }
    });
  });
});