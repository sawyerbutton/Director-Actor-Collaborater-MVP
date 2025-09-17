import { NextResponse } from 'next/server';
import { securityHeadersMiddleware, requestSizeLimitMiddleware } from '@/lib/api/middleware/security-headers';

describe('Security Headers Middleware', () => {
  describe('securityHeadersMiddleware', () => {
    it('should add all security headers to response', () => {
      const response = new NextResponse('test body', { status: 200 });
      const securedResponse = securityHeadersMiddleware(response);

      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(securedResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(securedResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(securedResponse.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
      expect(securedResponse.headers.get('Permissions-Policy')).toContain('camera=()');
    });

    it('should not add HSTS header in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = new NextResponse('test body', { status: 200 });
      const securedResponse = securityHeadersMiddleware(response);

      expect(securedResponse.headers.get('Strict-Transport-Security')).toBeNull();

      process.env.NODE_ENV = originalEnv;
    });

    it('should add HSTS header in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = new NextResponse('test body', { status: 200 });
      const securedResponse = securityHeadersMiddleware(response);

      expect(securedResponse.headers.get('Strict-Transport-Security')).toBe(
        'max-age=31536000; includeSubDomains'
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('requestSizeLimitMiddleware', () => {
    it('should allow requests within size limit', () => {
      const smallBody = { test: 'data' };
      
      expect(() => {
        requestSizeLimitMiddleware(smallBody, { maxSize: 1024 });
      }).not.toThrow();
    });

    it('should reject requests exceeding size limit', () => {
      const largeBody = { data: 'x'.repeat(1000) };
      
      expect(() => {
        requestSizeLimitMiddleware(largeBody, { maxSize: 100 });
      }).toThrow('Request body too large');
    });

    it('should use custom error message', () => {
      const largeBody = { data: 'x'.repeat(1000) };
      
      expect(() => {
        requestSizeLimitMiddleware(largeBody, { 
          maxSize: 100,
          message: 'Custom size error'
        });
      }).toThrow('Custom size error');
    });

    it('should handle null/undefined body', () => {
      expect(() => {
        requestSizeLimitMiddleware(null);
        requestSizeLimitMiddleware(undefined);
      }).not.toThrow();
    });
  });
});