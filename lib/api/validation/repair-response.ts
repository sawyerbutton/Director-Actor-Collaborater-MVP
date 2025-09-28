/**
 * Validation schema for repair API responses
 */

import { z } from 'zod';

export const RepairResponseSchema = z.object({
  success: z.boolean(),
  fix: z.object({
    content: z.string(),
    confidence: z.number().min(0).max(1),
    explanation: z.string(),
    location: z.object({
      page: z.number().optional(),
      line: z.number().optional(),
      scene: z.number().optional()
    }).optional()
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    details: z.any().optional()
  }).optional(),
  retryCount: z.number().optional(),
  processingTime: z.number().optional()
});

export type RepairResponse = z.infer<typeof RepairResponseSchema>;

/**
 * Validates a repair response
 */
export function validateRepairResponse(response: unknown): RepairResponse | null {
  try {
    return RepairResponseSchema.parse(response);
  } catch (error) {
    console.error('Invalid repair response format:', error);
    return null;
  }
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  retryable: boolean = false,
  details?: any
): RepairResponse {
  return {
    success: false,
    error: {
      code,
      message,
      retryable,
      details
    }
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse(
  fix: RepairResponse['fix'],
  retryCount?: number,
  processingTime?: number
): RepairResponse {
  return {
    success: true,
    fix,
    retryCount,
    processingTime
  };
}