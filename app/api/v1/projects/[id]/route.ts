import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, NotFoundError } from '@/lib/api/errors';
import { HTTP_STATUS } from '@/lib/config/constants';
import { projectService } from '@/lib/db/services/project.service';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/v1/projects/[id] - Get project details
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withMiddleware(request, async () => {
    try {
      const { id } = params;

      if (!id) {
        throw new NotFoundError('Project ID is required');
      }

      // Fetch project
      const project = await projectService.findById(id);

      if (!project) {
        console.log(`[API] Project not found: ${id}`);
        throw new NotFoundError('Project');
      }

      // Format response
      return NextResponse.json(
        createApiResponse({
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          workflowStatus: project.workflowStatus,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString()
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
