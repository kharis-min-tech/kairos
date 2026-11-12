-- 0065 — Gift Aid declarations carry a maiden or previous name.
--
-- Asked for by finance during the legal and finance review of the public
-- form. A donor's bank account is often in a name that is not the name they
-- declare under (most commonly a maiden name), and the register had nothing
-- to match the payment against.
--
-- Deliberately NOT part of the declaration. HMRC's Charities Online schedule
-- has no column for it, nothing here is ever claimed on, and
-- `renderDeclarationText` is untouched — so GIFT_AID_WORDING_VERSION does not
-- move and no existing declaration is affected.
--
-- Nullable with no default: it is optional on the form and blank on every row
-- captured before this.

ALTER TABLE gift_aid_declarations
  ADD COLUMN IF NOT EXISTS maiden_name VARCHAR(35);

COMMENT ON COLUMN gift_aid_declarations.maiden_name IS
  'Maiden or previous name, as given by the donor. Optional. A matching aid for finance, never entered on an HMRC claim.';

-- Same review, second change: HMRC's own word is "cancel", so every
-- donor-facing and admin-facing string moved off "withdraw". The Gift Aid
-- Admin role description was seeded by 0059 with the old word and is read by
-- an admin assigning the grant, so it is corrected here rather than left to
-- disagree with `seed.ts`. Matched on the old text so a hand-edited
-- description is never clobbered.
UPDATE roles
   SET description = 'Church-wide administration of Gift Aid declarations. Reviews submissions, matches them to members, records cancellations taken by phone or letter, and exports the HMRC claim register. Carries no branch, directory or safeguarding sight.'
 WHERE role_name = 'Gift Aid Admin'
   AND description LIKE '%records withdrawals taken by phone or letter%';
