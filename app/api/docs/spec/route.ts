import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
import { openApiSpec } from '@/lib/api/openapi/spec';
import { UnauthorizedError } from '@/lib/api/errors';
import { withMiddleware } from '@/lib/api/middleware';
import { withErrorBoundary } from '@/lib/api/errors';

export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    return withErrorBoundary(async () => {
      // Check if API docs are enabled
      if (!env.get('ENABLE_API_DOCS')) {
        throw new UnauthorizedError('API documentation is disabled');
      }

      // Only allow in development mode unless explicitly enabled
      if (env.isProduction() && env.get('ENABLE_API_DOCS') !== 'true') {
        throw new UnauthorizedError('API documentation is not available in production');
      }

      // Return the OpenAPI spec as JSON
      return NextResponse.json(openApiSpec);
    });
  });
}