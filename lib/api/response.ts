import { ApiResponse as ApiResponseType } from '@/types/api';
import { NextResponse } from 'next/server';

export class ApiResponse {
  static success<T = any>(data: T, message?: string, statusCode: number = 200): NextResponse {
    return NextResponse.json(
      createApiResponse(data, true),
      { status: statusCode }
    );
  }

  static error(error: any): NextResponse {
    if (error instanceof Error && 'statusCode' in error) {
      const apiError = error as any;
      return NextResponse.json(
        createErrorResponse(apiError.code || 'UNKNOWN', apiError.message, apiError.details),
        { status: apiError.statusCode || 500 }
      );
    }
    
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', error.message || 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}

export function createApiResponse<T = any>(
  data?: T,
  success: boolean = true
): ApiResponseType<T> {
  const response: ApiResponseType<T> = {
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
): ApiResponseType {
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