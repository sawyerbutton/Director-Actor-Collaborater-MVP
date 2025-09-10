import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { createErrorResponse } from '@/lib/api/response';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';

// Redis client configuration
const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // For development/testing, fallback to in-memory if Redis not available
  if (process.env.NODE_ENV === 'test' || !process.env.REDIS_URL) {
    console.warn('Redis URL not configured, using in-memory fallback for rate limiting');
    return null;
  }
  
  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableOfflineQueue: false,
    });
    
    client.on('error', (err) => {
      console.error('Redis client error:', err);
    });
    
    return client;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
};

// Fallback in-memory store for development/testing
const memoryStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many requests, please try again later',
  keyGenerator: (req) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return ip;
  },
  skipSuccessfulRequests: false,
};

export function createRedisRateLimiter(namespace: string, config: Partial<RateLimitConfig> = {}) {
  const options = { ...defaultConfig, ...config };
  const redis = getRedisClient();
  
  return async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const key = `rate_limit:${namespace}:${options.keyGenerator!(request)}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;
    
    try {
      if (redis) {
        // Redis-based rate limiting
        const pipeline = redis.pipeline();
        
        // Remove old entries outside the window
        pipeline.zremrangebyscore(key, '-inf', windowStart);
        
        // Count requests in current window
        pipeline.zcard(key);
        
        // Add current request with timestamp as score
        pipeline.zadd(key, now, `${now}-${Math.random()}`);
        
        // Set expiry on the key
        pipeline.expire(key, Math.ceil(options.windowMs / 1000));
        
        const results = await pipeline.exec();
        
        if (!results) {
          throw new Error('Redis pipeline execution failed');
        }
        
        const count = (results[1]?.[1] as number) || 0;
        
        if (count >= options.max) {
          // Calculate reset time from oldest entry in window
          const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
          const oldestTime = oldestEntry?.[1] ? parseInt(oldestEntry[1]) : now;
          const resetTime = oldestTime + options.windowMs;
          
          return NextResponse.json(
            createErrorResponse(
              ERROR_CODES.RATE_LIMIT,
              options.message!,
              {
                retryAfter: Math.ceil((resetTime - now) / 1000)
              }
            ),
            {
              status: HTTP_STATUS.TOO_MANY_REQUESTS,
              headers: {
                'Retry-After': String(Math.ceil((resetTime - now) / 1000)),
                'X-RateLimit-Limit': String(options.max),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(resetTime).toISOString()
              }
            }
          );
        }
        
        // Add rate limit headers to successful response
        const remaining = Math.max(0, options.max - count - 1);
        return new NextResponse(null, {
          headers: {
            'X-RateLimit-Limit': String(options.max),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': new Date(now + options.windowMs).toISOString()
          }
        });
        
      } else {
        // Fallback to in-memory store
        const record = memoryStore.get(key);
        
        if (record && record.resetTime > now) {
          record.count++;
          
          if (record.count > options.max) {
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
        } else {
          memoryStore.set(key, {
            count: 1,
            resetTime: now + options.windowMs
          });
        }
        
        const currentRecord = memoryStore.get(key)!;
        const remaining = Math.max(0, options.max - currentRecord.count);
        
        return new NextResponse(null, {
          headers: {
            'X-RateLimit-Limit': String(options.max),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': new Date(currentRecord.resetTime).toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Rate limiting error:', error);
      // On error, allow the request but log the issue
      return null;
    }
  };
}

// Specific rate limiters for auth endpoints
export const authRateLimiter = createRedisRateLimiter('auth', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later'
});

export const registrationRateLimiter = createRedisRateLimiter('registration', {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  message: 'Too many registration attempts, please try again later'
});

// Cleanup function for in-memory store (called periodically if using fallback)
if (!getRedisClient()) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (record.resetTime < now) {
        memoryStore.delete(key);
      }
    }
  }, 60 * 60 * 1000); // Clean up every hour
}