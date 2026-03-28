import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: Request) {
  console.log('[API/Upload] POST request received');
  try {
    const session = await getSession();
    
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[API/Upload] FormData parse error:', msg);
      return NextResponse.json({ error: 'Failed to parse form data', details: msg }, { status: 400 });
    }
    
    const file = formData.get('file');
    const procedureId = formData.get('procedureId')?.toString();
    const auditId = formData.get('auditId')?.toString();
    const type = formData.get('type')?.toString();

    console.log('[API/Upload] Metadata:', { procedureId, auditId, type });

    if (!file || typeof file === 'string') {
      console.error('[API/Upload] No file found in request');
      return NextResponse.json({ error: 'Valid file is required in form field "file"' }, { status: 400 });
    }

    // Cast to unknown then any to get attributes safely
    const fileAny = file as any;
    const filenameAttr = fileAny.name || 'unknown_file';
    console.log('[API/Upload] Processing file:', filenameAttr);
    
    // Clean up IDs
    const cleanProcedureId = (procedureId === 'null' || procedureId === 'undefined' || !procedureId) ? undefined : procedureId;
    const cleanAuditId = (auditId === 'null' || auditId === 'undefined' || !auditId) ? undefined : auditId;
    const cleanType = type?.toLowerCase();

    if (!cleanProcedureId && !cleanAuditId) {
      console.error('[API/Upload] Missing IDs');
      return NextResponse.json({ error: 'Either procedureId or auditId is required' }, { status: 400 });
    }

    let buffer: Buffer;
    try {
      const arrayBuffer = await fileAny.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log('[API/Upload] File buffer size:', buffer.length);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[API/Upload] Buffer read error:', msg);
      return NextResponse.json({ error: 'Failed to read uploaded file', details: msg }, { status: 500 });
    }
    
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (mkdirErr: unknown) {
      const msg = mkdirErr instanceof Error ? mkdirErr.message : 'Unknown error';
      console.error('[API/Upload] Directory creation error:', msg);
      return NextResponse.json({ error: 'Failed to prepare upload directory', details: msg }, { status: 500 });
    }

    const uniqueSuffix = crypto.randomUUID();
    const safeFilename = filenameAttr.replace(/[^a-zA-Z0-9.-]/g, '_');
    const diskFilename = `${uniqueSuffix}-${safeFilename}`;
    const filepath = path.join(uploadDir, diskFilename);

    try {
      await fs.writeFile(filepath, buffer);
      console.log('[API/Upload] File saved to:', filepath);
    } catch (writeErr: unknown) {
      const msg = writeErr instanceof Error ? writeErr.message : 'Unknown error';
      console.error('[API/Upload] File write failure:', msg);
      return NextResponse.json({ error: 'Failed to write file to disk', details: msg }, { status: 500 });
    }

    // MILESTONE ATTACHMENT PATH
    if (cleanAuditId && cleanType === 'milestone') {
      console.log('[API/Upload] Updating milestone for audit:', cleanAuditId);
      try {
        const audit = await prisma.audit.findUnique({
          where: { id: cleanAuditId },
          select: { id: true, milestoneAttachmentUrl: true, title: true }
        });

        if (!audit) {
          console.error('[API/Upload] Audit not found:', cleanAuditId);
          return NextResponse.json({ error: 'Audit not found in database' }, { status: 404 });
        }

        // Cleanup old file
        if (audit.milestoneAttachmentUrl) {
          const oldPath = path.join(process.cwd(), 'public', audit.milestoneAttachmentUrl);
          try {
            await fs.unlink(oldPath);
            console.log('[API/Upload] Cleaned up old file:', oldPath);
          } catch (e) {}
        }

        const updatedAudit = await prisma.audit.update({
          where: { id: cleanAuditId },
          data: {
            milestoneAttachmentUrl: `/uploads/${diskFilename}`,
            milestoneAttachmentName: filenameAttr,
          }
        });

        try {
          await prisma.auditLog.create({
            data: {
              action: 'UPDATE',
              entityType: 'AUDIT',
              entityId: cleanAuditId,
              details: `Uploaded milestone spreadsheet: ${filenameAttr}`,
              performedBy: session?.user?.username || 'System',
            }
          });
        } catch (logError) {
          console.error('[API/Upload] Log creation failed:', logError);
        }

        console.log('[API/Upload] Milestone success');
        return NextResponse.json(updatedAudit);
      } catch (dbError: unknown) {
        const msg = dbError instanceof Error ? dbError.message : 'Unknown database error';
        console.error('[API/Upload] DB error:', msg);
        return NextResponse.json({ error: 'Database update failed', details: msg }, { status: 500 });
      }
    }

    // REGULAR PROCEDURE ATTACHMENT PATH
    if (!cleanProcedureId) {
      console.error('[API/Upload] No procedureId for regular attachment');
      return NextResponse.json({ error: 'procedureId is required' }, { status: 400 });
    }

    console.log('[API/Upload] Updating procedure attachment:', cleanProcedureId);
    try {
      const aggregateResult = await prisma.attachment.aggregate({
        where: { procedureId: cleanProcedureId },
        _max: { displayOrder: true }
      });
      
      const nextOrder = (aggregateResult._max.displayOrder || 0) + 1;
      
      const attachment = await prisma.attachment.create({
        data: {
          procedureId: cleanProcedureId,
          filename: filenameAttr,
          filepath: `/uploads/${diskFilename}`,
          mimetype: fileAny.type || 'application/octet-stream',
          size: Number(fileAny.size) || 0,
          displayOrder: nextOrder,
        }
      });

      const attachmentId = attachment.id;

      try {
        const procedure = await prisma.procedure.findUnique({
          where: { id: cleanProcedureId },
          include: { audit: { select: { title: true } } }
        });

        await prisma.auditLog.create({
          data: {
            action: 'CREATE',
            entityType: 'ATTACHMENT',
            entityId: attachmentId,
            details: `Uploaded attachment: ${filenameAttr} to procedure: ${procedure?.title}`,
            performedBy: session?.user?.username || 'System',
          }
        });
      } catch (e) {}

      console.log('[API/Upload] Attachment success');
      return NextResponse.json(attachment);
    } catch (dbError: unknown) {
      const msg = dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.error('[API/Upload] DB error:', msg);
      return NextResponse.json({ error: 'Database insertion failed', details: msg }, { status: 500 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API/Upload] Critical error:', msg);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}
