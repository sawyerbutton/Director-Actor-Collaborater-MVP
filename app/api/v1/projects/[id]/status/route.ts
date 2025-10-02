import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { projectService, analysisJobService } from '@/lib/db/services';
import { HTTP_STATUS } from '@/lib/config/constants';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/v1/projects/[id]/status - Get project workflow status
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withMiddleware(request, async () => {
    try {
      // Use demo user for now
      const userId = 'demo-user';

      const projectId = params.id;
      if (!projectId) {
        throw new NotFoundError('Project ID is required');
      }

      // Get project with workflow data
      const project = await projectService.findWithWorkflowData(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }
      if (project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this project');
      }

      // Get job statistics
      const jobStats = await analysisJobService.getStatistics(projectId);

      // Get latest analysis job
      const latestJob = project.analysisJobs?.[0];

      return NextResponse.json(
        createApiResponse({
          projectId,
          workflowStatus: project.workflowStatus,
          scriptVersions: project.scriptVersions?.length || 0,
          diagnosticReport: project.diagnosticReport ? {
            id: project.diagnosticReport.id,
            createdAt: project.diagnosticReport.createdAt.toISOString()
          } : null,
          latestJob: latestJob ? {
            id: latestJob.id,
            type: latestJob.type,
            status: latestJob.status,
            createdAt: latestJob.createdAt.toISOString()
          } : null,
          statistics: jobStats,
          updatedAt: project.updatedAt.toISOString()
        }),
        {
          status: HTTP_STATUS.OK,
          headers: {
            'Cache-Control': 'no-cache' // Always get fresh status
          }
        }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}