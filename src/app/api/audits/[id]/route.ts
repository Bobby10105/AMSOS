import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import type { Audit } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    include: {
      teamMembers: true,
      procedures: {
        include: { attachments: true }
      }
    }
  });
  return NextResponse.json(audit);
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    const updateData: Partial<Audit> = {};
    const parseDate = (val: string | null | undefined) => {
      if (val === undefined) return undefined;
      if (!val || val === '') return null;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d;
    };

    if (data.planningDate !== undefined) updateData.planningDate = parseDate(data.planningDate);
    if (data.fieldworkStartDate !== undefined) updateData.fieldworkStartDate = parseDate(data.fieldworkStartDate);
    if (data.fieldworkEndDate !== undefined) updateData.fieldworkEndDate = parseDate(data.fieldworkEndDate);
    if (data.reportIssuedDate !== undefined) updateData.reportIssuedDate = parseDate(data.reportIssuedDate);
    if (data.title !== undefined) updateData.title = data.title;
    if (data.objective !== undefined) updateData.objective = data.objective;

    const audit = await prisma.audit.update({
      where: { id: params.id },
      data: updateData
    });

    // Log the update with the audit title
    try {
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'AUDIT',
          entityId: audit.id,
          details: `Updated milestones/details for audit: ${audit.title}`,
          performedBy: session.user.username,
        }
      });
    } catch (e) {}
    
    return NextResponse.json(audit);
  } catch (error: any) {
    console.error('Audit update error:', error);
    return NextResponse.json({ error: 'Failed to update audit', message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Administrator can delete audits
    if (session.user.role !== 'Administrator') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can delete audits' }, { status: 403 });
    }

    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      include: {
        procedures: {
          include: { attachments: true }
        }
      }
    });

    if (audit) {
      // 1. Delete all actual files from the filesystem
      const publicDir = path.join(process.cwd(), 'public');
      
      for (const procedure of audit.procedures) {
        for (const attachment of procedure.attachments) {
          const fullPath = path.join(publicDir, attachment.filepath);
          try {
            await fs.unlink(fullPath);
          } catch (e) {
            console.warn(`Could not delete file during audit deletion: ${fullPath}`, e);
          }
        }
      }

      // 2. Log the action with the audit title
      try {
        await prisma.auditLog.create({
          data: {
            action: 'DELETE',
            entityType: 'AUDIT',
            entityId: params.id,
            details: `Deleted audit: ${audit.title} and all its attachments`,
            performedBy: session.user.username,
          }
        });
      } catch (e) {}

      // 3. Delete the database record (Cascade will handle procedures, attachments, etc.)
      await prisma.audit.delete({
        where: { id: params.id }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Audit deletion error:', error);
    return NextResponse.json({ error: 'Delete failed', details: error.message }, { status: 500 });
  }
}
