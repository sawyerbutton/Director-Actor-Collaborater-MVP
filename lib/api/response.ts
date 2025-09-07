import { ApiResponse } from '@/types/api';

export function createApiResponse<T = any>(
  data?: T,
  success: boolean = true
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success,
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_API_VERSION || 'v1'
    }
  };

  if (success && data !== undefined) {
    response.data = data;
  }

  return response;
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_API_VERSION || 'v1'
    }
  };
}