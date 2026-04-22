import { type NextRequest, NextResponse } from 'next/server';

// Read at request time (runtime) — works in Docker standalone regardless of build env.
const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const targetUrl = `${API_URL}/api/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  // Remove headers that cause issues when forwarding
  headers.delete('host');

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // @ts-expect-error — duplex is required for streaming bodies in Node 18+
    init.duplex = 'half';
    init.body = req.body;
  }

  const upstream = await fetch(targetUrl, init);

  const responseHeaders = new Headers(upstream.headers);
  // Strip hop-by-hop headers
  responseHeaders.delete('transfer-encoding');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
