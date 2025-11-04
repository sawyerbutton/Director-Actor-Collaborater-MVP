/**
 * Single Script File Conversion API
 *
 * POST /api/conversion/convert
 *
 * Converts a single script file using Python FastAPI service and updates database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { withMiddleware } from '@/lib/api/middleware';
import { pythonConverterClient } from '@/lib/services/python-converter-client';
import { scriptFileService } from '@/lib/db/services/script-file.service';
import { z } from 'zod';

// Request validation schema
const ConvertRequestSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
});

export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      const body = await request.json();

      // Validate request
      const validation = ConvertRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', validation.error.message),
          { status: 400 }
        );
      }

      const { fileId } = validation.data;

      console.log(`[Conversion] Starting conversion for file ${fileId}`);

      // 1. Fetch ScriptFile from database
      const scriptFile = await scriptFileService.getFileById(fileId);

      if (!scriptFile) {
        return NextResponse.json(
          createErrorResponse('NOT_FOUND', `Script file with ID ${fileId} not found`),
          { status: 404 }
        );
      }

      // 2. Update status to 'processing'
      await scriptFileService.updateFile(fileId, {
        conversionStatus: 'processing',
        conversionError: null,
      });

      console.log(`[Conversion] File ${fileId}: Status updated to 'processing'`);

      // 3. Call Python conversion service
      try {
        const conversionResult = await pythonConverterClient.convertScript({
          file_id: fileId,
          raw_content: scriptFile.rawContent,
          filename: scriptFile.filename,
          episode_number: scriptFile.episodeNumber ?? undefined,
        });

        console.log(`[Conversion] File ${fileId}: Conversion successful`);

        // 4. Update database with conversion result
        const updatedFile = await scriptFileService.updateFile(fileId, {
          jsonContent: conversionResult.json_content as Record<string, any>,
          conversionStatus: 'completed',
          conversionError: null,
        });

        console.log(`[Conversion] File ${fileId}: Database updated`);

        return NextResponse.json(
          createApiResponse({
            success: true,
            fileId,
            filename: scriptFile.filename,
            conversionResult: {
              metadata: conversionResult.metadata,
              processing_time_ms: conversionResult.processing_time_ms,
            },
            updatedAt: updatedFile.updatedAt,
          }),
          { status: 200 }
        );
      } catch (conversionError) {
        // Conversion failed - update status to 'failed'
        const errorMessage =
          conversionError instanceof Error
            ? conversionError.message
            : 'Unknown conversion error';

        console.error(`[Conversion] File ${fileId}: Conversion failed -`, errorMessage);

        await scriptFileService.updateFile(fileId, {
          conversionStatus: 'failed',
          conversionError: errorMessage,
        });

        return NextResponse.json(
          createErrorResponse('CONVERSION_FAILED', errorMessage, {
            fileId,
            filename: scriptFile.filename,
          }),
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('[Conversion] Unexpected error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', errorMessage),
        { status: 500 }
      );
    }
  });
}
