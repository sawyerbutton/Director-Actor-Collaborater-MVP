import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse } from '@/lib/api/response';
import { withMiddleware } from '@/lib/api/middleware';
import { withErrorBoundary } from '@/lib/api/errors';

export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    return withErrorBoundary(async () => {
      const startTime = Date.now();
      
      // Basic health information
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
        responseTime: `${Date.now() - startTime}ms`,
        services: {
          api: 'healthy',
          // Database check would go here when implemented
          // database: await checkDatabaseHealth(),
          // AI service check would go here when implemented  
          // ai: await checkAIServiceHealth()
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memoryUsage: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
          }
        }
      };

      return NextResponse.json(
        createApiResponse(health),
        { status: 200 }
      );
    });
  });
}