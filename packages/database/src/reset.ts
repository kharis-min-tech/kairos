/**
 * db:drop — Wipes the public schema entirely so that db:migrate can rebuild
 * from a clean slate. Use db:fresh (drop + migrate + seed) for a full reset.
 *
 * ⚠️  DESTRUCTIVE — never run against staging or production.
 */
import { Client } from 'pg';

const url = process.env.DATABASE_URL ?? 'postgresql://kairos:kairos@127.0.0.1:5433/kairos';

async function main() {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log('⚠️  Dropping public schema and all its objects...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    console.log('✅ Schema cleared. Run db:migrate to rebuild.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
