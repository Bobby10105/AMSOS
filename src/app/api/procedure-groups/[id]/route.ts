import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { title } = data;

    const group = await prisma.procedureGroup.update({
      where: { id: params.id },
      data: { title }
    });

    return NextResponse.json(group);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update group', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const group = await prisma.procedureGroup.delete({
      where: { id: params.id }
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'PROCEDURE_GROUP',
        entityId: params.id,
        details: `Deleted procedure group: ${group.title}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete group', details: error.message }, { status: 500 });
  }
}
