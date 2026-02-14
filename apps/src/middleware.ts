import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side middleware for route protection and security headers.
 *
 * Because Cognito OIDC tokens are stored client-side by react-oidc-context,
 * we cannot fully validate JWTs in Edge middleware without extra infrastructure.
 * Instead we enforce:
 *  1. A lightweight session cookie check for protected routes — the cookie is
 *     set by the client after successful OIDC authentication.
 *  2. Security response headers on every request.
 *  3. Redirect unauthenticated traffic away from protected paths.
 */

// Routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/members',
  '/events',
  '/giving',
  '/settings',
  '/profile',
];

// Routes that are always public
const PUBLIC_PATHS = [
  '/',
  '/auth',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/silent-callback',
  '/api',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, _next internals, and favicons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // e.g. .css, .js, .png, .ico
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // ── Security headers ──────────────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // ── Route protection ──────────────────────────────────────────────
  // For protected routes, look for the OIDC user key in cookies.
  // The client-side auth provider should set a lightweight flag cookie
  // after successful authentication (see auth-provider.tsx).
  if (isProtectedPath(pathname)) {
    const hasAuthSession = request.cookies.get('kcms_auth_session');

    if (!hasAuthSession) {
      const signInUrl = request.nextUrl.clone();
      signInUrl.pathname = '/';
      signInUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
