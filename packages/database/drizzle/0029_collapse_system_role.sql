-- RBAC Phase 4a: collapse `system_role` to the break-glass binary and
-- preserve the pastor/leader/elder/reverend titles as display-only honorifics.
--
-- After this migration:
--   - `members.system_role` is only ever 'admin' or 'member'.
--   - Members who used to hold 'pastor' have honorific='Pastor'. Their
--     branch-tier authority is NOT auto-granted — they only see what an
--     explicit `member_roles` row grants them (matches the rebuild's intent:
--     a "Pastor" who isn't a branch admin / fellowship leader / department
--     lead sees no admin UI).
--   - 'leader' was a permission tier rather than a title, so we don't write
--     an honorific for them. Their FellowshipLeader / DepartmentLead grants
--     (already in member_roles via Phase 3) carry their access.
--
-- Operational caveat: this is the first irreversible RBAC phase. Any old
-- 'pastor' who relied on the systemRole bypass to administer their branch
-- but isn't explicitly listed as Branch System Admin in member_roles loses
-- branch admin access after this runs. The seed updates in this same phase
-- give the dev/test pastors explicit BSA grants so the demo continues to
-- work; in production, branches must ensure their pastors hold the
-- appropriate role grants before cutting over.

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS honorific varchar(50);

-- Backfill honorific for current pastor members.
UPDATE members SET honorific = 'Pastor' WHERE system_role = 'pastor' AND honorific IS NULL;

-- Collapse system_role for everyone except platform admins.
UPDATE members SET system_role = 'member' WHERE system_role NOT IN ('admin', 'member');
