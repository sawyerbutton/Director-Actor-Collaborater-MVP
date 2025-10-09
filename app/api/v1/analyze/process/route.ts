import { NextRequest, NextResponse } from 'next/server';
import { workflowQueue } from '@/lib/api/workflow-queue';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError } from '@/lib/api/errors';
import { HTTP_STATUS } from '@/lib/config/constants';

/**
 * POST /api/v1/analyze/process
 * Manually trigger job processing (Serverless-compatible)
 *
 * This endpoint should be called by the frontend polling mechanism
 * to actively process queued jobs in Serverless environments where
 * setInterval doesn't work.
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     processed: number,
 *     message: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // Manually trigger job processing
      const result = await workflowQueue.processNextManually();

      return NextResponse.json(
        createApiResponse({
          processed: result.processed ? 1 : 0,
          message: result.message
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
