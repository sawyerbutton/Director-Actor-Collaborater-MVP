import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, ValidationError, UnauthorizedError, NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { analysisService } from '@/lib/db/services/analysis.service';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';
import { sanitizeInput } from '@/lib/api/sanitization';
import { authenticateRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';

// Validation schemas
const updateAnalysisSchema = z.object({
  action: z.enum(['accept', 'reject']),
  suggestionIds: z.array(z.string()).optional(),
  suggestions: z.array(z.object({
    id: z.string(),
    accepted: z.boolean()
  })).optional()
});


interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/v1/analyze/[id] - Get analysis status and results
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withMiddleware(request, async () => {
    try {
      // Authenticate user
      const user = await authenticateRequest(request);
      const userId = user.id;

      // Get analysis ID from params
      const analysisId = params.id;
      if (!analysisId) {
        throw new ValidationError('Analysis ID is required');
      }

      // Fetch analysis with project details
      const analysis = await analysisService.findById(analysisId, true);
      if (!analysis) {
        throw new NotFoundError('Analysis');
      }

      // Fetch the project to verify ownership
      const project = await prisma.project.findUnique({
        where: { id: analysis.projectId }
      });
      
      if (!project || project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this analysis');
      }

      // Format response based on analysis status
      const response: any = {
        id: analysis.id,
        projectId: analysis.projectId,
        status: analysis.status,
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString()
      };

      // Add timestamps if available
      if (analysis.startedAt) {
        response.startedAt = analysis.startedAt.toISOString();
      }
      if (analysis.completedAt) {
        response.completedAt = analysis.completedAt.toISOString();
      }

      // Add result data based on status
      if (analysis.status === 'completed' && analysis.result) {
        response.result = analysis.result;
        if (analysis.suggestions) {
          response.suggestions = analysis.suggestions;
        }
      } else if (analysis.status === 'failed' && analysis.errors) {
        response.errors = analysis.errors;
      }

      // Add cache headers for completed/failed analyses
      const headers: HeadersInit = {};
      if (analysis.status === 'completed' || analysis.status === 'failed') {
        headers['Cache-Control'] = 'public, max-age=3600'; // Cache for 1 hour
      } else {
        headers['Cache-Control'] = 'no-cache'; // Don't cache pending/processing
      }

      return NextResponse.json(
        createApiResponse(response),
        { 
          status: HTTP_STATUS.OK,
          headers
        }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}

// PATCH /api/v1/analyze/[id] - Update analysis (accept/reject suggestions)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withMiddleware(request, async () => {
    try {
      // Authenticate user
      const user = await authenticateRequest(request);
      const userId = user.id;

      // Get analysis ID from params
      const analysisId = params.id;
      if (!analysisId) {
        throw new ValidationError('Analysis ID is required');
      }

      // Parse and validate request body
      const body = await request.json();
      
      // Sanitize input to prevent XSS
      const sanitizedBody = sanitizeInput(body);
      const validatedData = updateAnalysisSchema.parse(sanitizedBody);

      // Fetch analysis with project details
      const analysis = await analysisService.findById(analysisId, true);
      if (!analysis) {
        throw new NotFoundError('Analysis');
      }

      // Fetch the project to verify ownership
      const project = await prisma.project.findUnique({
        where: { id: analysis.projectId }
      });
      
      if (!project || project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this analysis');
      }

      // Verify analysis is completed
      if (analysis.status !== 'completed') {
        throw new ValidationError('Analysis must be completed before updating suggestions');
      }

      // Process suggestion updates
      let updatedSuggestions = analysis.suggestions;
      if (validatedData.suggestions && Array.isArray(updatedSuggestions)) {
        // Create a map of suggestion updates
        const updateMap = new Map(
          validatedData.suggestions.map(s => [s.id, s.accepted])
        );

        // Update suggestions with acceptance status
        updatedSuggestions = (updatedSuggestions as any[]).map(suggestion => {
          if (updateMap.has(suggestion.id)) {
            return {
              ...suggestion,
              accepted: updateMap.get(suggestion.id),
              updatedAt: new Date().toISOString()
            };
          }
          return suggestion;
        });
      }

      // Update analysis record
      const updatedAnalysis = await analysisService.update(analysisId, {
        suggestions: updatedSuggestions
      });

      return NextResponse.json(
        createApiResponse({
          id: updatedAnalysis.id,
          projectId: updatedAnalysis.projectId,
          status: updatedAnalysis.status,
          suggestions: updatedAnalysis.suggestions,
          updatedAt: updatedAnalysis.updatedAt.toISOString()
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}