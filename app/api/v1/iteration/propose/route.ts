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
import { createRulesAuditor } from '@/lib/agents/rules-auditor';
import { createPacingStrategist } from '@/lib/agents/pacing-strategist';
import { createThematicPolisher } from '@/lib/agents/thematic-polisher';
import { ActType } from '@prisma/client';
import { HTTP_STATUS } from '@/lib/config/constants';
import { sanitizeInput, validateRequestSize } from '@/lib/api/sanitization';
import { VersionManager } from '@/lib/synthesis/version-manager';

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

      // Get script context from latest version (for gradual iteration)
      let scriptContext = validatedData.scriptContext;
      if (!scriptContext) {
        // Fetch from latest version (NOT original V1)
        const versionManager = new VersionManager();
        const latestVersion = await versionManager.getLatestVersion(project.id);
        scriptContext = latestVersion?.content || project.content;

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

      // Execute act-specific agent logic
      let focusContext: any;
      let proposals: any[];
      let recommendation: string;

      switch (validatedData.act) {
        case 'ACT2_CHARACTER': {
          const agent = createCharacterArchitect();
          const focus = await agent.focusCharacter(
            validatedData.focusName,
            validatedData.contradiction,
            scriptContext
          );
          const proposalSet = await agent.proposeSolutions(focus);
          focusContext = focus;
          proposals = proposalSet.proposals;
          recommendation = proposalSet.recommendation;
          break;
        }

        case 'ACT3_WORLDBUILDING': {
          const agent = createRulesAuditor();
          // P7: Audit worldbuilding rules
          const auditResult = await agent.auditWorldRules(
            validatedData.focusName, // setting description
            scriptContext
          );
          // P8: Generate solutions if inconsistencies found
          let verificationResult;
          if (auditResult.inconsistencies.length > 0) {
            verificationResult = await agent.verifyDynamicConsistency(
              auditResult.inconsistencies
            );
          } else {
            verificationResult = {
              solutions: [],
              recommendation: '未发现设定矛盾'
            };
          }
          focusContext = auditResult;
          proposals = verificationResult.solutions;
          recommendation = verificationResult.recommendation;
          break;
        }

        case 'ACT4_PACING': {
          const agent = createPacingStrategist();
          // P10: Analyze pacing
          const analysisResult = await agent.analyzePacing(
            scriptContext,
            validatedData.focusName // time range
          );
          // P11: Generate restructure strategies if issues found
          let restructureResult;
          if (analysisResult.pacingIssues.length > 0) {
            restructureResult = await agent.restructureConflicts(
              analysisResult.pacingIssues
            );
          } else {
            restructureResult = {
              strategies: [],
              recommendedSequence: '未发现节奏问题',
              continuityChecks: []
            };
          }
          focusContext = analysisResult;
          proposals = restructureResult.strategies;
          recommendation = restructureResult.recommendedSequence;
          break;
        }

        case 'ACT5_THEME': {
          const agent = createThematicPolisher();
          // P12: Enhance character depth
          const enhanced = await agent.enhanceCharacterDepth(
            validatedData.focusName, // character name
            validatedData.contradiction, // theme
            scriptContext // style reference
          );
          // Use enhanced profile as proposals (single option workflow)
          focusContext = enhanced;
          proposals = [enhanced.characterProfile];
          recommendation = `建议采用增强后的角色设定以深化主题表达`;
          break;
        }

        default:
          throw new ValidationError(`Unsupported act type: ${validatedData.act}`);
      }

      // Store decision in database
      const decision = await revisionDecisionService.create({
        projectId: validatedData.projectId,
        act: validatedData.act as ActType,
        focusName: validatedData.focusName,
        focusContext: focusContext as any,
        proposals: proposals as any
      });

      // Return proposals to user
      return NextResponse.json(
        createApiResponse({
          decisionId: decision.id,
          focusContext,
          proposals,
          recommendation
        }),
        { status: HTTP_STATUS.OK }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
