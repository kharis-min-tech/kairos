-- The name on the donor's bank account, captured only when the donor says it
-- differs from the name they are declaring under.
--
-- VARCHAR(70), not the 35 used by the name columns. 35 is HMRC's claim column
-- width and this is not an HMRC column: nothing here is ever pasted into a
-- schedule. A joint account prints as "MR M T JONES & MRS A JONES" before
-- anybody has a long surname, and truncating the one string whose entire
-- purpose is matching a bank statement exactly would defeat the field.
--
-- Nullable, and null is the normal case. Null means the donor did not say the
-- name differs. It does NOT assert that the names match, which is why nothing
-- downstream may read a null here as a confirmed match.
ALTER TABLE gift_aid_declarations
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(70);
