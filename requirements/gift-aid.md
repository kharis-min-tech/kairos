# Kairos - Gift Aid

## Document Overview

Gift Aid declarations for Kharis Ministries: how they are collected before the Kairos rollout, how they appear on a member profile afterwards, how a donor withdraws one, and what finance needs out of Kairos to make an HMRC claim.

**Status: 🚧 Phase 1 shipped, awaiting finance and legal review.** Nothing in here should be published to donors until the finance and legal team has signed off on the declaration wording and the privacy notice changes in section 8. The defaults recorded in section 3 were chosen to sit as close to HMRC's guidance as the research supports; each one is a decision that review can overturn.

**Audience.** Sections 1 to 3 are for finance and legal. Sections 4 onward are implementation.

---

## 1. The charity

| Fact | Value | Why it matters here |
|---|---|---|
| Charity name | Kharis Ministries | Must be named in the declaration (HMRC 3.6.2) |
| Registered charity number | 1139291 | Shown beneath the declaration |
| Legal form | Charitable company (Companies House 07308725, company limited by guarantee) | Fixes the claim and retention clocks to the accounting period, not the tax year |
| Accounting period | June to May, so it ends **31 May** | `GIFT_AID_PERIOD_END_MONTH` / `_DAY` in `packages/types/src/gift-aid.ts`. The only place it is written; every deadline and retention date derives from it |
| Claim deadline | 4 years after the end of the accounting period in which the donation was received | **Confirm with HMRC.** Sourced from secondary guides, not from a GOV.UK page |
| Record retention | 6 years after the end of the accounting period, running from the last donation the declaration covered | The 2016 Regulations and current GOV.UK guidance word the start of this clock differently; we take the longer reading |

### Unresolved: the year end disagrees with Companies House

Kharis finance states the accounting period runs **June to May**, so it ends 31 May, and that is what the code encodes. Companies House lists the charity's next accounts as **made up to 30 June 2026**, which implies a 30 June period end.

Both cannot be right, and it matters: it moves every claim deadline and every retention date by a month, and in the worst case shifts a gift received in early June from one accounting period into the next. Finance should confirm the period against the filed accounts and the HMRC Gift Aid registration before the first claim.

If it turns out to be 30 June, change `GIFT_AID_PERIOD_END_MONTH` to `6` and `GIFT_AID_PERIOD_END_DAY` to `30`. Nothing else needs touching, and `packages/types/src/gift-aid.test.ts` covers the boundary either way.

Overseas branches (Accra, Freetown) are out of scope: Gift Aid only reaches UK Income Tax and Capital Gains Tax. The form accepts a non-UK address because UK taxpayers live abroad, and warns that UK tax is the test.

## 2. What makes a declaration valid

From HMRC's detailed guidance chapter 3 and the GOV.UK declarations guidance. Each of these is enforced somewhere in the code, and the cross-reference is in section 4.

1. **The charity is named.**
2. **The donor's full name.** Not initials. HMRC matches to tax records on it.
3. **The donor's home address.** House name or number plus postcode is enough for a UK address. Overseas donors give a full address and **no** postcode; HMRC rejects Isle of Man and Channel Islands postcodes outright.
4. **Which donations it covers**, unambiguously. "All donations I make on or after the date of this declaration" is the model phrasing; a declaration with no date in its description must itself be dated.
5. **A statement that the donor wants Gift Aid to apply.** An online tick box qualifies only where the tick is the donor's own positive act, so the box must not be pre-ticked.
6. **An adequate explanation of the donor's tax liability.** "I am a UK taxpayer" on its own is explicitly **not** sufficient (3.6.7). The declaration must explain that the donor owes HMRC the difference if they pay less tax in a year than all charities claim on their giving. Getting this wrong invalidates the declaration and can mean repaying the tax with interest.
7. **No joint names and no company names.** A household can share one printed form only if each person is listed separately with their own full name and address.
8. **An auditable record of the declaration itself.** Chapter 3.7.2: "transcribing of declarations ... into a database will not satisfy the requirements." A boolean on a profile is not a record. This is the single most important constraint on the data model.

### Withdrawal

- A donor may withdraw at any time.
- Withdrawal is **prospective**: it stops Gift Aid on gifts made from the date the donor tells us, and does not disturb claims already made. The one retrospective case is a withdrawal within 30 days of the written confirmation of a *verbal* declaration, where the declaration is treated as never made.
- We must keep a record of the withdrawal including its **date and its method** (2016 Regulations, reg. 9). The database enforces that the two travel together.
- A written confirmation returned undeliverable is treated as a cancellation (3.8.1).
- The declaration is kept after withdrawal. It is the evidence for everything claimed under it.

### Reminders

HMRC expects the charity to remind donors regularly that the tax liability is theirs (3.5.5). Planned for Phase 2 as an annual notification.

### Not in scope: GASDS

The Gift Aid Small Donations Scheme tops up cash and contactless gifts of £30 or less with no declaration at all, capped at £8,000 of small donations a year (so £2,000 of top-up), subject to a matching rule against ordinary Gift Aid claimed in the same tax year. For a multi-branch church the community-buildings election may give an allowance per building, which would be worth more than chasing declarations. That detail only appears in secondary guides, so confirm it on GOV.UK. Tracked as Phase 3.

## 3. Defaults chosen, pending review

Each of these was a judgement call. Finance and legal should confirm or overturn them.

| Decision | Default | Reasoning |
|---|---|---|
| Declaration wording | `renderDeclarationText` in `packages/types/src/gift-aid.ts`, version `2026-10-v1` | Covers all eight requirements in section 2. Reproduced in full in section 9 |
| Coverage offered | "This gift, the past 4 years, and all future gifts" (default) or "this gift and all future gifts" | HMRC permits backdating; four years is where the claim window closes, so the default recovers the most |
| Single-gift declarations | Supported in the data model, not offered in any UI | A church's giving is recurring. Adding the option would complicate the form for a case nobody asked for |
| Verbal declarations | Column and channel exist, no UI | The 30-day retrospective-cancellation machinery is real work and nobody has asked for phone declarations yet |
| Who may see declarations | The `Gift Aid Admin` grant, held by nobody by default and given to named individuals as and when needed. **Not** branch admins, and not tied to any job title | A declaration carries a home address and a statement about the donor's tax affairs. That is finance data, and the people who need it are not otherwise admins. See section 3a |
| Donations | Not held in Kairos | Giving runs through kharis.org and text giving. Kairos exports a declaration register for finance to join against |
| Retention action | A review date is stored; nothing is ever auto-deleted | An open HMRC enquiry extends the period indefinitely, and no scheduled job can know about one |
| GDPR erasure | A declaration survives `deleteMyAccount` | Lawful basis is legal obligation, not consent. See section 8 |
| Email on the public form | Required | It is the only handle for matching the declaration to a member later |
| Title and name lengths | 4 and 35 characters | HMRC's Charities Online schedule column widths. Validated at capture so a declaration can never be collected in a shape that cannot be claimed on |

## 3a. The access model

**Gift Aid access is a grant to a named person, not a role anyone holds by default.** Confirmed by the product owner: the people who need it are the finance people, who are typically not administrators of anything else in Kairos, and it is given out as and when a specific individual needs it.

The implementation is already exactly this, and it should stay this way:

- `Gift Aid Admin` is a row in `roles`, seeded by migration 0059 and granted through `member_roles`. No member holds it on creation and nothing derives it.
- It carries one capability, `giftaid:admin`, and nothing else. No `branch:read`, no directory, no safeguarding, no reports.
- It is orthogonal to `systemRole`. A member with `systemRole: 'member'` holds it and works, which is the whole point.
- It is church-scoped, so it is not a per-branch grant and cannot be narrowed to one.
- Revoking it (`is_active = false` on the `member_roles` row) removes the access immediately on the next token refresh.

Two consequences worth recording:

1. **`assignRole` already handles this correctly** because it derives the scope shape from `DB_ROLE_NAME_TO_FUNCTIONAL` in `apps/api/src/lib/grants.ts` rather than hardcoding `'branch'`. The comment there anticipated exactly this case. `'Gift Aid Admin'` is in that map; omitting it would have written a branch-scoped row that `resolveGrants` resolves into a grant matching nothing, and the UI would have reported success while the grantee stayed locked out.
2. **Granting it is a `systemRole: 'admin'` action**, because `assignRole` gates on that. So a system admin has to hand it to each finance person. Flagged to the product owner as a thing we can change.

Do not add `giftaid:admin` to another role's bundle, and do not give it a default holder. If a future request is "the treasurer should always have it", that is a grant to whoever is treasurer, not a capability on a title.

## 4. Where each requirement is enforced

| Requirement | Enforced in |
|---|---|
| Charity named, wording correct | `renderDeclarationText` (`packages/types/src/gift-aid.ts`) - the one renderer, used by the web form and stored on the row |
| Full name, length-safe | `declarantShape` in `apps/api/src/gift-aid/schemas.ts`, mirrored in `apps/web/src/components/gift-aid-declaration-form.tsx` |
| UK address needs a postcode, overseas must not have one | `enforceAddressRules` (API) + `gift_aid_uk_postcode_required_check` (DB) |
| Coverage unambiguous | `gift_aid_covers_from_check` (DB) + `buildInsert` sets `coversFrom` from the donor's declaration date |
| Positive opt-in | `confirmedDeclaration: z.literal(true)` on both schemas; the box is never pre-ticked |
| Auditable record | `declaration_text`, `wording_version`, `channel`, `evidence_url`, `source_ip`, `user_agent` on `gift_aid_declarations` |
| Name and address survive erasure | Stored on the declaration row, not read through to `members` |
| Withdrawal carries date and method | `gift_aid_cancellation_complete_check` (DB) + `recordWithdrawal` (API) |
| One declaration in force per donor | `uq_gift_aid_active_per_member` partial unique index |
| Paper declaration has its scan | `captureDeclarationSchema` refuses `channel: 'paper'` without `evidenceUrl` |
| Verbal declaration has its written confirmation date | Same schema, `writtenConfirmationSentAt` required for `channel: 'verbal'` |

## 5. Data model

`gift_aid_declarations` (migration `0059_gift_aid_declarations.sql`). Append-mostly: a withdrawal updates the cancellation columns, and nothing deletes a row.

Three decisions worth not re-litigating, all argued in the migration header:

1. **Not `consent_records`.** That table is (member x type x version) with a boolean, cascade-deleted with the member, carrying no payload. A declaration needs an address, a coverage scope, the wording agreed to, and evidence, and it must survive erasure. Consent version semantics would also be wrong: re-wording a declaration does not invalidate an existing one, so a version bump must never re-prompt a donor.
2. **The declared identity lives on the declaration.** `member_id` is a link, `ON DELETE RESTRICT`, not the source of the donor's name or address.
3. **Church scope.** A declaration names the charity, and one charity contains every branch. `branch_id` is a query handle for the review queue, not the record's reach. Same argument as Membership Admin (0048) and Safeguarding Head (0054).

**Status is in-force-or-not: `active | cancelled | invalid`.** Being unmatched to a Kairos member is a separate axis (`member_id IS NULL`), because a declaration made on the pre-rollout form is in force the moment the donor makes it, exactly like a paper form handed in at a service. Conflating the two would have made every pre-rollout declaration look unclaimable until an admin got to it.

## 6. Routes

Public, mounted before the consent gate because the people it serves have no Kairos account:

| Route | Purpose |
|---|---|
| `GET /api/public/gift-aid/declaration-text` | The wording, from the one renderer |
| `POST /api/public/gift-aid/declarations` | The pre-rollout form |

Authenticated, donor-facing, gated on nothing but being signed in:

| Route | Purpose |
|---|---|
| `GET /api/gift-aid/me` | The declaration in force, the history, and whether to offer declare or update |
| `POST /api/gift-aid/me` | Declare. Withdraws and supersedes any existing declaration, which is HMRC's required route for a change |
| `POST /api/gift-aid/me/withdraw` | Withdraw. Prospective |

Administrative, gated on `giftaid:admin` at `CHURCH_SCOPE`:

| Route | Purpose |
|---|---|
| `GET /api/gift-aid` | List and review queue (`?unmatched=true`) |
| `POST /api/gift-aid` | Capture a paper, verbal or imported declaration |
| `GET /api/gift-aid/:id` | One declaration |
| `POST /api/gift-aid/:id/match` | Link an unmatched declaration to its member |
| `POST /api/gift-aid/:id/withdraw` | Record a withdrawal that arrived by phone, letter, email or in person |
| `POST /api/gift-aid/:id/invalid` | Mark a declaration as not meeting HMRC's requirements |
| `GET /api/gift-aid/register` / `register.csv` | The claim register |

## 7. Surfaces

| Surface | Path |
|---|---|
| Public pre-rollout form | `/gift-aid` (outside both route groups, chrome mirrors `/legal`) |
| Member's own declaration | `/profile/settings/gift-aid`, linked from Privacy & Data in settings |
| Admin queue and register | `/gift-aid`, nav item under Organisation, visible only with `giftaid:admin` |

Mobile has no Gift Aid surface yet. The giving tab is a WebView over kharis.org, so the public form is reachable there today; a native profile surface is open work.

## 8. Privacy notice changes

**Status: drafted in `apps/web/src/app/legal/privacy/page.tsx`, marked `DRAFT, awaiting legal sign-off` at each of the three insertion points.** The wording is live on the page, which is the right place for legal to read it in context, but it has not been reviewed. Remove the DRAFT comments once it has.

The three changes, all applied:

1. A row in the section 3 lawful basis table naming Gift Aid as a legal obligation under UK tax law, and saying in terms that it is not based on consent.
2. A retention bullet in section 5: six years after the end of the accounting period containing the last donation covered, longer while an HMRC enquiry is open, covering the declaration, the declared name and address, and the withdrawal record.
3. A bullet in section 6 (rights) saying that deleting a profile does not delete a Gift Aid declaration, and why. The existing erasure caveat ("except where we are required to keep it for safeguarding or legal reasons") technically covered this, but a donor should not have to infer it.

Two open questions for the reviewers, carried in the review doc:

- Is `privacy@kharis.org` the right contact for Gift Aid queries and withdrawals, or should they go to a finance address? The donor-facing copy currently says the church office.
- Name six years, or say "as long as HM Revenue and Customs requires"? The draft names the figure, which is clearer for a donor but commits us to the longer reading of the two retention clocks.

The substance the notice has to carry, for reference:

1. That Gift Aid declaration data (name, home address, postcode, the fact of the declaration) is processed on the basis of a **legal obligation** under the Taxes Management Act and the Gift Aid regulations, **not consent**.
2. That it is retained for six years after the end of the accounting period containing the last donation it covered, and longer while an HMRC enquiry is open.
3. That it is **not deleted** when a member asks for their profile to be deleted, and why.
4. That the home address is used to identify the donor to HMRC.

The declaration notes shown beside the form already tell the donor points 2 to 4 in plain words (`renderDeclarationNotes`).

## 9. The declaration text, version 2026-10-v1

As rendered for the default coverage. The wording is produced by `renderDeclarationText`, so this is a copy for review, not the source.

> I want to Gift Aid all qualifying gifts of money I make to Kharis Ministries today, in the future, and in the past 4 years.
>
> I am a UK taxpayer. I understand that Kharis Ministries will reclaim 25p of tax on every 1 pound I give, and that if I pay less Income Tax and/or Capital Gains Tax in a tax year than the amount of Gift Aid claimed on all my donations to all charities in that year, it is my responsibility to pay the difference to HM Revenue and Customs.
>
> I confirm this is my own money, that it is not the proceeds of a collection or a payment from a company, and that I am not receiving anything in return for it.
>
> I will tell Kharis Ministries if I change my name or home address, if I stop paying enough tax, or if I want to withdraw this declaration.

Shown beside it, not part of the declaration:

> Kharis Ministries is a registered charity, number 1139291.
>
> Your home address is needed so HM Revenue and Customs can identify you as a UK taxpayer. It is not used for anything else without your agreement.
>
> Gift Aid cannot be claimed on gifts made from a business account, on the proceeds of a collection, or on payments for tickets, courses or goods.
>
> You can withdraw this declaration at any time. Withdrawing it stops Gift Aid on gifts you make from the day you tell us, and does not affect Gift Aid already claimed on earlier gifts.
>
> We keep this declaration, and the record of any withdrawal, for as long as HM Revenue and Customs requires. That is why it is not removed if you later ask us to delete your profile.

## 10. The claim path, and what is missing

Kairos holds declarations. It does **not** hold donations: giving runs through kharis.org (bank transfer, a card page per branch) and text giving on 70085. So Kairos cannot produce an HMRC claim end to end, and pretending otherwise would be the wrong build.

What it does produce is `GET /api/gift-aid/register.csv`, shaped to the Charities Online schedule columns (title, name, house name or number, postcode in capitals with a space, declared on, covers donations from, status, withdrawn on, email, branch). Finance joins it against the donation data and pastes the result into HMRC's own spreadsheet.

Two things to settle before the first claim:

1. **Duplicate claims.** A text-giving or card provider that claims Gift Aid on its own gifts must not have those gifts claimed again. Whoever owns the donation data needs to record which system claimed each gift.
2. **Schedule mechanics.** One spreadsheet carries at most 1,000 lines. Donations of £20 or less from different donors can be aggregated onto one line up to £1,000, with no donor names on an aggregated line. Sponsored-event gifts over £500 must be listed individually.

## 11. Phases

- **Phase 0 - before publishing anything.** Finance and legal sign off on the wording (section 9) and the drafted privacy notice changes (section 8), via the review doc at https://claude.ai/artifact/Us9LvjYfFYYEddXyC5epP3. Confirm HMRC Gift Aid registration is in place, and whether there are existing paper declarations to import.
- **Phase 1 - shipped.** Schema and migration, the `Gift Aid Admin` role, API, public form, profile surface with withdrawal, admin review and match queue, register export.
- **Phase 2 - open.** Annual tax-responsibility reminder via `notification_events`. Address-change tracking (a change does not invalidate a declaration but must be recorded). A retention review surface. Verbal declaration capture with the 30-day window. A mobile profile surface.
- **Phase 3 - open.** GASDS tracking, including the community-buildings election per branch.
- **Phase 4 - open, and a separate decision.** Donations in Kairos.

## 12. Sources

- HMRC detailed guidance chapter 3: Gift Aid - https://www.gov.uk/government/publications/charities-detailed-guidance-notes/chapter-3-gift-aid
- Gift Aid declarations: claiming tax back on donations - https://www.gov.uk/guidance/gift-aid-declarations-claiming-tax-back-on-donations
- Schedule spreadsheet to claim back tax on Gift Aid donations - https://www.gov.uk/guidance/schedule-spreadsheet-to-claim-back-tax-on-gift-aid-donations
- The Donations to Charity (Gift Aid Declarations) Regulations 2016, reg. 9 - https://www.legislation.gov.uk/uksi/2016/1195/regulation/9/made
- Charity Commission register, Kharis Ministries - https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/4023678
- Companies House, company 07308725 - https://find-and-update.company-information.service.gov.uk/company/07308725
