// @kairos/api - Database Migration Lambda
// Runs all Drizzle SQL migrations in order against Aurora from inside the VPC.
// Invoke manually: aws lambda invoke --function-name kairos-staging-db-migrate out.json

import type { Handler } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

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
    // 3. Ensure the migrations tracking table exists
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS _drizzle_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 4. Read all migration files and sort alphabetically
    const migrationsDir = '/var/task/migrations/';
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    let applied = 0;
    let skipped = 0;

    for (const file of files) {
      // Check if this migration has already been applied
      const existing = await sql`
        SELECT id FROM _drizzle_migrations WHERE name = ${file}
      `;

      if (existing.length > 0) {
        console.log(`Migration ${file} SKIPPED (already applied)`);
        skipped++;
        continue;
      }

      // Read and execute the migration
      const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const statements = migrationSql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      console.log(`Applying migration ${file} (${statements.length} statements)...`);

      for (let i = 0; i < statements.length; i++) {
        try {
          await sql.unsafe(statements[i]!);
          console.log(`  Statement ${i + 1}/${statements.length} OK`);
        } catch (err: any) {
          // Skip "already exists" errors for idempotency
          if (
            err.message?.includes('already exists') ||
            err.message?.includes('duplicate key')
          ) {
            console.log(`  Statement ${i + 1}/${statements.length} SKIPPED (already exists)`);
          } else {
            console.error(`  Statement ${i + 1}/${statements.length} FAILED:`, err.message);
            throw err;
          }
        }
      }

      // Record the migration as applied
      await sql`
        INSERT INTO _drizzle_migrations (name) VALUES (${file})
      `;
      console.log(`Migration ${file} applied successfully`);
      applied++;
    }

    const summary = `Migration complete: ${applied} applied, ${skipped} skipped (${files.length} total)`;
    console.log(summary);
    return { statusCode: 200, body: summary };
  } finally {
    await sql.end();
  }
};
