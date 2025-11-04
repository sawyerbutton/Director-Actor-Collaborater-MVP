import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { handleApiError, NotFoundError } from '@/lib/api/errors';
import { scriptFileService } from '@/lib/db/services/script-file.service';
import { projectService } from '@/lib/db/services/project.service';
import { HTTP_STATUS } from '@/lib/config/constants';

// Query schema
const querySchema = z.object({
  includeProject: z.coerce.boolean().default(false),
  includeContent: z.coerce.boolean().default(true) // Whether to include rawContent/jsonContent
});

/**
 * GET /api/v1/projects/[id]/files/[fileId]
 *
 * Get a single script file by ID
 *
 * Query parameters:
 * - includeProject: boolean (include project data, default: false)
 * - includeContent: boolean (include rawContent/jsonContent, default: true)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: string;
 *     projectId: string;
 *     filename: string;
 *     episodeNumber: number | null;
 *     rawContent?: string;      // Only if includeContent=true
 *     jsonContent?: object;     // Only if includeContent=true
 *     fileSize: number;
 *     contentHash: string;
 *     conversionStatus: string;
 *     conversionError: string | null;
 *     createdAt: string;
 *     updatedAt: string;
 *     project?: {               // Only if includeProject=true
 *       id: string;
 *       title: string;
 *       description: string | null;
 *     }
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  return withMiddleware(request, async () => {
    try {
      const { id: projectId, fileId } = params;

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams;
      const query = querySchema.parse({
        includeProject: searchParams.get('includeProject'),
        includeContent: searchParams.get('includeContent')
      });

      // Verify project exists
      const project = await projectService.findById(projectId);
      if (!project) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      // Fetch file
      const file = await scriptFileService.getFileById(fileId, query.includeProject);

      if (!file) {
        throw new NotFoundError(`File with ID ${fileId} not found`);
      }

      // Verify file belongs to project
      if (file.projectId !== projectId) {
        throw new NotFoundError(`File with ID ${fileId} does not belong to project ${projectId}`);
      }

      // Format response
      const response: any = {
        id: file.id,
        projectId: file.projectId,
        filename: file.filename,
        episodeNumber: file.episodeNumber,
        fileSize: file.fileSize,
        contentHash: file.contentHash,
        conversionStatus: file.conversionStatus,
        conversionError: file.conversionError,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString()
      };

      // Include content if requested
      if (query.includeContent) {
        response.rawContent = file.rawContent;
        response.jsonContent = file.jsonContent;
      }

      // Include project if requested
      if (query.includeProject && 'project' in file && file.project) {
        response.project = {
          id: file.project.id,
          title: file.project.title,
          description: file.project.description
        };
      }

      return NextResponse.json(
        createApiResponse(response),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}

/**
 * DELETE /api/v1/projects/[id]/files/[fileId]
 *
 * Delete a single script file
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     message: string;
 *     deletedFileId: string;
 *   }
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  return withMiddleware(request, async () => {
    try {
      const { id: projectId, fileId } = params;

      // Verify project exists
      const project = await projectService.findById(projectId);
      if (!project) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      // Verify file exists and belongs to project
      const file = await scriptFileService.getFileById(fileId);
      if (!file) {
        throw new NotFoundError(`File with ID ${fileId} not found`);
      }

      if (file.projectId !== projectId) {
        throw new NotFoundError(`File with ID ${fileId} does not belong to project ${projectId}`);
      }

      // Delete file
      await scriptFileService.deleteFile(fileId);

      return NextResponse.json(
        createApiResponse({
          message: `File "${file.filename}" deleted successfully`,
          deletedFileId: fileId
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
