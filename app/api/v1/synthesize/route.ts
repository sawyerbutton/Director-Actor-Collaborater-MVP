/**
 * Epic 007: Synthesis API Endpoint
 * POST /api/v1/synthesize - Trigger script synthesis
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';

const prisma = new PrismaClient();

// Request schema validation
const synthesizeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  options: z.object({
    preserveOriginalStyle: z.boolean().optional().default(true),
    conflictResolution: z.enum(['auto', 'manual']).optional().default('auto'),
    changeIntegrationMode: z.enum(['conservative', 'balanced', 'aggressive']).optional().default('balanced'),
    includeChangeLog: z.boolean().optional().default(true),
    validateCoherence: z.boolean().optional().default(true)
  }).optional()
});

async function handleSynthesize(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = synthesizeSchema.parse(body);
    const { projectId, options } = validatedData;

    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        revisionDecisions: true,
        scriptVersions: {
          orderBy: { version: 'asc' },
          take: 1 // Get V1 (original)
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        createErrorResponse('PROJECT_NOT_FOUND', 'Project not found'),
        { status: 404 }
      );
    }

    // Check if there are decisions to synthesize
    if (project.revisionDecisions.length === 0) {
      return NextResponse.json(
        createErrorResponse('NO_DECISIONS', 'No revision decisions found. Complete Acts 2-5 first.'),
        { status: 400 }
      );
    }

    // Check workflow status
    if (project.workflowStatus !== 'ITERATING') {
      return NextResponse.json(
        createErrorResponse('INVALID_STATUS', `Invalid workflow status: ${project.workflowStatus}. Expected ITERATING.`),
        { status: 400 }
      );
    }

    // Create synthesis job
    const job = await prisma.analysisJob.create({
      data: {
        projectId,
        type: 'SYNTHESIS',
        status: 'QUEUED',
        metadata: {
          options: options || {}
        }
      }
    });

    // Update project workflow status
    await prisma.project.update({
      where: { id: projectId },
      data: { workflowStatus: 'SYNTHESIZING' }
    });

    return NextResponse.json(createApiResponse({
      jobId: job.id,
      status: job.status,
      message: 'Synthesis job queued successfully'
    }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid request data', error.issues),
        { status: 400 }
      );
    }

    console.error('[Synthesize API] Error:', error);
    return NextResponse.json(
      createErrorResponse('SYNTHESIS_FAILED', 'Failed to queue synthesis job'),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return withMiddleware(request, () => handleSynthesize(request));
}
