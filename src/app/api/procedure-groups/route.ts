import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  console.log('[API/ProcedureGroups] POST request received');
  try {
    const session = await getSession();
    if (!session) {
      console.warn('[API/ProcedureGroups] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { auditId, phase, title } = data;
    console.log('[API/ProcedureGroups] Data payload:', { auditId, phase, title });

    if (!auditId || !phase || !title) {
      console.error('[API/ProcedureGroups] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Defensive check
    if (!prisma.procedureGroup) {
      const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
      console.error('[API/ProcedureGroups] ProcedureGroup model NOT FOUND in client');
      console.error('[API/ProcedureGroups] Available models:', models.join(', '));
      return NextResponse.json({ 
        error: 'Database configuration error', 
        details: 'ProcedureGroup model not found in client',
        availableModels: models
      }, { status: 500 });
    }

    // Get max displayOrder for this phase
    console.log('[API/ProcedureGroups] Calculating max display order...');
    const maxOrder = await prisma.procedureGroup.aggregate({
      where: { auditId, phase },
      _max: { displayOrder: true }
    });

    const newOrder = (maxOrder._max.displayOrder || 0) + 1;
    console.log('[API/ProcedureGroups] Next display order:', newOrder);

    const group = await prisma.procedureGroup.create({
      data: {
        auditId,
        phase,
        title,
        displayOrder: newOrder
      }
    });

    console.log('[API/ProcedureGroups] Group created successfully:', group.id);

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'PROCEDURE_GROUP',
        entityId: group.id,
        details: `Created procedure group: ${title} in ${phase}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json(group);
  } catch (error: any) {
    console.error('[API/ProcedureGroups] POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
