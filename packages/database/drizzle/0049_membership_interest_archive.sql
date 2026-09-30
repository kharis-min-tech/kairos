-- 0049_membership_interest_archive.sql
-- Archive stale lapsed pool entries so the /membership/interest surface stays
-- readable. Without this, every lapsed row accumulates forever — the pool
-- page eventually reads as noise, and admins lose sight of who is actively
-- waiting. Mirrors the New Believers archive/removal pattern.
--
-- Design:
--   - `archived_at` is nullable; NULL means the row is live in every sense
--     the pool surfaces care about, whether the status is 'waiting',
--     'lapsed', or 'withdrawn'.
--   - The sweep in api/src/membership/service.ts::lapseExpiredInterest also
--     archives rows that have been in status 'lapsed' for >= 30 days.
--     Grace window is intentional so admins can react to a lapse (or the
--     ex-waiter can re-express interest without the old row noising up the
--     history) before the row disappears from active lists.
--   - Archived rows are kept for audit — they never get hard-deleted.
--   - The 'waiting' partial unique index (0048) is not touched here: an
--     archived row is by definition not 'waiting', so it cannot conflict.
--   - Every service read filters on `archived_at IS NULL` for the active
--     pool surface. The one exception is a future admin-audit view that
--     wants historical entries, if we ever build one.

ALTER TABLE membership_interest
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_membership_interest_archived_at
  ON membership_interest (archived_at)
  WHERE archived_at IS NOT NULL;
