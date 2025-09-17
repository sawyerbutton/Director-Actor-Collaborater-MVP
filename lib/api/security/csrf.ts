import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { UnauthorizedError } from '@/lib/api/errors';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf-token';

// In-memory store for CSRF tokens (in production, use Redis or similar)
const csrfTokenStore = new Map<string, { token: string; expires: number }>();

export class CSRFProtection {
  private cleanupExpiredTokens() {
    const now = Date.now();
    for (const [key, value] of csrfTokenStore.entries()) {
      if (value.expires < now) {
        csrfTokenStore.delete(key);
      }
    }
  }

  generateToken(): string {
    this.cleanupExpiredTokens();
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  }

  storeToken(sessionId: string, token: string): void {
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour
    csrfTokenStore.set(sessionId, { token, expires });
  }

  validateToken(sessionId: string, token: string): boolean {
    this.cleanupExpiredTokens();
    
    const stored = csrfTokenStore.get(sessionId);
    if (!stored) return false;
    
    if (stored.expires < Date.now()) {
      csrfTokenStore.delete(sessionId);
      return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token)
    );
  }

  async protect(request: NextRequest): Promise<NextResponse | null> {
    // Skip CSRF check for GET requests
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return null;
    }

    // Get session ID from cookie or generate one
    const sessionId = request.cookies.get('session-id')?.value || crypto.randomUUID();
    
    // Get CSRF token from header or body
    const headerToken = request.headers.get(CSRF_HEADER);
    
    if (!headerToken) {
      throw new UnauthorizedError('CSRF token missing');
    }

    if (!this.validateToken(sessionId, headerToken)) {
      throw new UnauthorizedError('Invalid CSRF token');
    }

    return null;
  }

  setTokenCookie(response: NextResponse, token: string): void {
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });
  }
}

export const csrfProtection = new CSRFProtection();

// Middleware to apply CSRF protection
export async function withCSRFProtection(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const csrfCheck = await csrfProtection.protect(request);
    if (csrfCheck) return csrfCheck;
    
    return await handler();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    throw error;
  }
}

// API endpoint to get a new CSRF token
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session-id')?.value || crypto.randomUUID();
  const token = csrfProtection.generateToken();
  
  csrfProtection.storeToken(sessionId, token);
  
  const response = NextResponse.json({ token });
  
  // Set session cookie if not present
  if (!request.cookies.get('session-id')) {
    response.cookies.set('session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });
  }
  
  csrfProtection.setTokenCookie(response, token);
  
  return response;
}