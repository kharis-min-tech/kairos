/**
 * db:diagnose — READ-ONLY staging/production schema reconnaissance.
 *
 * Answers the question `db:bootstrap --dry-run` cannot: is the drizzle journal
 * empty because migrations are genuinely missing, or because the schema was
 * provisioned out-of-band (database/migrations/01-08_*.sql via init_schema.ps1)?
 *
 * Those two cases look identical in the bootstrap dry-run output — every file
 * reports `would-apply` — but they call for opposite actions. This script
 * issues SELECTs only; it never writes.
 *
 *   DATABASE_URL='postgresql://…' npm run db:diagnose --workspace=@kairos/database
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

/** Tables migration 0047 introduces. All five must exist for membership to work. */
const MEMBERSHIP_TABLES = [
  'membership_cohorts',
  'membership_cohort_teachers',
  'membership_sessions',
  'membership_enrollments',
  'membership_session_records',
];

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    console.log(`Target: ${redact(url)}\n`);

    const tableRows = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    console.log(`public tables:            ${tableRows[0]?.count ?? '?'}`);

    const journalExists = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
      ) AS exists
    `;
    if (!journalExists[0]?.exists) {
      console.log(`drizzle journal:          ABSENT (never migrated by drizzle-kit)`);
    } else {
      const journalRows = await sql<{ count: string }[]>`
        SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations
      `;
      const localFiles = readdirSync(join(import.meta.dirname, '..', 'drizzle'))
        .filter((f) => f.endsWith('.sql')).length;
      console.log(
        `drizzle journal rows:     ${journalRows[0]?.count ?? '?'}  (local .sql files: ${localFiles})`,
      );
    }

    console.log(`\nMigration 0047 tables:`);
    for (const t of MEMBERSHIP_TABLES) {
      const [row] = await sql<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = ${t}
        ) AS exists
      `;
      console.log(`  ${row?.exists ? 'present ' : 'MISSING '} ${t}`);
    }

    // A spot-check that the pre-0047 schema is genuinely intact. If these are
    // present the DB is up to date and only 0047 needs applying.
    console.log(`\nRecent pre-0047 landmarks:`);
    for (const [table, column] of [
      ['member_roles', 'scope_kind'],
      ['members', 'membership_class_completed_at'],
      ['department_join_requests', 'probation_outcome'],
    ] as const) {
      const [row] = await sql<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
        ) AS exists
      `;
      console.log(`  ${row?.exists ? 'present ' : 'MISSING '} ${table}.${column}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function redact(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}:***@${u.host}${u.pathname}`;
  } catch {
    return '(unparseable URL)';
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
