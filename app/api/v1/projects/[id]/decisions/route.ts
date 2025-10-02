import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import {
  handleApiError,
  NotFoundError,
  ForbiddenError
} from '@/lib/api/errors';
import { projectService } from '@/lib/db/services/project.service';
import { revisionDecisionService } from '@/lib/db/services/revision-decision.service';
import { HTTP_STATUS } from '@/lib/config/constants';

/**
 * GET /api/v1/projects/:id/decisions
 * Get all revision decisions for a project
 *
 * Query parameters:
 * - act?: ActType (optional filter)
 *
 * Response:
 * {
 *   success: true
 *   data: {
 *     decisions: RevisionDecision[]
 *     statistics: {
 *       total: number
 *       executed: number
 *       pending: number
 *       byAct: Record<ActType, number>
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
      // Use demo user for now
      const userId = 'demo-user';

      const projectId = params.id;

      // Verify project exists and user has access
      const project = await projectService.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }
      if (project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this project');
      }

      // Get query parameters
      const searchParams = request.nextUrl.searchParams;
      const actFilter = searchParams.get('act');

      // Get decisions
      let decisions;
      if (actFilter) {
        // Validate act type
        const validActs = ['ACT2_CHARACTER', 'ACT3_WORLDBUILDING', 'ACT4_PACING', 'ACT5_THEME'];
        if (!validActs.includes(actFilter)) {
          throw new Error('Invalid act type');
        }
        decisions = await revisionDecisionService.getByProjectAndAct(
          projectId,
          actFilter as any
        );
      } else {
        decisions = await revisionDecisionService.getParsedDecisions(projectId);
      }

      // Get statistics
      const statistics = await revisionDecisionService.getStatistics(projectId);

      return NextResponse.json(
        createApiResponse({
          decisions,
          statistics
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
