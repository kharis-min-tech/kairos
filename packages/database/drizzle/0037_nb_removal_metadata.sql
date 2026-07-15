-- 0037: NB removeFromPipeline metadata
-- Add nullable removal_reason + removal_notes so leaders can record WHY a New
-- Believer was pulled out of the pipeline (AWOL, moved away, etc.). Active
-- enrollments keep both columns null; the reason is stamped alongside the
-- isActive=false flip.

ALTER TABLE new_believer_enrollments
  ADD COLUMN IF NOT EXISTS removal_reason varchar(20),
  ADD COLUMN IF NOT EXISTS removal_notes text;

-- CHECK constraint on the allowed reason values. Nullable so active
-- enrollments trivially satisfy it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'new_believer_enrollments_removal_reason_check'
  ) THEN
    ALTER TABLE new_believer_enrollments
      ADD CONSTRAINT new_believer_enrollments_removal_reason_check
      CHECK (removal_reason IS NULL OR removal_reason IN ('awol', 'withdrew', 'moved_away', 'stopped_attending', 'other'));
  END IF;
END $$;
