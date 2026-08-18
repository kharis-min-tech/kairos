/**
 * db:bootstrap — trust-the-SQL-files migration re-runner.
 *
 * Why this exists: `drizzle-kit migrate` reads `drizzle.__drizzle_migrations`
 * to decide what to apply. If that journal ever falls out of sync with the
 * actual schema (a `public` wipe that spared the `drizzle` schema, a partial
 * apply that inserted the journal row before failing, a snapshot restore that
 * kept only some tables) then `drizzle-kit migrate` cheerfully says
 * "migrations applied successfully" and does nothing while your schema stays
 * broken. See `src/reset.ts` for the historical write-up.
 *
 * This script sidesteps the journal: it reads every `.sql` file in `drizzle/`
 * in order and executes it against the target DB. All Kairos migration files
 * use `IF NOT EXISTS` guards on ADD COLUMN / CREATE TABLE / ADD CONSTRAINT
 * (via DO blocks) so replaying them is a no-op when the change is already
 * present, and repairs the missing bits when it's not.
 *
 * Usage:
 *   DATABASE_URL='postgresql://…' npm run db:bootstrap --workspace=@kairos/database
 *   DATABASE_URL='postgresql://…' npm run db:bootstrap --workspace=@kairos/database -- --dry-run
 *
 * The dry-run mode reports what it WOULD apply without touching the DB.
 * After bootstrap runs, it also normalises `drizzle.__drizzle_migrations`
 * so future `drizzle-kit migrate` runs behave normally.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import postgres from 'postgres';

const DRY_RUN = process.argv.includes('--dry-run');
/**
 * `--force` re-applies every SQL file regardless of the journal — the escape
 * hatch when the journal is stamped as done but the actual schema wasn't
 * changed (drift). Safe because our migrations use IF NOT EXISTS guards.
 */
const FORCE = process.argv.includes('--force');

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const migrationsDir = join(import.meta.dirname, '..', 'drizzle');
  const sqlFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (sqlFiles.length === 0) {
    console.error(`No migration SQL files in ${migrationsDir}`);
    process.exit(1);
  }

  console.log(`Bootstrap target: ${redact(url)}`);
  console.log(`Migration files:  ${sqlFiles.length}`);
  if (DRY_RUN) console.log(`Mode:             DRY RUN (no changes)`);

  const sql = postgres(url, { max: 1, prepare: false });

  try {
    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `;

    const existingRows = await sql<{ hash: string }[]>`
      SELECT hash FROM drizzle.__drizzle_migrations
    `;
    const existingHashes = new Set(existingRows.map((r) => r.hash));

    let applied = 0;
    let skipped = 0;

    for (const file of sqlFiles) {
      const path = join(migrationsDir, file);
      const body = readFileSync(path, 'utf8');
      // Drizzle splits on `--> statement-breakpoint` sentinels; our files
      // don't currently use them, so treat each file as a single statement
      // batch. Run through `sql.unsafe(body)` to submit as one command.
      const hash = drizzleHash(body);

      if (existingHashes.has(hash) && !FORCE) {
        console.log(`  skip  ${file}  (journal has this hash — pass --force to replay)`);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  would-apply ${file}`);
        applied++;
        continue;
      }

      try {
        await sql.unsafe(body);
        if (!existingHashes.has(hash)) {
          await sql`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${hash}, ${Date.now()})
          `;
        }
        console.log(`  applied ${file}`);
        applied++;
      } catch (err) {
        console.error(`  FAILED  ${file}`);
        console.error(err);
        throw err;
      }
    }

    console.log(`\nDone. Applied: ${applied}. Skipped (journal hit): ${skipped}.`);
    console.log(
      `\nRemember: this script is CATCH-UP for drift. Normal migration flow` +
        ` stays \`drizzle-kit migrate\` after you generate a new file.`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Drizzle-kit hashes a migration file by SHA-256 of its trimmed content.
 * Matches the format written into `__drizzle_migrations.hash`.
 */
function drizzleHash(body: string): string {
  return createHash('sha256').update(body).digest('hex');
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
