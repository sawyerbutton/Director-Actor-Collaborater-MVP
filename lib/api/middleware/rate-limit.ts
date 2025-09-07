import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/api/response';
import { ERROR_CODES, HTTP_STATUS, RATE_LIMIT_CONFIG } from '@/lib/config/constants';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private store: Map<string, RateLimitStore> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  private getClientId(request: NextRequest): string {
    // Use IP address as client identifier
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `${ip}-${request.nextUrl.pathname}`;
  }

  checkLimit(
    request: NextRequest,
    maxRequests: number = RATE_LIMIT_CONFIG.maxRequests,
    windowMs: number = RATE_LIMIT_CONFIG.windowMs
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const clientId = this.getClientId(request);
    const now = Date.now();
    
    let clientData = this.store.get(clientId);
    
    if (!clientData || clientData.resetTime < now) {
      // Create new window
      clientData = {
        count: 1,
        resetTime: now + windowMs
      };
      this.store.set(clientId, clientData);
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: clientData.resetTime
      };
    }
    
    // Increment counter
    clientData.count++;
    
    const allowed = clientData.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - clientData.count);
    
    return {
      allowed,
      remaining,
      resetTime: clientData.resetTime
    };
  }

  reset(request: NextRequest): void {
    const clientId = this.getClientId(request);
    this.store.delete(clientId);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

export const rateLimiter = RateLimiter.getInstance();

export interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitOptions = {}
): NextResponse | null {
  const {
    maxRequests = RATE_LIMIT_CONFIG.maxRequests,
    windowMs = RATE_LIMIT_CONFIG.windowMs
  } = options;
  
  const { allowed, remaining, resetTime } = rateLimiter.checkLimit(
    request,
    maxRequests,
    windowMs
  );
  
  if (!allowed) {
    const response = NextResponse.json(
      createErrorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests, please try again later'
      ),
      { status: HTTP_STATUS.TOO_MANY_REQUESTS }
    );
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', resetTime.toString());
    response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
    
    return response;
  }
  
  // Return null to indicate request should proceed
  // Headers will be added to the actual response
  return null;
}

export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  options: RateLimitOptions = {}
): NextResponse {
  const {
    maxRequests = RATE_LIMIT_CONFIG.maxRequests,
    windowMs = RATE_LIMIT_CONFIG.windowMs
  } = options;
  
  const { remaining, resetTime } = rateLimiter.checkLimit(
    request,
    maxRequests,
    windowMs
  );
  
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime.toString());
  
  return response;
}