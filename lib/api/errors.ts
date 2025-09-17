import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createErrorResponse } from './response';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';
import { logger } from './middleware/logging';

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(
    code: string,
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      createErrorResponse(this.code, this.message, this.details),
      { status: this.statusCode }
    );
  }
}

// Predefined error types
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(ERROR_CODES.VALIDATION_ERROR, message, HTTP_STATUS.BAD_REQUEST, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(ERROR_CODES.NOT_FOUND, `${resource} not found`, HTTP_STATUS.NOT_FOUND);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(ERROR_CODES.UNAUTHORIZED, message, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(ERROR_CODES.FORBIDDEN, message, HTTP_STATUS.FORBIDDEN);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super(ERROR_CODES.CONFLICT, message, HTTP_STATUS.CONFLICT);
  }
}

export class BusinessError extends ApiError {
  constructor(message: string = 'Business logic error', details?: any) {
    super(ERROR_CODES.CONFLICT, message, HTTP_STATUS.CONFLICT, details);
    this.name = 'BusinessError';
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(ERROR_CODES.SERVICE_UNAVAILABLE, message, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
}

// Error handler function
export function handleApiError(error: unknown): NextResponse {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    logger.error(`API Error: ${error.code}`, {
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack
    });
    return error.toResponse();
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.issues.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    
    logger.warn('Validation Error', { details });
    
    return NextResponse.json(
      createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        details
      ),
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    logger.error('Unhandled Error', {
      message: error.message,
      stack: error.stack
    });
    
    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An internal error occurred'
      : error.message;
    
    return NextResponse.json(
      createErrorResponse(ERROR_CODES.INTERNAL_ERROR, message),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }

  // Handle unknown errors
  logger.error('Unknown Error', { error });
  
  return NextResponse.json(
    createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred'
    ),
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  );
}

// Error boundary wrapper for API routes
export async function withErrorBoundary<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch (error) {
    return handleApiError(error);
  }
}

// Error code to message mapping
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.INTERNAL_ERROR]: 'An internal error occurred',
  [ERROR_CODES.VALIDATION_ERROR]: 'Invalid request data',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.UNAUTHORIZED]: 'Authentication required',
  [ERROR_CODES.FORBIDDEN]: 'Access denied',
  [ERROR_CODES.RATE_LIMIT]: 'Too many requests, please try again later',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests',
  [ERROR_CODES.BAD_REQUEST]: 'Bad request',
  [ERROR_CODES.CONFLICT]: 'Resource conflict',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable'
};