import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { handleApiError, ValidationError, UnauthorizedError } from '@/lib/api/errors';
import { projectService } from '@/lib/db/services/project.service';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';
import { sanitizeInput, sanitizeScriptContent, validateRequestSize, RequestSizeError } from '@/lib/api/sanitization';

// Validation schemas
const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  content: z.string().min(1).optional(), // Optional for MULTI_FILE projects
  projectType: z.enum(['SINGLE', 'MULTI_FILE']).default('SINGLE')
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectType: z.enum(['SINGLE', 'MULTI_FILE', 'ALL']).default('ALL') // Filter by project type
});


// POST /api/v1/projects - Create new project
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // Use demo user for now
      const userId = 'demo-user';

      // Parse and validate request body
      const body = await request.json();
      
      // Validate request size (10MB limit)
      if (!validateRequestSize(JSON.stringify(body))) {
        throw new ValidationError('Request size exceeds maximum allowed size of 10MB');
      }
      
      // Sanitize input to prevent XSS
      const sanitizedBody = sanitizeInput(body);
      
      // Validate schema
      const validatedData = createProjectSchema.parse(sanitizedBody);

      // Validation: SINGLE projects must have content
      if (validatedData.projectType === 'SINGLE' && !validatedData.content) {
        throw new ValidationError('Content is required for SINGLE projects');
      }

      // Additional sanitization for script content
      if (validatedData.content) {
        validatedData.content = sanitizeScriptContent(validatedData.content);
      }

      // Create project
      const project = await projectService.create({
        ...validatedData,
        content: validatedData.content || '', // Default to empty string for MULTI_FILE
        userId
      });

      // Return success response
      return NextResponse.json(
        createApiResponse({
          id: project.id,
          title: project.title,
          description: project.description,
          projectType: project.projectType,
          status: project.status,
          workflowStatus: project.workflowStatus,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString()
        }),
        { status: HTTP_STATUS.CREATED }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}

// GET /api/v1/projects - Get user's projects
export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // Use demo user for now
      const userId = 'demo-user';

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams;
      const query = querySchema.parse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        projectType: searchParams.get('projectType')
      });

      // Calculate pagination
      const offset = (query.page - 1) * query.limit;

      // Build filter
      const where: any = {};
      if (query.projectType !== 'ALL') {
        where.projectType = query.projectType;
      }

      // Fetch projects
      const projects = await projectService.findByUser(userId, {
        limit: query.limit,
        offset,
        where
      });

      // Count total projects for pagination
      const totalProjects = await projectService.countByUser(userId);
      const totalPages = Math.ceil(totalProjects / query.limit);

      // Format response
      const formattedProjects = projects.map(project => ({
        id: project.id,
        title: project.title,
        description: project.description,
        projectType: project.projectType,
        status: project.status,
        workflowStatus: project.workflowStatus,
        analysisCount: project._count?.analyses || 0,
        fileCount: project._count?.scriptFiles || 0, // For MULTI_FILE projects
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString()
      }));

      return NextResponse.json(
        createApiResponse({
          items: formattedProjects,
          pagination: {
            page: query.page,
            limit: query.limit,
            total: totalProjects,
            totalPages,
            hasNext: query.page < totalPages,
            hasPrevious: query.page > 1
          }
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}