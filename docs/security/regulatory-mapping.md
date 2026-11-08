# Regulatory mapping — UK GDPR

**Status:** first draft, 2026-11-08. Each row says where the obligation is met
in code or in published text, and says plainly where it is only partly met.
Nothing here is marked compliant on the strength of an intention.

**Controller:** **Kharis Ministries**, ICO registration **ZB659958**, operating
as Kharis Church in member-facing copy — one body under two names
(`dpia.md` §6). **Regime:** UK GDPR and the Data Protection Act 2018.
**DPO:** Tianna Johnson, contact details outstanding. **Published contact:**
privacy@kharis.org, with a one-calendar-month response commitment.

One thing to establish before the table, because it changes how everything else
reads: **the privacy notice is unusually good and unusually load-bearing.** It
carries a real lawful-basis table, real retention periods and a complete rights
list, and members accept it at sign-in, which makes it a set of binding
commitments rather than boilerplate. All four legal documents carry a visible
"Draft for review" banner stating they have not been reviewed by a
data-protection professional. That disclosure is correct and should stay until
the review happens.

---

## 1. Summary

| Obligation | Status |
|---|---|
| Art 5(1)(a) lawfulness, fairness, **transparency** | **Partly.** Excellent notice; six statements in it are inaccurate. §3 |
| Art 5(1)(b) purpose limitation | **Met** in the notice; not technically enforced |
| Art 5(1)(c) data minimisation | **Partly.** Strong RBAC and minor redaction; recent review found whole-row over-exposure. §9 |
| Art 5(1)(d) accuracy | **Met.** Self-service rectification. §5 |
| Art 5(1)(e) storage limitation | **Not met.** Periods defined, almost none enforced. §4 |
| Art 5(1)(f) integrity and confidentiality | **Partly.** §9 |
| Art 6 lawful basis | **Met** and documented. §2 |
| Art 7 consent | **Met**, with one defect in the evidence trail. §6 |
| Art 9 special category | **Partly.** Access control is good; the Art 9 condition is not recorded. §7 |
| Art 8 / children | **Met and well built.** §8 |
| Art 12–14 information | **Partly.** Art 13(1)(a) controller identity remediated, pending merge; **Art 13(1)(b) DPO contact still not met**; six statements inaccurate. §3 |
| Art 15 access / Art 20 portability | **Partly.** Self-service export omits several categories. §5 |
| Art 16 rectification | **Met.** §5 |
| Art 17 erasure | **Partly, and defensibly.** Pseudonymisation, not erasure. §5 |
| Art 25 data protection by design | **Partly.** §9 |
| Art 28 processors | **Met for evidence** — all four DPAs held, dated 8 Nov 2026. One sub-processor list outstanding; the notice still names a processor not in use. §10 |
| Art 30 records of processing | **Drafted, not adopted** — `ropa.md`. Awaiting sign-off. §11 |
| Art 32 security of processing | **Partly.** §9 |
| Art 33/34 breach notification | **Procedure now exists**; detection cannot scope an exfiltration. §12 |
| Art 35 DPIA | **Drafted, not signed or consulted on** — `dpia.md`. §11 |
| PCI DSS | **Out of scope.** §13 |

---

## 2. Article 6 — lawful basis

**Met, and documented in a form a regulator can read.** The notice carries a
six-row purpose-to-basis table at `privacy/page.tsx:134-210`:

| Purpose | Basis |
|---|---|
| Membership administration, sign-in, contacting members about services and fellowships they belong to | Legitimate interests |
| Attendance, discipleship tracking, rota co-ordination | Legitimate interests |
| Pastoral care, prayer follow-up, safeguarding of vulnerable people including under-16s | Legitimate interests, and legal obligations under safeguarding law |
| Optional newsletters, event invitations, outreach beyond one's own fellowships | **Explicit consent** |
| Gift Aid claims, including keeping the declaration and any withdrawal | **Legal obligation** under UK tax law — expressly not consent, and expressly not stoppable on request |
| Fraud and abuse prevention, audit logs of consent and admin actions | Legitimate interests |

The notice also states that there is no automated decision-making with
significant effects and no sale of data.

The Gift Aid row is the one that has been reasoned through properly, and its
reasoning is recorded in two places that agree:
`packages/database/src/schema/gift-aid-declarations.ts:17-50` and
`requirements/gift-aid.md`. It is the model the other rows should eventually
match.

**Partly met, in two respects:**

- **No legitimate interests assessment (LIA) exists.** Four of the six purposes
  rest on legitimate interests, and Article 6(1)(f) requires a balancing test
  against the data subject's interests. The notice asserts the basis; nothing
  documents the balancing. For the `souls` table — PII of people who gave their
  details at an outreach and never came back, retained indefinitely with no
  delete endpoint — the balancing is genuinely arguable and should be written
  down rather than assumed.
- **Three of the Gift Aid rows are still marked `DRAFT, awaiting legal
  sign-off`** in the source (`privacy/page.tsx:181-186`, `:289`, `:321-325`).

> **DECISION NEEDED: write a legitimate interests assessment for the four LI purposes, and decide the position on `souls`.**
> **Recommended:** one short LIA per purpose — purpose, necessity, balancing,
> and the safeguards relied on. The `souls` entry should conclude with a
> retention period and a deletion route, because "we keep an unconsented
> person's home address forever" will not survive the balancing test as it
> stands.
> **Trade-off:** an LIA that concludes against a current practice obliges the
> church to change it. That is the point of doing one.

---

## 3. Articles 12–14 — transparency

**Met in substance**, by a notice covering: who it applies to including
non-account-holders; what is collected, in five categories down to the field
level; why, with the lawful-basis table; who it is shared with; retention;
rights; children; cookies; security; change process; and contact. Version
`2026-07-v1`, effective 23 July 2026, mirrored for the docs site at
`apps/docs/legal/privacy.md`.

**Article 13(1)(a) — controller identity: remediated, pending merge.** The
notice previously named "Kharis Church" as controller, which is the operating
name rather than the registered entity. It now reads "Kharis Ministries,
operating as Kharis Church, is the data controller" and cites ICO registration
ZB659958, so a data subject can find the controller on the public register.
**Committed as `e61dfdcf` on `fix/privacy-controller-identity`. No pull request
has been raised**, so this is further from production than the two remediation
PRs tracked in `dpia.md` §5 — it needs a PR, a review, a merge to `staging`, a
merge to `main` and a production dispatch.

**Article 13(1)(b) — DPO contact details: NOT met.** A DPO is designated
(Tianna Johnson), and where one is designated Article 13(1)(b) requires their
contact details to be given to data subjects. **The notice names no DPO and
publishes only `privacy@kharis.org`.** Open decision in `dpia.md` §6, where the
recommendation is a role address rather than a personal one.

**Not met in accuracy.** Six statements in the published notice are
contradicted by the code. Each is an Article 5(1)(a) exposure and all six are
cheap to fix. Fuller detail in `data-retention.md` §4.

| Claim | Reality |
|---|---|
| "Sign-in logs and error reports are kept for up to 90 days, then automatically deleted" | `audit_log` is append-only. No code anywhere issues UPDATE or DELETE against it. Nothing is ever deleted. |
| "**Sentry, Inc.** receives error reports when Kairos fails" | **Sentry is not wired.** No `@sentry` dependency in any workspace, no Sentry code anywhere; the only mention of Sentry in the whole repository is this sentence. Naming a processor that receives nothing is an accuracy failure in the opposite direction from the usual one. |
| "Archived member records … after that period we anonymise or delete the record" | No job does this. The only scrub is member-initiated. |
| "Attendance records are kept for 3 years on a rolling basis" | Nothing expires attendance. Neither attendance table even has a soft-delete column. |
| "When a child turns 18, their record transitions to the standard adult retention" | The threshold is **16** and the cron transitions at 16. The notice's own §7 correctly says under 16, so it contradicts itself. |
| "Kairos uses a single first-party cookie to keep you signed in during a session" | Tokens are kept in browser storage via Zustand `persist` (`apps/web/src/lib/auth-store.ts:45`), not a cookie. The only cookie is the short-lived OAuth state cookie, which is not mentioned. |

A seventh, in §9 "Security": "Access to Kairos administration is gated by
role-based permissions **and audit-logged**." The first half is true and well
built. The second is not — see §12.

> **DECISION NEEDED: correct the six statements, and decide which direction each correction goes.**
> Each one can be fixed either by changing the notice or by building the thing.
> **Recommended:** change the notice for the cookie and Sentry claims (no
> behaviour needs to change); build the thing for attendance retention (it is
> the easiest period to enforce); and for the audit-log claim, decide via the
> retention question in `data-retention.md` §2. Fix the 18-versus-16
> contradiction immediately — it is a typo with safeguarding implications.

---

## 4. Article 5(1)(e) — storage limitation

**Not met.** Periods are defined, and several are published, but across 55
tables there is **no retention enforcement of any kind**. The only time-based
expiry of personal data anywhere is the 180-day membership-interest lapse, and
it soft-deletes rather than removing anything. Gift Aid stores a
`retentionReviewAt` date that nothing acts on — deliberately and correctly,
because an open HMRC enquiry extends the period indefinitely and no cron can
know about one.

The full schedule, the four over-promises, and seven open retention decisions
are in **`data-retention.md`**. The three gaps most likely to be challenged:

- `member_health_records` — special-category data, no defined period, and
  **nothing writes to it at all**: no soft delete, no update, no delete. Not
  touched by account deletion.
- `souls` — PII of non-members, no soft-delete column, no delete endpoint, kept
  forever.
- Profile photos in Cloudflare Images — **never deleted**, and after erasure
  nulls `photo_url` the URL is no longer recorded anywhere, so the image cannot
  be found to clean up later.

---

## 5. Articles 15–20 — data subject rights

### Art 15 access and Art 20 portability — partly met

Self-service, no admin involvement: **`GET /api/me/export`**
(`apps/api/src/me/router.ts:145`, implemented at `me/service.ts:328-474`).
Returns JSON; the web app also renders an HTML report, mobile offers JSON.
Deliberately allow-listed through the consent gate so a gated user can still
exercise it. `password_hash` and `password_reset_token` are stripped.

Covers nine categories: the member's own row, consent records, fellowship
memberships, department memberships, service attendance, fellowship meeting
attendance, new-believer enrolments, form submissions where they are the
subject, and notification preferences. A separate self-service read exists for
the audit log (`GET /api/me/audit-log`).

The exclusions are reasoned at `me/service.ts:321-327`: the audit log,
follow-ups written by leaders about them, safeguarding notes and outreach
participation are "available on request per the privacy notice", because
including them would leak third-party data such as mentor session notes. That
is a legitimate Article 15(4) argument.

**But five categories are absent and are not named in that comment**, which
means nobody decided about them:

- `member_health_records` — **the subject's own special-category data**
- `gift_aid_declarations`
- `member_guardians`
- `member_roles`
- form submissions where the subject *submitted* but is not the subject

The health-record omission is the one that matters. A parent asking for their
child's data would not receive the child's medical conditions, allergies or
medications through the automated export, despite that being their own child's
data held about them.

> **DECISION NEEDED: extend the export, and decide the manual SAR route.**
> **Recommended:** add `member_health_records`, `gift_aid_declarations`,
> `member_guardians` and `member_roles` to the automated export — all four are
> the subject's own data with no third-party content. Leave follow-ups and
> mentor notes to the manual route, which is the correct call.
> Then **document the manual route**, because Article 15 covers the excluded
> categories too and there is currently no written procedure for answering a SAR
> that reaches them: no admin-mediated export endpoint exists, so someone has to
> query the database by hand within one calendar month.
> **Trade-off:** including `member_roles` tells a member exactly what authority
> they hold, which is fine; including health records means the export now
> carries Art 9 data, so the delivery channel needs thinking about.

### Art 16 rectification — met

`PATCH /api/members/:id`, where `enforceMemberAccess`
(`apps/api/src/members/service.ts:28-34`) permits a member to patch their own
row. Self-editable: names, date of birth, gender, phone, both addresses,
profession, emergency contact, photo. The notice correctly says "you can do
most of this yourself from your profile screen".

Correctly held back: **email** is not in the update schema at all, changing
only through a three-step verified flow backed by `email_change_requests`;
`homeBranchId`, `honorific`, approval status, membership-class certification,
roles and safeguarding decisions are admin actions. When an admin changes a
watched field on someone else's record, the member is notified
(`members/service.ts:473-508`) — a good transparency control that goes beyond
what Article 16 requires.

One structural note: there is no self-editable-field allowlist — the same
`updateMemberSchema` serves self and admin. Nothing currently in the schema is
dangerous, but a field added for admins becomes self-editable silently.

### Art 17 erasure — partly met, and defensibly so

**`POST /api/me/delete-account`** (`me/router.ts:151`), self-service only, no
admin-mediated erasure endpoint, gated on re-supplying the current password,
with a typed confirmation phrase in both clients. No grace period: synchronous
and irreversible.

**It is pseudonymisation, not erasure**, and the FK graph forces it. The
complete set of member-pointing foreign keys that are neither `cascade` nor
`set null` is eight, not seven:

| Table | Column | Behaviour |
|---|---|---|
| `gift_aid_declarations` | `member_id` | RESTRICT |
| `branch_leadership` | `member_id` | RESTRICT |
| `member_followups` | `recorded_by_id` | RESTRICT |
| `mentor_followups` | `mentor_member_id` | RESTRICT |
| `form_submissions` | `submitted_by` | NO ACTION |
| `form_submissions` | `subject_member_id` | NO ACTION |
| `services` | `created_by` | NO ACTION |
| `service_attendance` | `recorded_by` | NO ACTION |

`audit_log.actor_member_id` is `ON DELETE SET NULL`, deliberately nullable so a
failed sign-in against a non-existent account can still be recorded.

A real `DELETE FROM members` would fail on those eight. Cascading instead would
destroy the attendance history of every service a leader recorded, the
follow-up trail of everyone they pastored, and the HMRC evidence behind tax
already reclaimed. **This is lawful under Article 17(3)** — retention necessary
for compliance with a legal obligation and for safeguarding in the public
interest — and the notice carries both the general caveat and an explicit Gift
Aid paragraph.

What the scrub does: replaces first and last name with `Deleted` / `User`,
replaces the email with `deleted-<uuid>@deleted.kairos.local`, invalidates the
password hash, nulls 16 PII columns, sets `is_active=false` and
`approval_status='rejected'`, and hard-deletes `notification_preferences`.

**Four gaps in it, each a real residual-data finding:**

1. **`member_health_records` is not scrubbed.** Special-category data survives
   erasure verbatim, with no comment acknowledging it.
2. **`form_submissions.payload` is not scrubbed** — free-text testimonies,
   prayer and health detail, guardian names and phone numbers.
3. **The profile photo in Cloudflare Images is not deleted** — `photo_url` is
   nulled, the image remains publicly fetchable, and the URL is now
   unrecoverable so it cannot be cleaned up later.
4. **No audit entry is written for the erasure itself.** `deleteMyAccount`
   records nothing. The one act a data subject is most likely to query later is
   unevidenced.

> **DECISION NEEDED: close the four residual-data gaps, in this order.**
> **Recommended:** (4) first — add an audit action for erasure; it is trivial
> and it is evidence. Then (1), scrubbing health detail while keeping the
> consent flags as lawfulness evidence, per `data-retention.md` §2. Then (3),
> which needs a Cloudflare Images delete call that does not exist yet. Then (2),
> which is hardest: a form payload is unstructured, so scrubbing it needs a
> per-form-type field map, and the sacramental-register decision in
> `data-retention.md` §2 may mean some payloads should survive.
> **Trade-off:** scrubbing payloads could destroy a baptism record the church
> considers permanent. Decide the register question first.

### Art 18 restriction and Art 21 objection

Both are published in the notice's rights list. **Neither has any technical
implementation** — there is no "restricted" flag on a member record and no
objection register. They would be handled manually, and no written procedure
exists. For a system of this size that is probably acceptable; it should be a
stated decision rather than an omission.

---

## 6. Article 7 — consent

**Met, with one defect.** `consent_records` holds one row per
(member × type × version), with a unique partial index on active rows. Five
types (`packages/types/src/consent.ts`):

| Type | Required of members | Required of privileged roles |
|---|---|---|
| `terms` | yes | yes |
| `privacy` | yes | yes |
| `marketing` | **no** | no |
| `acceptable_use` | yes | yes |
| `admin_confidentiality` | **no** | **yes** |

Versions come from `CONSENT_VERSION_*` env vars, so re-prompting everyone is a
configuration change rather than a migration. Enforcement is server-side and
authoritative: `consentGateMiddleware` (`apps/api/src/middleware/consent-gate.ts`)
is mounted for every `/api/*` and returns 403 `CONSENT_REQUIRED`. It verifies
the JWT itself because router-level `authMiddleware` has not run yet, and its
rationale is worth quoting: *"a technical user could bypass the gate via `curl`
after being made an admin and never accept the Confidentiality Undertaking."*
That is the right instinct — the gate is a control, not a UX flow. Allow-listed
through it: `/me`, consent read/write, logout, and **delete-account**, so a
gated user can still exercise their rights.

Requiring `admin_confidentiality` of privileged roles is effectively an
**Article 29** control — processors and persons acting under the controller's
authority processing only on instruction — and it is implemented, which is more
than most organisations of this size manage.

**The defect:** the schema header calls it "one immutable row per
(member × type × version × grant)", but `recordConsent`
(`apps/api/src/consent/service.ts:120-124`) **updates in place** when a row for
the same version exists. Granting, withdrawing, then re-granting the same
version leaves one row; the original grant timestamp and the withdrawal are both
lost. Article 7(1) requires the controller to be able to demonstrate that
consent was given — and for marketing, the only truly optional consent, the
evidence trail is exactly what gets overwritten.

Also: withdrawal of a *required* consent is possible but immediately re-blocks
the application, so required consents are withdrawable in name only. That is
defensible — they rest on contract and legitimate interests, not consent — but
it means the notice's "withdraw consent at any time" is only meaningfully true
for marketing, which the notice does in fact use as its example.

> **DECISION NEEDED: make `consent_records` genuinely append-only.**
> **Recommended:** insert a new row per act rather than updating, with the
> active-row unique index relaxed to permit history. This matches what the
> schema comment already claims and what Article 7(1) needs.
> **Trade-off:** a migration plus a change to the "current state" query, and the
> table grows per consent act rather than per version. Both are small.

Per-submission consent is also captured on
`form_submissions.consent_given_at / consent_by / consent_policy_version`, and
three consent flags sit on `member_health_records` with a recorder and date,
deliberately nullable so NULL means "not yet asked" rather than "refused".

---

## 7. Article 9 — special category data

**Partly met.** Article 9 prohibits processing special-category data unless a
condition in 9(2) applies, and for most of those conditions the DPA 2018
Schedule 1 also requires an **appropriate policy document**.

**Where it lives.** Structured Art 9 data is in exactly one table,
`member_health_records`: `medical_conditions`, `allergies`, `medications`,
`dietary_needs`, `additional_notes`. There are no columns anywhere for
ethnicity, race, disability, sexual orientation, marital status or criminal
convictions.

**But there is an unstructured surface**, and it is the compliance gap:
`form_submissions.payload` is untyped jsonb across nine form types. Religious
belief beyond bare membership is intrinsic to the altar-call, baptism and
baby-dedication forms; the testimony form has free text plus a category list
that includes `Health/Healing`; the child and guardian sections capture guardian
names, phone numbers and relationships. **None of the Art 9 protections apply to
it** — the access control described below attaches to
`member_health_records`, not to the jsonb, and there is no field-level control
over a payload.

**What is done well.** Access to `member_health_records` is narrow and correctly
scoped. `hasSafeguardingAccess`
(`apps/api/src/members/service.ts:1086-1106`) permits exactly two callers: the
child's **linked guardian**, branch-independently, or a **`SafeguardingLead`
scoped to the subject's own branch** — not the viewer's, which is the direction
that is easy to invert and was in fact a bug found in the recent review. A
`BranchAdmin` grant deliberately does **not** carry `safeguarding:read`, and
`SafeguardingLead` deliberately does not carry `welfare:read`. That separation
is a genuine Article 9 safeguard and it is documented in
`docs/auth-and-permissions.md`.

**What is missing:**

- **The Article 9(2) condition is not recorded anywhere.** The notice's §2.5
  describes the category sensitively but names no condition. The likely bases
  are 9(2)(g) substantial public interest — safeguarding of children, via DPA
  2018 Schedule 1 Part 2 paragraph 18 — and 9(2)(c) vital interests for the
  medical-treatment consent. Neither is written down.
- **No appropriate policy document**, which Schedule 1 Part 4 requires for the
  substantial-public-interest conditions. This document set is the start of one
  but does not yet constitute it.
- **No retention period**, and nothing ever writes to the table — see §4.
- **No Art 9 coverage of form payloads.**

> **DECISION NEEDED: name the Article 9(2) condition for each kind of special-category processing, and produce the Schedule 1 appropriate policy document.**
> **Recommended:** 9(2)(g) with DPA Schedule 1 Part 2 para 18 (safeguarding of
> children and individuals at risk) for safeguarding and health records held for
> ministry to minors; 9(2)(c) vital interests for medical-treatment consent;
> and for the religious-belief content inherent in sacramental forms, 9(2)(d) —
> processing by a not-for-profit body with a religious aim, relating to its own
> members, with no disclosure outside without consent. The last is the condition
> most clearly available to a church and it is currently unclaimed.
> **Trade-off:** 9(2)(d) is conditional on no external disclosure without
> consent, which constrains what the church may ever do with testimony and
> baptism data. That constraint is probably already the church's intention, but
> claiming the condition makes it binding.

---

## 8. Children — Article 8 and the age threshold

**Met, and the best-built part of the system.** The threshold is **16**, from a
single constant with its reasoning recorded
(`packages/types/src/minor.ts:4-10`):

> The product line is **16** (the first-timer form's "under 16 / attends with a
> guardian" question), not 18 — see the U16 data-protection feature. Named
> `MINOR_AGE_THRESHOLD` rather than anything with "18" in it on purpose.

16 is the right number for the UK: the DPA 2018 sets 13 as the age at which a
child can consent to information society services, and 16 is a more protective
line that also matches the church's own safeguarding practice. The notice's §7
correctly describes under-16 handling; its §5 contradicts this with "turns 18"
and should be fixed.

`isMinorMember` is the single gate, and it is enforced in seven distinct places:

| Control | Where |
|---|---|
| **No self-registration** under 16 | `auth/service.ts:203-207` |
| **No sign-in at all** for a minor's account | `auth/service.ts:403-407` |
| **Field redaction** on reads — date of birth, email, phone, address, city, postcode and all three emergency-contact fields nulled for viewers without access | `members/service.ts:155-171` |
| **Inverted access model**: for adults, admin or self only; for minors, the guardian (any branch) and the subject's-branch Safeguarding Lead get the full record, other same-branch viewers get a redacted stub, out-of-branch viewers are denied | `members/service.ts:375-394` |
| **Health record** restricted to guardian or Safeguarding Lead | `members/service.ts:1080-1109` |
| **Safeguarding review queue**, re-surfacing a minor whose review is over 90 days old | `members/service.ts:1244` |
| **Aging out** at 16, notifying branch authority and safeguarding leads | `cron/lifecycle.ts:105-131` |

Guardianship is a proper many-to-many join (`member_guardians`, migration
`0056`), with a free-text relationship label because families do not fit a
closed list, a partial unique index enforcing one primary guardian, and a CHECK
preventing self-guardianship. The previous single self-FK column was **dropped**
rather than kept as a denormalised pointer, so "unguarded" means no live link
and cannot disagree with itself.

Parents create their own children's records
(`POST /api/me/children`), with `dateOfBirth` **required** — because "every U16
protection keys off the age, so a child with no date of birth is a minor the
system cannot recognise as one". Creating is self-service; **claiming an
existing child is not**, and stays with admins. That is the correct boundary.

**Two gaps:**

- **A minor cannot exercise any right themselves**, because they cannot sign in.
  All rights run through the guardian, and there is no route for a 15-year-old
  who objects to their guardian's handling of their record. For a UK
  safeguarding context this is a reasonable default, but it should be a recorded
  decision, because the ICO's Children's Code expects a child's own rights to be
  considered.
- **The aging-out cron duplicates the threshold constant.**
  `apps/api/src/cron/lifecycle.ts:100` declares its own local
  `MINOR_AGE_THRESHOLD = 16` rather than importing it from `@kairos/types`. If
  the threshold ever changes, the cron silently disagrees with every other gate
  — the exact hand-copied-constant failure the codebase worked hard to
  eliminate for `matchesCapability`. One-line fix.

The ICO's **Age Appropriate Design Code** should be assessed for
applicability. Kairos is an internal church administration platform rather than
a consumer service likely to be accessed by children — and under-16s cannot
sign in at all, which is a strong argument that it does not apply. That argument
should be written down rather than left implicit.

---

## 9. Articles 25 and 32 — security of processing

Covered in full in `secure-sdlc.md` §4. Summarised against Article 32's named
measures:

| Art 32 measure | Status |
|---|---|
| Pseudonymisation | **Yes**, as the erasure mechanism (§5), though not named as such anywhere in the code |
| Encryption in transit | **Yes.** TLS throughout; Cloudflare-terminated |
| Encryption at rest | **Assumed** — PlanetScale default. Not verified; see `backup-recovery.md` §2 |
| Password storage | **Strong.** argon2id at OWASP-2025 minimums (m=19456, t=2, p=1), constant-time comparison, per-hash parameter agility. No bcrypt anywhere. |
| Access control | **Strong in design.** One capability matcher shared by API, web and mobile with no copies; grants re-resolved from the database on **every request**, so a revocation takes effect on the next API call with no cached-permission window. |
| Confidentiality — resilience against unauthorised access | **Partly.** Five vulnerability classes found in the recent review, including a cross-branch read of children's data. Fixes exist on an unmerged branch. |
| Integrity | **Partly.** `audit_log` is append-only in practice, but by convention rather than by database grant. |
| Availability | PS-5 3-node HA; no tested restore (`backup-recovery.md` §5) |
| Testing and evaluation of measures | **Partly.** Four-command CI gate, mandatory authorization and branch-isolation tests per module. **No dependency scanning, no SAST, no secret scanning in CI, no penetration test.** |

The Article 25 "by design" gaps worth naming explicitly, each from
`secure-sdlc.md` §4:

- **Two signing secrets fail open** onto values committed to this repository,
  with no environment gate — in a codebase that states the correct principle in
  its own words at `oauth-server/keys.ts:21`.
- **No rate limiting anywhere**, with an argon2id-amplified CPU-exhaustion path
  on unauthenticated endpoints.
- **No security headers** — no CSP, HSTS, X-Frame-Options or Referrer-Policy —
  while session tokens live in browser storage, which makes any XSS a full
  session theft.
- **`requireSignedURLs: false`** on profile photos, including under-16s':
  permanent, unauthenticated, unrevocable URLs with no delete path.
- **Stateless 365-day refresh tokens** with no store, rotation, reuse detection
  or revocation list — in a codebase whose own OAuth server has all four.

---

## 10. Article 28 — processors

Named in the notice, with the Article 28(3) assurance that they process only on
instruction and are contractually bound, and an Article 46 statement relying on
the UK IDTA or SCCs where data leaves the UK/EEA:

| Processor | Role | Status |
|---|---|---|
| **Cloudflare, Inc.** | Pages, Worker, Hyperdrive, Images | In use |
| **PlanetScale, Inc.** | Postgres. Notice states UK/EEA storage. | In use |
| **Amazon Web Services, Inc.** | SES transactional email, eu-west-2 | In use |
| **Sentry, Inc.** | "receives error reports when Kairos fails" | **Not in use. Not wired. Nothing is sent.** |

One further processor is **in use and not named: Mapbox** (address autofill and
map rendering, which receives partial address strings as members type them and
is therefore a processor of personal data). **Expo / EAS** handles mobile builds
— build infrastructure rather than member data, arguably out of scope.

**Axiom is not a processor**, verified rather than assumed: the Logpush pipeline
described in `../observability.md` was never wired, because `"logpush": true`
appears nowhere in `apps/api/wrangler.jsonc` for either environment and a Worker
emits to Logpush only when its own config carries that flag. Request logs stop
at Cloudflare Workers Logs, which Cloudflare already processes under its
existing role. `ropa.md` §3 records this so nobody re-adds Axiom from reading
the observability doc.

So the accurate list is **four**: Cloudflare, PlanetScale, AWS SES and Mapbox.

### Article 28 evidence — met

**All four DPAs were retrieved on 8 November 2026** and are held by Kharis
Ministries outside the repository. `ropa.md` §3 records the filenames and the
exact document versions, so the record answers "which version were we relying
on, and when":

- Cloudflare Customer DPA **v6.4, 3 April 2026**, plus its sub-processor list
- PlanetScale Customer DPA, **last updated 15 October 2026**
- AWS GDPR DPA, incorporated into the **Service Terms §1.14.1**, with the UK
  GDPR and Swiss addenda at **§1.14.4** and the June 2021 SCCs
- Mapbox Customer DPA **1 April 2025**, plus its sub-processor list

**All four are incorporated by reference rather than separately signed** —
PlanetScale's says so in its own first paragraph, and AWS folded its DPA into
the Service Terms in 2018 with no customer action required. So the obligation
discharged here is **evidential**: Article 28(9) requires the terms to be in
writing and producible, and dated copies are how that is satisfied.

**This closes Article 28 evidence and nothing more.** It says nothing about
whether the processing those contracts cover is lawful — that remains the work
of the lawful bases in §2, the Article 9(2) conditions in §7, the retention
position in §4 and the DPIA. A complete set of DPAs over unlawful processing is
still unlawful processing.

Two residual items, both small:

> **DECISION NEEDED: retrieve PlanetScale's sub-processor list.**
> Cloudflare's and Mapbox's were retrieved; PlanetScale's was not — and
> PlanetScale holds all 55 tables including the health and safeguarding records.
> Article 28(2) makes sub-processor awareness the controller's business: a
> processor may not engage another without authorisation, and a controller cannot
> object to what it has not seen.
> **Recommended:** retrieve it and add the row to `ropa.md` §3.
> **Trade-off:** none.

> **DECISION NEEDED: correct the notice's processor list — remove Sentry, add Mapbox.**
> Narrowed from the earlier version of this marker now the DPAs are held. Sentry
> is named and receives nothing; Mapbox receives address fragments and is not
> named. Note that enabling Logpush, which `incident-response.md` §9 recommends,
> would add a fifth processor and reopen both this row and the §10 evidence set.

---

## 11. Articles 30 and 35 — ROPA and DPIA

**Both now drafted — neither is adopted, and until they are the obligations are not discharged.** `dpia.md` and `ropa.md` in this directory are the drafts; the DPIA needs Article 35(2) advice from the DPO, consultation under Article 35(9) and the controller's signature, and the ROPA cannot be headed until the controlling entity is settled. When this section was first written neither existed at all: grepping the whole repository for `ROPA` and "record of
processing" returns **zero hits**. `DPIA` appears three times, all as
*unbuilt product scope* for the church's own compliance teams —
`requirements/mvp-scope.md:756` lists "Data Protection compliance tools (SAR,
DPIA, breach management)" as explicitly **out of MVP scope**, and
`requirements/software_spec.md:402-404` describes a DPIA *tool* Kairos would
offer. Neither is a DPIA *of* Kairos.

### Article 30 — records of processing

Required of this church notwithstanding the small-organisation exemption,
because Article 30(5) withdraws that exemption where processing is not
occasional, includes special-category data, or is likely to result in a risk to
rights and freedoms. **All three apply here.**

The lawful-basis table in §2 is the nearest thing that exists and is a genuine
head start, but a ROPA needs more per purpose: the categories of data subjects
and personal data, the recipients, any third-country transfers, the retention
periods, and a description of the security measures.

> **DECISION NEEDED: produce a ROPA.**
> **Recommended:** build it from material that already exists rather than from a
> template — the purposes and bases from §2, the data categories and retention
> from `data-retention.md` §2, the recipients from §10, and the security
> measures from §9. That is most of a ROPA already written; it needs assembling
> into the Article 30(1) structure, not researching.
> **Trade-off:** a ROPA has to be maintained. Tying it to `data-retention.md`
> §2, which is already organised per data type, is what stops it rotting.

### Article 35 — DPIA

**A DPIA is required, not optional.** Article 35(3) mandates one for large-scale
processing of special-category data, and the ICO's own list of operations
requiring a DPIA includes processing children's data and processing
special-category data for profiling or automated decision-making. Kairos
processes **children's safeguarding and health data**, which is squarely within
it. The scale is small, but "large-scale" is not the only trigger, and the ICO
screening criteria are met on at least three counts: special-category data,
vulnerable data subjects, and new technology.

> **DECISION NEEDED: commission a DPIA before the pilot processes real member data.**
> **Recommended: yes, and before the pilot — this is the highest-priority item in this document.**
> It is also the cheapest it will ever be: the pilot is one branch with
> structural seeding only and no member import, so a DPIA now describes an
> intended system rather than auditing a live one, and its mitigations can be
> built rather than retrofitted.
> The DPIA should take as its inputs: the processing description from §2, the
> necessity and proportionality argument from the LIA in §2, the risk assessment
> in `secure-sdlc.md` §4, and the retention position in `data-retention.md`.
> It should reach a conclusion on the children's-data risks in particular: the
> unauthenticated profile-photo URLs, the unscrubbed health records surviving
> erasure, and the absence of any retention enforcement on safeguarding records.
> **Trade-off:** a DPIA that identifies a high residual risk the church cannot
> mitigate obliges consultation with the ICO under Article 36. That is a real
> possibility for the profile-photo issue and is a reason to fix it first, not a
> reason to delay the DPIA.

---

## 12. Articles 33 and 34 — breach notification

**The procedure now exists** — `incident-response.md` §4 — with a concrete
Article 33 decision tree, the 72-hour clock defined as running from awareness,
a notifiable-by-default list weighted toward children's and health data, and an
Article 33(5) breach register.

**The detection capability does not support it.** Stated plainly because it is
the gap that most undermines the rest:

The audit log covers 18 action types — authentication, password change, email
change, role grant and revoke, and the OAuth authorization-server events. It
contains **no action for reading, changing or exporting a member record**, and
the CSV export routes (`apps/api/src/members/router.ts:85`,
`apps/api/src/forms/router.ts:74`) write no audit row at all. So a branch
administrator can export the entire member directory and leave no trace in the
security log.

Article 33(3) requires the categories and approximate number of data subjects
and records concerned. **From the audit log alone, that cannot be determined
for an exfiltration incident.** The request logger would show the export call,
but **Logpush is confirmed not enabled**, so the only copy is Cloudflare Workers
Logs — head-sampled, retained for days. For any data-access incident more than
a few days old, **this system retains no evidence from which to scope it**, and
an Article 33 notification would have to say the scope is unknown.

This also means the notice's §9 claim that administration access is
"audit-logged" is not accurate as written.

> **DECISION NEEDED: add `member_exported` and `member_updated` audit actions before the pilot.**
> **Recommended: yes.** Without them the Article 33 assessment defaults to the
> conservative answer on no evidence, which means over-notifying the ICO and
> being unable to tell affected families what happened.
> **Trade-off:** `audit_log.action` has a database CHECK constraint, so new
> actions need a migration as well as two call sites — roughly half a day. It
> also expands the audit log's own retention question (`data-retention.md` §2),
> since read events are far higher-volume than role grants.

---

## 13. PCI DSS — out of scope

**Not applicable.** PCI DSS applies to entities that store, process or transmit
cardholder data. Kairos does none of the three:

- **No payment processor is integrated.** No Stripe, no PayPal, no card gateway
  of any kind in any workspace.
- **No cardholder data is stored.** No PAN, cardholder name in a payment
  context, expiry date, service code or sensitive authentication data appears in
  any of the 55 tables.
- **Donations were descoped** as a product decision, which is why no payment
  surface exists.
- **Gift Aid processes no money.** `gift_aid_declarations` records a donor's
  declaration that they are a UK taxpayer and that the church may reclaim tax —
  a name, an address, a coverage scope, the wording agreed to, and evidence of
  the act. It records no transaction, no amount and no payment instrument.
  Donations themselves are taken outside Kairos entirely.
- **No card data transits the system.** The Worker handles no payment redirect
  or webhook.

**This becomes in scope the moment any payment capability is added**, including
an embedded iframe or hosted-page redirect, which would bring SAQ A obligations.
If donations are ever un-descoped, this section must be revisited before any
code is written, not after.

Also out of scope, for the record: **HIPAA**, which is a US regime with no
application to a UK church, despite `requirements/software_spec.md:127` naming
it alongside GDPR. The health data Kairos holds is governed by UK GDPR Article 9
and the DPA 2018, not HIPAA.

---

## 14. Open decisions, collected

In the order they should be addressed.

1. **Get the DPIA consulted on and signed** (§11). It is drafted (`dpia.md`);
   Article 35(2) advice from the DPO is now mandatory, and Article 35(9)
   consultation with parents and guardians has not happened.
2. Add `member_exported` and `member_updated` audit actions (§12) — a
   prerequisite for Article 33 being answerable.
3. Correct the six inaccurate statements in the published privacy notice (§3);
   fix the 18-versus-16 contradiction immediately. Also publish the DPO's
   contact details, which Article 13(1)(b) requires and the notice omits.
4. Raise a PR for `fix/privacy-controller-identity` and merge it (§3) — the
   Article 13(1)(a) controller-identity fix is committed but has no PR.
5. Correct the notice's processor list — remove Sentry, add Mapbox — and
   retrieve PlanetScale's sub-processor list (§10). The four DPAs themselves are
   now held.
6. Name the Article 9(2) condition for each kind of special-category
   processing, and produce the DPA 2018 Schedule 1 appropriate policy document
   (§7).
7. Write a legitimate interests assessment for the four LI purposes, and settle
   the `souls` position (§2).
8. Extend the self-service export, and document the manual SAR route (§5).
9. Close the four erasure residual-data gaps (§5).
10. Make `consent_records` genuinely append-only (§6).
11. **Adopt the ROPA** (§11) — drafted at `ropa.md`, awaiting sign-off.
12. Import the shared `MINOR_AGE_THRESHOLD` into the lifecycle cron, and record
    the decision on whether the Age Appropriate Design Code applies (§8).

Items 1 and 2 are the two that an auditor will ask about first, and item 2 is a
prerequisite for item 1 reaching a defensible conclusion about detection.
