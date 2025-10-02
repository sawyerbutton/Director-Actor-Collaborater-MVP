/**
 * Epic 007: Synthesis Job Status Endpoint
 * GET /api/v1/synthesize/:jobId/status - Poll synthesis job status
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';

const prisma = new PrismaClient();

async function handleGetStatus(
  request: NextRequest,
  context: { params: { jobId: string } }
) {
  try {
    const { jobId } = context.params;

    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId },
      include: {
        project: {
          include: {
            scriptVersions: {
              orderBy: { version: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json(
        createErrorResponse('JOB_NOT_FOUND', 'Job not found'),
        { status: 404 }
      );
    }

    if (job.type !== 'SYNTHESIS') {
      return NextResponse.json(
        createErrorResponse('INVALID_JOB_TYPE', 'Invalid job type'),
        { status: 400 }
      );
    }

    // Return job status
    const response: any = {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    };

    if (job.status === 'COMPLETED' && job.result) {
      // Include synthesized version info
      const latestVersion = job.project.scriptVersions[0];
      response.versionId = latestVersion?.id;
      response.version = latestVersion?.version;
    }

    if (job.status === 'FAILED' && job.error) {
      response.error = job.error;
    }

    return NextResponse.json(createApiResponse(response));
  } catch (error) {
    console.error('[Synthesis Status API] Error:', error);
    return NextResponse.json(
      createErrorResponse('STATUS_FETCH_FAILED', 'Failed to fetch job status'),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: { jobId: string } }) {
  return withMiddleware(request, () => handleGetStatus(request, context));
}
