import { NextRequest, NextResponse } from 'next/server';
import { handlers } from "@/lib/auth";
import { createErrorResponse } from '@/lib/api/response';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';
import { authRateLimiter } from '@/lib/api/middleware/redis-rate-limit';

// UPDATED: Now using Redis-based rate limiting via redis-rate-limit.ts
// The Redis implementation will automatically fall back to in-memory storage
// if Redis is not available (e.g., in development/testing)
// Set REDIS_URL environment variable for production deployment

// Legacy in-memory rate limiting store (kept for backward compatibility)
interface RateLimitRecord {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

// Configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes block after max attempts

function getClientIdentifier(request: NextRequest): string {
  // Get IP address from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  
  // Also consider the email if it's a POST request with credentials
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname.endsWith('/callback/credentials')) {
    // Try to get email from the request body (for credentials provider)
    // Note: We'll use IP as primary identifier for now
    return `auth:${ip}`;
  }
  
  return `auth:${ip}`;
}

// Cleanup old records periodically to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean every hour

function cleanupExpiredRecords() {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [key, record] of loginAttempts.entries()) {
      if (record.resetTime < now && (!record.blockedUntil || record.blockedUntil < now)) {
        loginAttempts.delete(key);
      }
    }
    lastCleanup = now;
  }
}

function checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(clientId);
  
  // Clean up expired records periodically
  cleanupExpiredRecords();
  
  // Clean up this specific record if expired
  if (record && record.resetTime < now && (!record.blockedUntil || record.blockedUntil < now)) {
    loginAttempts.delete(clientId);
  }
  
  // Check if client is blocked
  if (record?.blockedUntil && record.blockedUntil > now) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.blockedUntil - now) / 1000)
    };
  }
  
  // Initialize or get existing record
  const currentRecord = loginAttempts.get(clientId) || {
    count: 0,
    resetTime: now + RATE_LIMIT_WINDOW
  };
  
  // Reset if window expired
  if (currentRecord.resetTime < now) {
    currentRecord.count = 0;
    currentRecord.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  // Increment attempt count
  currentRecord.count++;
  
  // Check if limit exceeded
  if (currentRecord.count > MAX_ATTEMPTS) {
    currentRecord.blockedUntil = now + BLOCK_DURATION;
    loginAttempts.set(clientId, currentRecord);
    return {
      allowed: false,
      retryAfter: Math.ceil(BLOCK_DURATION / 1000)
    };
  }
  
  // Update record
  loginAttempts.set(clientId, currentRecord);
  
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  
  // Only apply rate limiting to credential sign-in attempts
  if (url.pathname.endsWith('/callback/credentials')) {
    // Use Redis-based rate limiter
    const rateLimitResult = await authRateLimiter(request);
    
    // If rate limiter returns a response, it means the limit was exceeded
    if (rateLimitResult && rateLimitResult.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      return rateLimitResult;
    }
    
    // Fallback to legacy rate limiting if Redis fails
    const clientId = getClientIdentifier(request);
    const { allowed, retryAfter } = checkRateLimit(clientId);
    
    if (!allowed) {
      return NextResponse.json(
        createErrorResponse(
          ERROR_CODES.RATE_LIMIT,
          'Too many login attempts. Please try again later.',
          { retryAfter }
        ),
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(MAX_ATTEMPTS),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (retryAfter! * 1000)).toISOString()
          }
        }
      );
    }
    
    // Add rate limit headers to response
    const response = await handlers.POST(request);
    const record = loginAttempts.get(clientId);
    
    if (record && response) {
      const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
      response.headers.set('X-RateLimit-Limit', String(MAX_ATTEMPTS));
      response.headers.set('X-RateLimit-Remaining', String(remaining));
      response.headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
    }
    
    return response;
  }
  
  // For non-credential endpoints, pass through to normal handler
  return handlers.POST(request);
}

export async function GET(request: NextRequest) {
  return handlers.GET(request);
}