/**
 * Idempotent admin bootstrap. Run once against any environment (local, prod)
 * to ensure a region, a home branch, and a system-admin member exist.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com \
 *   ADMIN_PASSWORD='S0meStrongPass!' \
 *   ADMIN_FIRST_NAME=Daniel \
 *   ADMIN_LAST_NAME=Bolarinwa \
 *   DATABASE_URL='postgresql://...psdb.cloud:5432/postgres?sslmode=require' \
 *     npx tsx packages/database/src/seed-admin.ts
 *
 * Re-running with the same email is safe: the script does nothing if the admin
 * already exists. Region/branch are created if absent, reused if present.
 */
import { eq, and } from 'drizzle-orm';
import { createDb } from './index';
import { regions, branches, members } from './schema';
import { hashPassword } from '@kairos/utils';

const DEFAULT_REGION_NAME = 'United Kingdom';
const DEFAULT_REGION_COUNTRY = 'United Kingdom';
const DEFAULT_BRANCH_NAME = 'Kharis London Central';

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

async function main() {
  const email = requiredEnv('ADMIN_EMAIL').toLowerCase();
  const password = requiredEnv('ADMIN_PASSWORD');
  const firstName = requiredEnv('ADMIN_FIRST_NAME');
  const lastName = requiredEnv('ADMIN_LAST_NAME');
  const regionName = process.env['ADMIN_REGION_NAME'] ?? DEFAULT_REGION_NAME;
  const regionCountry = process.env['ADMIN_REGION_COUNTRY'] ?? DEFAULT_REGION_COUNTRY;
  const branchName = process.env['ADMIN_BRANCH_NAME'] ?? DEFAULT_BRANCH_NAME;

  const databaseUrl = requiredEnv('DATABASE_URL');
  const db = createDb(databaseUrl);

  console.log(`Bootstrapping admin against ${new URL(databaseUrl).host}\n`);

  const existingMember = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  if (existingMember.length > 0) {
    if (process.env['ADMIN_RESET_PASSWORD'] === 'true') {
      const newHash = await hashPassword(password);
      await db
        .update(members)
        .set({
          passwordHash: newHash,
          systemRole: 'admin',
          approvalStatus: 'approved',
          emailVerified: true,
          isActive: true,
        })
        .where(eq(members.email, email));
      console.log(`✓ Admin password reset for ${email} (new argon2 params applied).`);
      process.exit(0);
    }
    console.log(
      `✓ Admin already exists for ${email}. Pass ADMIN_RESET_PASSWORD=true to overwrite.`,
    );
    process.exit(0);
  }

  let region = await db
    .select()
    .from(regions)
    .where(eq(regions.regionName, regionName))
    .limit(1)
    .then((r) => r[0]);

  if (!region) {
    [region] = await db
      .insert(regions)
      .values({ regionName, country: regionCountry })
      .returning();
    console.log(`✓ Created region: ${regionName}`);
  } else {
    console.log(`• Region exists: ${regionName}`);
  }

  let branch = await db
    .select()
    .from(branches)
    .where(and(eq(branches.branchName, branchName), eq(branches.regionId, region!.id)))
    .limit(1)
    .then((r) => r[0]);

  if (!branch) {
    [branch] = await db
      .insert(branches)
      .values({
        branchName,
        regionId: region!.id,
        branchType: 'Main',
        isActive: true,
      })
      .returning();
    console.log(`✓ Created branch: ${branchName}`);
  } else {
    console.log(`• Branch exists: ${branchName}`);
  }

  const passwordHash = await hashPassword(password);

  await db.insert(members).values({
    firstName,
    lastName,
    email,
    homeBranchId: branch!.id,
    passwordHash,
    emailVerified: true,
    approvalStatus: 'approved',
    systemRole: 'admin',
    memberType: 'member',
    isActive: true,
  });

  console.log(`\n✓ Admin member created: ${firstName} ${lastName} <${email}>`);
  console.log(`  systemRole=admin, branch=${branchName}`);
  console.log(`\nYou can now log in at the web app with the password you supplied.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('\n✘ Admin bootstrap failed:');
  console.error(err);
  process.exit(1);
});
