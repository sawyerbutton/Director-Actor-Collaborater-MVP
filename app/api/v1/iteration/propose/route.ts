import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import {
  handleApiError,
  ValidationError,
  NotFoundError,
  ForbiddenError
} from '@/lib/api/errors';
import { projectService } from '@/lib/db/services/project.service';
import { analysisJobService } from '@/lib/db/services/analysis-job.service';
import { ActType, JobType } from '@prisma/client';
import { HTTP_STATUS } from '@/lib/config/constants';
import { sanitizeInput, validateRequestSize } from '@/lib/api/sanitization';

// Validation schema
const proposeRequestSchema = z.object({
  projectId: z.string().min(1),
  act: z.enum(['ACT2_CHARACTER', 'ACT3_WORLDBUILDING', 'ACT4_PACING', 'ACT5_THEME']),
  focusName: z.string().min(1),
  contradiction: z.string().min(1),
  scriptContext: z.string().optional()
});

/**
 * POST /api/v1/iteration/propose
 * Create an async job to generate AI proposals for iteration
 *
 * ⚡ ASYNC MODE (Serverless Compatible):
 * - Creates background job instead of executing immediately
 * - Returns jobId for polling
 * - Suitable for Hobby Plan (no 10s timeout limit)
 *
 * Request body:
 * {
 *   projectId: string
 *   act: ActType
 *   focusName: string (e.g., character name)
 *   contradiction: string (description of the issue)
 *   scriptContext?: string (optional, will fetch from project if not provided)
 * }
 *
 * Response:
 * {
 *   success: true
 *   data: {
 *     jobId: string
 *     message: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // Use demo user for now
      const userId = 'demo-user';

      // Parse and validate request body
      const body = await request.json();

      // Validate request size (10MB limit)
      if (!validateRequestSize(JSON.stringify(body))) {
        throw new ValidationError(
          'Request size exceeds maximum allowed size of 10MB'
        );
      }

      // Sanitize input
      const sanitizedBody = sanitizeInput(body);
      const validatedData = proposeRequestSchema.parse(sanitizedBody);

      // Verify project exists and user has access
      const project = await projectService.findById(validatedData.projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }
      if (project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this project');
      }

      console.log('[Iteration Propose] Creating async job:', {
        projectId: validatedData.projectId,
        act: validatedData.act,
        focusName: validatedData.focusName
      });

      // Create async job for background processing
      const job = await analysisJobService.create({
        projectId: validatedData.projectId,
        type: JobType.ITERATION,
        metadata: {
          act: validatedData.act,
          focusName: validatedData.focusName,
          contradiction: validatedData.contradiction,
          scriptContext: validatedData.scriptContext,
          userId
        }
      });

      console.log('[Iteration Propose] Job created:', {
        jobId: job.id,
        type: job.type,
        status: job.status
      });

      // Return jobId immediately (< 1 second)
      return NextResponse.json(
        createApiResponse({
          jobId: job.id,
          message: 'AI分析任务已创建，请轮询状态获取结果',
          estimatedTime: '30-60秒'
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
