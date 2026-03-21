import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const procedureId = formData.get('procedureId') as string;

    if (!file || !procedureId) {
      return NextResponse.json({ error: 'File and procedureId are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const uniqueSuffix = crypto.randomUUID();
    const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = path.join(uploadDir, filename);

    await fs.writeFile(filepath, buffer);

    // Bypassing Prisma validation with raw query for displayOrder calculation
    const rawResult = await prisma.$queryRawUnsafe<{ maxOrder: any }[]>(
      `SELECT MAX(displayOrder) as maxOrder FROM Attachment WHERE procedureId = ?`,
      procedureId
    );
    
    const nextOrder = Number(rawResult[0]?.maxOrder || 0) + 1;

    // Use raw execute to avoid validation error on the field name
    const attachmentId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO Attachment (id, procedureId, filename, filepath, mimetype, size, displayOrder, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      attachmentId,
      procedureId,
      file.name,
      `/uploads/${filename}`,
      file.type,
      file.size,
      nextOrder,
      new Date().toISOString()
    );

    // Fetch the created record using standard prisma (which should work for basic select if it matches ID)
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    });

    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      include: { audit: { select: { title: true } } }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'ATTACHMENT',
        entityId: attachmentId,
        details: `Uploaded attachment: ${file.name} to procedure: ${procedure?.title} in audit: ${procedure?.audit?.title}`,
        performedBy: session?.user?.username || 'System',
      }
    });

    return NextResponse.json(attachment);
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}
