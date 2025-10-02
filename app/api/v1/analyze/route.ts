import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, ValidationError, NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { projectService } from '@/lib/db/services/project.service';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';
import { sanitizeInput, sanitizeScriptContent, validateRequestSize } from '@/lib/api/sanitization';
import { workflowQueue } from '@/lib/api/workflow-queue';

// Validation schema
const analyzeRequestSchema = z.object({
  projectId: z.string().min(1),
  scriptContent: z.string().min(1).optional() // Optional, can use project content
});

// POST /api/v1/analyze - Submit Act 1 analysis request
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
      const validatedData = analyzeRequestSchema.parse(sanitizedBody);

      // Verify project exists and user has access
      const project = await projectService.findById(validatedData.projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }
      if (project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this project');
      }

      // Get script content (from request or project)
      let scriptContent = validatedData.scriptContent || project.content;
      if (!scriptContent) {
        throw new ValidationError('Script content is required');
      }

      // Sanitize script content
      scriptContent = sanitizeScriptContent(scriptContent);

      // Submit Act 1 analysis job to workflow queue
      const jobId = await workflowQueue.submitAct1Analysis(
        validatedData.projectId,
        scriptContent
      );

      // Return 202 Accepted with job ID
      return NextResponse.json(
        createApiResponse({
          jobId,
          projectId: validatedData.projectId,
          status: 'processing',
          message: 'Act 1 analysis started successfully'
        }),
        { status: HTTP_STATUS.ACCEPTED }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}