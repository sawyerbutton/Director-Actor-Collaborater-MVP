import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, ValidationError, UnauthorizedError, NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { projectService } from '@/lib/db/services/project.service';
import { analysisService } from '@/lib/db/services/analysis.service';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';
import { sanitizeInput, sanitizeScriptContent, validateRequestSize, RequestSizeError } from '@/lib/api/sanitization';
import { analysisQueue } from '@/lib/api/job-queue';
import { authenticateRequest } from '@/lib/auth/middleware';

// Validation schema
const analyzeRequestSchema = z.object({
  projectId: z.string().min(1),
  scriptContent: z.string().min(1).optional() // Optional, can use project content
});



// POST /api/v1/analyze - Submit analysis request
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // Authenticate user
      const user = await authenticateRequest(request);
      const userId = user.id;

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

      // Create analysis record with pending status
      const analysis = await analysisService.create({
        projectId: validatedData.projectId,
        status: 'pending'
      });

      // Add analysis job to queue for async processing
      const jobId = await analysisQueue.addJob(analysis.id, scriptContent);

      // Return 202 Accepted with analysis ID
      return NextResponse.json(
        createApiResponse({
          analysisId: analysis.id,
          status: 'processing',
          message: 'Analysis started successfully'
        }),
        { status: HTTP_STATUS.ACCEPTED }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}