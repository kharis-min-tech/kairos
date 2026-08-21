-- 0046 — Extend fellowship_followups + department_followups with the visit
-- shape: contact vs visit type, multi-method contact, orthogonal welfare +
-- safeguarding flags, visit arrival/departure times, companions, visit
-- outcome. All additive + nullable — existing rows default to type='contact'
-- with legacy fields intact.

ALTER TABLE fellowship_followups
  ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'contact',
  ADD COLUMN IF NOT EXISTS methods JSONB,
  ADD COLUMN IF NOT EXISTS contact_reached BOOLEAN,
  ADD COLUMN IF NOT EXISTS interest_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS visit_kind VARCHAR(20),
  ADD COLUMN IF NOT EXISTS visit_announced BOOLEAN,
  ADD COLUMN IF NOT EXISTS visit_arrival_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS visit_departure_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS visit_outcome VARCHAR(20),
  ADD COLUMN IF NOT EXISTS companion_member_ids JSONB,
  ADD COLUMN IF NOT EXISTS welfare_concern BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS safeguarding_concern BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE fellowship_followups
  DROP CONSTRAINT IF EXISTS fellowship_followups_type_check;
ALTER TABLE fellowship_followups
  ADD CONSTRAINT fellowship_followups_type_check
    CHECK (type IN ('contact', 'visit'));

ALTER TABLE fellowship_followups
  DROP CONSTRAINT IF EXISTS fellowship_followups_interest_level_check;
ALTER TABLE fellowship_followups
  ADD CONSTRAINT fellowship_followups_interest_level_check
    CHECK (interest_level IS NULL OR interest_level IN ('interested', 'not_interested', 'undecided'));

ALTER TABLE fellowship_followups
  DROP CONSTRAINT IF EXISTS fellowship_followups_visit_kind_check;
ALTER TABLE fellowship_followups
  ADD CONSTRAINT fellowship_followups_visit_kind_check
    CHECK (visit_kind IS NULL OR visit_kind IN ('in_person', 'virtual'));

ALTER TABLE fellowship_followups
  DROP CONSTRAINT IF EXISTS fellowship_followups_visit_outcome_check;
ALTER TABLE fellowship_followups
  ADD CONSTRAINT fellowship_followups_visit_outcome_check
    CHECK (visit_outcome IS NULL OR visit_outcome IN ('present', 'not_present', 'rescheduled'));

-- Partial indexes for the two new leader inboxes — welfare concern +
-- safeguarding matter surface here, so filter cheaply.
CREATE INDEX IF NOT EXISTS idx_fellowship_followups_welfare_concern
  ON fellowship_followups (fellowship_id, contacted_at DESC)
  WHERE welfare_concern = TRUE;
CREATE INDEX IF NOT EXISTS idx_fellowship_followups_safeguarding_concern
  ON fellowship_followups (fellowship_id, contacted_at DESC)
  WHERE safeguarding_concern = TRUE;

-- ── department_followups mirror ───────────────────────────

ALTER TABLE department_followups
  ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'contact',
  ADD COLUMN IF NOT EXISTS methods JSONB,
  ADD COLUMN IF NOT EXISTS contact_reached BOOLEAN,
  ADD COLUMN IF NOT EXISTS interest_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS visit_kind VARCHAR(20),
  ADD COLUMN IF NOT EXISTS visit_announced BOOLEAN,
  ADD COLUMN IF NOT EXISTS visit_arrival_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS visit_departure_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS visit_outcome VARCHAR(20),
  ADD COLUMN IF NOT EXISTS companion_member_ids JSONB,
  ADD COLUMN IF NOT EXISTS welfare_concern BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS safeguarding_concern BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE department_followups
  DROP CONSTRAINT IF EXISTS department_followups_type_check;
ALTER TABLE department_followups
  ADD CONSTRAINT department_followups_type_check
    CHECK (type IN ('contact', 'visit'));

ALTER TABLE department_followups
  DROP CONSTRAINT IF EXISTS department_followups_interest_level_check;
ALTER TABLE department_followups
  ADD CONSTRAINT department_followups_interest_level_check
    CHECK (interest_level IS NULL OR interest_level IN ('interested', 'not_interested', 'undecided'));

ALTER TABLE department_followups
  DROP CONSTRAINT IF EXISTS department_followups_visit_kind_check;
ALTER TABLE department_followups
  ADD CONSTRAINT department_followups_visit_kind_check
    CHECK (visit_kind IS NULL OR visit_kind IN ('in_person', 'virtual'));

ALTER TABLE department_followups
  DROP CONSTRAINT IF EXISTS department_followups_visit_outcome_check;
ALTER TABLE department_followups
  ADD CONSTRAINT department_followups_visit_outcome_check
    CHECK (visit_outcome IS NULL OR visit_outcome IN ('present', 'not_present', 'rescheduled'));

CREATE INDEX IF NOT EXISTS idx_department_followups_welfare_concern
  ON department_followups (branch_department_id, contacted_at DESC)
  WHERE welfare_concern = TRUE;
CREATE INDEX IF NOT EXISTS idx_department_followups_safeguarding_concern
  ON department_followups (branch_department_id, contacted_at DESC)
  WHERE safeguarding_concern = TRUE;
