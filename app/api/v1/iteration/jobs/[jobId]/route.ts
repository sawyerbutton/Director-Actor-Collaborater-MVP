import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, NotFoundError } from '@/lib/api/errors';
import { HTTP_STATUS } from '@/lib/config/constants';
import { workflowQueue } from '@/lib/api/workflow-queue';

interface RouteParams {
  params: {
    jobId: string;
  };
}

/**
 * GET /api/v1/iteration/jobs/[jobId]
 * Poll iteration job status (ACT2-5 propose operations)
 *
 * Returns:
 * - QUEUED: Job waiting to be processed
 * - PROCESSING: AI analysis in progress
 * - COMPLETED: Job finished, includes decisionId and proposals
 * - FAILED: Job failed, includes error message
 *
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     jobId: string,
 *     status: JobStatus,
 *     progress: number (0-100),
 *     result?: {
 *       decisionId: string,
 *       focusContext: object,
 *       proposals: array,
 *       recommendation: string
 *     },
 *     error?: string
 *   }
 * }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withMiddleware(request, async () => {
    try {
      const { jobId } = params;

      if (!jobId) {
        throw new NotFoundError('Job ID is required');
      }

      // Get job status from workflow queue
      const jobStatus = await workflowQueue.getJobStatus(jobId);

      // Set appropriate cache headers
      const headers: HeadersInit = {};
      if (jobStatus.status === 'COMPLETED' || jobStatus.status === 'FAILED') {
        headers['Cache-Control'] = 'public, max-age=3600'; // Cache completed/failed for 1 hour
      } else {
        headers['Cache-Control'] = 'no-cache'; // Don't cache pending/processing
      }

      return NextResponse.json(
        createApiResponse({
          jobId,
          status: jobStatus.status,
          progress: jobStatus.progress,
          result: jobStatus.result,
          error: jobStatus.error
        }),
        {
          status: HTTP_STATUS.OK,
          headers
        }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
