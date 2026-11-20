-- A branch putting itself forward to go first.
--
-- The rollout plan asks every branch pastor and branch leader which branch
-- wants to be the pilot, and is blunt about why the commitments are stated
-- before anyone volunteers: "a branch that volunteers on enthusiasm alone and
-- then meets the daily approval queue will sour by the third week". Most of
-- the columns here exist so that choice can be made from what the plan says
-- to look for rather than from who answered most eagerly.
--
-- `branch_id` is nullable and `branch_name` is always written. The form is
-- public and unauthenticated, and the plan seeds a branch only AFTER it is
-- chosen, so the branch named may not exist in the system yet. What was typed
-- is the record; the foreign key is a convenience for the admin queue once it
-- resolves, and ON DELETE SET NULL because deleting a branch must not delete
-- the evidence that somebody offered it.
--
-- The acknowledgements are one column each rather than a single "I agree".
-- Which commitment a branch hesitated over is the useful signal, and one
-- boolean throws it away. `requirements_version` records the wording they
-- were shown so a later edit to the page cannot rewrite what was agreed to.
--
-- No member link. Whoever fills this in has no account yet; members sign
-- themselves up only once a branch is chosen and seeded.
--
-- Guarded throughout: `db:bootstrap` replays every file in this directory in
-- order, so a migration that is not idempotent breaks the one recovery path
-- the project has when the journal falls out of sync.

CREATE TABLE IF NOT EXISTS pilot_interest (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  full_name                    VARCHAR(200) NOT NULL,
  role_at_branch               VARCHAR(40)  NOT NULL,
  role_other                   VARCHAR(120),
  email                        VARCHAR(255) NOT NULL,
  phone                        VARCHAR(40),

  branch_id                    UUID REFERENCES branches(id) ON DELETE SET NULL,
  branch_name                  VARCHAR(200) NOT NULL,
  fellowship_count             INTEGER,
  department_count             INTEGER,
  approx_members               INTEGER,

  head_of_admin_name           VARCHAR(200),
  head_of_admin_email          VARCHAR(255),
  safeguarding_lead_in_post    BOOLEAN NOT NULL DEFAULT FALSE,
  safeguarding_lead_name       VARCHAR(200),
  earliest_start               DATE,

  requirements_version         VARCHAR(20) NOT NULL,
  ack_daily_approvals          BOOLEAN NOT NULL DEFAULT FALSE,
  ack_attendance_every_service BOOLEAN NOT NULL DEFAULT FALSE,
  ack_no_history_import        BOOLEAN NOT NULL DEFAULT FALSE,
  ack_pilot_feedback           BOOLEAN NOT NULL DEFAULT FALSE,
  ack_training                 BOOLEAN NOT NULL DEFAULT FALSE,
  ack_retire_old_system        BOOLEAN NOT NULL DEFAULT FALSE,

  why_this_branch              TEXT,
  notes                        TEXT,

  status                       VARCHAR(20) NOT NULL DEFAULT 'new',
  review_notes                 TEXT,

  source_ip                    VARCHAR(64),
  user_agent                   TEXT,
  submitted_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The admin queue reads newest-first within a status.
CREATE INDEX IF NOT EXISTS pilot_interest_status_submitted_idx
  ON pilot_interest (status, submitted_at);

CREATE INDEX IF NOT EXISTS pilot_interest_branch_idx
  ON pilot_interest (branch_id);
