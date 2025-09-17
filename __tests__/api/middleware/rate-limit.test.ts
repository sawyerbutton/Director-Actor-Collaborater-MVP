import { NextRequest } from 'next/server';
import { rateLimiter, rateLimitMiddleware } from '@/lib/api/middleware/rate-limit';

describe('Rate Limit Middleware', () => {
  const mockRequest = (path: string = '/api/test') => {
    return new NextRequest(new URL(`http://localhost:3000${path}`), {
      headers: new Headers({
        'x-forwarded-for': '127.0.0.1'
      })
    });
  };

  beforeEach(() => {
    // Reset rate limiter before each test
    rateLimiter.destroy();
  });

  it('should allow requests within rate limit', () => {
    const request = mockRequest();
    const options = { maxRequests: 5, windowMs: 1000 };
    
    for (let i = 0; i < 5; i++) {
      const response = rateLimitMiddleware(request, options);
      expect(response).toBeNull();
    }
  });

  it('should block requests exceeding rate limit', () => {
    const request = mockRequest();
    const options = { maxRequests: 2, windowMs: 1000 };
    
    // First two requests should pass
    expect(rateLimitMiddleware(request, options)).toBeNull();
    expect(rateLimitMiddleware(request, options)).toBeNull();
    
    // Third request should be blocked
    const response = rateLimitMiddleware(request, options);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
    
    const headers = response?.headers;
    expect(headers?.get('X-RateLimit-Limit')).toBe('2');
    expect(headers?.get('X-RateLimit-Remaining')).toBe('0');
    expect(headers?.get('Retry-After')).toBeTruthy();
  });

  it('should track limits per endpoint', () => {
    const request1 = mockRequest('/api/endpoint1');
    const request2 = mockRequest('/api/endpoint2');
    const options = { maxRequests: 1, windowMs: 1000 };
    
    // First request to endpoint1 should pass
    expect(rateLimitMiddleware(request1, options)).toBeNull();
    
    // First request to endpoint2 should also pass
    expect(rateLimitMiddleware(request2, options)).toBeNull();
    
    // Second request to endpoint1 should be blocked
    const response = rateLimitMiddleware(request1, options);
    expect(response?.status).toBe(429);
  });

  it('should reset limits after window expires', async () => {
    const request = mockRequest();
    const options = { maxRequests: 1, windowMs: 100 };
    
    // First request should pass
    expect(rateLimitMiddleware(request, options)).toBeNull();
    
    // Second request should be blocked
    expect(rateLimitMiddleware(request, options)?.status).toBe(429);
    
    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Request should pass again
    expect(rateLimitMiddleware(request, options)).toBeNull();
  });

  it('should handle requests without forwarded IP', () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/test'));
    const options = { maxRequests: 1, windowMs: 1000 };
    
    // Should still track rate limits
    expect(rateLimitMiddleware(request, options)).toBeNull();
    expect(rateLimitMiddleware(request, options)?.status).toBe(429);
  });
});