import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { csrfProtection } from '@/lib/api/security/csrf';

// GET /api/auth/csrf - Get a new CSRF token
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session-id')?.value || crypto.randomUUID();
  const token = csrfProtection.generateToken();
  
  csrfProtection.storeToken(sessionId, token);
  
  const response = NextResponse.json({ 
    token,
    headerName: 'x-csrf-token'
  });
  
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