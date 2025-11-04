/**
 * Batch Script Files Conversion API
 *
 * POST /api/conversion/batch
 *
 * Converts multiple script files for a project using Python FastAPI service
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { withMiddleware } from '@/lib/api/middleware';
import { pythonConverterClient } from '@/lib/services/python-converter-client';
import { scriptFileService } from '@/lib/db/services/script-file.service';
import { z } from 'zod';

// Request validation schema
const BatchConvertRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  fileIds: z.array(z.string()).min(1, 'At least one file ID is required'),
});

export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      const body = await request.json();

      // Validate request
      const validation = BatchConvertRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', validation.error.message),
          { status: 400 }
        );
      }

      const { projectId, fileIds } = validation.data;

      console.log(`[Batch Conversion] Starting batch conversion for project ${projectId}, ${fileIds.length} files`);

      // 1. Fetch all files from database
      const files = await scriptFileService.getFilesByProjectId(projectId);

      if (!files || files.length === 0) {
        return NextResponse.json(
          createErrorResponse('NOT_FOUND', `No files found for project ${projectId}`),
          { status: 404 }
        );
      }

      // Filter files by requested fileIds
      const filesToConvert = files.filter((f) => fileIds.includes(f.id));

      if (filesToConvert.length === 0) {
        return NextResponse.json(
          createErrorResponse('NOT_FOUND', 'No matching files found for the provided IDs'),
          { status: 404 }
        );
      }

      // 2. Update all files to 'processing' status
      await Promise.all(
        filesToConvert.map((file) =>
          scriptFileService.updateFile(file.id, {
            conversionStatus: 'processing',
            conversionError: null,
          })
        )
      );

      console.log(`[Batch Conversion] ${filesToConvert.length} files marked as 'processing'`);

      // 3. Prepare batch conversion request
      const conversionRequest = {
        project_id: projectId,
        files: filesToConvert.map((file) => ({
          file_id: file.id,
          raw_content: file.rawContent,
          filename: file.filename,
          episode_number: file.episodeNumber ?? undefined,
        })),
      };

      // 4. Call Python batch conversion service
      try {
        const batchResult = await pythonConverterClient.convertOutline(conversionRequest);

        console.log(
          `[Batch Conversion] Batch completed: ${batchResult.successful} successful, ${batchResult.failed} failed`
        );

        // 5. Update database with results
        const updatePromises = batchResult.results.map(async (result) => {
          if (result.success && result.json_content) {
            // Successful conversion
            return scriptFileService.updateFile(result.file_id, {
              jsonContent: result.json_content as Record<string, any>,
              conversionStatus: 'completed',
              conversionError: null,
            });
          } else {
            // Failed conversion
            const errorMessage = result.error?.message || 'Unknown error';
            return scriptFileService.updateFile(result.file_id, {
              conversionStatus: 'failed',
              conversionError: errorMessage,
            });
          }
        });

        await Promise.all(updatePromises);

        console.log(`[Batch Conversion] Database updates completed`);

        return NextResponse.json(
          createApiResponse({
            success: true,
            projectId,
            totalFiles: batchResult.total_files,
            successful: batchResult.successful,
            failed: batchResult.failed,
            totalProcessingTime: batchResult.total_processing_time_ms,
            results: batchResult.results.map((r) => ({
              fileId: r.file_id,
              success: r.success,
              error: r.error?.message,
              processingTime: r.processing_time_ms,
            })),
          }),
          { status: 200 }
        );
      } catch (conversionError) {
        // Batch conversion failed - mark all files as failed
        const errorMessage =
          conversionError instanceof Error
            ? conversionError.message
            : 'Unknown batch conversion error';

        console.error(`[Batch Conversion] Batch failed -`, errorMessage);

        await Promise.all(
          filesToConvert.map((file) =>
            scriptFileService.updateFile(file.id, {
              conversionStatus: 'failed',
              conversionError: errorMessage,
            })
          )
        );

        return NextResponse.json(
          createErrorResponse('CONVERSION_FAILED', errorMessage, {
            projectId,
            totalFiles: filesToConvert.length,
          }),
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('[Batch Conversion] Unexpected error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', errorMessage),
        { status: 500 }
      );
    }
  });
}
