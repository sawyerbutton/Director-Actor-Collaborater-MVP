import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, CorsOptions } from './cors';
import { loggingMiddleware, logResponse } from './logging';
import { rateLimitMiddleware, addRateLimitHeaders, RateLimitOptions } from './rate-limit';
import { securityHeadersMiddleware } from './security-headers';

export interface MiddlewareOptions {
  cors?: CorsOptions | boolean;
  logging?: boolean;
  rateLimit?: RateLimitOptions | boolean;
  securityHeaders?: boolean;
}

export async function withMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options: MiddlewareOptions = {}
): Promise<NextResponse> {
  const {
    cors = true,
    logging = true,
    rateLimit = true,
    securityHeaders = true
  } = options;

  let logContext: any = null;

  try {
    // Logging middleware
    if (logging) {
      logContext = loggingMiddleware(request);
    }

    // Rate limiting middleware
    if (rateLimit) {
      const rateLimitOptions = typeof rateLimit === 'object' ? rateLimit : {};
      const rateLimitResponse = rateLimitMiddleware(request, rateLimitOptions);
      
      if (rateLimitResponse) {
        if (logging && logContext) {
          logResponse(logContext, rateLimitResponse.status || 429);
        }
        return rateLimitResponse;
      }
    }

    // Execute the handler
    let response = await handler();

    // CORS middleware
    if (cors) {
      const corsOptions = typeof cors === 'object' ? cors : undefined;
      response = corsMiddleware(request, response, corsOptions);
    }

    // Add rate limit headers to successful responses
    if (rateLimit) {
      const rateLimitOptions = typeof rateLimit === 'object' ? rateLimit : {};
      response = addRateLimitHeaders(response, request, rateLimitOptions);
    }

    // Add security headers
    if (securityHeaders) {
      response = securityHeadersMiddleware(response);
    }

    // Log the response
    if (logging && logContext) {
      const duration = Date.now() - (logContext.timestamp || Date.now());
      logResponse({ ...logContext, duration }, response.status || 200);
    }

    return response;
  } catch (error) {
    // Log errors
    if (logging && logContext) {
      logResponse(logContext, 500, error);
    }
    throw error;
  }
}

// Export individual middleware for selective use
export { corsMiddleware, loggingMiddleware, rateLimitMiddleware };
export { logger } from './logging';
export { rateLimiter } from './rate-limit';