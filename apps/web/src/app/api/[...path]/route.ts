import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

type ProxyRouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(
  req: NextRequest,
  { params }: ProxyRouteContext,
) {
  const { path } = await params;

  const targetUrl = `${API_URL}/api/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
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
