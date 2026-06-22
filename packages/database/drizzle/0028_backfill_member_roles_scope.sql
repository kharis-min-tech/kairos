-- RBAC Phase 3e: backfill `member_roles` from the legacy FK + Admin-dept
-- derivations so it becomes the single source of truth for grants.
--
-- All five INSERTs use INSERT … SELECT … WHERE NOT EXISTS so the migration
-- is idempotent — safe to re-run after partial failure or in environments
-- already created via the service-layer write-through.

-- ── 1. FellowshipLeader (from fellowships.leader_id) ───────
INSERT INTO member_roles (member_id, role_id, branch_id, scope_kind, scope_id, is_active)
SELECT f.leader_id, r.id, f.branch_id, 'fellowship', f.id, true
FROM fellowships f
CROSS JOIN (SELECT id FROM roles WHERE role_name = 'Fellowship Leader' LIMIT 1) r
WHERE f.is_active = true
  AND f.leader_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_roles mr
    WHERE mr.member_id = f.leader_id
      AND mr.role_id = r.id
      AND mr.scope_kind = 'fellowship'
      AND mr.scope_id = f.id
      AND mr.is_active = true
  );

-- ── 2. FellowshipLeader (from fellowships.co_leader_id) ────
INSERT INTO member_roles (member_id, role_id, branch_id, scope_kind, scope_id, is_active)
SELECT f.co_leader_id, r.id, f.branch_id, 'fellowship', f.id, true
FROM fellowships f
CROSS JOIN (SELECT id FROM roles WHERE role_name = 'Fellowship Leader' LIMIT 1) r
WHERE f.is_active = true
  AND f.co_leader_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_roles mr
    WHERE mr.member_id = f.co_leader_id
      AND mr.role_id = r.id
      AND mr.scope_kind = 'fellowship'
      AND mr.scope_id = f.id
      AND mr.is_active = true
  );

-- ── 3. Department Lead (from branch_departments.lead_member_id) ──
INSERT INTO member_roles (member_id, role_id, branch_id, scope_kind, scope_id, is_active)
SELECT bd.lead_member_id, r.id, bd.branch_id, 'department', bd.id, true
FROM branch_departments bd
CROSS JOIN (SELECT id FROM roles WHERE role_name = 'Department Lead' LIMIT 1) r
WHERE bd.is_active = true
  AND bd.lead_member_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_roles mr
    WHERE mr.member_id = bd.lead_member_id
      AND mr.role_id = r.id
      AND mr.scope_kind = 'department'
      AND mr.scope_id = bd.id
      AND mr.is_active = true
  );

-- ── 4. Department Deputy (from branch_departments.deputy_member_id) ──
INSERT INTO member_roles (member_id, role_id, branch_id, scope_kind, scope_id, is_active)
SELECT bd.deputy_member_id, r.id, bd.branch_id, 'department', bd.id, true
FROM branch_departments bd
CROSS JOIN (SELECT id FROM roles WHERE role_name = 'Department Deputy' LIMIT 1) r
WHERE bd.is_active = true
  AND bd.deputy_member_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_roles mr
    WHERE mr.member_id = bd.deputy_member_id
      AND mr.role_id = r.id
      AND mr.scope_kind = 'department'
      AND mr.scope_id = bd.id
      AND mr.is_active = true
  );

-- ── 5. Branch Data Admin (from Admin-department lead/deputy) ──
-- Today's resolveBranchAdminAuthority derives BDA from being lead OR deputy
-- of the global 'Admin' department. Materialise these as explicit grants
-- so Phase 3f's `resolveGrants` cutover doesn't need to keep that
-- derivation.
INSERT INTO member_roles (member_id, role_id, branch_id, scope_kind, scope_id, is_active)
SELECT m.member_id, r.id, bd.branch_id, 'branch', bd.branch_id, true
FROM (
  SELECT bd.id AS bd_id, bd.branch_id, bd.lead_member_id AS member_id
  FROM branch_departments bd
  INNER JOIN departments d ON d.id = bd.department_id
  WHERE bd.is_active = true
    AND d.department_name = 'Admin'
    AND bd.lead_member_id IS NOT NULL
  UNION
  SELECT bd.id AS bd_id, bd.branch_id, bd.deputy_member_id AS member_id
  FROM branch_departments bd
  INNER JOIN departments d ON d.id = bd.department_id
  WHERE bd.is_active = true
    AND d.department_name = 'Admin'
    AND bd.deputy_member_id IS NOT NULL
) AS m
INNER JOIN branch_departments bd ON bd.id = m.bd_id
CROSS JOIN (SELECT id FROM roles WHERE role_name = 'Branch Data Admin' LIMIT 1) r
WHERE NOT EXISTS (
  SELECT 1 FROM member_roles mr
  WHERE mr.member_id = m.member_id
    AND mr.role_id = r.id
    AND mr.scope_kind = 'branch'
    AND mr.scope_id = bd.branch_id
    AND mr.is_active = true
);
