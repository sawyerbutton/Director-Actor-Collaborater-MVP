import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check environment variables (REMOVE IN PRODUCTION!)
 * GET /api/debug/env
 */
export async function GET(request: NextRequest) {
  // Only allow in development or with secret key
  const secret = request.nextUrl.searchParams.get('secret');
  if (process.env.NODE_ENV === 'production' && secret !== process.env.DEBUG_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    database: {
      DATABASE_URL: {
        exists: !!process.env.DATABASE_URL,
        prefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
      },
      DIRECT_URL: {
        exists: !!process.env.DIRECT_URL,
        prefix: process.env.DIRECT_URL?.substring(0, 30) + '...',
      },
    },
    deepseek: {
      DEEPSEEK_API_KEY: {
        exists: !!process.env.DEEPSEEK_API_KEY,
        length: process.env.DEEPSEEK_API_KEY?.length || 0,
        prefix: process.env.DEEPSEEK_API_KEY?.substring(0, 7) + '...',
      },
      DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com (default)',
    },
    vercel: {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    },
  };

  return NextResponse.json(envCheck, { status: 200 });
}
