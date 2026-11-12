# Kairos - Gift Aid

## Document Overview

Gift Aid declarations for Kharis Ministries: how they are collected before the Kairos rollout, how they appear on a member profile afterwards, how a donor cancels one, and what finance needs out of Kairos to make an HMRC claim.

**Status: ✅ Phase 1 shipped and reviewed by finance and legal on 11 November 2026.** The review was broadly an approval with six changes, all applied and recorded in section 2a. What is still open is not the wording: it is the public URL (section 7) and the two questions in section 8 that the reviewers did not reach. The defaults recorded in section 3 were chosen to sit as close to HMRC's guidance as the research supports; each one is a decision review can still overturn.

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

### Cancellation

- A donor may cancel at any time.
- Cancellation is **prospective**: it stops Gift Aid on gifts made from the date the donor tells us, and does not disturb claims already made. The one retrospective case is a cancellation within 30 days of the written confirmation of a *verbal* declaration, where the declaration is treated as never made.
- We must keep a record of the cancellation including its **date and its method** (2016 Regulations, reg. 9). The database enforces that the two travel together.
- A written confirmation returned undeliverable is treated as a cancellation (3.8.1).
- The declaration is kept after cancellation. It is the evidence for everything claimed under it.

### Reminders

HMRC expects the charity to remind donors regularly that the tax liability is theirs (3.5.5). Planned for Phase 2 as an annual notification.

### Not in scope: GASDS

The Gift Aid Small Donations Scheme tops up cash and contactless gifts of £30 or less with no declaration at all, capped at £8,000 of small donations a year (so £2,000 of top-up), subject to a matching rule against ordinary Gift Aid claimed in the same tax year. For a multi-branch church the community-buildings election may give an allowance per building, which would be worth more than chasing declarations. That detail only appears in secondary guides, so confirm it on GOV.UK. Tracked as Phase 3.

## 2a. Finance and legal review, 11 November 2026

The team reviewed the public form, the declaration wording and the privacy notice, and were content with the substance. Six changes were asked for. All six are applied.

| # | Asked for | Where it landed |
|---|---|---|
| 1 | Title should be a dropdown, not a text box | `GIFT_AID_TITLE_OPTIONS` in `packages/types/src/gift-aid.ts`, rendered as a `CustomSelect` on the form. Mr, Mrs, Miss and Ms, each inside HMRC's 4-character column. The API still validates length only, so a declaration carrying a title that is not on the list is not rejected |
| 2 | Add a maiden name, optional | `maiden_name` on `gift_aid_declarations` (migration `0065`), optional on both schemas and on the form, searchable in the admin match queue, and its own column in the register export |
| 3 | Emphasise that the name should be the one on the donor's bank account where that differs | Second paragraph of the guidance block above the name fields, pointing at the maiden name field |
| 4 | Lawful basis wording: "Legal Obligation (Article 6(1)(c)): Processing is necessary for us the controller to comply with the law (excluding contractual obligations)" | Verbatim in the section 3 table of `apps/web/src/app/legal/privacy/page.tsx`, with the existing "not consent, not stoppable at your request" sentence kept after it |
| 5 | Updated opening wording on the public form | The intro paragraph of `apps/web/src/app/gift-aid/page.tsx`, with the member's own Gift Aid page brought into line so the same claim is not made two ways |
| 6 | HMRC name guidance, with the "Margaret Jones" example, moved above the name section | The guidance block now sits above the name fields rather than beneath them, where it was read after the donor had already typed |

**None of these six touches the declaration itself.** The maiden name in particular is a matching aid for finance, never entered on a claim, and a test asserts it does not reach the stored wording. The wording version moved for a different reason, decided afterwards: see section 2b.

### 2b. "Cancel", not "withdraw" (decided 11 November 2026)

Change 5 introduced "until you cancel it", HMRC's own model phrasing, while the rest of Kairos said *withdraw*. Asked to choose, the product owner took HMRC's word everywhere, so every donor-facing and admin-facing string now says **cancel**.

This one does reach the declaration itself: `renderDeclarationText` now ends "if I want to cancel this declaration", so **`GIFT_AID_WORDING_VERSION` moves to `2026-11-v1`**. Nothing a donor agreed to changed in substance. A version bump never invalidates a declaration and never re-prompts a donor, so declarations captured under `2026-10-v1` keep that version on their row, stay in force, and still reproduce the exact words their donor saw. That is the whole reason the version and the rendered text are both stored.

What changed: the declaration text and the notes beside it, the status label (`Cancelled`, not `Withdrawn`), the cancellation-method labels, the register's `Cancelled on` column, the donor's profile surface, the admin queue, the public form's thank-you page, and the Gift Aid rows of the privacy notice. "Withdraw consent" in the privacy notice is untouched: that is GDPR's word for a different thing.

What did **not** change, deliberately: the route paths `POST /api/gift-aid/me/withdraw` and `POST /api/gift-aid/:id/withdraw`, and the function and hook names behind them. Pages and the Worker deploy from the same push but not atomically, so renaming a live path opens a window where the donor's cancel button 404s against the older half. The database has said `cancelled_at` / `cancellation_method` since 0059, so the stored data already uses the right word and nothing is ambiguous. Rename the paths in their own change if it is ever worth doing.

**Still carried from before the review.** The two open questions in section 8 (the contact address for Gift Aid queries, and whether to name six years) were not answered, and section 1's accounting-period disagreement with Companies House is unresolved. None of the three blocks publishing the form.

## 3. Defaults chosen, pending review

Each of these was a judgement call. Finance and legal should confirm or overturn them.

| Decision | Default | Reasoning |
|---|---|---|
| Declaration wording | `renderDeclarationText` in `packages/types/src/gift-aid.ts`, version `2026-11-v1` | Covers all eight requirements in section 2. Reproduced in full in section 9 |
| Coverage offered | "This gift, the past 4 years, and all future gifts" (default) or "this gift and all future gifts" | HMRC permits backdating; four years is where the claim window closes, so the default recovers the most |
| Single-gift declarations | Supported in the data model, not offered in any UI | A church's giving is recurring. Adding the option would complicate the form for a case nobody asked for |
| Verbal declarations | Column and channel exist, no UI | The 30-day retrospective-cancellation machinery is real work and nobody has asked for phone declarations yet |
| Who may see declarations | The `Gift Aid Admin` grant, held by nobody by default and given to named individuals as and when needed. **Not** branch admins, and not tied to any job title | A declaration carries a home address and a statement about the donor's tax affairs. That is finance data, and the people who need it are not otherwise admins. See section 3a |
| Donations | Not held in Kairos | Giving runs through kharis.org and text giving. Kairos exports a declaration register for finance to join against |
| Retention action | A review date is stored; nothing is ever auto-deleted | An open HMRC enquiry extends the period indefinitely, and no scheduled job can know about one |
| GDPR erasure | A declaration survives `deleteMyAccount` | Lawful basis is legal obligation, not consent. See section 8 |
| Email on the public form | Required | It is the only handle for matching the declaration to a member later |
| Title and name lengths | 4 and 35 characters | HMRC's Charities Online schedule column widths. Validated at capture so a declaration can never be collected in a shape that cannot be claimed on |
| Title input | A dropdown of Mr, Mrs, Miss, Ms, blank allowed | Asked for by finance (section 2a). Every option fits the 4-character column; the API keeps the length check rather than an allowlist, so an off-list title is still a valid declaration |
| Maiden or previous name | Optional, captured, never claimed on | Asked for by finance (section 2a). A donor's bank account is often in a former name and the register had nothing to match the payment against. HMRC has no column for it |

## 3a. The access model

**Gift Aid access is a grant to a named person, not a role anyone holds by default.** Confirmed by the product owner: the people who need it are the finance people, who are typically not administrators of anything else in Kairos, and it is given out as and when a specific individual needs it.

The implementation is already exactly this, and it should stay this way:

- `Gift Aid Admin` is a row in `roles`, seeded by migration 0059 and granted through `member_roles`. No member holds it on creation and nothing derives it.
- It carries one capability, `giftaid:admin`, and nothing else. No `branch:read`, no directory, no safeguarding, no reports.
- It is orthogonal to `systemRole`. A member with `systemRole: 'member'` holds it and works, which is the whole point.
- **A `systemRole: 'admin'` account can read the register without holding the grant.** `matchesCapability` returns true for a system admin against every capability in Kairos, so Gift Aid is not an exception to a rule, it sits inside a blanket override that predates this feature. Verified at runtime: `admin@kairos.local`, which holds no grants at all, gets 200 on `GET /api/gift-aid` and `/register`, while a plain member with no grant gets 403. Confirmed as intended by the product owner. There will be one or two system admins, and anything needing that level of access is handled by granting `systemRole: 'admin'` for the task and revoking it once done, so the elevation is deliberate and temporary rather than a standing permission.
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
| Cancellation carries date and method | `gift_aid_cancellation_complete_check` (DB) + `recordWithdrawal` (API) |
| One declaration in force per donor | `uq_gift_aid_active_per_member` partial unique index |
| Paper declaration has its scan | `captureDeclarationSchema` refuses `channel: 'paper'` without `evidenceUrl` |
| Verbal declaration has its written confirmation date | Same schema, `writtenConfirmationSentAt` required for `channel: 'verbal'` |

## 5. Data model

`gift_aid_declarations` (migration `0059_gift_aid_declarations.sql`). Append-mostly: a cancellation updates the cancellation columns, and nothing deletes a row.

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
| `POST /api/gift-aid/me` | Declare. Cancels and supersedes any existing declaration, which is HMRC's required route for a change |
| `POST /api/gift-aid/me/withdraw` | Cancel. Prospective (the path keeps the old spelling; see section 2a) |

Administrative, gated on `giftaid:admin` at `CHURCH_SCOPE`:

| Route | Purpose |
|---|---|
| `GET /api/gift-aid` | List and review queue (`?unmatched=true`) |
| `POST /api/gift-aid` | Capture a paper, verbal or imported declaration |
| `GET /api/gift-aid/:id` | One declaration |
| `POST /api/gift-aid/:id/match` | Link an unmatched declaration to its member |
| `POST /api/gift-aid/:id/withdraw` | Record a cancellation that arrived by phone, letter, email or in person |
| `POST /api/gift-aid/:id/invalid` | Mark a declaration as not meeting HMRC's requirements |
| `GET /api/gift-aid/register` / `register.csv` | The claim register |

## 7. Surfaces

| Surface | Path |
|---|---|
| Public pre-rollout form | `/gift-aid` (outside both route groups, chrome mirrors `/legal`) |
| Member's own declaration | `/profile/settings/gift-aid`, linked from Privacy & Data in settings |
| Admin queue and register | `/admin/gift-aid`, nav item under Organisation, visible only with `giftaid:admin` |

The admin surface sits under `/admin` rather than at `/gift-aid` because `(dashboard)` is an App Router route group and contributes no path segment, so `(dashboard)/gift-aid/page.tsx` and `gift-aid/page.tsx` both resolve to `/gift-aid` and Next refuses to build. The public form keeps the short URL, since that is the one the congregation is given. Typecheck and lint do not catch this; only running the app does.

Mobile has no Gift Aid surface yet. The giving tab is a WebView over kharis.org, so the public form is reachable there today; a native profile surface is open work.

### The URL, and the QR code it goes behind

The form is reached by **scanning a QR code on a printed card**. Nobody types the address, which decides most of this: what matters is the domain the phone shows in the scan preview, and the fact that a printed card cannot be recalled.

**DECIDED 12 November 2026: encode `https://giftaid.kharis.org`**, a redirect-only hostname in the `kharis.org` zone, pointing at the form through a Cloudflare dynamic-redirect rule.

The indirection is the point. Encoding `kairos.kharis.org/gift-aid` directly saves one invisible hop and bakes the app's current address into a physical object forever; if the app ever moves, every printed card dies. One redirect rule is cheap insurance, and the scan preview reads `giftaid.kharis.org`, which says what it is and carries the church's domain.

**Why not `kharis.org/gift-aid`, which this section originally recommended.** It cannot work as the zone is configured, and the reason is worth recording because it is invisible from the dashboard's rules screen: **the `kharis.org` root is DNS-only**. The `A` record points at `160.153.0.102` (GoDaddy) with `proxied: false`, and `www` is a CNAME to the root, also unproxied. Cloudflare never sees that traffic, so no rule in the zone can fire for it — a redirect rule written against `kharis.org/gift-aid` sits there looking correct and does nothing. Verified: `https://kharis.org/gift-aid` returns 404 with the rule deployed and enabled.

Making it work would mean proxying the root record, which puts Cloudflare in front of a live GoDaddy WordPress site and changes caching and SSL handling (the zone is on `Full`, not `Full (strict)`). That is a deliberate decision about the main church website, not a side effect of a QR code, and it was declined as not worth the hassle for a URL nobody types.

**What is deployed**

| | |
|---|---|
| Hostname | `giftaid.kharis.org` — `AAAA` to `100::`, **proxied**. The IPv6 discard prefix, so nothing is ever reached and the proxy answers. Same pattern as `visit-spurgeons-centre.kharis.org`, already in this zone. |
| Rule | `04c77895de4a4cdc9fae773cb44cc436`, ruleset `ad23ec00da5544fab2b9d3fac5a52c28`, phase `http_request_dynamic_redirect` |
| Expression | `http.host eq "giftaid.kharis.org"` — any path |
| Target | `https://staging.kairos.kharis.org/gift-aid`, query string preserved |
| Status | **302 while validating.** See below. |

**The 302 is deliberate and must be changed on purpose.** A 301 is cached hard and effectively permanently by browsers. Validating against staging with a 301 would pin every tester's browser to staging after the target is switched to production, and the people most likely to have tested are the people demonstrating it. Switch to 301 only once the target is the production URL and settled.

**Two edits before the print run**, both on the same rule: target → `https://kairos.kharis.org/gift-aid`, status → 301.

Before the print run:

- **Ship to production, then repoint the rule.** The form is on `staging` only, and `kairos.kharis.org/gift-aid` 404s as of 12 November 2026. Merge `staging` into `main`. The QR itself never changes, which is the whole point of the indirection: the card can be designed and even printed before production exists, because only the rule target moves.
- **No link shortener, and no third-party dynamic QR.** On a form asking for a home address and a statement about someone's tax affairs, a `bit.ly` reads as phishing, and a tracking redirector puts a third party in the path of donor data.
- **Test the printed card**, not a QR on a screen, on both an iPhone and an Android camera. Use error-correction level Q or H if the card carries a logo overlay or is likely to crease.
- The browser tab title and link preview are set in `apps/web/src/app/gift-aid/layout.tsx`, overriding the app root's "Kairos: Church Administration". That override exists purely because of the scan.

One alternative, recorded so it is not re-proposed:

- **A true rewrite**, so the address bar never leaves `kharis.org`. Needs both the page and `POST /api/public/gift-aid/*` proxied through the zone, because the form posts same-origin today, and it touches live WordPress routing. Not worth it for a URL nobody reads, and it has the same unproxied-root problem as above before it even starts.

**A correction, because the earlier version of this section got it wrong and the error is instructive.** This document previously listed `giftaid.kharis.org` as "the one that silently breaks", on the grounds that the form's POST would be cross-origin and the CORS callback in `apps/api/src/app.ts` returns `http://localhost:3002` for every non-localhost origin. **That is true of serving the app on a subdomain. It is not true of redirecting from one.** A redirect lands the browser on `kairos.kharis.org`, same-origin with the API, so the form posts exactly as it does today. The two uses of the same hostname were conflated. The CORS warning still stands for anyone who later proposes pointing Pages at `giftaid.kharis.org` as a second custom domain — that version really would break.

The form still has to reach **production** before the print run: merge `staging` into `main`.

The public layout's header and the "Back to Kharis Church" button now point at `https://kharis.org` rather than `/`, because a donor who follows `/` lands on the Kairos product landing page with a sign-in button, which is not a page they can use.

## 8. Privacy notice changes

**Status: reviewed and signed off on 11 November 2026.** All three insertion points are live in `apps/web/src/app/legal/privacy/page.tsx` and the DRAFT markers are gone, replaced by a comment recording the review date. The lawful-basis cell now carries the reviewers' own wording verbatim (section 2a, change 4); do not reword it without going back to them.

The three changes, all applied:

1. A row in the section 3 lawful basis table naming Gift Aid as a legal obligation under UK tax law, and saying in terms that it is not based on consent.
2. A retention bullet in section 5: six years after the end of the accounting period containing the last donation covered, longer while an HMRC enquiry is open, covering the declaration, the declared name and address, and the cancellation record.
3. A bullet in section 6 (rights) saying that deleting a profile does not delete a Gift Aid declaration, and why. The existing erasure caveat ("except where we are required to keep it for safeguarding or legal reasons") technically covered this, but a donor should not have to infer it.

Two open questions for the reviewers, carried in the review doc:

- Is `privacy@kharis.org` the right contact for Gift Aid queries and cancellations, or should they go to a finance address? The donor-facing copy currently says the church office.
- Name six years, or say "as long as HM Revenue and Customs requires"? The draft names the figure, which is clearer for a donor but commits us to the longer reading of the two retention clocks.

The substance the notice has to carry, for reference:

1. That Gift Aid declaration data (name, home address, postcode, the fact of the declaration) is processed on the basis of a **legal obligation** under the Taxes Management Act and the Gift Aid regulations, **not consent**.
2. That it is retained for six years after the end of the accounting period containing the last donation it covered, and longer while an HMRC enquiry is open.
3. That it is **not deleted** when a member asks for their profile to be deleted, and why.
4. That the home address is used to identify the donor to HMRC.

The declaration notes shown beside the form already tell the donor points 2 to 4 in plain words (`renderDeclarationNotes`).

## 9. The declaration text, version 2026-11-v1

As rendered for the default coverage. The wording is produced by `renderDeclarationText`, so this is a copy for review, not the source.

> I want to Gift Aid all qualifying gifts of money I make to Kharis Ministries today, in the future, and in the past 4 years.
>
> I am a UK taxpayer. I understand that Kharis Ministries will reclaim 25p of tax on every 1 pound I give, and that if I pay less Income Tax and/or Capital Gains Tax in a tax year than the amount of Gift Aid claimed on all my donations to all charities in that year, it is my responsibility to pay the difference to HM Revenue and Customs.
>
> I confirm this is my own money, that it is not the proceeds of a collection or a payment from a company, and that I am not receiving anything in return for it.
>
> I will tell Kharis Ministries if I change my name or home address, if I stop paying enough tax, or if I want to cancel this declaration.

Shown beside it, not part of the declaration:

> Kharis Ministries is a registered charity, number 1139291.
>
> Your home address is needed so HM Revenue and Customs can identify you as a UK taxpayer. It is not used for anything else without your agreement.
>
> Gift Aid cannot be claimed on gifts made from a business account, on the proceeds of a collection, or on payments for tickets, courses or goods.
>
> You can cancel this declaration at any time. Cancelling it stops Gift Aid on gifts you make from the day you tell us, and does not affect Gift Aid already claimed on earlier gifts.
>
> We keep this declaration, and the record of any cancellation, for as long as HM Revenue and Customs requires. That is why it is not removed if you later ask us to delete your profile.

## 10. The claim path, and what is missing

Kairos holds declarations. It does **not** hold donations: giving runs through kharis.org (bank transfer, a card page per branch) and text giving on 70085. So Kairos cannot produce an HMRC claim end to end, and pretending otherwise would be the wrong build.

What it does produce is `GET /api/gift-aid/register.csv`, shaped to the Charities Online schedule columns (title, name, house name or number, postcode in capitals with a space, declared on, covers donations from, status, cancelled on, email, branch), plus a maiden-or-previous-name column that is a matching aid and is dropped before anything is pasted into HMRC's spreadsheet. Finance joins it against the donation data and pastes the result into HMRC's own spreadsheet.

Two things to settle before the first claim:

1. **Duplicate claims.** A text-giving or card provider that claims Gift Aid on its own gifts must not have those gifts claimed again. Whoever owns the donation data needs to record which system claimed each gift.
2. **Schedule mechanics.** One spreadsheet carries at most 1,000 lines. Donations of £20 or less from different donors can be aggregated onto one line up to £1,000, with no donor names on an aggregated line. Sponsored-event gifts over £500 must be listed individually.

## 11. Phases

- **Phase 0 - before publishing anything.** Finance and legal sign off on the wording (section 9) and the drafted privacy notice changes (section 8), via the review doc at https://claude.ai/artifact/Us9LvjYfFYYEddXyC5epP3. Confirm HMRC Gift Aid registration is in place, and whether there are existing paper declarations to import.
- **Phase 1 - shipped.** Schema and migration, the `Gift Aid Admin` role, API, public form, profile surface with cancellation, admin review and match queue, register export.

  Verified against a real database locally, not just in unit tests: all eight CHECK constraints reject what they should, a public submission lands in force and unmatched with its postcode normalised and its backdating set, matching preserves the declared name and address rather than overwriting them from the profile, cancellation is prospective and sets a retention review date of 31 May 2033, and **a declaration survives account deletion** (the member row scrubs to "Deleted User" with a null address while the declaration keeps "Dr Jonathan Smithson, 9 Oak Avenue, M1 1AE"). `scripts/local-up.ps1` brings the stack up.
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
