-- 0016_new_believer_stage_sessions
-- Make New Believers sessions explicit curriculum-stage events.

ALTER TABLE "new_believer_enrollments"
  ALTER COLUMN "stage" SET DEFAULT 'session-1';

UPDATE "new_believer_enrollments"
SET "stage" = 'session-1',
    "updated_at" = NOW()
WHERE "stage" = 'enrolled'
  AND "is_active" = true;

ALTER TABLE "new_believer_sessions"
  ADD COLUMN IF NOT EXISTS "session_stage" varchar(30);

UPDATE "new_believer_sessions"
SET "session_stage" = CASE
  WHEN lower("topic") LIKE '%who is a christian%' OR lower("topic") LIKE '%session 2%' THEN 'session-2'
  WHEN lower("topic") LIKE '%working out your salvation%' OR lower("topic") LIKE '%session 3%' THEN 'session-3'
  WHEN lower("topic") LIKE '%importance of fellowship%' OR lower("topic") LIKE '%session 4%' THEN 'session-4'
  ELSE 'session-1'
END
WHERE "session_stage" IS NULL;

ALTER TABLE "new_believer_sessions"
  ALTER COLUMN "session_stage" SET DEFAULT 'session-1',
  ALTER COLUMN "session_stage" SET NOT NULL;

ALTER TABLE "new_believer_sessions"
  ADD COLUMN IF NOT EXISTS "location" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'new_believer_sessions_session_stage_check'
  ) THEN
    ALTER TABLE "new_believer_sessions"
      ADD CONSTRAINT "new_believer_sessions_session_stage_check"
      CHECK ("session_stage" IN ('session-1', 'session-2', 'session-3', 'session-4'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_nb_sessions_session_stage"
  ON "new_believer_sessions" USING btree ("session_stage");
