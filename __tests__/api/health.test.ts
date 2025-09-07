import { GET } from '@/app/api/health/route';
import { NextRequest } from 'next/server';

describe('Health Check Endpoint', () => {
  it('should return healthy status', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/health'));
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.status).toBe('healthy');
    expect(data.data.timestamp).toBeDefined();
    expect(data.data.uptime).toBeGreaterThan(0);
    expect(data.data.environment).toBeDefined();
    expect(data.data.version).toBeDefined();
    expect(data.data.responseTime).toBeDefined();
  });

  it('should include meta information', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/health'));
    const response = await GET(request);
    
    const data = await response.json();
    expect(data.meta).toBeDefined();
    expect(data.meta.timestamp).toBeDefined();
    expect(data.meta.version).toBeDefined();
  });

  it('should handle CORS headers', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/health'), {
      headers: new Headers({
        'origin': 'http://localhost:3000'
      })
    });
    
    const response = await GET(request);
    
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('should include rate limit headers', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/health'));
    const response = await GET(request);
    
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
  });
});