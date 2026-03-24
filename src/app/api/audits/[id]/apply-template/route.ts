import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { templateId, phase } = await req.json();
    
    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const template = await prisma.auditTemplate.findUnique({
      where: { id: templateId },
      include: { procedures: true }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Filter procedures by phase if specified, otherwise take all
    const proceduresToCopy = phase 
      ? template.procedures.filter(p => p.phase === phase)
      : template.procedures;

    if (proceduresToCopy.length === 0) {
      return NextResponse.json({ message: 'No procedures found for the specified phase in this template' }, { status: 200 });
    }

    const createdProcedures = await prisma.$transaction(
      proceduresToCopy.map(p => prisma.procedure.create({
        data: {
          auditId: params.id,
          phase: p.phase,
          title: p.title,
          purpose: p.purpose,
          // Other fields will use defaults
        }
      }))
    );

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'AUDIT',
        entityId: params.id,
        details: `Applied template: ${template.name}${phase ? ` for phase: ${phase}` : ''}. Created ${createdProcedures.length} procedures.`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json({ 
      success: true, 
      count: createdProcedures.length,
      procedures: createdProcedures 
    });
  } catch (error: any) {
    console.error('Apply template error:', error);
    return NextResponse.json({ error: 'Failed to apply template', details: error.message }, { status: 500 });
  }
}
