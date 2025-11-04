/**
 * Conversion Status Query API
 *
 * GET /api/conversion/status/[projectId]
 *
 * Returns conversion status for all files in a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { withMiddleware } from '@/lib/api/middleware';
import { scriptFileService } from '@/lib/db/services/script-file.service';

interface ConversionStatusResponse {
  projectId: string;
  totalFiles: number;
  completed: number;
  processing: number;
  pending: number;
  failed: number;
  progress: number; // 0-100
  status: 'idle' | 'processing' | 'completed' | 'failed' | 'partial';
  files: Array<{
    id: string;
    filename: string;
    episodeNumber: number | null;
    conversionStatus: string;
    conversionError: string | null;
    updatedAt: Date;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return withMiddleware(request, async () => {
    try {
      const { projectId } = params;

      console.log(`[Conversion Status] Querying status for project ${projectId}`);

      // Fetch all files for the project
      const files = await scriptFileService.getFilesByProjectId(projectId);

      if (!files || files.length === 0) {
        return NextResponse.json(
          createErrorResponse('NOT_FOUND', `No files found for project ${projectId}`),
          { status: 404 }
        );
      }

      // Calculate statistics
      const totalFiles = files.length;
      const completed = files.filter((f) => f.conversionStatus === 'completed').length;
      const processing = files.filter((f) => f.conversionStatus === 'processing').length;
      const pending = files.filter((f) => f.conversionStatus === 'pending').length;
      const failed = files.filter((f) => f.conversionStatus === 'failed').length;

      // Calculate overall progress (0-100)
      const progress = totalFiles > 0 ? Math.round((completed / totalFiles) * 100) : 0;

      // Determine overall status
      let status: 'idle' | 'processing' | 'completed' | 'failed' | 'partial';
      if (processing > 0) {
        status = 'processing';
      } else if (completed === totalFiles) {
        status = 'completed';
      } else if (failed === totalFiles) {
        status = 'failed';
      } else if (completed > 0 || failed > 0) {
        status = 'partial'; // Some completed, some failed/pending
      } else {
        status = 'idle'; // All pending
      }

      const response: ConversionStatusResponse = {
        projectId,
        totalFiles,
        completed,
        processing,
        pending,
        failed,
        progress,
        status,
        files: files.map((f) => ({
          id: f.id,
          filename: f.filename,
          episodeNumber: f.episodeNumber,
          conversionStatus: f.conversionStatus,
          conversionError: f.conversionError,
          updatedAt: f.updatedAt,
        })),
      };

      return NextResponse.json(
        createApiResponse(response),
        {
          status: 200,
          headers: {
            // Prevent caching for real-time status updates
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        }
      );
    } catch (error) {
      console.error('[Conversion Status] Error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', errorMessage),
        { status: 500 }
      );
    }
  });
}
