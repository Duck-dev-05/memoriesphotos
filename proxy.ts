import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = "memories_session";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-memories-app-key-12345");

export async function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  if (!session) {
    return redirectToLogin(request);
  }

  try {
    await jwtVerify(session, SECRET);
    return NextResponse.next();
  } catch (error) {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/upload/:path*',
    '/albums/:path*',
    '/favorites/:path*',
    '/timeline/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/shared-albums/:path*',
    '/trash/:path*',
    '/map/:path*',
    '/search/:path*',
  ]
};
