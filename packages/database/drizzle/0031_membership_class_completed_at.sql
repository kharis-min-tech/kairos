-- Task #33 Phase 1: introduce the real Membership signifier.
--
-- Per docs/domain-model.md §0, "Member" in this church means "completed the
-- 4-week membership class + received the certificate." The existing
-- members.member_type='member' is misnamed — it's a provenance tag for
-- self-signup / admin-add rows, NOT a status. This column is the truth.
--
-- NULL = not a confirmed Member yet.
-- Set => the timestamp the class was completed.
--
-- Phase 2 (separate migration) will flip the self-signup default for
-- member_type and sweep the 6 filter sites that currently key off it.

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS membership_class_completed_at TIMESTAMP;
