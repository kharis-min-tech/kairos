-- Partial unique index: only one ACTIVE assignment per (member, role, branch).
-- Closes a TOCTOU race in assignBranchSystemAdmin where two concurrent
-- callers can both pass the "already-assigned?" check before either insert
-- lands. Inactive (soft-deleted) rows are exempt so re-grants are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_roles_active_assignment
  ON member_roles (member_id, role_id, branch_id)
  WHERE is_active = true;
