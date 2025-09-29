import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/api/response';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const stores: { [endpoint: string]: RateLimitStore } = {};

export interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: NextRequest) => string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  // More permissive in development for testing
  max: process.env.NODE_ENV === 'development' ? 100 : 10, // 100 requests per minute in dev, 10 in production
  message: 'Too many requests, please try again later',
  keyGenerator: (req) => {
    // Use IP address as default key
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return ip;
  }
};

export function createRateLimiter(endpoint: string, config: RateLimitConfig = {}) {
  const options = { ...defaultConfig, ...config };

  if (!stores[endpoint]) {
    stores[endpoint] = {};
  }

  return async function rateLimitMiddleware(request: NextRequest) {
    // Skip rate limiting in development if DISABLE_RATE_LIMIT is set
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true') {
      return null; // Continue to next middleware
    }

    const key = options.keyGenerator!(request);
    const now = Date.now();
    const store = stores[endpoint];
    
    // Clean up expired entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });
    
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + options.windowMs!
      };
    }
    
    const record = store[key];
    
    if (record.resetTime < now) {
      record.count = 0;
      record.resetTime = now + options.windowMs!;
    }
    
    record.count++;
    
    if (record.count > options.max!) {
      return NextResponse.json(
        createErrorResponse(
          ERROR_CODES.RATE_LIMIT,
          options.message!,
          {
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
          }
        ),
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
            'X-RateLimit-Limit': String(options.max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
          }
        }
      );
    }
    
    return null; // Continue to next middleware
  };
}

// Specific rate limiters for auth endpoints
export const authRateLimiter = createRateLimiter('auth', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later'
});

export const registrationRateLimiter = createRateLimiter('registration', {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  message: 'Too many registration attempts, please try again later'
});

// Legacy exports for backward compatibility with middleware/index.ts
export const rateLimitMiddleware = (req: NextRequest, options: RateLimitConfig = {}) => {
  const limiter = createRateLimiter('default', options);
  return limiter(req);
};

export const addRateLimitHeaders = (res: NextResponse, req: NextRequest, options: RateLimitConfig = {}) => {
  // Add rate limit headers to response
  const config = { ...defaultConfig, ...options };
  const keyGen = config.keyGenerator || defaultConfig.keyGenerator;
  const key = keyGen!(req);
  
  res.headers.set('X-RateLimit-Limit', String(config.max));
  res.headers.set('X-RateLimit-Window', String(config.windowMs));
  
  return res;
};

export type { RateLimitConfig as RateLimitOptions };
export const rateLimiter = createRateLimiter;