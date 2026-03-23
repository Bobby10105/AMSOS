import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Health check endpoint for Kubernetes, Load Balancers, and monitoring tools.
 * Returns 200 if the app and database are responsive.
 */
export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({ 
      status: 'UP', 
      timestamp: new Date().toISOString(),
      services: {
        database: 'HEALTHY'
      }
    }, { status: 200 });
  } catch (error) {
    console.error('[Health Check] Failure:', error);
    
    return NextResponse.json({ 
      status: 'DOWN', 
      timestamp: new Date().toISOString(),
      services: {
        database: 'UNHEALTHY'
      }
    }, { status: 503 });
  }
}
