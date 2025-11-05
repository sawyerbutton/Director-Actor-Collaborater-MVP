import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { projectService, multiFileAnalysisService } from '@/lib/db/services';
import { HTTP_STATUS } from '@/lib/config/constants';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/projects/[id]/cross-file-findings
 * Get cross-file consistency findings for a project
 *
 * Query parameters:
 * - grouped: boolean (optional) - Return findings grouped by type
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withMiddleware(request, async () => {
    try {
      // Use demo user for now
      const userId = 'demo-user';

      const projectId = params.id;
      if (!projectId) {
        throw new NotFoundError('Project ID is required');
      }

      // Verify project exists and user has access
      const project = await projectService.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }
      if (project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this project');
      }

      // Check if grouped results are requested
      const { searchParams } = new URL(request.url);
      const grouped = searchParams.get('grouped') === 'true';

      if (grouped) {
        // Get grouped findings
        const groupedFindings = await multiFileAnalysisService.getGroupedCrossFileFindings(projectId);

        const totalCount = Object.values(groupedFindings).reduce(
          (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
          0
        );

        return NextResponse.json(
          createApiResponse({
            projectId,
            grouped: true,
            findings: groupedFindings,
            totalCount,
          }),
          { status: HTTP_STATUS.OK }
        );
      } else {
        // Get all cross-file findings
        const findings = await multiFileAnalysisService.getCrossFileFindings(projectId);

        return NextResponse.json(
          createApiResponse({
            projectId,
            grouped: false,
            findings,
            totalCount: findings.length,
          }),
          { status: HTTP_STATUS.OK }
        );
      }
    } catch (error) {
      return handleApiError(error);
    }
  });
}
