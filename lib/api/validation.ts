import { NextRequest } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errors';

export interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

export interface ValidatedRequest<
  TBody = any,
  TQuery = any,
  TParams = any,
  THeaders = any
> {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
  headers?: THeaders;
  raw: NextRequest;
}

export async function validateRequest<
  TBody = any,
  TQuery = any,
  TParams = any,
  THeaders = any
>(
  request: NextRequest,
  options: ValidationOptions
): Promise<ValidatedRequest<TBody, TQuery, TParams, THeaders>> {
  const validated: ValidatedRequest<TBody, TQuery, TParams, THeaders> = {
    raw: request
  };

  try {
    // Validate query parameters
    if (options.query) {
      const url = new URL(request.url);
      const query = Object.fromEntries(url.searchParams);
      validated.query = options.query.parse(query) as TQuery;
    }

    // Validate request body
    if (options.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.json();
        validated.body = options.body.parse(body) as TBody;
      } catch (error) {
        // Handle JSON parsing errors
        if (error instanceof SyntaxError) {
          throw new ValidationError('Invalid JSON in request body');
        }
        throw error;
      }
    }

    // Validate headers
    if (options.headers) {
      const headers = Object.fromEntries(request.headers.entries());
      validated.headers = options.headers.parse(headers) as THeaders;
    }

    // Validate params (would need to be passed separately in Next.js)
    if (options.params) {
      // Params would typically come from the route segment
      // This would be handled differently in actual implementation
      validated.params = options.params.parse({}) as TParams;
    }

    return validated;
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      throw new ValidationError('Request validation failed', details);
    }
    throw error;
  }
}

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc')
  }),

  // ID validation
  id: z.string().uuid(),
  
  // Email validation
  email: z.string().email(),
  
  // URL validation
  url: z.string().url(),
  
  // Date validation
  date: z.string().datetime(),
  
  // Search query
  search: z.object({
    q: z.string().min(1).max(255),
    fields: z.array(z.string()).optional()
  })
};

// Validation middleware factory
export function createValidationMiddleware(options: ValidationOptions) {
  return async (request: NextRequest) => {
    return validateRequest(request, options);
  };
}

// Type-safe query parameter parser
export function parseQueryParams<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): z.infer<T> {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  return schema.parse(query);
}

// Type-safe body parser
export async function parseBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON in request body');
    }
    if (error instanceof ZodError) {
      const details = error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      throw new ValidationError('Request body validation failed', details);
    }
    throw error;
  }
}

// Validation decorators for cleaner route handlers
export function validate(options: ValidationOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      const validated = await validateRequest(request, options);
      return originalMethod.call(this, request, validated, ...args);
    };
    
    return descriptor;
  };
}