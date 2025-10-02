import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { projectService, diagnosticReportService } from '@/lib/db/services';
import { HTTP_STATUS } from '@/lib/config/constants';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/v1/projects/[id]/report - Get diagnostic report for project
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

      // Get diagnostic report
      const report = await diagnosticReportService.getParsedReport(projectId);

      if (!report) {
        return NextResponse.json(
          createApiResponse({
            projectId,
            message: 'No diagnostic report available. Please run Act 1 analysis first.',
            report: null
          }),
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      // Get statistics
      const statistics = await diagnosticReportService.getStatistics(projectId);

      // Transform statistics for frontend compatibility
      const summary = {
        totalErrors: statistics?.total || 0,
        highSeverity: statistics?.bySeverity?.critical || 0,
        mediumSeverity: statistics?.bySeverity?.warning || 0,
        lowSeverity: statistics?.bySeverity?.info || 0
      };

      return NextResponse.json(
        createApiResponse({
          projectId,
          report: {
            id: report.id,
            findings: report.parsedFindings,
            summary: summary,  // Use transformed summary instead of raw string
            confidence: report.confidence,
            statistics,
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString()
          }
        }),
        {
          status: HTTP_STATUS.OK,
          headers: {
            'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
          }
        }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}