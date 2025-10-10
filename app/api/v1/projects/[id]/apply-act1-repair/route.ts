import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { projectService } from '@/lib/db/services/project.service';
import { VersionManager } from '@/lib/synthesis/version-manager';
import { z } from 'zod';
import { ActType } from '@prisma/client';

// Validation schema
const applyRepairSchema = z.object({
  repairedScript: z.string().min(10, 'Repaired script is too short'),
  acceptedErrors: z.array(z.object({
    id: z.string(),
    type: z.string(),
    typeName: z.string(),
    severity: z.string(),
    line: z.number(),
    content: z.string(),
    description: z.string(),
    suggestion: z.string(),
    confidence: z.number()
  })),
  metadata: z.object({
    source: z.string().optional(),
    errorCount: z.number().optional(),
    timestamp: z.string().optional()
  }).optional()
});

/**
 * POST /api/v1/projects/[id]/apply-act1-repair
 *
 * Applies ACT1 AI repair to project:
 * 1. Creates ScriptVersion V1 (or next version)
 * 2. Updates Project.content with repaired script
 * 3. Allows user to continue to ACT2-5 iteration with repaired script
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withMiddleware(request, async () => {
    const projectId = params.id;

    // Validate request body
    const body = await request.json();
    const validationResult = applyRepairSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', validationResult.error.message),
        { status: 400 }
      );
    }

    const { repairedScript, acceptedErrors, metadata } = validationResult.data;

    // Verify project exists
    const project = await projectService.findById(projectId);
    if (!project) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Project not found'),
        { status: 404 }
      );
    }

    // Create VersionManager instance
    const versionManager = new VersionManager();

    // Build change log from accepted errors (simplified format for ACT1)
    const changeLog = acceptedErrors.map((error, idx) => ({
      id: `act1-repair-${idx}`,
      errorType: error.typeName,
      severity: error.severity,
      line: error.line,
      originalText: error.content,
      suggestedFix: error.suggestion,
      rationale: error.description,
      confidence: error.confidence
    }));

    // Create new script version (V1 or next version)
    const version = await versionManager.createVersion(
      projectId,
      repairedScript,
      {
        synthesisLog: [], // ACT1 doesn't use the full ChangeEntry structure
        decisionsApplied: ['ACT1_SMART_REPAIR'],
        confidence: acceptedErrors.length > 0
          ? acceptedErrors.reduce((sum, e) => sum + e.confidence, 0) / acceptedErrors.length
          : 0.9,
        timestamp: new Date(),
        previousVersion: 0 // ACT1 repair is the first version
      }
    );

    // Update Project.content with repaired script
    await projectService.updateContent(projectId, repairedScript);

    // Update workflow status to ITERATING (ready for ACT2-5)
    await projectService.updateWorkflowStatus(projectId, 'ITERATING' as any);

    return NextResponse.json(
      createApiResponse({
        versionId: version.id,
        version: version.version,
        projectId,
        message: 'ACT1 修复已成功保存到项目',
        details: {
          errorsApplied: acceptedErrors.length,
          scriptLength: repairedScript.length,
          confidence: version.confidence
        }
      }),
      { status: 200 }
    );
  });
}
