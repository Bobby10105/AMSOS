import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SSO users might not have a password
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
      }
    } else {
        // If user was created via SSO and has no password, we might want to let them set one
        // or prevent them from changing it if we want to force SSO.
        // For now, if they have no password, they can't "change" it via this method.
        return NextResponse.json({ error: 'Password change not available for SSO users' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'USER',
        entityId: user.id,
        details: 'User changed their password',
        performedBy: user.username,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
