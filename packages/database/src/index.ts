import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Options } from 'postgres';
import * as schema from './schema';

export interface CreateDbOptions {
  /** Extra postgres.js client options. Merged over the Workers/Hyperdrive defaults. */
  postgresOptions?: Options<Record<string, never>>;
}

export function createDb(connectionString: string, opts: CreateDbOptions = {}) {
  const client = postgres(connectionString, {
    // prepare: false is required for poolers (Cloudflare Hyperdrive, PgBouncer
    // in transaction mode). Slightly slower on direct Node connections, but
    // we need a single configuration that works in both runtimes.
    prepare: false,
    ...(opts.postgresOptions ?? {}),
  });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

export * from './schema';
