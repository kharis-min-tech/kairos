-- RBAC Phase 3a: extend member_roles to support fellowship/department scope.
--
-- Today member_roles is keyed by (member_id, role_id, branch_id) — branch-
-- scoped only. After this migration it supports any RoleScope via
-- (scope_kind, scope_id). The legacy `branch_id` column stays populated as
-- the parent-branch index (cleanup later if/when it becomes redundant).
--
-- Scope encoding:
--   'branch'     → scope_id = branch_id          (BSA, BDA, Safeguarding Lead, etc.)
--   'fellowship' → scope_id = fellowship.id      (FellowshipLeader)
--   'department' → scope_id = branch_department.id  (DepartmentLeader, DepartmentDeputy)

ALTER TABLE member_roles
  ADD COLUMN IF NOT EXISTS scope_kind varchar(20),
  ADD COLUMN IF NOT EXISTS scope_id uuid;

-- Backfill existing rows: every legacy row is branch-scoped.
UPDATE member_roles
SET scope_kind = 'branch', scope_id = branch_id
WHERE scope_kind IS NULL;

ALTER TABLE member_roles
  ALTER COLUMN scope_kind SET NOT NULL,
  ALTER COLUMN scope_id SET NOT NULL;

-- Drop the legacy unique indexes — they keyed on branch_id, which doesn't
-- discriminate between e.g. FellowshipLeader@F1 vs @F2 in the same branch.
DROP INDEX IF EXISTS uq_member_roles_assignment;
DROP INDEX IF EXISTS uq_member_roles_active_assignment;

-- New indexes key on scope_kind + scope_id.
CREATE UNIQUE INDEX uq_member_roles_assignment
  ON member_roles (member_id, role_id, scope_kind, scope_id, assigned_date);

-- Partial unique index: only one ACTIVE assignment per (member, role, scope).
-- Preserves the BSA TOCTOU guard from 0026; inactive rows are exempt so
-- re-grants are allowed.
CREATE UNIQUE INDEX uq_member_roles_active_assignment
  ON member_roles (member_id, role_id, scope_kind, scope_id)
  WHERE is_active = true;

-- Index for scope lookups (e.g. "all FellowshipLeader grants for fellowship X").
CREATE INDEX IF NOT EXISTS idx_member_roles_scope ON member_roles (scope_kind, scope_id);

-- Phase 3b: register the new authority-bearing role bundles. Names match
-- DB_ROLE_NAME_TO_FUNCTIONAL in apps/api/src/lib/grants.ts.
INSERT INTO roles (role_name, description) VALUES
  ('Branch Data Admin', 'Branch-level data operations. Can edit branch settings and member data but not grant roles.'),
  ('Fellowship Leader', 'Leads or co-leads a specific fellowship. Authority is scoped to that fellowship.'),
  ('Department Lead', 'Leads a specific branch department. Authority is scoped to that department.'),
  ('Department Deputy', 'Deputy of a specific branch department. Same write authority as the lead, scoped to that department.'),
  ('New Believers Mentor', 'Mentors new believers in a branch. Authority is branch-scoped.'),
  ('New Believers Teacher', 'Teaches new-believer sessions in a branch. Authority is branch-scoped.')
ON CONFLICT (role_name) DO NOTHING;
