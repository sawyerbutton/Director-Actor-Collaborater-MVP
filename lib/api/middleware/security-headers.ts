import { NextResponse } from 'next/server';

/**
 * Security headers middleware
 * Adds security headers to responses to protect against common vulnerabilities
 */
export function securityHeadersMiddleware(response: NextResponse): NextResponse {
  // Clone the response to avoid mutating the original
  const secureResponse = response instanceof NextResponse 
    ? response 
    : new NextResponse(response.body, response);

  // Prevent clickjacking attacks
  secureResponse.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  secureResponse.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection (for older browsers)
  secureResponse.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  secureResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy - adjust based on your needs
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
  
  secureResponse.headers.set('Content-Security-Policy', csp);
  
  // Strict Transport Security (HSTS) - only in production
  if (process.env.NODE_ENV === 'production') {
    secureResponse.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
  
  // Permissions Policy (formerly Feature Policy)
  secureResponse.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  return secureResponse;
}

/**
 * Request size limit middleware
 * Prevents large request bodies that could cause DoS
 */
export interface SizeLimitOptions {
  maxSize?: number; // in bytes
  message?: string;
}

export function requestSizeLimitMiddleware(
  body: any,
  options: SizeLimitOptions = {}
): void {
  const { 
    maxSize = 10 * 1024 * 1024, // 10MB default
    message = 'Request body too large'
  } = options;

  if (!body) return;

  const size = JSON.stringify(body).length;
  
  if (size > maxSize) {
    throw new Error(message);
  }
}