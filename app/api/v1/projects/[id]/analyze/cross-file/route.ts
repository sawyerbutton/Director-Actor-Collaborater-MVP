import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from '@/lib/api/errors';
import { projectService, multiFileAnalysisService } from '@/lib/db/services';
import { HTTP_STATUS } from '@/lib/config/constants';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Request body schema
const CrossFileAnalysisSchema = z.object({
  config: z.object({
    checkTypes: z.array(z.enum(['cross_file_timeline', 'cross_file_character', 'cross_file_plot', 'cross_file_setting'])).optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    maxFindingsPerType: z.number().min(1).max(100).optional(),
    useAI: z.boolean().optional(),
  }).optional(),
});

/**
 * POST /api/v1/projects/[id]/analyze/cross-file
 * Run cross-file consistency analysis on a project
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

      // Parse and validate request body
      const body = await request.json().catch(() => ({}));
      const validation = CrossFileAnalysisSchema.safeParse(body);

      if (!validation.success) {
        throw new ValidationError(validation.error.message);
      }

      const { config } = validation.data;

      // Default config with AI enabled
      const analysisConfig = {
        ...config,
        useAI: config?.useAI !== false,  // Default to true (AI-powered analysis)
        minConfidence: config?.minConfidence || 0.5
      };

      console.log(`[API] Running cross-file analysis for project ${projectId} (useAI=${analysisConfig.useAI})`);

      // Run cross-file analysis
      const result = await multiFileAnalysisService.analyzeCrossFileIssues(
        projectId,
        analysisConfig
      );

      console.log(`[API] Cross-file analysis completed: ${result.findings.length} findings`);

      return NextResponse.json(
        createApiResponse({
          projectId,
          reportId: result.reportId,
          findingsCount: result.findings.length,
          findings: result.findings,
          message: `发现 ${result.findings.length} 个跨文件一致性问题`,
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
