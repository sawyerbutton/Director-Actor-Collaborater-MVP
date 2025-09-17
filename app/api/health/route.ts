import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse } from '@/lib/api/response';
import { withMiddleware } from '@/lib/api/middleware';
import { withErrorBoundary } from '@/lib/api/errors';
import { prisma } from '@/lib/db/client';
import Redis from 'ioredis';

async function checkDatabaseHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    // Perform a simple query to check database connectivity
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    return 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    return 'unhealthy';
  }
}

async function checkRedisHealth(): Promise<'healthy' | 'not_configured' | 'unhealthy'> {
  if (!process.env.REDIS_URL) {
    return 'not_configured';
  }
  
  try {
    const redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    
    await redis.connect();
    const pong = await redis.ping();
    await redis.disconnect();
    
    return pong === 'PONG' ? 'healthy' : 'unhealthy';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return 'unhealthy';
  }
}


export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    return withErrorBoundary(async () => {
      const startTime = Date.now();
      
      // Perform health checks in parallel
      const [databaseHealth, redisHealth] = await Promise.all([
        checkDatabaseHealth(),
        checkRedisHealth(),
      ]);
      
      // Determine overall status
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (databaseHealth === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (
        databaseHealth === 'degraded' ||
        (redisHealth === 'unhealthy' && process.env.NODE_ENV === 'production')
      ) {
        overallStatus = 'degraded';
      }
      
      // Get package version
      const packageJson = require('../../../package.json');
      const version = packageJson.version || '1.0.0';
      
      // Build health response
      const health = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version,
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        responseTime: `${Date.now() - startTime}ms`,
        services: {
          api: 'healthy',
          database: databaseHealth,
          redis: redisHealth,
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

      // Set appropriate HTTP status code
      const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

      return NextResponse.json(
        createApiResponse(health),
        { 
          status: httpStatus,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Health-Status': overallStatus,
          }
        }
      );
    });
  });
}