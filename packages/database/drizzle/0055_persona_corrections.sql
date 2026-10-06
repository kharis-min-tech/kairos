-- 0055_persona_corrections.sql
--
-- Correct role data in place on databases that already hold real accounts.
--
-- The seed was reshaped to match how Kharis actually runs, but a seed only
-- helps a fresh database — and `db:seed` truncates, so it can never be used to
-- repair one that has live test accounts on it. These are the same corrections
-- expressed against relationships rather than seeded ids, so they apply to
-- whatever is actually there.
--
-- Three rules are being enforced, all of them about a Main Pastor:
--
--   1. A Main Pastor leads no fellowship. He is over all of them; a scoped
--      FellowshipLeader grant says strictly less than the BranchAdmin grant he
--      already holds, and it misrepresents the relationship.
--   2. A Main Pastor belongs to no fellowship and no department.
--   3. A Main Pastor holds neither Branch Data Admin (pure operational
--      authority, deliberately someone else) nor Safeguarding Lead (whose
--      entire value is independence from branch leadership — a concern raised
--      about the leadership has to reach someone outside it).
--
-- What this migration deliberately does NOT do: invent appointments. It will
-- not grant Safeguarding Lead, Safeguarding Head or Membership Champion to
-- anybody. Those are decisions a human makes in the admin UI, and a plausible
-- guess would be worse than an empty seat.
--
-- Everything here is idempotent: each statement's WHERE clause is already
-- false once it has run. Removals are soft (is_active = false), per the
-- codebase's soft-delete rule.

-- ── Who is a Main Pastor, and where ────────────────────────
CREATE TEMP TABLE _main_pastors ON COMMIT DROP AS
SELECT DISTINCT bl.member_id, bl.branch_id
FROM branch_leadership bl
WHERE bl.role = 'Main Pastor' AND bl.is_current = TRUE;

-- ── 1. Main Pastors leave the fellowships they belong to ───
UPDATE fellowship_members fm
SET is_active = FALSE,
    leave_date = CURRENT_DATE,
    updated_at = NOW()
FROM fellowships f, _main_pastors mp
WHERE fm.fellowship_id = f.id
  AND fm.member_id = mp.member_id
  AND f.branch_id = mp.branch_id
  AND fm.is_active = TRUE;

-- ── 2. ...and the departments they belong to ───────────────
UPDATE department_members dm
SET is_active = FALSE,
    updated_at = NOW()
FROM branch_departments bd, _main_pastors mp
WHERE dm.branch_department_id = bd.id
  AND dm.member_id = mp.member_id
  AND bd.branch_id = mp.branch_id
  AND dm.is_active = TRUE;

-- ── 3. Hand over the fellowships they lead ─────────────────
--
-- The replacement is the longest-tenured ACTIVE member of that same
-- fellowship, excluding the pastor himself and excluding platform admins.
-- Where no such member exists the leader becomes NULL rather than a guess:
-- `leader_id` is nullable by design, a leaderless fellowship is a true and
-- actionable state, and inventing a leader would be worse than an empty seat.
CREATE TEMP TABLE _handovers ON COMMIT DROP AS
SELECT
  f.id                AS fellowship_id,
  f.branch_id         AS branch_id,
  f.leader_id         AS old_leader_id,
  (
    SELECT fm.member_id
    FROM fellowship_members fm
    JOIN members m ON m.id = fm.member_id
    WHERE fm.fellowship_id = f.id
      AND fm.is_active = TRUE
      AND m.is_active = TRUE
      AND m.system_role <> 'admin'
      AND fm.member_id <> f.leader_id
      AND fm.member_id NOT IN (SELECT member_id FROM _main_pastors)
    ORDER BY fm.join_date ASC, fm.created_at ASC
    LIMIT 1
  )                   AS new_leader_id
FROM fellowships f
JOIN _main_pastors mp
  ON mp.member_id = f.leader_id
 AND mp.branch_id = f.branch_id
WHERE f.is_active = TRUE;

UPDATE fellowships f
SET leader_id = h.new_leader_id,
    updated_at = NOW()
FROM _handovers h
WHERE f.id = h.fellowship_id;

-- The matching RBAC grants. Service-layer write-through keeps these in sync
-- for changes made through the API; a direct UPDATE like the one above has to
-- carry them itself, or `resolveGrants` hands out capabilities that no longer
-- reflect the table.
UPDATE member_roles mr
SET is_active = FALSE,
    end_date = CURRENT_DATE,
    updated_at = NOW()
FROM _handovers h, roles r
WHERE mr.role_id = r.id
  AND r.role_name = 'Fellowship Leader'
  AND mr.member_id = h.old_leader_id
  AND mr.scope_kind = 'fellowship'
  AND mr.scope_id = h.fellowship_id
  AND mr.is_active = TRUE;

INSERT INTO member_roles (member_id, role_id, branch_id, scope_kind, scope_id)
SELECT h.new_leader_id, r.id, h.branch_id, 'fellowship', h.fellowship_id
FROM _handovers h
CROSS JOIN roles r
WHERE r.role_name = 'Fellowship Leader'
  AND h.new_leader_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── 4. A Main Pastor is not the branch data admin ──────────
UPDATE member_roles mr
SET is_active = FALSE,
    end_date = CURRENT_DATE,
    updated_at = NOW()
FROM _main_pastors mp, roles r
WHERE mr.role_id = r.id
  AND r.role_name = 'Branch Data Admin'
  AND mr.member_id = mp.member_id
  AND mr.scope_kind = 'branch'
  AND mr.scope_id = mp.branch_id
  AND mr.is_active = TRUE;

-- ── 5. ...and is never the safeguarding lead ───────────────
UPDATE member_roles mr
SET is_active = FALSE,
    end_date = CURRENT_DATE,
    updated_at = NOW()
FROM _main_pastors mp, roles r
WHERE mr.role_id = r.id
  AND r.role_name = 'Safeguarding Lead'
  AND mr.member_id = mp.member_id
  AND mr.scope_kind = 'branch'
  AND mr.scope_id = mp.branch_id
  AND mr.is_active = TRUE;

-- ── 6. Also drop the Admin-desk lead where it IS the pastor ─
-- Branch Data Admin is derived from leading the Admin department, so clearing
-- the grant above without clearing its source would let a later write-through
-- hand it straight back.
UPDATE branch_departments bd
SET lead_member_id = NULL,
    updated_at = NOW()
FROM departments d, _main_pastors mp
WHERE bd.department_id = d.id
  AND d.department_name = 'Admin'
  AND bd.lead_member_id = mp.member_id
  AND bd.branch_id = mp.branch_id;
