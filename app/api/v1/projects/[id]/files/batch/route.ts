import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/api/errors';
import { scriptFileService } from '@/lib/db/services/script-file.service';
import { projectService } from '@/lib/db/services/project.service';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';
import { sanitizeInput, sanitizeScriptContent, validateRequestSize } from '@/lib/api/sanitization';

// Validation schemas
const fileSchema = z.object({
  filename: z.string().min(1).max(200),
  rawContent: z.string().min(1),
  episodeNumber: z.number().int().positive().optional()
});

const batchCreateSchema = z.object({
  files: z.array(fileSchema).min(1).max(50) // Max 50 files per batch
});

/**
 * POST /api/v1/projects/[id]/files/batch
 *
 * Upload multiple script files to a project in a single transaction
 *
 * Request body:
 * {
 *   files: [
 *     {
 *       filename: string;
 *       rawContent: string;
 *       episodeNumber?: number;
 *     },
 *     ...
 *   ]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     success: boolean;
 *     count: number;           // Number of files successfully created
 *     errors?: [               // Only present if some files failed
 *       {
 *         filename: string;
 *         error: string;
 *       },
 *       ...
 *     ]
 *   }
 * }
 *
 * Notes:
 * - All files are processed in a transaction
 * - Duplicate filenames will be reported in errors array
 * - Invalid files will be skipped, others will still be created
 * - Maximum 50 files per batch to prevent timeout
 */
export async function POST(
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

      // Parse and validate request body
      const body = await request.json();

      // Validate request size (10MB limit)
      if (!validateRequestSize(JSON.stringify(body))) {
        throw new ValidationError('Request size exceeds maximum allowed size of 10MB');
      }

      // Sanitize input
      const sanitizedBody = sanitizeInput(body);

      // Validate schema
      const validatedData = batchCreateSchema.parse(sanitizedBody);

      // Sanitize all file contents
      const sanitizedFiles = validatedData.files.map(file => ({
        ...file,
        rawContent: sanitizeScriptContent(file.rawContent)
      }));

      // Prepare files for creation
      const filesToCreate = sanitizedFiles.map(file => ({
        projectId,
        filename: file.filename,
        rawContent: file.rawContent,
        episodeNumber: file.episodeNumber
      }));

      // Create files using batch operation
      const result = await scriptFileService.createFiles(filesToCreate);

      // Return appropriate status code
      // If all succeeded: 201 Created
      // If some succeeded: 201 Created (with errors array)
      // If all failed: 400 Bad Request
      const statusCode = result.count > 0
        ? HTTP_STATUS.CREATED
        : HTTP_STATUS.BAD_REQUEST;

      return NextResponse.json(
        createApiResponse({
          success: result.success,
          count: result.count,
          totalRequested: filesToCreate.length,
          ...(result.errors && { errors: result.errors })
        }),
        { status: statusCode }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
