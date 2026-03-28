import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user } = session;

  let whereClause = {};
  
  if (user.role !== 'Administrator') {
    whereClause = {
      teamMembers: {
        some: {
          userId: user.id
        }
      }
    };
  }

  const audits = await prisma.audit.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });
  
  return NextResponse.json(audits);
}

export async function POST(req: Request) {
  const session = await getSession();
  const data = await req.json();
  const audit = await prisma.audit.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      auditNumber: data.auditNumber,
      objective: data.objective,
      status: data.status || 'In Progress',
    }
  });

  // Log the action
  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'AUDIT',
      entityId: audit.id,
      details: `Created audit: ${audit.title}`,
      performedBy: session?.user?.username || 'System',
    }
  });

  return NextResponse.json(audit);
}
