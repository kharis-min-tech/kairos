import { createDb, type Database } from '@kairos/database';

/**
 * Connection-string source. Workers will plumb `c.env.HYPERDRIVE.connectionString`
 * in PR 4 via `bindDbEnv()`; Node reads `process.env.DATABASE_URL` lazily on first use.
 *
 * Module-load must not read env: Cloudflare Workers initialises modules without
 * `process` bindings populated, and Hyperdrive secrets only arrive per-request.
 */

let _db: Database | null = null;
let _connectionString: string | null = null;

function resolveConnectionString(): string {
  if (_connectionString) return _connectionString;
  if (typeof process !== 'undefined' && process.env) {
    const url = process.env['DATABASE_URL'];
    if (typeof url === 'string' && url.length > 0) return url;
  }
  throw new Error('DATABASE_URL is not configured');
}

/** Set the connection string at runtime (called from the Workers fetch handler in PR 4). */
export function bindDbEnv(connectionString: string): void {
  if (_db && _connectionString && _connectionString !== connectionString) {
    throw new Error('bindDbEnv called with a different connection string after init');
  }
  _connectionString = connectionString;
}

function getDb(): Database {
  if (_db) return _db;
  _db = createDb(resolveConnectionString());
  return _db;
}

/**
 * Lazy proxy: every property access defers to a real Database instance that is
 * built on first use. Lets existing `import { db } from '../db'` callsites stay
 * unchanged while moving the DATABASE_URL read off the module-load path.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
}) as Database;

export type { Database };
