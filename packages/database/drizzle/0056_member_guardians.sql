-- 0056_member_guardians.sql
--
-- Guardianship becomes many-to-many.
--
-- `members.guardian_member_id` was a single nullable self-FK, so a member
-- could have exactly one guardian. Children routinely have two parents, and
-- plenty have a parent plus a grandparent or a carer. The baby forms already
-- ask for both parents by name and then had nowhere to put the second, so the
-- system recorded one and silently dropped the other.
--
-- The old column is DROPPED rather than kept as a denormalised "primary"
-- pointer. Two places holding the same fact is the drift this codebase keeps
-- paying for; primary-ness is a flag on the row instead, with one source of
-- truth and a partial unique index enforcing at most one primary per member.
--
-- Order matters: create, backfill, then drop. The whole file runs as one
-- transaction (bootstrap submits it through a single sql.unsafe), so a failure
-- anywhere leaves the column and its data intact.

CREATE TABLE IF NOT EXISTS member_guardians (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  guardian_member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  -- Mother, Father, Grandparent, Carer, Other. A label rather than an enum:
  -- families do not fit a closed list, and the safeguarding review page needs
  -- to tell a reader who this adult actually is to this child.
  relationship        varchar(40),
  is_primary          boolean NOT NULL DEFAULT false,
  is_active           boolean NOT NULL DEFAULT true,
  notes               text,
  created_at          timestamp NOT NULL DEFAULT NOW(),
  updated_at          timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT member_guardians_not_self CHECK (member_id <> guardian_member_id)
);

CREATE INDEX IF NOT EXISTS idx_member_guardians_member_id
  ON member_guardians(member_id);
-- The access-control path asks the reverse question ("which members is this
-- person a guardian of"), so index that direction too.
CREATE INDEX IF NOT EXISTS idx_member_guardians_guardian_member_id
  ON member_guardians(guardian_member_id);
CREATE INDEX IF NOT EXISTS idx_member_guardians_is_active
  ON member_guardians(is_active);

-- One live link per pair: re-adding a guardian you removed revives the row
-- rather than stacking a duplicate beside it.
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_guardians_link
  ON member_guardians(member_id, guardian_member_id) WHERE is_active = true;

-- At most one primary guardian per member.
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_guardians_primary
  ON member_guardians(member_id) WHERE is_primary = true AND is_active = true;

-- Postgres has no CREATE TRIGGER IF NOT EXISTS, so drop first to keep the
-- file replayable like every other statement here.
DROP TRIGGER IF EXISTS set_member_guardians_updated_at ON member_guardians;
CREATE TRIGGER set_member_guardians_updated_at
  BEFORE UPDATE ON member_guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill. Every existing link becomes the primary guardian, since it was the
-- only one. Relationship is left NULL: the old column never recorded one and
-- inventing "Parent" would be a guess printed on a safeguarding screen.
INSERT INTO member_guardians (member_id, guardian_member_id, is_primary)
SELECT m.id, m.guardian_member_id, true
FROM members m
WHERE m.guardian_member_id IS NOT NULL
  AND m.guardian_member_id <> m.id
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS idx_members_guardian_member_id;
ALTER TABLE members DROP COLUMN IF EXISTS guardian_member_id;
