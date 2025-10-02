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
import { revisionDecisionService } from '@/lib/db/services/revision-decision.service';
import { diagnosticReportService } from '@/lib/db/services/diagnostic-report.service';
import { createCharacterArchitect } from '@/lib/agents/character-architect';
import { ActType } from '@prisma/client';
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
 * Generate AI proposals for a character contradiction or focus area
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
 *     decisionId: string
 *     focusContext: FocusContext
 *     proposals: Proposal[]
 *     recommendation: string
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

      // Get script context
      let scriptContext = validatedData.scriptContext;
      if (!scriptContext) {
        // Fetch from project content
        scriptContext = project.content;

        // For ACT2_CHARACTER, also fetch diagnostic report for character issues
        if (validatedData.act === 'ACT2_CHARACTER') {
          const report = await diagnosticReportService.getParsedReport(
            validatedData.projectId
          );
          if (report) {
            const characterFindings = report.parsedFindings.filter(
              f => f.type === 'character'
            );
            if (characterFindings.length > 0) {
              scriptContext += '\n\n## 相关诊断发现:\n' +
                characterFindings
                  .map(f => `- ${f.description}`)
                  .join('\n');
            }
          }
        }
      }

      if (!scriptContext) {
        throw new ValidationError('Script context is required');
      }

      // Initialize CharacterArchitect agent
      const agent = createCharacterArchitect();

      // Execute P4 + P5 (Focus and Proposal generation)
      const focusContext = await agent.focusCharacter(
        validatedData.focusName,
        validatedData.contradiction,
        scriptContext
      );

      const proposalSet = await agent.proposeSolutions(focusContext);

      // Store decision in database
      const decision = await revisionDecisionService.create({
        projectId: validatedData.projectId,
        act: validatedData.act as ActType,
        focusName: validatedData.focusName,
        focusContext: focusContext as any,
        proposals: proposalSet.proposals as any
      });

      // Return proposals to user
      return NextResponse.json(
        createApiResponse({
          decisionId: decision.id,
          focusContext,
          proposals: proposalSet.proposals,
          recommendation: proposalSet.recommendation
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
