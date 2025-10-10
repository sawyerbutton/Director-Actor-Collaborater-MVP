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
import { VersionManager } from '@/lib/synthesis/version-manager';
import { applyChanges } from '@/lib/synthesis/change-applicator';

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
          // Store complete result object in database
          generatedChanges = {
            dramaticActions: showDontTellResult.dramaticActions,
            overallArc: showDontTellResult.overallArc,
            integrationNotes: showDontTellResult.integrationNotes
          };
          result = {
            selectedProposal,
            generatedChanges: generatedChanges
          };
          break;
        }

        case 'ACT3_WORLDBUILDING': {
          const agent = createRulesAuditor();
          const solution = selectedProposal as any;
          // P9: Align setting with theme (using selected solution)
          const alignmentResult = await agent.alignSettingWithTheme(
            solution.title, // setting aspect
            solution.adjustment || '' // theme alignment
          );
          generatedChanges = {
            alignmentStrategies: alignmentResult.alignmentStrategies,
            coreRecommendation: alignmentResult.coreRecommendation,
            integrationNotes: `应用选定的世界观修复方案: ${solution.title}`
          };
          result = {
            selectedProposal,
            generatedChanges: generatedChanges
          };
          break;
        }

        case 'ACT4_PACING': {
          // For pacing, the selected strategy IS the execution result
          // No additional AI call needed
          const strategy = selectedProposal as any;
          generatedChanges = {
            changes: strategy.changes || [],
            expectedImprovement: strategy.expectedImprovement || '',
            integrationNotes: `应用选定的节奏优化策略: ${strategy.title}`
          };
          result = {
            selectedProposal,
            generatedChanges: generatedChanges
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
          generatedChanges = {
            characterCore: coreDefinition.characterCore,
            integrationNotes: coreDefinition.integrationNotes
          };
          result = {
            selectedProposal: enhancedProfile,
            generatedChanges: generatedChanges
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

      // ===== NEW: Gradual Version Update (方案A) =====
      // 1. Get current latest version
      const versionManager = new VersionManager();
      const currentVersion = await versionManager.getLatestVersion(project.id);
      const currentScript = currentVersion?.content || project.content;

      // 2. Apply changes to script
      let newScript: string;
      try {
        newScript = await applyChanges({
          act: decision.act,
          generatedChanges: generatedChanges,
          currentScript: currentScript,
          focusContext: decision.focusContext
        });
      } catch (applyError) {
        console.error('[Execute API] Failed to apply changes:', applyError);
        // If apply fails, use original script (graceful degradation)
        newScript = currentScript;
      }

      // 3. Create new version
      const changeEntry = {
        id: `change_${decision.id}`,
        decisionId: decision.id,
        act: decision.act,
        focusName: decision.focusName,
        changeType: 'modification' as const,
        originalText: currentScript.substring(0, 100), // First 100 chars as sample
        modifiedText: newScript.substring(0, 100), // First 100 chars as sample
        location: {
          scene: 0,
          line: 0
        },
        rationale: `Applied ${decision.act} decision: ${decision.focusName}`,
        appliedAt: new Date()
      };

      const newVersion = await versionManager.createVersion(project.id, newScript, {
        synthesisLog: [changeEntry],
        decisionsApplied: [decision.id],
        confidence: 0.9, // Single decision has high confidence
        timestamp: new Date(),
        previousVersion: currentVersion?.version || 0
      });

      // 4. Update Project.content to latest version
      await projectService.updateContent(project.id, newScript);

      // 5. Update RevisionDecision.version field
      await revisionDecisionService.updateVersion(decision.id, newVersion.version);

      console.log(`[Execute API] Created version ${newVersion.version} for decision ${decision.id}`);
      // ===== END: Gradual Version Update =====

      // Update project workflow status to ITERATING (if first decision)
      if (project.workflowStatus === 'ACT1_COMPLETE') {
        await projectService.updateWorkflowStatus(project.id, 'ITERATING');
      }

      // Return execution result to user (with new version info)
      return NextResponse.json(
        createApiResponse({
          decisionId: updatedDecision.id,
          versionId: newVersion.id, // NEW: Return version ID
          version: newVersion.version, // NEW: Return version number
          ...result
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
