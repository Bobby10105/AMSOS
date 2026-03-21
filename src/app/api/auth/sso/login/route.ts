import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.SSO_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/sso/callback`;
  const issuerUrl = process.env.SSO_ISSUER_URL;

  if (!clientId || !issuerUrl) {
    console.error('SSO configuration missing');
    return NextResponse.json({ error: 'SSO not configured' }, { status: 500 });
  }

  // In a real app, you would fetch the authorization_endpoint from OIDC Discovery
  // For now, we assume a standard path or configured via env
  const authEndpoint = `${issuerUrl}/auth`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state: Math.random().toString(36).substring(7), // In production, use a more secure state + store in cookie
    nonce: Math.random().toString(36).substring(7), // In production, use a more secure nonce + store in cookie
  });

  return NextResponse.redirect(`${authEndpoint}?${params.toString()}`);
}
