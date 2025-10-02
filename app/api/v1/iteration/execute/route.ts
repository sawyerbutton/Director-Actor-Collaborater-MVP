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
import { createCharacterArchitect } from '@/lib/agents/character-architect';
import { HTTP_STATUS } from '@/lib/config/constants';
import { sanitizeInput, validateRequestSize } from '@/lib/api/sanitization';

// Validation schema
const executeRequestSchema = z.object({
  decisionId: z.string().min(1),
  proposalChoice: z.number().int().min(0).max(1) // 0 or 1
});

/**
 * POST /api/v1/iteration/execute
 * Execute the selected proposal and generate dramatic actions
 *
 * Request body:
 * {
 *   decisionId: string
 *   proposalChoice: 0 | 1 (index of selected proposal)
 * }
 *
 * Response:
 * {
 *   success: true
 *   data: {
 *     decisionId: string
 *     selectedProposal: Proposal
 *     dramaticActions: DramaticAction[]
 *     overallArc: string
 *     integrationNotes: string
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

      // Validate request size
      if (!validateRequestSize(JSON.stringify(body))) {
        throw new ValidationError(
          'Request size exceeds maximum allowed size of 10MB'
        );
      }

      // Sanitize input
      const sanitizedBody = sanitizeInput(body);
      const validatedData = executeRequestSchema.parse(sanitizedBody);

      // Get decision with parsed data
      const decision = await revisionDecisionService.getById(
        validatedData.decisionId
      );

      if (!decision) {
        throw new NotFoundError('Decision');
      }

      // Verify user has access to the project
      const project = await projectService.findById(decision.projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }
      if (project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this project');
      }

      // Verify decision has proposals
      if (!decision.parsedProposals || decision.parsedProposals.length !== 2) {
        throw new ValidationError('Decision does not have valid proposals');
      }

      // Get selected proposal
      const selectedProposal = decision.parsedProposals[validatedData.proposalChoice];
      if (!selectedProposal) {
        throw new ValidationError('Invalid proposal choice');
      }

      // Initialize CharacterArchitect agent
      const agent = createCharacterArchitect();

      // Execute P6 (Show Don't Tell transformation)
      const focusContext = decision.focusContext as any;
      const showDontTellResult = await agent.executeShowDontTell(
        selectedProposal as any,
        focusContext
      );

      // Update decision with user choice and generated changes
      const updatedDecision = await revisionDecisionService.execute(
        validatedData.decisionId,
        {
          userChoice: selectedProposal.id,
          generatedChanges: showDontTellResult.dramaticActions as any
        }
      );

      // Return dramatic actions to user
      return NextResponse.json(
        createApiResponse({
          decisionId: updatedDecision.id,
          selectedProposal,
          dramaticActions: showDontTellResult.dramaticActions,
          overallArc: showDontTellResult.overallArc,
          integrationNotes: showDontTellResult.integrationNotes
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
