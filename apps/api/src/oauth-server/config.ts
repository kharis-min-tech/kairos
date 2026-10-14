import type { Context } from 'hono';

/**
 * Token lifetimes. Industry practice is a minutes-long access token and a
 * rotating refresh token capped by both an idle and an absolute window; the
 * authorization code is single-use and lives about a minute.
 */
export const AUTH_CODE_TTL_SECONDS = 60;
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_IDLE_TTL_SECONDS = 30 * 24 * 60 * 60;
export const REFRESH_ABSOLUTE_TTL_SECONDS = 90 * 24 * 60 * 60;
/** After a secret rotation the old secret keeps working this long. */
export const SECRET_ROTATION_OVERLAP_SECONDS = 24 * 60 * 60;

function readEnv(c: Context | undefined, key: string): string | undefined {
  if (c) {
    const env = (c as { env?: unknown }).env;
    if (env && typeof env === 'object') {
      const v = (env as Record<string, unknown>)[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    const v = process.env[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

/** The web origin. The API shares it in production (Worker on /api/*). */
export function getPublicOrigin(c?: Context): string {
  return (readEnv(c, 'FRONTEND_URL') ?? 'http://localhost:3002').replace(/\/+$/, '');
}

/**
 * The OIDC issuer. It carries the /api/oauth path so discovery, JWKS and the
 * token endpoints all live under the Worker's route without any Pages config.
 */
export function getIssuer(c?: Context): string {
  return `${getPublicOrigin(c)}/api/oauth`;
}

/** The consent screen is a web page: the member's session lives in the browser, not a cookie. */
export function getAuthorizationEndpoint(c?: Context): string {
  return `${getPublicOrigin(c)}/oauth/authorize`;
}

export { readEnv };
