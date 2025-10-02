import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  // Only allow in production with secret
  if (process.env.NODE_ENV === 'production' && secret !== process.env.DEBUG_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        demoUserExists: false,
        projectCount: 0,
        error: null as string | null
      }
    };

    // Test database connection
    try {
      await prisma.$connect();
      diagnostics.database.connected = true;

      // Check if demo-user exists
      const demoUser = await prisma.user.findUnique({
        where: { id: 'demo-user' }
      });
      diagnostics.database.demoUserExists = !!demoUser;

      // Count projects
      diagnostics.database.projectCount = await prisma.project.count();

      await prisma.$disconnect();
    } catch (dbError) {
      diagnostics.database.error = dbError instanceof Error ? dbError.message : 'Unknown database error';
    }

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
