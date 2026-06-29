import type { MiddlewareHandler } from 'hono';
import { logger, withLoggerContext, patchLoggerContext } from '@kairos/utils';

/**
 * Per-request logging middleware.
 *
 * Mounts BEFORE auth so the request-entry log fires even on 401s. Wires the
 * AsyncLocalStorage logger context so every subsequent `logger.*` call inside
 * the request automatically carries requestId / method / path / status /
 * durationMs without plumbing them through call sites.
 *
 * Auth middleware later patches in memberId / activeRole / branchId via
 * `patchLoggerContext(...)` once the JWT is decoded; module code can call the
 * same helper to add fellowship / department dimensions when they're resolved.
 *
 * Emits one summary log line per request on completion. Per-route info logs
 * (member approval, soul conversion, etc.) emit their own entries and inherit
 * the same context — Axiom queries can correlate them by requestId.
 */
export const loggingMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId =
    c.req.header('cf-ray') ??
    c.req.header('x-request-id') ??
    crypto.randomUUID();
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;
  const start = Date.now();

  await withLoggerContext({ requestId, method, path }, async () => {
    try {
      await next();
    } finally {
      const durationMs = Date.now() - start;
      const status = c.res?.status ?? 0;
      // Single summary line per request. Per-handler logs (info / warn) get
      // the same requestId so they're trivially joinable in Axiom.
      logger.info('request', { status, durationMs });
    }
  });
};

/**
 * Re-export of the context patcher so auth middleware (and any module that
 * resolves new dimensions mid-request) has a clean import path.
 */
export { patchLoggerContext };
