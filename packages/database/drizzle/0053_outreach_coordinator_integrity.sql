-- 0053_outreach_coordinator_integrity.sql
--
-- `outreach_programs` carries BOTH coordinator_id (a member) and
-- coordinator_name (text). That is not a redundant shadow copy: the text
-- encodes the institutional case, where an admin sets the coordinator to
-- "Kharis" — the church itself runs the programme and there is no member.
-- Reads do COALESCE(coordinator_name, member name), so the text wins only
-- when it is set.
--
-- The hazard is setting BOTH. Then the frozen string beats the live member
-- name forever: rename the member and the programme still shows the old one.
-- `seed-souls.ts` was doing exactly that.
--
-- So: null the name wherever a member is also set, and add a CHECK so the
-- two can never both be populated again.

UPDATE outreach_programs
SET coordinator_name = NULL
WHERE coordinator_id IS NOT NULL
  AND coordinator_name IS NOT NULL;

ALTER TABLE outreach_programs
  DROP CONSTRAINT IF EXISTS outreach_programs_coordinator_check;
ALTER TABLE outreach_programs
  ADD CONSTRAINT outreach_programs_coordinator_check
    CHECK (NOT (coordinator_id IS NOT NULL AND coordinator_name IS NOT NULL));
