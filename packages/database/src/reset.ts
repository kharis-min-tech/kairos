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
 * ⚠️  DESTRUCTIVE. The warning used to be this comment and nothing else, so
 * a DATABASE_URL left pointing at staging in your shell would erase it with no
 * prompt. It now refuses any host that is not local unless you pass --force.
 * `db:fresh` is unaffected: it resets localhost, which the guard allows.
 *
 * To apply schema changes to a database that has real accounts on it, use
 * `db:bootstrap` — it runs pending migrations and destroys nothing.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? 'postgresql://kairos:kairos@localhost:5432/kairos';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal', 'db', 'postgres']);

/** Refuse to drop a remote schema that somebody is probably using. */
function guardRemote(target: string, force: boolean) {
  let host: string;
  try {
    host = new URL(target).hostname;
  } catch {
    // An unparseable URL is not something to take a DROP SCHEMA guess at.
    console.error('Refusing to drop: DATABASE_URL is not a URL this script can read.');
    process.exit(1);
  }
  if (LOCAL_HOSTS.has(host) || force) {
    if (!LOCAL_HOSTS.has(host)) {
      console.warn(`⚠️  --force: dropping the schema on REMOTE host ${host}.\n`);
    }
    return;
  }

  console.error('');
  console.error(`Refusing to drop: ${host} is not a local database.`);
  console.error('');
  console.error('  db:drop runs DROP SCHEMA public CASCADE. Everything goes —');
  console.error('  every branch, member, grant, record and tester account.');
  console.error('');
  console.error('  To apply pending migrations without destroying anything:');
  console.error('      npm run db:bootstrap --workspace=@kairos/database');
  console.error('');
  console.error('  If you genuinely meant to wipe this remote database:');
  console.error('      npm run db:drop --workspace=@kairos/database -- --force');
  console.error('');
  process.exit(1);
}

async function main() {
  guardRemote(url, process.argv.includes('--force'));
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
