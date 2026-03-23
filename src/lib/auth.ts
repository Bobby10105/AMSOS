import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
const SESSION_DURATION = parseInt(process.env.SESSION_DURATION_SECONDS || '3600', 10); // Default 1 hour

export async function encrypt(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secretKey);
}

export async function decrypt(input: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(input, secretKey, {
    algorithms: ['HS256'],
  });
  return payload;
}

export async function getSession(): Promise<{ user: { id: string; username: string; role: string } } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
      return null;
    }
    const decrypted = await decrypt(sessionCookie);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return decrypted as any;
  } catch (error) {
    console.error('[Auth] Session error:', error);
    return null;
  }
}

export async function login(user: { id: string; username: string; role: string }) {
  const expires = new Date(Date.now() + SESSION_DURATION * 1000);
  const session = await encrypt({ user, expires });

  const cookieStore = await cookies();
  cookieStore.set('session', session, { 
    expires, 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set('session', '', { 
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;

  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session);
  const expires = new Date(Date.now() + SESSION_DURATION * 1000);
  parsed.expires = expires;
  
  const res = NextResponse.next();
  res.cookies.set({
    name: 'session',
    value: await encrypt(parsed),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
  return res;
}
