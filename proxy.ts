import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = "memories_session";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-memories-app-key-12345");

function removeVietnameseTones(str: string) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  if (url.pathname.startsWith('/uploads/')) {
    const decodedPath = decodeURIComponent(url.pathname);
    const normalizedPath = removeVietnameseTones(decodedPath);
    
    if (decodedPath !== normalizedPath) {
      url.pathname = '/api/serve-upload';
      url.searchParams.set('path', request.nextUrl.pathname);
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

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
    '/uploads/:path*',
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
