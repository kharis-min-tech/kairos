import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Strip X-Frame-Options from proxied MM responses so the iframe can embed
  // Mattermost inside Kairos. The CSP frame-ancestors header already correctly
  // restricts framing to http://localhost:3002 (set via MM_SERVICESETTINGS_FRAMEANCESTORS).
  if (request.nextUrl.pathname.startsWith('/mm')) {
    response.headers.delete('x-frame-options');
    response.headers.delete('X-Frame-Options');
  }

  return response;
}

export const config = {
  matcher: ['/mm', '/mm/', '/mm/:path*'],
};
