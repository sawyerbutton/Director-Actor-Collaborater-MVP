import { NextRequest, NextResponse } from 'next/server';
import { CORS_ORIGINS } from '@/lib/config/constants';

export interface CorsOptions {
  origins?: string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}

const defaultOptions: CorsOptions = {
  origins: CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization'],
  credentials: true
};

export function corsMiddleware(
  request: NextRequest,
  response: NextResponse,
  options: CorsOptions = defaultOptions
): NextResponse {
  const origin = request.headers.get('origin');
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });
    
    if (origin && mergedOptions.origins?.includes(origin)) {
      preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    preflightResponse.headers.set(
      'Access-Control-Allow-Methods',
      mergedOptions.methods!.join(', ')
    );
    
    preflightResponse.headers.set(
      'Access-Control-Allow-Headers',
      mergedOptions.headers!.join(', ')
    );
    
    if (mergedOptions.credentials) {
      preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    preflightResponse.headers.set('Access-Control-Max-Age', '86400');
    
    return preflightResponse;
  }
  
  // Set CORS headers for actual requests
  if (origin && mergedOptions.origins?.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  if (mergedOptions.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return response;
}