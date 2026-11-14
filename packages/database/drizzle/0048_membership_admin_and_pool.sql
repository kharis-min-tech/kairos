-- 0048 — Membership admins, and the interest pool that feeds a cohort.
--
-- Two corrections to 0047, both driven by how the church actually runs the
-- membership class.
--
-- 1. WHO RUNS IT.
--    0047 had no way to say "runs the membership programme" other than
--    `system_role = 'admin'`, because every RBAC grant is scoped to a branch,
--    fellowship or department and a cohort is church-wide. So cohort
--    administration was platform-admin only, which is far too much authority
--    for the handful of people who actually teach and run the class.
--
--    This migration adds a fourth scope kind, 'church', and one role that
--    uses it: Membership Admin. `member_roles.scope_kind` has no CHECK
--    constraint, so the value needs no DDL — only the seeded role row and the
--    application-side catalog in packages/types/src/rbac.ts.
--
--    Church-scoped rows store the nil UUID in `scope_id` (the column is NOT
--    NULL and a church scope has no entity to point at) and the grantee's
--    home branch in `branch_id` (which 0027 documents as a query handle, not
--    the grant's reach). Neither is dereferenced for a church grant.
--
-- 2. HOW PEOPLE GET IN.
--    0047 modelled enrolment as self-service: pick a cohort, enrol, done.
--    The real flow has two stages. You express interest, which puts you in a
--    church-wide pool that belongs to no cohort. An admin later admits you
--    into a specific cohort. The gap matters: someone who expressed interest
--    and then stopped attending for a season must not roll silently into the
--    next intake, because they most likely will not be there.
--
--    Hence `membership_interest`, with an explicit `expires_at`. Entries
--    lapse on their own; see the note on that column for why the lapse is
--    materialised rather than left as a view-time predicate.
--
-- Also drops `membership_cohort_teachers`. Its only purpose in 0047 was
-- carrying marking authority, and marking is now an admin action. Teaching is
-- already modelled where it belongs: `membership_sessions.teacher_id`, one
-- per session, because different people teach different sessions of the same
-- cohort.

-- ---------------------------------------------------------------------------
-- MEMBERSHIP ADMIN ROLE
-- The first and only church-scoped role.
-- ---------------------------------------------------------------------------
-- Idempotent via NOT EXISTS rather than ON CONFLICT. `ON CONFLICT (role_name)`
-- requires a unique constraint on that column, and staging's public schema was
-- provisioned out-of-band (see the db:diagnose docstring), so its constraint
-- set cannot be assumed to match what the Drizzle schema declares. A missing
-- constraint would fail the whole migration with "no unique or exclusion
-- constraint matching the ON CONFLICT specification". This form needs none.
INSERT INTO roles (role_name, description)
SELECT
  'Membership Admin',
  'Runs the church-wide membership class: cohorts, sessions, the interest pool, admission, marking and graduation. Church-scoped, not branch-scoped.'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Membership Admin');

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_INTEREST
-- The pool. Cohort-independent by design: you join it before there is a
-- cohort to join, and an admin decides which intake you land in.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  -- Denormalised from members.home_branch_id when interest is expressed, for
  -- the same reason membership_enrollments carries it: the pool is
  -- church-wide, so this is the only handle a branch leader has on it.
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- waiting  — in the pool, awaiting admission
  -- admitted — an admin placed them in a cohort (admitted_cohort_id says which)
  -- lapsed   — expires_at passed while still waiting
  -- withdrawn— they took themselves back out
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  expressed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  /*
   * When this entry stops counting as waiting.
   *
   * Stored per row rather than derived from a constant so that changing the
   * window later does not retroactively lapse or revive anybody.
   *
   * The lapse is MATERIALISED, not computed at read time: the application
   * runs a cheap indexed UPDATE (status='lapsed' WHERE status='waiting' AND
   * expires_at <= NOW()) before any pool read or write. Three reasons over a
   * view-time predicate:
   *   - `uq_membership_interest_waiting` below can then be a plain partial
   *     unique index. If 'waiting' silently meant "waiting or long expired",
   *     an expired row would block the member from re-expressing interest.
   *   - Anything reading this table directly (exports, reports, a psql
   *     session) sees the honest status.
   *   - No cron. A scheduled sweep can fail to run and drift; this cannot,
   *     because nothing observes the pool without first settling it.
   */
  expires_at TIMESTAMP NOT NULL,
  admitted_cohort_id UUID REFERENCES membership_cohorts(id) ON DELETE SET NULL,
  admitted_at TIMESTAMP,
  admitted_by UUID REFERENCES members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT membership_interest_status_check
    CHECK (status IN ('waiting', 'admitted', 'lapsed', 'withdrawn')),
  CONSTRAINT membership_interest_expiry_check
    CHECK (expires_at > expressed_at),
  -- An admitted row must say where to; nothing else may.
  CONSTRAINT membership_interest_admitted_check
    CHECK (
      (status = 'admitted' AND admitted_cohort_id IS NOT NULL AND admitted_at IS NOT NULL)
      OR (status <> 'admitted' AND admitted_cohort_id IS NULL AND admitted_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_membership_interest_member_id
  ON membership_interest (member_id);
CREATE INDEX IF NOT EXISTS idx_membership_interest_branch_id
  ON membership_interest (branch_id);
CREATE INDEX IF NOT EXISTS idx_membership_interest_status
  ON membership_interest (status);
-- Drives the lapse sweep. Partial, so it stays small: settled rows never
-- match the sweep's predicate.
CREATE INDEX IF NOT EXISTS idx_membership_interest_expiry
  ON membership_interest (expires_at)
  WHERE status = 'waiting';
-- One live pool entry per member. Re-expressing interest after a lapse or a
-- withdrawal is a NEW row, which is the point: the wait restarts, so nobody
-- accumulates seniority during a season away.
CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_interest_waiting
  ON membership_interest (member_id)
  WHERE status = 'waiting';

DROP TRIGGER IF EXISTS set_membership_interest_updated_at ON membership_interest;
CREATE TRIGGER set_membership_interest_updated_at
  BEFORE UPDATE ON membership_interest
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- ENROLMENT PROVENANCE
--
-- `self_enrolled` recorded the only distinction 0047 had: did the member
-- enrol themselves, or did an admin do it. Self-enrolment is gone, so nothing
-- can ever set that flag true again and the column would sit permanently
-- false — a field that looks like data but only records the year the row was
-- written.
--
-- The distinction that survives is whether the member came through the pool
-- or was added directly by an admin (the paper-signup case), so the column is
-- renamed to say that. Existing self-enrolments were people choosing to be
-- there, which is what a pool entry represents, so their TRUE carries over
-- unchanged.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'membership_enrollments' AND column_name = 'self_enrolled'
  ) THEN
    ALTER TABLE membership_enrollments RENAME COLUMN self_enrolled TO from_pool;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- DROP MEMBERSHIP_COHORT_TEACHERS
-- Marking is an admin action now, so this table carries no authority, and
-- teaching is per session rather than per cohort.
--
-- Before dropping it, rescue what it knew: a session with no teacher of its
-- own inherits the cohort's lead teacher, or its sole teacher if there is
-- exactly one and no lead. A cohort with several teachers and no lead is
-- genuinely ambiguous at the session level, so those sessions are left blank
-- for an admin to fill in.
-- ---------------------------------------------------------------------------
-- Guarded so the whole migration stays re-runnable: on a second pass the
-- table is already gone and the backfill is simply skipped.
DO $$
BEGIN
  IF to_regclass('public.membership_cohort_teachers') IS NOT NULL THEN
    UPDATE membership_sessions s
    SET teacher_id = t.member_id
    FROM (
      SELECT DISTINCT ON (cohort_id) cohort_id, member_id
      FROM membership_cohort_teachers
      WHERE cohort_id IN (
        SELECT cohort_id FROM membership_cohort_teachers
        GROUP BY cohort_id
        HAVING COUNT(*) FILTER (WHERE role = 'lead') = 1 OR COUNT(*) = 1
      )
      ORDER BY cohort_id, (role = 'lead') DESC, assigned_at ASC
    ) t
    WHERE s.cohort_id = t.cohort_id AND s.teacher_id IS NULL;
  END IF;
END $$;

DROP TABLE IF EXISTS membership_cohort_teachers;
