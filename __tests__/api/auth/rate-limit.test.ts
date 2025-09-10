import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/[...nextauth]/route-with-rate-limit';

// Mock the handlers from lib/auth
jest.mock('@/lib/auth', () => ({
  handlers: {
    POST: jest.fn().mockImplementation(() => 
      new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
    ),
    GET: jest.fn()
  }
}));

describe('Authentication Rate Limiting', () => {
  const mockIp = '192.168.1.1';
  
  function createMockRequest(path: string = '/api/auth/callback/credentials') {
    return new NextRequest(new URL(`http://localhost:3000${path}`), {
      method: 'POST',
      headers: {
        'x-forwarded-for': mockIp,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });
  }

  beforeEach(() => {
    // Clear any rate limit records between tests
    jest.clearAllMocks();
  });

  it('should allow up to 5 login attempts', async () => {
    for (let i = 0; i < 5; i++) {
      const request = createMockRequest();
      const response = await POST(request);
      
      // Should not be rate limited yet
      expect(response.status).not.toBe(429);
      
      // Check rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining) {
        expect(parseInt(remaining)).toBe(4 - i);
      }
    }
  });

  it('should block after 5 failed attempts', async () => {
    // Make 5 attempts first
    for (let i = 0; i < 5; i++) {
      const request = createMockRequest();
      await POST(request);
    }
    
    // 6th attempt should be blocked
    const request = createMockRequest();
    const response = await POST(request);
    
    expect(response.status).toBe(429);
    
    // Check rate limit headers
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('Retry-After')).toBeTruthy();
    
    // Check response body
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMIT');
  });

  it('should include proper rate limit headers', async () => {
    const request = createMockRequest();
    const response = await POST(request);
    
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('should not rate limit non-credential endpoints', async () => {
    const request = new NextRequest(
      new URL('http://localhost:3000/api/auth/session'),
      { method: 'POST' }
    );
    
    const response = await POST(request);
    
    // Should pass through to normal handler
    expect(response.status).not.toBe(429);
  });

  it('should track rate limits per IP address', async () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';
    
    // Make 5 attempts from IP1
    for (let i = 0; i < 5; i++) {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/callback/credentials'),
        {
          method: 'POST',
          headers: { 'x-forwarded-for': ip1 }
        }
      );
      await POST(request);
    }
    
    // IP1 should be blocked
    const blockedRequest = new NextRequest(
      new URL('http://localhost:3000/api/auth/callback/credentials'),
      {
        method: 'POST',
        headers: { 'x-forwarded-for': ip1 }
      }
    );
    const blockedResponse = await POST(blockedRequest);
    expect(blockedResponse.status).toBe(429);
    
    // IP2 should still be allowed
    const allowedRequest = new NextRequest(
      new URL('http://localhost:3000/api/auth/callback/credentials'),
      {
        method: 'POST',
        headers: { 'x-forwarded-for': ip2 }
      }
    );
    const allowedResponse = await POST(allowedRequest);
    expect(allowedResponse.status).not.toBe(429);
  });
});