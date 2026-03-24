import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const template = await prisma.auditTemplate.findUnique({
    where: { id: params.id },
    include: {
      procedures: {
        orderBy: { displayOrder: 'asc' }
      }
    }
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, description, procedures } = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      // Update template details
      const updatedTemplate = await tx.auditTemplate.update({
        where: { id: params.id },
        data: { name, description }
      });

      // If procedures are provided, replace them all
      if (procedures && Array.isArray(procedures)) {
        // Delete existing procedures
        await tx.templateProcedure.deleteMany({
          where: { templateId: params.id }
        });

        // Create new ones
        if (procedures.length > 0) {
          await tx.templateProcedure.createMany({
            data: procedures.map((p: any, index: number) => ({
              templateId: params.id,
              phase: p.phase,
              title: p.title,
              purpose: p.purpose,
              displayOrder: p.displayOrder ?? index
            }))
          });
        }
      }

      return updatedTemplate;
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'TEMPLATE',
        entityId: params.id,
        details: `Updated audit template: ${result.name}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update template', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const template = await prisma.auditTemplate.delete({
      where: { id: params.id }
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'TEMPLATE',
        entityId: params.id,
        details: `Deleted audit template: ${template.name}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete template', details: error.message }, { status: 500 });
  }
}
