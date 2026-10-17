-- 0059 — Forms expansion (phase 0)
--
-- Groundwork for three new forms and two module extensions. One file because
-- the parts ship together: the new form types are unusable without the CHECK,
-- and the applications that collect the new columns are the same piece of work.
--
--   1. form_submissions.form_type — three new forms: a request for the church
--      to sign a document, a marriage-pack enquiry, and an offer to host a
--      K-group. (A K-group *placement* form was considered and dropped: a
--      member can already request any fellowship and a leader can place them
--      directly, so a form would only add a second inbox.)
--   2. members.profession — asked once on the Kingdom Service application.
--      It belongs on the member, not inside one join request's payload, so it
--      can be queried later.
--   3. The fields the Kingdom Service and Membership applications collect,
--      added to the modules that already own those workflows rather than
--      duplicating the workflows as forms.
--
-- Every column is nullable and every existing row stays valid, so there is
-- no backfill and nothing to reconcile.

-- 1 ── New form types ────────────────────────────────────────
ALTER TABLE "form_submissions" DROP CONSTRAINT IF EXISTS "form_submissions_form_type_check";
ALTER TABLE "form_submissions"
  ADD CONSTRAINT "form_submissions_form_type_check"
  CHECK ("form_type" IN (
    'altar_call',
    'baptism',
    'testimony',
    'baby_naming',
    'baby_dedication',
    'first_time_visitor',
    'signature_request',
    'marriage_pack',
    'kgroup_host'
  ));

-- 2 ── Profession on the member ──────────────────────────────
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "profession" varchar(150);

-- 3a ── Kingdom Service application ──────────────────────────
-- The declaration is stamped rather than flagged: a boolean would say the
-- applicant agreed but not to which wording or when, and this is the row a
-- leader relies on when they say somebody undertook to serve.
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "experience" text;
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "declaration_accepted_at" timestamp;
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "signature_name" varchar(150);
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "signature_date" date;

-- 3b ── Membership programme application ─────────────────────
-- No CHECK on the day: `fellowships.meeting_day` is a plain varchar validated
-- at the Zod layer, and a class stream that moves to a Wednesday should not
-- need a migration.
ALTER TABLE "membership_interest" ADD COLUMN IF NOT EXISTS "preferred_class_day" varchar(20);
ALTER TABLE "membership_interest" ADD COLUMN IF NOT EXISTS "started_attending_on" date;
ALTER TABLE "membership_interest" ADD COLUMN IF NOT EXISTS "attends_another_church" boolean;
