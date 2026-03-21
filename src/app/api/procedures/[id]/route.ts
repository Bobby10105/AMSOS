import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const data = await req.json();
    
    const parseDate = (dateStr: any) => {
      if (!dateStr || dateStr === '') return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    // RAW UPDATE for reviewComments to bypass Prisma Client validation issues
    if (data.reviewComments !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE Procedure SET reviewComments = ? WHERE id = ?`,
          data.reviewComments,
          params.id
        );
      } catch (e: any) {
        console.error('Raw comments update failed:', e.message);
      }
    }

    const updateData: any = {
      title: data.title,
      purpose: data.purpose,
      source: data.source,
      scope: data.scope,
      methodology: data.methodology,
      results: data.results,
      conclusions: data.conclusions,
      preparedBy: data.preparedBy,
      preparedDate: parseDate(data.preparedDate),
      reviewedBy: data.reviewedBy,
      reviewedDate: parseDate(data.reviewedDate),
      // specifically NOT including reviewComments here to avoid Prisma error
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const procedure = await prisma.procedure.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(procedure);
  } catch (error: any) {
    console.error('Update procedure error:', error);
    return NextResponse.json({ 
      error: 'Failed to update procedure', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const params = await props.params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Specialist role cannot delete procedures
    if (session.user.role === 'Specialist') {
      return NextResponse.json({ error: 'Forbidden: Specialists cannot delete procedures' }, { status: 403 });
    }
    
    const procedure = await prisma.procedure.findUnique({
      where: { id: params.id },
      include: { 
        audit: { select: { title: true } },
        attachments: true
      }
    });

    if (procedure) {
      // 1. Delete all actual files from the filesystem
      const publicDir = path.join(process.cwd(), 'public');
      for (const attachment of procedure.attachments) {
        const fullPath = path.join(publicDir, attachment.filepath);
        try {
          await fs.unlink(fullPath);
        } catch (e) {
          console.warn(`Could not delete file during procedure deletion: ${fullPath}`, e);
        }
      }

      // 2. Log the action
      await prisma.auditLog.create({
        data: {
          action: 'DELETE',
          entityType: 'PROCEDURE',
          entityId: params.id,
          details: `Deleted procedure: ${procedure.title} from audit: ${procedure.audit.title} and its attachments`,
          performedBy: session.user.username,
        }
      });

      // 3. Delete the database record (Cascade will handle attachments)
      await prisma.procedure.delete({
        where: { id: params.id }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete procedure error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete procedure', 
      details: error.message 
    }, { status: 500 });
  }
}
