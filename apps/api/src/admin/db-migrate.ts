// @kairos/api - Database Migration Lambda
// Runs the Drizzle SQL migration against Aurora from inside the VPC.
// Invoke manually: aws lambda invoke --function-name kairos-staging-db-migrate out.json

import type { Handler } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import postgres from 'postgres';
import * as fs from 'fs';

const secretsClient = new SecretsManagerClient({});

export const handler: Handler = async () => {
  const secretArn = process.env['DATABASE_SECRET_ARN'];
  if (!secretArn) throw new Error('DATABASE_SECRET_ARN is required');

  // 1. Get database credentials from Secrets Manager
  const secret = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretArn })
  );
  const creds = JSON.parse(secret.SecretString!);
  const connectionString = `postgres://${creds.username}:${encodeURIComponent(creds.password)}@${creds.host}:${creds.port}/${creds.dbname}`;

  // 2. Connect to Aurora
  const sql = postgres(connectionString, {
    max: 1,
    connect_timeout: 30,
    idle_timeout: 5,
    ssl: 'require',
  });

  try {
    // 3. Read and execute the migration SQL
    const migrationPath = process.env['MIGRATION_PATH'] || '/var/task/migration.sql';
    let migrationSql: string;

    if (fs.existsSync(migrationPath)) {
      migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    } else {
      // Fallback: migration SQL is bundled inline via environment variable
      const inlineSql = process.env['MIGRATION_SQL'];
      if (!inlineSql) {
        throw new Error('No migration SQL found. Set MIGRATION_PATH or MIGRATION_SQL.');
      }
      migrationSql = inlineSql;
    }

    // Split by Drizzle statement breakpoints and execute each
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Executing ${statements.length} migration statements...`);

    for (let i = 0; i < statements.length; i++) {
      try {
        await sql.unsafe(statements[i]!);
        console.log(`Statement ${i + 1}/${statements.length} OK`);
      } catch (err: any) {
        // Skip "already exists" errors for idempotency
        if (
          err.message?.includes('already exists') ||
          err.message?.includes('duplicate key')
        ) {
          console.log(`Statement ${i + 1}/${statements.length} SKIPPED (already exists)`);
        } else {
          console.error(`Statement ${i + 1}/${statements.length} FAILED:`, err.message);
          throw err;
        }
      }
    }

    console.log('Migration completed successfully');
    return { statusCode: 200, body: `Migration complete: ${statements.length} statements executed` };
  } finally {
    await sql.end();
  }
};
