# API Development Guide

## Overview

This guide covers the backend API architecture built on Next.js 14 App Router with TypeScript. The API follows RESTful principles and includes middleware for CORS, rate limiting, logging, request validation, and error handling.

## Directory Structure

```
app/api/              # API routes
├── health/          # Health check endpoint
├── v1/              # Version 1 API routes
└── docs/            # API documentation (dev only)

lib/api/              # API utilities
├── middleware/      # Middleware implementations
│   ├── cors.ts     # CORS middleware
│   ├── logging.ts  # Request/response logging
│   └── rate-limit.ts # Rate limiting
├── openapi/         # OpenAPI specification
├── schemas/         # Zod validation schemas
├── errors.ts        # Error handling utilities
├── response.ts      # Response formatting
└── validation.ts    # Request validation

types/                # TypeScript definitions
├── api.d.ts        # API types
└── env.d.ts        # Environment variables
```

## Creating New API Routes

### Basic Route Structure

Use the provided template as a starting point:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { withMiddleware } from '@/lib/api/middleware';
import { withErrorBoundary } from '@/lib/api/errors';
import { z } from 'zod';

// Define validation schemas
const requestSchema = z.object({
  // Define your request structure
});

export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    return withErrorBoundary(async () => {
      // Your business logic here
      const result = {};
      
      return NextResponse.json(
        createApiResponse(result),
        { status: 200 }
      );
    });
  });
}
```

## Middleware

### Available Middleware

All middleware is automatically applied through `withMiddleware`:

1. **CORS**: Handles cross-origin requests
2. **Rate Limiting**: Prevents API abuse
3. **Logging**: Tracks requests and responses
4. **Error Handling**: Standardizes error responses

### Custom Middleware Options

```typescript
withMiddleware(request, handler, {
  cors: {
    origins: ['http://custom.com'],
    methods: ['GET', 'POST']
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000
  },
  logging: true
});
```

## Request Validation

### Using Zod for Validation

```typescript
import { validateRequest } from '@/lib/api/validation';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    return withErrorBoundary(async () => {
      const { body } = await validateRequest(request, {
        body: bodySchema
      });
      
      // body is now type-safe
      console.log(body.name, body.email);
      
      return NextResponse.json(createApiResponse({ success: true }));
    });
  });
}
```

### Common Validation Schemas

Pre-built schemas are available in `lib/api/schemas/common.ts`:

- `projectSchema`: Project structure
- `analysisRequestSchema`: Script analysis requests
- `listRequestSchema`: Pagination and filtering
- `commonSchemas`: Reusable patterns (pagination, email, URL, etc.)

## Error Handling

### Throwing Errors

Use predefined error classes:

```typescript
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
} from '@/lib/api/errors';

// Examples
throw new NotFoundError('User');  // "User not found"
throw new ValidationError('Invalid input', { field: 'email' });
throw new UnauthorizedError('Token expired');
```

### Custom Errors

```typescript
import { ApiError } from '@/lib/api/errors';
import { HTTP_STATUS } from '@/lib/config/constants';

throw new ApiError(
  'CUSTOM_ERROR_CODE',
  'Error message',
  HTTP_STATUS.BAD_REQUEST,
  { additionalInfo: 'details' }
);
```

## Response Format

### Standard Response Structure

All API responses follow this format:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;           // Present on success
  error?: {           // Present on error
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}
```

### Creating Responses

```typescript
// Success response
return NextResponse.json(
  createApiResponse({ userId: '123', name: 'John' }),
  { status: 200 }
);

// Error response
return NextResponse.json(
  createErrorResponse('USER_NOT_FOUND', 'User does not exist'),
  { status: 404 }
);
```

## Environment Variables

### Configuration

Environment variables are validated on startup:

```typescript
// lib/config/env.ts
import { env } from '@/lib/config/env';

// Get a specific variable
const apiKey = env.get('DEEPSEEK_API_KEY');

// Check environment
if (env.isDevelopment()) {
  // Development-only code
}
```

### Required Variables

See `.env.local.example` for all required environment variables.

## Rate Limiting

Rate limits are configured per endpoint:

- Default: 100 requests per 60 seconds
- Configurable via environment variables
- Headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset timestamp
  - `Retry-After`: Seconds until reset (on 429)

## API Documentation

### Accessing Documentation

In development mode, visit:
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI Spec: `http://localhost:3000/api/docs/spec`

### Generating Documentation

```bash
npm run generate:api-docs
```

This creates:
- `docs/api/openapi.json`: OpenAPI specification
- `docs/api/api-reference.md`: Markdown documentation

### Adding to OpenAPI Spec

Update `lib/api/openapi/spec.ts` to document new endpoints:

```typescript
paths: {
  '/v1/your-endpoint': {
    get: {
      tags: ['YourTag'],
      summary: 'Brief description',
      description: 'Detailed description',
      parameters: [...],
      responses: {...}
    }
  }
}
```

## Testing

### Unit Tests

Test individual components:

```typescript
// __tests__/api/your-endpoint.test.ts
import { GET } from '@/app/api/your-endpoint/route';
import { NextRequest } from 'next/server';

describe('Your Endpoint', () => {
  it('should return expected response', async () => {
    const request = new NextRequest(
      new URL('http://localhost:3000/api/your-endpoint')
    );
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### Integration Tests

Test complete request flows including middleware:

```typescript
it('should handle rate limiting', async () => {
  const request = new NextRequest(url);
  
  // Make requests up to limit
  for (let i = 0; i < 100; i++) {
    const response = await GET(request);
    expect(response.status).toBe(200);
  }
  
  // Next request should be rate limited
  const response = await GET(request);
  expect(response.status).toBe(429);
});
```

## Security Best Practices

1. **Always validate input**: Use Zod schemas for all user input
2. **Sanitize error messages**: Don't expose internal details in production
3. **Use environment variables**: Never hardcode secrets
4. **Implement rate limiting**: Prevent API abuse
5. **Log security events**: Track authentication failures and suspicious activity
6. **CORS configuration**: Restrict origins in production
7. **Authentication**: Use NextAuth.js for protected routes (future implementation)

## Performance Considerations

1. **Use middleware selectively**: Disable unnecessary middleware for specific routes
2. **Implement caching**: Use appropriate cache headers
3. **Optimize database queries**: Use Prisma's query optimization features
4. **Monitor response times**: Track API performance metrics
5. **Implement pagination**: Limit response sizes for list endpoints

## Common Patterns

### Paginated Lists

```typescript
import { listRequestSchema } from '@/lib/api/schemas/common';

const query = listRequestSchema.parse(
  Object.fromEntries(request.nextUrl.searchParams)
);

const items = await fetchItems({
  skip: (query.page - 1) * query.limit,
  take: query.limit
});

return createApiResponse({
  items,
  pagination: {
    page: query.page,
    limit: query.limit,
    total: totalCount,
    totalPages: Math.ceil(totalCount / query.limit),
    hasNext: query.page * query.limit < totalCount,
    hasPrevious: query.page > 1
  }
});
```

### File Uploads

```typescript
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new ValidationError('File is required');
  }
  
  // Process file...
}
```

### Streaming Responses

```typescript
import { ReadableStream } from 'stream/web';

export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      // Stream data
      controller.enqueue('data chunk');
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream'
    }
  });
}
```

## Troubleshooting

### Common Issues

1. **CORS errors**: Check origin configuration in `lib/config/constants.ts`
2. **Rate limit errors**: Increase limits or implement user-specific limits
3. **Validation errors**: Check Zod schema definitions and error details
4. **Environment errors**: Ensure all required variables are set
5. **TypeScript errors**: Run `npm run type-check` to identify issues

### Debug Logging

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

Check logs in console for detailed request/response information.

## Next Steps

- Implement database integration (Story 3.2)
- Add authentication with NextAuth.js (Story 3.3)
- Create project management endpoints
- Implement script analysis endpoints
- Add WebSocket support for real-time updates