/**
 * Playwright global setup — resets the database to a clean seeded state
 * before each test run so tests are idempotent.
 */
import { execSync } from 'child_process';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

export default async function globalSetup() {
  console.log('\n🔄 Resetting database to clean seed state…');

  // Truncate all tables (CASCADE handles FK dependencies)
  execSync(
    `docker exec kairos-db psql -U kairos -d kairos -c "TRUNCATE regions, roles CASCADE;"`,
    { stdio: 'inherit' },
  );

  // Brief pause to let PostgreSQL release connections
  await new Promise((r) => setTimeout(r, 1000));

  // Re-seed
  execSync('npx tsx src/seed.ts', {
    stdio: 'inherit',
    cwd: path.join(ROOT, 'packages/database'),
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://kairos:kairos@localhost:5430/kairos',
    },
  });

  console.log('✅ Database ready\n');
}
