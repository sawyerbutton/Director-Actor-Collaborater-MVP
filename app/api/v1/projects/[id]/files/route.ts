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
const createFileSchema = z.object({
  filename: z.string().min(1).max(200),
  rawContent: z.string().min(1),
  episodeNumber: z.number().int().positive().optional()
});

const querySchema = z.object({
  orderBy: z.enum(['episodeNumber', 'createdAt', 'filename']).default('episodeNumber'),
  order: z.enum(['asc', 'desc']).default('asc'),
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  includeProject: z.coerce.boolean().default(false)
});

/**
 * POST /api/v1/projects/[id]/files
 *
 * Upload a single script file to a project
 *
 * Request body:
 * {
 *   filename: string;      // Original filename (e.g., "第1集.md")
 *   rawContent: string;    // Script text content
 *   episodeNumber?: number; // Optional, will be auto-extracted if not provided
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: string;
 *     projectId: string;
 *     filename: string;
 *     episodeNumber: number | null;
 *     fileSize: number;
 *     contentHash: string;
 *     conversionStatus: string;
 *     createdAt: string;
 *     updatedAt: string;
 *   }
 * }
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
      const validatedData = createFileSchema.parse(sanitizedBody);

      // Sanitize script content
      if (validatedData.rawContent) {
        validatedData.rawContent = sanitizeScriptContent(validatedData.rawContent);
      }

      // Check for duplicate filename
      const existingFile = await scriptFileService.getFileByProjectAndFilename(
        projectId,
        validatedData.filename
      );

      if (existingFile) {
        throw new ValidationError(
          `File "${validatedData.filename}" already exists in this project`
        );
      }

      // Create file
      const file = await scriptFileService.createFile({
        projectId,
        filename: validatedData.filename,
        rawContent: validatedData.rawContent,
        episodeNumber: validatedData.episodeNumber
      });

      // Trigger background conversion (fire-and-forget)
      // This will convert the file asynchronously without blocking the response
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v1/convert/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id })
      }).catch(err => {
        console.error(`[FileUpload] Failed to trigger conversion for ${file.id}:`, err);
      });

      console.log(`[FileUpload] File ${file.id} created, conversion triggered in background`);

      // Format response
      return NextResponse.json(
        createApiResponse({
          id: file.id,
          projectId: file.projectId,
          filename: file.filename,
          episodeNumber: file.episodeNumber,
          fileSize: file.fileSize,
          contentHash: file.contentHash,
          conversionStatus: file.conversionStatus,
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
          message: '文件上传成功，正在后台转换为结构化格式'
        }),
        { status: HTTP_STATUS.CREATED }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}

/**
 * GET /api/v1/projects/[id]/files
 *
 * Get all script files for a project
 *
 * Query parameters:
 * - orderBy: 'episodeNumber' | 'createdAt' | 'filename' (default: 'episodeNumber')
 * - order: 'asc' | 'desc' (default: 'asc')
 * - skip: number (pagination offset)
 * - take: number (pagination limit, max 100)
 * - includeProject: boolean (include project data, default: false)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     items: ScriptFile[];
 *     count: number;
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

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams;
      const query = querySchema.parse({
        orderBy: searchParams.get('orderBy'),
        order: searchParams.get('order'),
        skip: searchParams.get('skip'),
        take: searchParams.get('take'),
        includeProject: searchParams.get('includeProject')
      });

      // Fetch files
      const files = await scriptFileService.getFilesByProjectId(projectId, {
        orderBy: query.orderBy,
        order: query.order,
        skip: query.skip,
        take: query.take,
        includeProject: query.includeProject
      });

      // Format response
      const formattedFiles = files.map((file: any) => ({
        id: file.id,
        projectId: file.projectId,
        filename: file.filename,
        episodeNumber: file.episodeNumber,
        fileSize: file.fileSize,
        contentHash: file.contentHash,
        conversionStatus: file.conversionStatus,
        conversionError: file.conversionError,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
        ...(query.includeProject && file.project && {
          project: {
            id: file.project.id,
            title: file.project.title,
            description: file.project.description
          }
        })
      }));

      return NextResponse.json(
        createApiResponse({
          items: formattedFiles,
          count: formattedFiles.length
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
