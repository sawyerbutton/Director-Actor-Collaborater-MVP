import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/api/errors';
import { scriptFileService } from '@/lib/db/services/script-file.service';
import { createScriptConverter } from '@/lib/conversion/script-converter';
import { HTTP_STATUS } from '@/lib/config/constants';

// Request body schema
const convertScriptSchema = z.object({
  fileId: z.string().min(1),
  forceReconvert: z.boolean().optional().default(false)
});

/**
 * POST /api/v1/convert/script
 *
 * Convert a script file from Markdown to structured JSON
 *
 * Request body:
 * {
 *   fileId: string;           // ScriptFile ID to convert
 *   forceReconvert?: boolean; // Force reconversion even if already completed
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     fileId: string;
 *     conversionStatus: "completed" | "failed";
 *     scenesCount: number;
 *     charactersCount: number;
 *     error?: string;
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validatedData = convertScriptSchema.parse(body);

      const { fileId, forceReconvert } = validatedData;

      console.log(`[API Convert] Converting file ${fileId}, force=${forceReconvert}`);

      // Get file from database
      const file = await scriptFileService.getFileById(fileId);
      if (!file) {
        throw new NotFoundError(`Script file with ID ${fileId} not found`);
      }

      // Check if already converted
      if (file.conversionStatus === 'completed' && !forceReconvert) {
        console.log(`[API Convert] File ${fileId} already converted, skipping`);
        return NextResponse.json(
          createApiResponse({
            fileId: file.id,
            conversionStatus: 'completed',
            scenesCount: (file.jsonContent as any)?.scenes?.length || 0,
            charactersCount: (file.jsonContent as any)?.metadata?.characters?.length || 0,
            message: 'File already converted'
          }),
          { status: HTTP_STATUS.OK }
        );
      }

      // Update status to processing
      await scriptFileService.updateFile(fileId, {
        conversionStatus: 'processing',
        conversionError: null
      });

      // Create converter
      const converter = createScriptConverter();

      // Perform conversion
      console.log(`[API Convert] Starting conversion for file ${fileId}...`);
      const result = await converter.convert(file.rawContent);

      if (!result.success) {
        // Conversion failed
        console.error(`[API Convert] Conversion failed for ${fileId}:`, result.error);

        await scriptFileService.updateFile(fileId, {
          conversionStatus: 'failed',
          conversionError: result.error || 'Unknown conversion error'
        });

        return NextResponse.json(
          createApiResponse({
            fileId: file.id,
            conversionStatus: 'failed',
            error: result.error,
            scenesCount: 0,
            charactersCount: 0
          }),
          { status: HTTP_STATUS.OK }
        );
      }

      // Conversion successful - update database
      console.log(`[API Convert] Conversion successful for ${fileId}`);

      await scriptFileService.updateFile(fileId, {
        jsonContent: result.jsonContent as any,
        conversionStatus: 'completed',
        conversionError: null
      });

      return NextResponse.json(
        createApiResponse({
          fileId: file.id,
          conversionStatus: 'completed',
          scenesCount: result.jsonContent!.scenes.length,
          charactersCount: result.jsonContent!.metadata.characters.length,
          locationsCount: result.jsonContent!.metadata.locations.length,
          timeReferencesCount: result.jsonContent!.metadata.timeReferences.length,
          message: '转换成功'
        }),
        { status: HTTP_STATUS.OK }
      );

    } catch (error) {
      console.error('[API Convert] Error:', error);
      return handleApiError(error);
    }
  });
}

/**
 * GET /api/v1/convert/script?fileId=xxx
 *
 * Get conversion status for a file
 */
export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const fileId = searchParams.get('fileId');

      if (!fileId) {
        throw new ValidationError('fileId query parameter is required');
      }

      const file = await scriptFileService.getFileById(fileId);
      if (!file) {
        throw new NotFoundError(`Script file with ID ${fileId} not found`);
      }

      return NextResponse.json(
        createApiResponse({
          fileId: file.id,
          filename: file.filename,
          conversionStatus: file.conversionStatus,
          conversionError: file.conversionError,
          hasJsonContent: file.jsonContent !== null,
          scenesCount: (file.jsonContent as any)?.scenes?.length || 0,
          charactersCount: (file.jsonContent as any)?.metadata?.characters?.length || 0
        }),
        { status: HTTP_STATUS.OK }
      );

    } catch (error) {
      return handleApiError(error);
    }
  });
}
