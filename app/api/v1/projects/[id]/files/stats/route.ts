import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, NotFoundError } from '@/lib/api/errors';
import { scriptFileService } from '@/lib/db/services/script-file.service';
import { projectService } from '@/lib/db/services/project.service';
import { HTTP_STATUS } from '@/lib/config/constants';

/**
 * GET /api/v1/projects/[id]/files/stats
 *
 * Get statistics for all script files in a project
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     totalFiles: number;
 *     totalSize: number;          // Total size in bytes
 *     convertedFiles: number;     // Files with status 'completed'
 *     pendingFiles: number;       // Files with status 'pending'
 *     failedFiles: number;        // Files with status 'failed'
 *     episodeRange: {
 *       min: number | null;       // Minimum episode number
 *       max: number | null;       // Maximum episode number
 *     }
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMiddleware(request, async () => {
    try {
      const projectId = params.id;

      // Verify project exists
      const project = await projectService.findById(projectId);
      if (!project) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      // Get statistics
      const stats = await scriptFileService.getProjectFilesStats(projectId);

      return NextResponse.json(
        createApiResponse(stats),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
