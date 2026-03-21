import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  const data = await req.json();
  const procedure = await prisma.procedure.create({
    data: {
      auditId: data.auditId,
      phase: data.phase,
      title: data.title || 'New Procedure',
      purpose: data.purpose,
      source: data.source,
      scope: data.scope,
      methodology: data.methodology,
      results: data.results,
      conclusions: data.conclusions,
      preparedBy: data.preparedBy,
      preparedDate: data.preparedDate ? new Date(data.preparedDate) : null,
      reviewedBy: data.reviewedBy,
      reviewedDate: data.reviewedDate ? new Date(data.reviewedDate) : null,
    }
  });

  const audit = await prisma.audit.findUnique({
    where: { id: data.auditId },
    select: { title: true }
  });

  // Log the action
  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'PROCEDURE',
      entityId: procedure.id,
      details: `Created procedure: ${procedure.title} in audit: ${audit?.title || data.auditId}`,
      performedBy: session?.user?.username || 'System',
    }
  });

  return NextResponse.json(procedure);
}
