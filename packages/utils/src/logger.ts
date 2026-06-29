import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Structured, Workers-friendly logger.
 *
 * Emits one ndjson event per call to console.{info,warn,error,debug}. Cloudflare
 * Workers Logs picks these up automatically; Logpush forwards them to a sink
 * (Axiom recommended for Kairos) where the JSON fields become query columns.
 * That lets you slice logs by branchId / fellowshipId / memberId / requestId
 * without parsing.
 *
 * pino was the obvious choice on Node but relies on streams and worker threads,
 * neither of which exists on Workers. The full pattern (structured fields,
 * levels, child loggers, request-correlated context) fits in ~80 lines without
 * a dep.
 *
 * Request-scoped context (requestId, memberId, branchId, etc.) is set by a
 * Hono middleware at request entry via `withLoggerContext(ctx, fn)` and merged
 * into every log line within the request — no plumbing through call sites.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Per-request fields that get merged into every log entry within the request.
 * Modules can extend their own log calls with ad-hoc fields on top.
 */
export interface LoggerContext {
  requestId?: string;
  method?: string;
  path?: string;
  memberId?: string;
  activeRole?: string;
  branchId?: string;
  fellowshipId?: string;
  departmentId?: string;
  // Open-ended — modules add domain-specific dimensions as needed.
  [key: string]: unknown;
}

const contextStorage = new AsyncLocalStorage<LoggerContext>();

/**
 * Run `fn` with the given log context attached to every logger call within it
 * (and any async work it spawns). The Hono logging middleware uses this at
 * request entry; tests can use it directly to assert correlated output.
 */
export function withLoggerContext<T>(ctx: LoggerContext, fn: () => T): T {
  return contextStorage.run(ctx, fn);
}

/**
 * Mutate the current request's context — useful when downstream code learns
 * something new (e.g. resolved branchId after auth) and wants subsequent log
 * lines in the same request to carry it. No-op outside a withLoggerContext
 * scope so module-level code doesn't crash.
 */
export function patchLoggerContext(patch: Partial<LoggerContext>): void {
  const current = contextStorage.getStore();
  if (current) Object.assign(current, patch);
}

/**
 * Read the current context (mostly for tests / middleware that needs to read
 * back what's tracked).
 */
export function getLoggerContext(): LoggerContext | undefined {
  return contextStorage.getStore();
}

function resolveLevel(): LogLevel {
  // Node path picks up the env var; Workers path falls through to 'info'.
  if (typeof process !== 'undefined' && process.env && process.env['LOG_LEVEL']) {
    return process.env['LOG_LEVEL'] as LogLevel;
  }
  return 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[resolveLevel()];
}

function emit(level: LogLevel, msg: string, fields?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const ctx = contextStorage.getStore();
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(ctx ?? {}),
    ...(fields ?? {}),
  };
  // Always stringify — Workers Logs and downstream Logpush both expect text;
  // Axiom parses the JSON line into columns automatically.
  const out = JSON.stringify(payload);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else if (level === 'debug') console.debug(out);
  else console.info(out);
}

export const logger = {
  debug(msg: string, fields?: Record<string, unknown>) {
    emit('debug', msg, fields);
  },
  info(msg: string, fields?: Record<string, unknown>) {
    emit('info', msg, fields);
  },
  warn(msg: string, fields?: Record<string, unknown>) {
    emit('warn', msg, fields);
  },
  error(msg: string, fields?: Record<string, unknown>) {
    emit('error', msg, fields);
  },
};
