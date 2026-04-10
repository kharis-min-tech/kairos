// @kairos/db-client - Drizzle ORM database client with connection pooling
// Uses postgres.js driver for Aurora Serverless v2 (PostgreSQL 15)
// Supports both DATABASE_URL and DATABASE_SECRET_ARN (auto-resolves from Secrets Manager)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
let dbInstance = null;
let sqlInstance = null;
let cachedConnectionString = null;
function createPostgresClient(connectionString, options = {}) {
    return postgres(connectionString, {
        max: options.maxConnections ?? 1,
        idle_timeout: options.idleTimeout ?? 20,
        connect_timeout: options.connectTimeout ?? 10,
        prepare: false,
        ssl: process.env['DATABASE_SECRET_ARN'] ? { rejectUnauthorized: false } : undefined,
    });
}
async function resolveConnectionString(explicit) {
    if (explicit)
        return explicit;
    if (cachedConnectionString)
        return cachedConnectionString;
    const envUrl = process.env['DATABASE_URL'];
    if (envUrl) {
        cachedConnectionString = envUrl;
        return envUrl;
    }
    const secretArn = process.env['DATABASE_SECRET_ARN'];
    if (secretArn) {
        const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
        const client = new SecretsManagerClient({});
        const result = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
        const creds = JSON.parse(result.SecretString);
        const url = `postgres://${creds.username}:${encodeURIComponent(creds.password)}@${creds.host}:${creds.port}/${creds.dbname}`;
        cachedConnectionString = url;
        return url;
    }
    throw new Error('Database connection not configured. Set DATABASE_URL or DATABASE_SECRET_ARN.');
}
export async function initDb(options = {}) {
    if (dbInstance)
        return dbInstance;
    const connectionString = await resolveConnectionString(options.connectionString);
    sqlInstance = createPostgresClient(connectionString, options);
    dbInstance = drizzle(sqlInstance);
    return dbInstance;
}
export function getDb(options = {}) {
    if (dbInstance)
        return dbInstance;
    const connectionString = options.connectionString ?? process.env['DATABASE_URL'] ?? cachedConnectionString;
    if (!connectionString) {
        throw new Error('Database not initialized. Call await initDb() first, or set DATABASE_URL.');
    }
    sqlInstance = createPostgresClient(connectionString, options);
    dbInstance = drizzle(sqlInstance);
    return dbInstance;
}
export function createDbClient(options = {}) {
    return getDb(options);
}
export async function resetDb() {
    if (sqlInstance) {
        await sqlInstance.end();
        sqlInstance = null;
    }
    dbInstance = null;
    cachedConnectionString = null;
}
//# sourceMappingURL=client.js.map