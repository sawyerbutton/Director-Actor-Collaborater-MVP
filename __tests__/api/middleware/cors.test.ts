import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware } from '@/lib/api/middleware/cors';

describe('CORS Middleware', () => {
  const mockRequest = (origin?: string, method: string = 'GET') => {
    const headers = new Headers();
    if (origin) {
      headers.set('origin', origin);
    }
    return new NextRequest(new URL('http://localhost:3000/api/test'), {
      method,
      headers
    });
  };

  const mockResponse = () => {
    return new NextResponse('OK', { status: 200 });
  };

  it('should handle preflight requests', () => {
    const request = mockRequest('http://localhost:3000', 'OPTIONS');
    const response = mockResponse();
    const result = corsMiddleware(request, response);

    expect(result.status).toBe(204);
    expect(result.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
    expect(result.headers.get('Access-Control-Allow-Headers')).toBeTruthy();
    expect(result.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  it('should set CORS headers for allowed origins', () => {
    const request = mockRequest('http://localhost:3000');
    const response = mockResponse();
    const result = corsMiddleware(request, response);

    expect(result.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(result.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('should not set CORS headers for disallowed origins', () => {
    const request = mockRequest('http://evil.com');
    const response = mockResponse();
    const result = corsMiddleware(request, response);

    expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('should handle requests without origin header', () => {
    const request = mockRequest();
    const response = mockResponse();
    const result = corsMiddleware(request, response);

    expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('should accept custom CORS options', () => {
    const request = mockRequest('http://custom.com');
    const response = mockResponse();
    const options = {
      origins: ['http://custom.com'],
      methods: ['GET', 'POST'],
      headers: ['Content-Type'],
      credentials: false
    };
    
    const result = corsMiddleware(request, response, options);

    expect(result.headers.get('Access-Control-Allow-Origin')).toBe('http://custom.com');
    expect(result.headers.get('Access-Control-Allow-Credentials')).toBeNull();
  });
});