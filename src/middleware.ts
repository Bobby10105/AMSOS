import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Paths that don't require authentication
  if (
    pathname === '/login' || 
    pathname.startsWith('/api/login') || 
    pathname.startsWith('/api/auth/sso') ||
    pathname.startsWith('/_next') || 
    pathname === '/favicon.ico' ||
    pathname.startsWith('/uploads')
  ) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await decrypt(session);
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!api/login|_next/static|_next/image|favicon.ico).*)'],
};
