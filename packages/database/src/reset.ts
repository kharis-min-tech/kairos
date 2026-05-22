/**
 * db:drop — Wipes the public schema AND drizzle-kit's migration ledger so that
 * db:migrate can rebuild from a truly clean slate. Use db:fresh (drop + migrate
 * + seed) for a full reset.
 *
 * The migration ledger (`drizzle.__drizzle_migrations`) lives in its own `drizzle`
 * schema, separate from `public`. Dropping only `public` leaves the ledger behind,
 * so `drizzle-kit migrate` then believes every migration is already applied and
 * runs none against the now-empty `public` — leaving tables/columns missing and
 * breaking the seed. Dropping both keeps resets honest.
 *
 * ⚠️  DESTRUCTIVE — never run against staging or production.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? 'postgresql://kairos:kairos@localhost:5432/kairos';

async function main() {
  const sql = postgres(url, { max: 1 });
  try {
    console.log('⚠️  Dropping public schema and the drizzle migration ledger...');
    await sql`DROP SCHEMA public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    console.log('✅ Schema + migration ledger cleared. Run db:migrate to rebuild.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
