-- Task #4 Phase B: child safeguarding-aware dormancy review.
--
-- Minors (memberType='child') can't be silently bulk-archived like attendees
-- or visitors — every archive decision needs Safeguarding Lead approval and
-- an audit trail. This adds three columns to support that workflow:
--
--   safeguarding_reviewed_at      — last time a SG Lead acted on this row
--   safeguarding_reviewed_by      — member id of the reviewer (NULL = never)
--   safeguarding_archive_decision — 'active' | 'archived' | NULL
--
-- The /members/safeguarding page surfaces dormant minors that either have
-- never been reviewed or whose last review is older than 90 days (children
-- can return after a gap; we re-prompt rather than silently archiving).

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS safeguarding_reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS safeguarding_reviewed_by UUID REFERENCES members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS safeguarding_archive_decision VARCHAR(20);

-- Constrain the decision to the values the API actually emits.
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_safeguarding_archive_decision_check;
ALTER TABLE members ADD CONSTRAINT members_safeguarding_archive_decision_check
  CHECK (safeguarding_archive_decision IS NULL OR safeguarding_archive_decision IN ('active', 'archived'));

-- Index for the dormant-minors query: we filter on memberType='child' and
-- safeguarding_reviewed_at. The existing idx_members_name covers ordering.
CREATE INDEX IF NOT EXISTS idx_members_safeguarding_reviewed_at
  ON members(safeguarding_reviewed_at)
  WHERE member_type = 'child' AND is_active = TRUE;
