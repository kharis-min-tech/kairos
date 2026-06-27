import { AsyncLocalStorage } from 'node:async_hooks';
import { createDb, type Database } from '@kairos/database';

/**
 * Workers I/O isolation: postgres-js clients open a TCP socket on first query,
 * and that socket belongs to the request that created it. Caching the client
 * across requests trips the "Cannot perform I/O on behalf of a different request"
 * error. So in Workers we create a fresh client per request and stash it in
 * AsyncLocalStorage. Hyperdrive does the pooling on the edge — no perf hit.
 *
 * In Node (dev / seed scripts) there's no per-request boundary, so we keep a
 * process-wide singleton driven by DATABASE_URL.
 */

const dbStorage = new AsyncLocalStorage<Database>();

let _nodeDb: Database | null = null;

function resolveNodeConnectionString(): string {
  if (typeof process !== 'undefined' && process.env) {
    const url = process.env['DATABASE_URL'];
    if (typeof url === 'string' && url.length > 0) return url;
  }
  throw new Error('DATABASE_URL is not configured');
}

/**
 * Wrap a request handler so every `db` access inside resolves to a fresh
 * postgres-js client created from the supplied connection string. Used by the
 * Workers entry (worker.ts) once per fetch.
 */
export function withDb<T>(connectionString: string, fn: () => Promise<T>): Promise<T> {
  const requestDb = createDb(connectionString);
  return dbStorage.run(requestDb, fn);
}

function getDb(): Database {
  const requestDb = dbStorage.getStore();
  if (requestDb) return requestDb;
  if (_nodeDb) return _nodeDb;
  _nodeDb = createDb(resolveNodeConnectionString());
  return _nodeDb;
}

/**
 * Lazy proxy: every property access defers to a Database instance. In Workers
 * that's the per-request client from AsyncLocalStorage; in Node it's the
 * process-wide singleton. Keeps `import { db } from '../db'` unchanged across
 * every service file.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
}) as Database;

export type { Database };
