-- Department recruitment pipeline expansion
-- Extends department_join_requests with interview/offer/probation stages,
-- adds per-branch-department probation length, and tracks probation membership.

-- 1. branch_departments: per-department probation length (default 4 weeks)
ALTER TABLE "branch_departments"
  ADD COLUMN IF NOT EXISTS "probation_days" integer NOT NULL DEFAULT 28;

-- 2. department_members: track probation vs active membership
ALTER TABLE "department_members"
  ADD COLUMN IF NOT EXISTS "membership_status" varchar(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "probation_end_date" date;

ALTER TABLE "department_members"
  DROP CONSTRAINT IF EXISTS "department_members_membership_status_check";
ALTER TABLE "department_members"
  ADD CONSTRAINT "department_members_membership_status_check"
  CHECK (membership_status IN ('probation', 'active'));

-- 3. department_join_requests: widen status + add stage columns
-- Drop old constraints/indexes that are about to change
DROP INDEX IF EXISTS "uq_department_join_requests_pending";

ALTER TABLE "department_join_requests"
  DROP CONSTRAINT IF EXISTS "department_join_requests_status_check";

-- Migrate existing rows: pending -> applied, approved -> active, rejected stays
UPDATE "department_join_requests" SET "status" = 'applied' WHERE "status" = 'pending';
UPDATE "department_join_requests" SET "status" = 'active'  WHERE "status" = 'approved';

ALTER TABLE "department_join_requests"
  ALTER COLUMN "status" TYPE varchar(30),
  ALTER COLUMN "status" SET DEFAULT 'applied';

ALTER TABLE "department_join_requests"
  ADD COLUMN IF NOT EXISTS "interview_scheduled_at" timestamp,
  ADD COLUMN IF NOT EXISTS "interview_format" varchar(20),
  ADD COLUMN IF NOT EXISTS "interview_location" varchar(500),
  ADD COLUMN IF NOT EXISTS "interviewer_one_id" uuid,
  ADD COLUMN IF NOT EXISTS "interviewer_two_id" uuid,
  ADD COLUMN IF NOT EXISTS "interview_outcome" varchar(20),
  ADD COLUMN IF NOT EXISTS "interview_notes" text,
  ADD COLUMN IF NOT EXISTS "offered_at" timestamp,
  ADD COLUMN IF NOT EXISTS "offer_expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "offer_message" text,
  ADD COLUMN IF NOT EXISTS "offer_responded_at" timestamp,
  ADD COLUMN IF NOT EXISTS "offer_response" varchar(20),
  ADD COLUMN IF NOT EXISTS "probation_days" integer,
  ADD COLUMN IF NOT EXISTS "probation_start_date" date,
  ADD COLUMN IF NOT EXISTS "probation_end_date" date,
  ADD COLUMN IF NOT EXISTS "probation_outcome" varchar(20),
  ADD COLUMN IF NOT EXISTS "probation_notes" text;

ALTER TABLE "department_join_requests"
  DROP CONSTRAINT IF EXISTS "department_join_requests_interviewer_one_id_fkey",
  ADD CONSTRAINT "department_join_requests_interviewer_one_id_fkey"
    FOREIGN KEY ("interviewer_one_id") REFERENCES "members"("id") ON DELETE SET NULL;

ALTER TABLE "department_join_requests"
  DROP CONSTRAINT IF EXISTS "department_join_requests_interviewer_two_id_fkey",
  ADD CONSTRAINT "department_join_requests_interviewer_two_id_fkey"
    FOREIGN KEY ("interviewer_two_id") REFERENCES "members"("id") ON DELETE SET NULL;

ALTER TABLE "department_join_requests"
  ADD CONSTRAINT "department_join_requests_status_check"
  CHECK (status IN (
    'applied', 'interview_scheduled', 'interviewed', 'offered',
    'rejected', 'withdrawn', 'probation', 'active', 'probation_failed'
  ));

ALTER TABLE "department_join_requests"
  DROP CONSTRAINT IF EXISTS "department_join_requests_interview_format_check";
ALTER TABLE "department_join_requests"
  ADD CONSTRAINT "department_join_requests_interview_format_check"
  CHECK (interview_format IS NULL OR interview_format IN ('in_person', 'virtual'));

ALTER TABLE "department_join_requests"
  DROP CONSTRAINT IF EXISTS "department_join_requests_interview_outcome_check";
ALTER TABLE "department_join_requests"
  ADD CONSTRAINT "department_join_requests_interview_outcome_check"
  CHECK (interview_outcome IS NULL OR interview_outcome IN ('pass', 'fail', 'pending'));

ALTER TABLE "department_join_requests"
  DROP CONSTRAINT IF EXISTS "department_join_requests_offer_response_check";
ALTER TABLE "department_join_requests"
  ADD CONSTRAINT "department_join_requests_offer_response_check"
  CHECK (offer_response IS NULL OR offer_response IN ('accepted', 'declined'));

ALTER TABLE "department_join_requests"
  DROP CONSTRAINT IF EXISTS "department_join_requests_probation_outcome_check";
ALTER TABLE "department_join_requests"
  ADD CONSTRAINT "department_join_requests_probation_outcome_check"
  CHECK (probation_outcome IS NULL OR probation_outcome IN ('passed', 'failed', 'pending'));

ALTER TABLE "department_join_requests"
  DROP CONSTRAINT IF EXISTS "department_join_requests_interviewers_distinct_check";
ALTER TABLE "department_join_requests"
  ADD CONSTRAINT "department_join_requests_interviewers_distinct_check"
  CHECK (
    interviewer_one_id IS NULL
    OR interviewer_two_id IS NULL
    OR interviewer_one_id != interviewer_two_id
  );

ALTER TABLE "department_join_requests"
  DROP CONSTRAINT IF EXISTS "department_join_requests_probation_dates_check";
ALTER TABLE "department_join_requests"
  ADD CONSTRAINT "department_join_requests_probation_dates_check"
  CHECK (
    probation_end_date IS NULL
    OR probation_start_date IS NULL
    OR probation_end_date >= probation_start_date
  );

-- Replace pending unique with "open" unique covering all in-flight stages
CREATE UNIQUE INDEX IF NOT EXISTS "uq_department_join_requests_open"
  ON "department_join_requests" ("branch_department_id", "member_id")
  WHERE status IN ('applied', 'interview_scheduled', 'interviewed', 'offered', 'probation');
