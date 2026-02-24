import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
export type DbClient = PostgresJsDatabase;
export type TransactionClient = Parameters<Parameters<DbClient['transaction']>[0]>[0];
export interface DbClientOptions {
    connectionString?: string;
    maxConnections?: number;
    idleTimeout?: number;
    connectTimeout?: number;
}
export declare function initDb(options?: DbClientOptions): Promise<DbClient>;
export declare function getDb(options?: DbClientOptions): DbClient;
export declare function createDbClient(options?: DbClientOptions): DbClient;
export declare function resetDb(): Promise<void>;
//# sourceMappingURL=client.d.ts.map