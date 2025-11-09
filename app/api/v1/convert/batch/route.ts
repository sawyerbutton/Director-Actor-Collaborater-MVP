import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse } from '@/lib/api/response';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/api/errors';
import { scriptFileService } from '@/lib/db/services/script-file.service';
import { projectService } from '@/lib/db/services/project.service';
import { createScriptConverter } from '@/lib/conversion/script-converter';
import { HTTP_STATUS } from '@/lib/config/constants';

// Request body schema
const batchConvertSchema = z.object({
  projectId: z.string().min(1),
  forceReconvert: z.boolean().optional().default(false)
});

/**
 * POST /api/v1/convert/batch
 *
 * Batch convert all pending files in a project
 *
 * Request body:
 * {
 *   projectId: string;
 *   forceReconvert?: boolean;  // Reconvert even completed files
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     totalFiles: number;
 *     convertedFiles: number;
 *     failedFiles: number;
 *     results: Array<{
 *       fileId: string;
 *       filename: string;
 *       status: "completed" | "failed" | "skipped";
 *       error?: string;
 *     }>;
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validatedData = batchConvertSchema.parse(body);

      const { projectId, forceReconvert } = validatedData;

      console.log(`[API Batch Convert] Starting batch conversion for project ${projectId}`);

      // Verify project exists
      const project = await projectService.findById(projectId);
      if (!project) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      // Get all files in project
      const files = await scriptFileService.getFilesByProjectId(projectId);

      if (files.length === 0) {
        return NextResponse.json(
          createApiResponse({
            totalFiles: 0,
            convertedFiles: 0,
            failedFiles: 0,
            results: [],
            message: 'No files found in project'
          }),
          { status: HTTP_STATUS.OK }
        );
      }

      console.log(`[API Batch Convert] Found ${files.length} files`);

      // Filter files to convert
      const filesToConvert = forceReconvert
        ? files
        : files.filter(f => f.conversionStatus !== 'completed');

      console.log(`[API Batch Convert] Converting ${filesToConvert.length} files (force=${forceReconvert})`);

      if (filesToConvert.length === 0) {
        return NextResponse.json(
          createApiResponse({
            totalFiles: files.length,
            convertedFiles: 0,
            failedFiles: 0,
            results: [],
            message: 'All files already converted'
          }),
          { status: HTTP_STATUS.OK }
        );
      }

      // Create converter
      const converter = createScriptConverter();

      // Convert each file
      const results: Array<{
        fileId: string;
        filename: string;
        status: 'completed' | 'failed' | 'skipped';
        error?: string;
        scenesCount?: number;
      }> = [];

      let convertedCount = 0;
      let failedCount = 0;

      for (const file of filesToConvert) {
        try {
          console.log(`[API Batch Convert] Converting file ${file.id}: ${file.filename}`);

          // Update status to processing
          await scriptFileService.updateFile(file.id, {
            conversionStatus: 'processing',
            conversionError: null
          });

          // Perform conversion
          const result = await converter.convert(file.rawContent);

          if (result.success) {
            // Update database with JSON content
            await scriptFileService.updateFile(file.id, {
              jsonContent: result.jsonContent as any,
              conversionStatus: 'completed',
              conversionError: null
            });

            results.push({
              fileId: file.id,
              filename: file.filename,
              status: 'completed',
              scenesCount: result.jsonContent!.scenes.length
            });

            convertedCount++;
            console.log(`[API Batch Convert] ✓ ${file.filename} converted successfully`);
          } else {
            // Update database with error
            await scriptFileService.updateFile(file.id, {
              conversionStatus: 'failed',
              conversionError: result.error || 'Unknown error'
            });

            results.push({
              fileId: file.id,
              filename: file.filename,
              status: 'failed',
              error: result.error
            });

            failedCount++;
            console.error(`[API Batch Convert] ✗ ${file.filename} conversion failed:`, result.error);
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (fileError) {
          console.error(`[API Batch Convert] Error converting ${file.filename}:`, fileError);

          await scriptFileService.updateFile(file.id, {
            conversionStatus: 'failed',
            conversionError: fileError instanceof Error ? fileError.message : 'Unknown error'
          });

          results.push({
            fileId: file.id,
            filename: file.filename,
            status: 'failed',
            error: fileError instanceof Error ? fileError.message : 'Unknown error'
          });

          failedCount++;
        }
      }

      console.log(`[API Batch Convert] Batch conversion complete: ${convertedCount} succeeded, ${failedCount} failed`);

      return NextResponse.json(
        createApiResponse({
          totalFiles: files.length,
          convertedFiles: convertedCount,
          failedFiles: failedCount,
          results,
          message: `批量转换完成：${convertedCount} 个成功，${failedCount} 个失败`
        }),
        { status: HTTP_STATUS.OK }
      );

    } catch (error) {
      console.error('[API Batch Convert] Error:', error);
      return handleApiError(error);
    }
  });
}
