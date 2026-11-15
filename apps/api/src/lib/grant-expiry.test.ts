/**
 * Grant expiry, against a REAL Postgres (PGlite, in-process).
 *
 * The mocked Drizzle chain in `grants.test.ts` hands back whatever rows the
 * test provides and never evaluates a WHERE clause, so it cannot tell an
 * enforced predicate from an absent one. That is exactly the bug being fixed
 * here: `member_roles.end_date` was read by nothing, and a mock would have
 * gone on passing either way.
 *
 * So these run the real comparison, against real rows, with the database's
 * own CURRENT_DATE.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { Database } from '@kairos/database';
import { resolveGrants } from './grants';

const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const BRANCH_ID = '33333333-3333-3333-3333-333333333333';
const ROLE_ID = '44444444-4444-4444-4444-444444444444';

let db: Database;
let pg: PGlite;

beforeAll(async () => {
  pg = new PGlite();
  // Only the columns the grant query touches. A fuller schema would make this
  // slower without making it prove more.
  await pg.exec(`
    CREATE TABLE roles (
      id uuid PRIMARY KEY,
      role_name varchar(100) NOT NULL,
      is_active boolean NOT NULL DEFAULT true
    );
    CREATE TABLE member_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id uuid NOT NULL,
      role_id uuid NOT NULL,
      branch_id uuid NOT NULL,
      scope_kind varchar(20) NOT NULL DEFAULT 'branch',
      scope_id uuid NOT NULL,
      assigned_date date NOT NULL DEFAULT CURRENT_DATE,
      end_date date,
      is_active boolean NOT NULL DEFAULT true,
      CHECK (end_date IS NULL OR end_date >= assigned_date)
    );
    CREATE TABLE branch_leadership (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id uuid NOT NULL,
      branch_id uuid NOT NULL,
      role varchar(100) NOT NULL,
      is_current boolean NOT NULL DEFAULT true,
      is_active boolean NOT NULL DEFAULT true,
      end_date date
    );
  `);
  db = drizzle(pg) as unknown as Database;

  await pg.exec(`
    INSERT INTO roles (id, role_name) VALUES ('${ROLE_ID}', 'Branch System Admin');
  `);
});

beforeEach(async () => {
  await pg.exec(`DELETE FROM member_roles;`);
});

/** A grant with the given end date, or none. `offsetDays` is from today. */
async function grantEndingIn(offsetDays: number | null): Promise<void> {
  const endDate = offsetDays === null ? 'NULL' : `CURRENT_DATE + ${offsetDays}`;
  // assigned_date is pushed back far enough that the CHECK constraint holds
  // even for an end date in the past.
  await pg.exec(`
    INSERT INTO member_roles (member_id, role_id, branch_id, scope_kind, scope_id, assigned_date, end_date)
    VALUES ('${MEMBER_ID}', '${ROLE_ID}', '${BRANCH_ID}', 'branch', '${BRANCH_ID}',
            CURRENT_DATE - 365, ${endDate});
  `);
}

describe('grant expiry', () => {
  it('honours a grant with no end date, which is what nearly all of them carry', async () => {
    await grantEndingIn(null);
    expect(await resolveGrants(db, MEMBER_ID)).toHaveLength(1);
  });

  it('honours a grant whose end date is still ahead', async () => {
    await grantEndingIn(30);
    expect(await resolveGrants(db, MEMBER_ID)).toHaveLength(1);
  });

  /**
   * The bug. Before this predicate existed, a grant that expired in March
   * still conferred every capability it ever had, while the administrator who
   * set the date believed it was handled.
   */
  it('drops a grant whose end date has passed', async () => {
    await grantEndingIn(-1);
    expect(await resolveGrants(db, MEMBER_ID)).toEqual([]);
  });

  it('drops one that expired long ago', async () => {
    await grantEndingIn(-200);
    expect(await resolveGrants(db, MEMBER_ID)).toEqual([]);
  });

  /**
   * The boundary, and the reason the comparison is `>=` rather than `>`.
   * Someone covering "until the 30th" expects the 30th to work. Ending them
   * at midnight on the 30th would cut a day off every temporary grant anyone
   * ever sets.
   */
  it('honours a grant on its last day', async () => {
    await grantEndingIn(0);
    expect(await resolveGrants(db, MEMBER_ID)).toHaveLength(1);
  });

  it('keeps the live grants of a member who also holds an expired one', async () => {
    await grantEndingIn(null);
    await grantEndingIn(-5);
    expect(await resolveGrants(db, MEMBER_ID)).toHaveLength(1);
  });

  /**
   * `is_active = false` and an expiry are different things and both must bite.
   * A revoked grant with a future end date must not come back.
   */
  it('still drops a deactivated grant whose end date is in the future', async () => {
    await pg.exec(`
      INSERT INTO member_roles (member_id, role_id, branch_id, scope_kind, scope_id, end_date, is_active)
      VALUES ('${MEMBER_ID}', '${ROLE_ID}', '${BRANCH_ID}', 'branch', '${BRANCH_ID}',
              CURRENT_DATE + 30, false);
    `);
    expect(await resolveGrants(db, MEMBER_ID)).toEqual([]);
  });
});
