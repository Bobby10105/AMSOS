import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const params = await props.params;
    const { text } = await req.json();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Use raw SQL to bypass Prisma Client sync issues
    await prisma.$executeRawUnsafe(
      `INSERT INTO ProcedureMessage (id, procedureId, text, author, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      messageId,
      params.id,
      text.trim(),
      session.user.username,
      now
    );

    return NextResponse.json({
      id: messageId,
      procedureId: params.id,
      text: text.trim(),
      author: session.user.username,
      createdAt: now
    });
  } catch (error: any) {
    console.error('Create message error:', error);
    return NextResponse.json({ error: 'Failed to send message', details: error.message }, { status: 500 });
  }
}
