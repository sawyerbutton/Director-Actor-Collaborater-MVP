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
import { createRulesAuditor } from '@/lib/agents/rules-auditor';
import { createPacingStrategist } from '@/lib/agents/pacing-strategist';
import { createThematicPolisher } from '@/lib/agents/thematic-polisher';
import { HTTP_STATUS } from '@/lib/config/constants';
import { sanitizeInput, validateRequestSize } from '@/lib/api/sanitization';

// Validation schema
const executeRequestSchema = z.object({
  decisionId: z.string().min(1),
  proposalChoice: z.number().int().min(0) // Allow any non-negative index
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
      if (!decision.parsedProposals || decision.parsedProposals.length === 0) {
        throw new ValidationError('Decision does not have valid proposals');
      }

      // Get selected proposal
      const selectedProposal = decision.parsedProposals[validatedData.proposalChoice];
      if (!selectedProposal) {
        throw new ValidationError('Invalid proposal choice');
      }

      // Execute act-specific execution logic
      let generatedChanges: any;
      let result: any;

      switch (decision.act) {
        case 'ACT2_CHARACTER': {
          const agent = createCharacterArchitect();
          const focusContext = decision.focusContext as any;
          const showDontTellResult = await agent.executeShowDontTell(
            selectedProposal as any,
            focusContext
          );
          generatedChanges = showDontTellResult.dramaticActions;
          result = {
            selectedProposal,
            dramaticActions: showDontTellResult.dramaticActions,
            overallArc: showDontTellResult.overallArc,
            integrationNotes: showDontTellResult.integrationNotes
          };
          break;
        }

        case 'ACT3_WORLDBUILDING': {
          const agent = createRulesAuditor();
          const auditResult = decision.focusContext as any;
          const solution = selectedProposal as any;
          // P9: Align setting with theme (using selected solution)
          const alignmentResult = await agent.alignSettingWithTheme(
            solution.title, // setting aspect
            solution.adjustment || '' // theme alignment
          );
          generatedChanges = alignmentResult.alignmentStrategies;
          result = {
            selectedProposal,
            alignmentStrategies: alignmentResult.alignmentStrategies,
            coreRecommendation: alignmentResult.coreRecommendation,
            integrationNotes: `应用选定的世界观修复方案: ${solution.title}`
          };
          break;
        }

        case 'ACT4_PACING': {
          // For pacing, the selected strategy IS the execution result
          // No additional AI call needed
          const strategy = selectedProposal as any;
          generatedChanges = strategy.changes || [];
          result = {
            selectedProposal,
            changes: strategy.changes || [],
            expectedImprovement: strategy.expectedImprovement || '',
            integrationNotes: `应用选定的节奏优化策略: ${strategy.title}`
          };
          break;
        }

        case 'ACT5_THEME': {
          const agent = createThematicPolisher();
          const enhancedProfile = selectedProposal as any;
          // P13: Define character core based on enhanced profile
          const coreDefinition = await agent.defineCharacterCore(
            enhancedProfile.name || decision.focusName,
            enhancedProfile
          );
          generatedChanges = coreDefinition.characterCore;
          result = {
            selectedProposal: enhancedProfile,
            characterCore: coreDefinition.characterCore,
            integrationNotes: coreDefinition.integrationNotes
          };
          break;
        }

        default:
          throw new ValidationError(`Unsupported act type: ${decision.act}`);
      }

      // Update decision with user choice and generated changes
      const updatedDecision = await revisionDecisionService.execute(
        validatedData.decisionId,
        {
          userChoice: selectedProposal.id || `choice_${validatedData.proposalChoice}`,
          generatedChanges: generatedChanges as any
        }
      );

      // Return execution result to user
      return NextResponse.json(
        createApiResponse({
          decisionId: updatedDecision.id,
          ...result
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
