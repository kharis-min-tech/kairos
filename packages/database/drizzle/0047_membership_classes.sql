-- 0047 — Membership classes.
--
-- The machinery behind `members.membership_class_completed_at`, which is the
-- canonical "is this person a confirmed Member?" signal (see
-- apps/api/src/lib/member-predicates.ts and docs/domain-model.md §0). Until
-- now that column could only be stamped by hand through an admin override;
-- these tables are where the stamp is actually earned.
--
-- BRANCH ISOLATION EXCEPTION — READ BEFORE "FIXING" THIS.
-- `membership_cohorts` intentionally has NO branch_id. Membership classes run
-- church-wide, not per branch, so a cohort is a global row that any approved
-- member may enrol in. This is a deliberate, product-driven departure from the
-- branch-scoping invariant applied everywhere else in the schema. Branch
-- reporting is preserved by denormalising the member's home branch onto
-- `membership_enrollments.branch_id` at enrolment time.
--
-- Deliberately NOT linked to the new believers pipeline. The two are
-- independent programmes: people self-enrol in a membership cohort whenever
-- they like, with no dependency on completing new believers first.

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_COHORTS
-- One run of the four-week class, church-wide, with a unique name.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  -- The induction / graduation ceremony. Completing session 4 is NOT
  -- completion on its own; a member must also attend this to graduate.
  graduation_date DATE,
  -- Members must have sat AND passed the final test on or before this date.
  final_test_deadline DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  -- Whether members can self-enrol right now. Independent of `status` so an
  -- active cohort can be closed to late joiners.
  enrolment_open BOOLEAN NOT NULL DEFAULT TRUE,
  -- Pass marks applied to every assessment in this cohort, so a cohort can
  -- set a different bar without rewriting historical results.
  homework_pass_mark INTEGER NOT NULL DEFAULT 50,
  quiz_pass_mark INTEGER NOT NULL DEFAULT 50,
  final_test_pass_mark INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT membership_cohorts_status_check
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  CONSTRAINT membership_cohorts_marks_check
    CHECK (
      homework_pass_mark BETWEEN 0 AND 100
      AND quiz_pass_mark BETWEEN 0 AND 100
      AND final_test_pass_mark BETWEEN 0 AND 100
    ),
  CONSTRAINT membership_cohorts_graduation_after_start_check
    CHECK (graduation_date IS NULL OR graduation_date >= start_date)
);

-- Cohort names are how leaders refer to a run ("Autumn 2026"), so they must be
-- unambiguous church-wide. Partial index so a cancelled/soft-deleted cohort
-- doesn't block reusing its name.
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_cohorts_name_active
  ON membership_cohorts (LOWER(name))
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_membership_cohorts_status ON membership_cohorts (status);
CREATE INDEX IF NOT EXISTS idx_membership_cohorts_start_date ON membership_cohorts (start_date);
CREATE INDEX IF NOT EXISTS idx_membership_cohorts_is_active ON membership_cohorts (is_active);

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_COHORT_TEACHERS
-- Many teachers per cohort. There are no mentors: that is the new believers
-- module's shape, not this one.
--
-- This table IS the authority model for teaching. Because cohorts are
-- church-wide there is no branch-scoped grant that could express "teaches this
-- cohort", so marking permission is a direct membership test against these
-- rows rather than an RBAC capability.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_cohort_teachers (
  cohort_id UUID NOT NULL REFERENCES membership_cohorts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'teacher',
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES members(id) ON DELETE SET NULL,
  PRIMARY KEY (cohort_id, member_id),
  CONSTRAINT membership_cohort_teachers_role_check
    CHECK (role IN ('lead', 'teacher'))
);

CREATE INDEX IF NOT EXISTS idx_membership_cohort_teachers_member_id
  ON membership_cohort_teachers (member_id);

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_SESSIONS
-- Four per cohort, numbered 1 to 4.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES membership_cohorts(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  session_date TIMESTAMP,
  location TEXT,
  teacher_id UUID REFERENCES members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT membership_sessions_number_check CHECK (session_number BETWEEN 1 AND 4)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_sessions_cohort_number
  ON membership_sessions (cohort_id, session_number);
CREATE INDEX IF NOT EXISTS idx_membership_sessions_teacher_id
  ON membership_sessions (teacher_id);

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_ENROLLMENTS
-- One row per member per cohort.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES membership_cohorts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  -- Denormalised from members.home_branch_id at enrolment. Cohorts are
  -- church-wide, so this is the only way a branch leader can filter the roster
  -- to their own people or slice reporting by branch.
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'enrolled',
  enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Set by the member themselves rather than an admin. Useful for reporting on
  -- how the programme is actually filling up.
  self_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
  -- Final test. Score is mandatory once recorded; `passed` is derived against
  -- the cohort's pass mark at write time and stored so historical results
  -- survive a later change to the mark.
  final_test_score INTEGER,
  final_test_passed BOOLEAN,
  final_test_taken_at TIMESTAMP,
  -- The induction / graduation ceremony attendance.
  induction_attended BOOLEAN NOT NULL DEFAULT FALSE,
  induction_attended_at TIMESTAMP,
  graduated_at TIMESTAMP,
  withdrawn_reason VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT membership_enrollments_status_check
    CHECK (status IN ('enrolled', 'graduated', 'withdrawn', 'deferred')),
  CONSTRAINT membership_enrollments_final_test_score_check
    CHECK (final_test_score IS NULL OR final_test_score BETWEEN 0 AND 100),
  CONSTRAINT membership_enrollments_withdrawn_reason_check
    CHECK (
      withdrawn_reason IS NULL
      OR withdrawn_reason IN ('stopped_attending', 'withdrew', 'moved_away', 'deferred_to_next', 'other')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_enrollments_cohort_member
  ON membership_enrollments (cohort_id, member_id);
CREATE INDEX IF NOT EXISTS idx_membership_enrollments_member_id
  ON membership_enrollments (member_id);
CREATE INDEX IF NOT EXISTS idx_membership_enrollments_branch_id
  ON membership_enrollments (branch_id);
CREATE INDEX IF NOT EXISTS idx_membership_enrollments_status
  ON membership_enrollments (status);

-- A member may only sit in one unfinished cohort at a time. Without this a
-- member could self-enrol into three cohorts at once and graduate from
-- whichever they happened to attend.
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_enrollments_one_open_per_member
  ON membership_enrollments (member_id)
  WHERE status = 'enrolled';

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_SESSION_RECORDS
-- Per (session, enrollment): attendance plus the homework and quiz marks a
-- teacher records. Scores are mandatory when the corresponding assessment is
-- recorded at all, which is enforced in the service layer and by the paired
-- CHECKs below (a score and its pass flag must be set or absent together).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_session_records (
  session_id UUID NOT NULL REFERENCES membership_sessions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES membership_enrollments(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  homework_score INTEGER,
  homework_passed BOOLEAN,
  quiz_score INTEGER,
  quiz_passed BOOLEAN,
  notes TEXT,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES members(id) ON DELETE SET NULL,
  PRIMARY KEY (session_id, enrollment_id),
  CONSTRAINT membership_session_records_homework_check
    CHECK (
      (homework_score IS NULL AND homework_passed IS NULL)
      OR (homework_score BETWEEN 0 AND 100 AND homework_passed IS NOT NULL)
    ),
  CONSTRAINT membership_session_records_quiz_check
    CHECK (
      (quiz_score IS NULL AND quiz_passed IS NULL)
      OR (quiz_score BETWEEN 0 AND 100 AND quiz_passed IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_membership_session_records_enrollment_id
  ON membership_session_records (enrollment_id);
