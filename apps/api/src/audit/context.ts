import type { Context } from 'hono';
import type { RequestContext } from './service';

/**
 * Extract IP / user-agent / country from a Hono request. Cloudflare's
 * `CF-Connecting-IP` and `CF-IPCountry` headers are populated by the edge
 * and trusted; otherwise we fall back to `X-Forwarded-For` (proxied dev) or
 * the bare connection's user-agent only.
 */
export function extractRequestContext(c: Context): RequestContext {
  const cfIp = c.req.header('CF-Connecting-IP');
  const xff = c.req.header('X-Forwarded-For');
  const ip = cfIp ?? (xff ? xff.split(',')[0]?.trim() : undefined);
  const country = c.req.header('CF-IPCountry') ?? undefined;
  const userAgent = c.req.header('User-Agent') ?? undefined;
  return { ip, country, userAgent };
}
