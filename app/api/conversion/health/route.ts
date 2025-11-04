/**
 * Python Converter Service Health Check API
 *
 * GET /api/conversion/health
 *
 * Proxies health check to Python FastAPI service
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { withMiddleware } from '@/lib/api/middleware';
import { pythonConverterClient } from '@/lib/services/python-converter-client';

export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      console.log('[Conversion Health] Checking Python converter service health...');

      const health = await pythonConverterClient.getHealth();

      console.log('[Conversion Health] Service healthy:', health);

      return NextResponse.json(
        createApiResponse(health),
        { status: 200 }
      );
    } catch (error) {
      console.error('[Conversion Health] Health check failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return NextResponse.json(
        createErrorResponse('SERVICE_UNAVAILABLE', `Python converter service unavailable: ${errorMessage}`),
        { status: 503 }
      );
    }
  });
}
