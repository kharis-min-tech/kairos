-- 0052_followups_branch_context.sql
--
-- Gives a follow-up a context it declares, and adds the one that was missing.
--
-- Until now every follow-up table was defined BY its container —
-- fellowship_followups.fellowship_id and department_followups
-- .branch_department_id are both NOT NULL. That made the container
-- unambiguous, but it also meant a person in no fellowship and no department
-- could not be followed up at all: an invited first-timer (minted as a
-- `visitor` member by the first-timer form) and an ordinary member who
-- belongs to no group had nowhere for the record to live, and so no route
-- into the welfare / safeguarding inboxes either.
--
-- The fix is NOT a nullable container. "No container" as an absence is
-- something a bad write can fall into, which would let a fellowship
-- follow-up silently become a branch one. Instead the BRANCH becomes a
-- fifth context that everybody has — people in no group simply have only
-- that one — and `context_kind` is NOT NULL, so choosing it is deliberate
-- and the CHECK below enforces the pairing.
--
-- Separate nullable FK columns rather than one polymorphic context_id, so
-- the database keeps real foreign keys and still gets the guarantee.
--
-- Context is declared by the caller and validated server-side; it is never
-- inferred from the subject's memberships. Someone in both a fellowship and
-- a department has two genuinely different follow-up relationships — their
-- fellowship leader checking on them pastorally, their department lead on
-- their serving — and guessing between them would attribute the record, and
-- its visibility, to the wrong people.

-- ── 1. The team that owns first-timer follow-up ────────────────────────────
--
-- Distinct from Host Team ("first-time guest hosts"), which greets on the
-- day; this team makes contact during the week. Idempotent via NOT EXISTS,
-- same reasoning as 0048/0051 — staging's schema was provisioned
-- out-of-band, so no unique constraint on department_name is assumed.
INSERT INTO departments (department_name, description, icon_key)
SELECT
  'Follow-Up Team',
  'Contacts first-timers after their visit and members who are not yet in a fellowship or department',
  'phone'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'Follow-Up Team');

-- ── 2. fellowship_followups becomes the one follow-up table ────────────────
-- It already carries the modern visit shape and the concern flags from 0046,
-- so it is the one to generalise.
-- Named member_followups, not followups: the souls pipeline already owns
-- `follow_ups`, and two tables differing by one underscore is a footgun.
-- This one's subject is always a member, which the name now says.
ALTER TABLE fellowship_followups RENAME TO member_followups;

ALTER TABLE member_followups
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS context_kind VARCHAR(20),
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES branch_departments(id) ON DELETE CASCADE;

-- Department rows arrive with fellowship_id NULL, so this has to come before
-- the copy below rather than with the other constraint work further down.
ALTER TABLE member_followups ALTER COLUMN fellowship_id DROP NOT NULL;

-- Existing rows are all fellowship-context; their branch comes from the
-- fellowship they hang off.
UPDATE member_followups f
SET context_kind = 'fellowship',
    branch_id = fe.branch_id
FROM fellowships fe
WHERE fe.id = f.fellowship_id
  AND f.context_kind IS NULL;

-- ── 3. Absorb department_followups ─────────────────────────────────────────
-- Column-for-column identical apart from the container, so this is a
-- straight copy with the context declared.
INSERT INTO member_followups (
  id, fellowship_id, department_id, branch_id, context_kind,
  member_id, recorded_by_id, assigned_to_id, contacted_at,
  contact_method, contact_status, type, methods, contact_reached,
  interest_level, visit_kind, visit_announced, visit_arrival_at,
  visit_departure_at, visit_outcome, companion_member_ids,
  welfare_concern, safeguarding_concern, duration_minutes, notes,
  next_follow_up_date, created_at, updated_at
)
SELECT
  d.id, NULL, d.branch_department_id, bd.branch_id, 'department',
  d.member_id, d.recorded_by_id, d.assigned_to_id, d.contacted_at,
  d.contact_method, d.contact_status, d.type, d.methods, d.contact_reached,
  d.interest_level, d.visit_kind, d.visit_announced, d.visit_arrival_at,
  d.visit_departure_at, d.visit_outcome, d.companion_member_ids,
  d.welfare_concern, d.safeguarding_concern, d.duration_minutes, d.notes,
  d.next_follow_up_date, d.created_at, d.updated_at
FROM department_followups d
JOIN branch_departments bd ON bd.id = d.branch_department_id;

DROP TABLE department_followups;

-- ── 4. Lock the shape ──────────────────────────────────────────────────────
-- Any row we could not resolve a branch for would be unreachable by every
-- scoped read, so fail loudly here rather than ship orphans.
DELETE FROM member_followups WHERE branch_id IS NULL OR context_kind IS NULL;

ALTER TABLE member_followups ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE member_followups ALTER COLUMN context_kind SET NOT NULL;

ALTER TABLE member_followups DROP CONSTRAINT IF EXISTS member_followups_context_check;
ALTER TABLE member_followups
  ADD CONSTRAINT member_followups_context_check CHECK (
    (context_kind = 'fellowship' AND fellowship_id IS NOT NULL AND department_id IS NULL)
    OR (context_kind = 'department' AND department_id IS NOT NULL AND fellowship_id IS NULL)
    OR (context_kind = 'branch' AND fellowship_id IS NULL AND department_id IS NULL)
  );

-- ── 5. Indexes ─────────────────────────────────────────────────────────────
-- A rename carries the old index names over; rename them so they describe
-- the table they are actually on.
ALTER INDEX IF EXISTS idx_fellowship_followups_fellowship_id RENAME TO idx_member_followups_fellowship_id;
ALTER INDEX IF EXISTS idx_fellowship_followups_member_id RENAME TO idx_member_followups_member_id;
ALTER INDEX IF EXISTS idx_fellowship_followups_contacted_at RENAME TO idx_member_followups_contacted_at;
ALTER INDEX IF EXISTS idx_fellowship_followups_contact_status RENAME TO idx_member_followups_contact_status;
ALTER INDEX IF EXISTS idx_fellowship_followups_welfare_concern RENAME TO idx_member_followups_welfare_concern;
ALTER INDEX IF EXISTS idx_fellowship_followups_safeguarding_concern RENAME TO idx_member_followups_safeguarding_concern;

CREATE INDEX IF NOT EXISTS idx_member_followups_branch_id ON member_followups (branch_id);
CREATE INDEX IF NOT EXISTS idx_member_followups_department_id ON member_followups (department_id);
CREATE INDEX IF NOT EXISTS idx_member_followups_context_kind ON member_followups (context_kind);

-- The two leader inboxes filter on these flags within a branch, and the old
-- partial indexes were keyed on fellowship_id — which is NULL for every
-- branch-context row, so they would never serve those reads.
DROP INDEX IF EXISTS idx_member_followups_welfare_concern;
DROP INDEX IF EXISTS idx_member_followups_safeguarding_concern;
CREATE INDEX idx_member_followups_welfare_concern
  ON member_followups (branch_id, contacted_at DESC)
  WHERE welfare_concern = TRUE;
CREATE INDEX idx_member_followups_safeguarding_concern
  ON member_followups (branch_id, contacted_at DESC)
  WHERE safeguarding_concern = TRUE;

-- Drives the "who has no follow-up yet" queues.
CREATE INDEX IF NOT EXISTS idx_member_followups_member_contacted
  ON member_followups (member_id, contacted_at DESC);
