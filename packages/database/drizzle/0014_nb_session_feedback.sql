-- 0014_nb_session_feedback
-- Adds a JSONB map of stage → teacher feedback text to new_believer_enrollments.
-- Keyed the same way as session_completed_at: {"session-1": "Great progress…"}
-- Values are merged by the service layer (never overwritten wholesale).

ALTER TABLE "new_believer_enrollments"
  ADD COLUMN IF NOT EXISTS "session_feedback" jsonb;
