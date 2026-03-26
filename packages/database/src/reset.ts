/**
 * db:drop — Wipes the public schema entirely so that db:migrate can rebuild
 * from a clean slate. Use db:fresh (drop + migrate + seed) for a full reset.
 *
 * ⚠️  DESTRUCTIVE — never run against staging or production.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? 'postgresql://kairos:kairos@localhost:5432/kairos';

async function main() {
  const sql = postgres(url, { max: 1 });
  try {
    console.log('⚠️  Dropping public schema and all its objects...');
    await sql`DROP SCHEMA public CASCADE`;
    await sql`CREATE SCHEMA public`;
    console.log('✅ Schema cleared. Run db:migrate to rebuild.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
