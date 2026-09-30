-- 0051_membership_champion_role.sql
-- Membership Champion — per-branch liaison for the church-wide membership
-- class programme. Ships context to the local pastor and the HQ membership
-- admin team; does not create cohorts, admit from the pool or mark sessions.
--
-- Capability granted: `membership:branch:read` (read-only view over the
-- champion's branch waitlist + admitted-to-cohort members). Also the
-- recipient of the four membership lifecycle notifications for members of
-- their branch: joined waitlist, admitted into cohort, graduated,
-- withdrew or lapsed.
--
-- RoleScope kind = 'branch'. Multiple Champions per branch are allowed by
-- design: a big branch may have a primary + a backup; RBAC grants naturally
-- express that. No DB-level uniqueness on (member_id, branch_id, role).

-- Idempotent via NOT EXISTS — same reasoning as the Membership Admin seed
-- in 0048 (staging's public schema was provisioned out-of-band, so we
-- cannot assume the roles table has a unique constraint on role_name).
INSERT INTO roles (role_name, description)
SELECT
  'Membership Champion',
  'Per-branch liaison for the membership class programme. Read-only view over the branch waitlist and cohort enrolments from their branch; recipient of the four membership lifecycle notifications for members of their branch.'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Membership Champion');
