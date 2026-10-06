-- 0054_safeguarding_head_and_minister.sql
--
-- Two changes, both about who may see what.
--
-- 1. SAFEGUARDING HEAD — a church-scoped safeguarding role.
--
--    `Safeguarding Lead` is branch-scoped, and a branch grant can never
--    satisfy a church-scoped check (the church contains every branch, not
--    the reverse). That left no way to express oversight of safeguarding
--    across all branches short of `system_role = 'admin'`, which is far too
--    much power for the job — and no escalation path at all for a concern
--    that needs to leave the branch it was raised in.
--
--    RoleScope kind = 'church', so grants carry the nil-UUID sentinel in
--    `scope_id` and the grantee's home branch in `branch_id` (a query
--    handle, not the grant's reach) — same shape as Membership Admin.
--
-- 2. ELDER → MINISTER. A rename of the branch_leadership identity title, to
--    match what Kharis actually calls the role. Identity only: it carries no
--    permissions, which continue to live in member_roles grants.

-- ── 1. Safeguarding Head ──────────────────────────────────
--
-- Idempotent via NOT EXISTS, matching 0048/0051: staging's public schema was
-- provisioned out-of-band, so we cannot assume `roles.role_name` is unique.
INSERT INTO roles (role_name, description)
SELECT
  'Safeguarding Head',
  'Church-wide safeguarding oversight. Reads and acts on safeguarding concerns in every branch; the escalation path above each branch Safeguarding Lead. Carries no welfare, directory or branch-operations sight.'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Safeguarding Head');

-- ── 2. Elder → Minister ───────────────────────────────────
--
-- The CHECK in branch-leadership.ts has never actually been emitted as DDL —
-- Drizzle treats a bare sql`CHECK (...)` in the table extras as documentation
-- and 0000 shipped none. So DROP IF EXISTS is a no-op on existing databases
-- and the ADD below creates the constraint for the first time, which is the
-- point: the vocabulary should be enforced, not merely described. The order
-- still matters for any database where it HAS been applied by hand.
ALTER TABLE branch_leadership DROP CONSTRAINT IF EXISTS branch_leadership_role_check;

UPDATE branch_leadership SET role = 'Minister' WHERE role = 'Elder';

ALTER TABLE branch_leadership
  ADD CONSTRAINT branch_leadership_role_check
  CHECK (role IN ('Main Pastor', 'Minister'));
