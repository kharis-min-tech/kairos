-- RBAC Phase 4c follow-up: tighten the system_role CHECK constraint to match
-- the post-collapse domain. After 0029 the only legal values are 'admin' and
-- 'member'; this enforces it at the DB level so a buggy insert can't sneak
-- 'pastor' or 'leader' back in.
--
-- The constraint may or may not exist depending on environment history
-- (it was declared in the Drizzle schema but never produced by a migration),
-- so we drop-if-exists before adding the tightened version.

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_system_role_check;
ALTER TABLE members ADD CONSTRAINT members_system_role_check
  CHECK (system_role IN ('admin', 'member'));
