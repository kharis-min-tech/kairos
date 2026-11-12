# Record of Processing Activities (UK GDPR Article 30)

**Status: DRAFT, not yet adopted.** Assembled 2026-11-08 from the code at
commit `70e0130e`, the published privacy notice, and the companion documents in
this directory. It becomes the controller's Article 30 record when §7 is
completed.

## Why this is required

Article 30(5) exempts organisations with fewer than 250 employees — **but
withdraws the exemption** where processing is not occasional, or includes
special categories of data, or is likely to result in a risk to the rights and
freedoms of data subjects. **All three apply here**, so the exemption is
unavailable and a ROPA is mandatory regardless of the church's size.

## Controller

| | |
|---|---|
| **Controller** | **Kharis Ministries** |
| ICO registration | **ZB659958.** Registered 13 February 2024, **expires 12 February 2027**. Payment Tier 1. Registered address 2A Orchard Road, Belvedere, Kent, DA17 5BP. |
| Registered charity number | **1139291** |
| Legal form | Charitable company limited by guarantee, **Companies House 07308725** |
| **Data Protection Officer** | **Tianna Johnson.** Contact details not yet supplied — see `dpia.md` §6. |
| Published data protection contact | **privacy@kharis.org** (one calendar month response commitment). Does not name the DPO, which Article 13(1)(b) requires. |
| System | Kairos, an internal church administration platform. Pilot scope: **one branch, on production, structural seeding only, no member import.** |

**On the two names.** Kharis Ministries is the legal name and the registered
data controller; **Kharis Church is the operating name** used in member-facing
copy. They are one body, not two — so there is no Article 26 joint-controller
arrangement and no internal Article 28 agreement to put in place. This is
recorded because the ambiguity is visible in the codebase, where the
Confidentiality Undertaking writes "Kharis Ministries / Kharis Church"
(`apps/web/src/components/legal/confidentiality-body.tsx:30`), and a future
reader will hit it. The convention is **legal name in legal contexts, operating
name in member-facing copy** — the split that
`GIFT_AID_CHARITY_NAME = 'Kharis Ministries'`
(`packages/types/src/gift-aid.ts:26`) already encodes for HMRC.

---

## 1. Processing activities

Six activities, matching the purposes in the published lawful-basis table.
Retention columns cross-reference `data-retention.md`, and the **Enforced**
column is the honest answer rather than the intended one.

### A1 — Membership administration and authentication

| | |
|---|---|
| **Purpose** | Maintaining the member register, authenticating users, and contacting members about the services and fellowships they belong to |
| **Lawful basis** | Article 6(1)(f) legitimate interests — the church's interest in caring for its members. **No LIA documented** (`regulatory-mapping.md` §2) |
| **Data subjects** | Members with accounts; attendees and visitors added by a leader; people with no account whose details are entered on a form |
| **Personal data** | Names (first, middle, last), honorific, date of birth, gender, email, phone, home and secondary address, profile photo, occupation, emergency contact name/phone/relationship, password hash, approval status, last sign-in |
| **Special category** | No |
| **Tables** | `members`, `branches`, `regions`, `member_roles`, `roles`, `email_change_requests`, `oauth_accounts`, `oauth_verification_tokens`, `oauth_sessions` |
| **Recipients** | Branch administrators and branch data administrators for their own branch; system administrators globally; the member themselves |
| **Processors** | Cloudflare, PlanetScale, AWS SES |
| **Transfers** | None intended outside UK/EEA — see §4 |
| **Retention (stated)** | Active for the duration of membership; archived records 6 years after leaving, then "anonymise or delete" |
| **Enforced?** | **No.** Nothing expires an inactive member row. The only PII scrub is member-initiated. |

### A2 — Attendance, discipleship and rota co-ordination

| | |
|---|---|
| **Purpose** | Recording attendance, tracking discipleship progress, co-ordinating departmental rotas and uniforms |
| **Lawful basis** | Article 6(1)(f) legitimate interests — running services and ministries. **No LIA documented** |
| **Data subjects** | Members, attendees, visitors, children |
| **Personal data** | Service and fellowship attendance with arrival times and first-time-visitor flag; fellowship and department membership; leadership roles held; rota assignments and swap requests; uniform sizes; discipleship stage, session notes and feedback; membership-class enrolment, session records and test results |
| **Special category** | No, except where a free-text note volunteers it |
| **Tables** | `service_attendance`, `services`, `fellowship_meeting_attendance`, `fellowship_meetings`, `fellowships`, `fellowship_members`, `fellowship_join_requests`, `departments`, `branch_departments`, `department_members`, `department_join_requests`, `department_uniform_outfits`, `department_uniform_schedule`, `rota_templates`, `rota_template_slots`, `rota_instances`, `rota_assignments`, `rota_pool_members`, `rota_swap_requests`, `new_believer_enrollments`, `new_believer_sessions`, `new_believer_attendance`, `membership_cohorts`, `membership_sessions`, `membership_enrollments`, `membership_session_records`, `membership_interest` |
| **Recipients** | Fellowship leaders for their own fellowship; department leaders and deputies for their own department; branch administrators for their branch; new-believer mentors and teachers; membership admins (church-scoped) and membership champions (branch-scoped, read-only) |
| **Processors** | Cloudflare, PlanetScale, AWS SES |
| **Retention (stated)** | Attendance: **3 years on a rolling basis.** Everything else: unstated |
| **Enforced?** | **No.** Neither attendance table has even a soft-delete column. The one exception in this group is `membership_interest`, which lapses at 180 days and soft-deletes 30 days later — the only time-based expiry of personal data in the system, and it still deletes nothing. |

### A3 — Pastoral care and safeguarding *(special category)*

| | |
|---|---|
| **Purpose** | Pastoral care, prayer follow-up, welfare support, and safeguarding of children and vulnerable adults |
| **Lawful basis** | Article 6(1)(f) legitimate interests, and Article 6(1)(c) legal obligation under safeguarding law |
| **Article 9 condition** | **NOT RECORDED ANYWHERE.** Recommended Art 9(2)(g) with DPA 2018 Sch 1 Pt 2 para 18 (safeguarding), and Art 9(2)(c) vital interests for medical-treatment consent — `dpia.md` §3.3. Two of these require a **DPA 2018 Schedule 1 appropriate policy document, which does not exist.** |
| **Data subjects** | **Children under 16**; guardians; adults subject to a welfare or safeguarding concern; members receiving pastoral follow-up |
| **Personal data** | **Health: medical conditions, allergies, medications, dietary needs, additional notes.** Consent flags for photo/media, medical treatment and data processing, with recorder and date. Guardianship links with free-text relationship and notes. Follow-up records with contact method, visit arrival and departure times, companion members, outcome, duration and free-text notes, carrying orthogonal `welfare_concern` and `safeguarding_concern` flags. Safeguarding review state and archive decision on the member row. |
| **Special category** | **YES — health data, predominantly about children** |
| **Tables** | `member_health_records`, `member_guardians`, `member_followups`, `mentor_followups`, `follow_ups`, and the `safeguarding_*` columns on `members` |
| **Recipients** | **Deliberately narrow.** Health records: the child's **linked guardian** (branch-independently) or a **Safeguarding Lead scoped to the subject's own branch** — and nobody else; a `BranchAdmin` grant deliberately does **not** carry `safeguarding:read`. Welfare records: `welfare:read`, held by `BranchAdmin` and deliberately **not** by `SafeguardingLead`. Safeguarding also reaches `SafeguardingHead` (church-scoped) and the derived `BranchPastor` grant. |
| **Processors** | Cloudflare, PlanetScale, AWS SES |
| **Retention (stated)** | Children's records "in line with our safeguarding policy". Health records and follow-ups: **no period stated anywhere.** |
| **Enforced?** | **No — and nothing writes to `member_health_records` at all**: no soft delete, no update, no delete anywhere in the API, and account deletion does not touch it. A branch-context follow-up, where a branch-level safeguarding concern lives, **cannot be deleted through the API at all.** |

### A4 — Optional communications

| | |
|---|---|
| **Purpose** | Newsletters, event invitations and outreach communications beyond the fellowships a member belongs to |
| **Lawful basis** | **Article 6(1)(a) explicit consent** — the only activity here resting on consent |
| **Data subjects** | Members who have opted in |
| **Personal data** | Email address, name, notification category preferences and cadence |
| **Special category** | No |
| **Tables** | `consent_records` (type `marketing`), `notification_preferences`, `notification_events` |
| **Recipients** | The member; branch administrators administering preferences |
| **Processors** | Cloudflare, PlanetScale, AWS SES |
| **Transfers** | None intended |
| **Retention (stated)** | Consent records: account lifetime plus 6 years. `notification_events`: **unstated.** |
| **Enforced?** | **Partly.** `notification_preferences` is the one table hard-deleted on account deletion. `consent_records` and `notification_events` are never removed, and `notification_events` payloads carry member and **children's** names indefinitely. |

### A5 — Gift Aid

| | |
|---|---|
| **Purpose** | Claiming Gift Aid on donations, and retaining the declaration as HMRC evidence |
| **Lawful basis** | **Article 6(1)(c) legal obligation** under UK tax law. Expressly **not** consent, and expressly not stoppable at the donor's request |
| **Data subjects** | Donors, **including people with no Kairos account** — the public form predates enrolment |
| **Personal data** | Declared title, first and last name, address lines, city, postcode, country, email, phone; the exact declaration wording agreed to; **`source_ip` and `user_agent` as evidence of the act**; declaration date; coverage scope; any cancellation with method and notes; maiden or previous name where given |
| **Special category** | No |
| **Tables** | `gift_aid_declarations` |
| **Recipients** | Holders of `giftaid:admin` (church-scoped, and carrying **no** other capability — no directory, no safeguarding, no reports). **HMRC**, as a separate controller, on a claim |
| **Processors** | Cloudflare, PlanetScale, AWS SES |
| **Retention (stated)** | **6 years** after the end of the accounting period containing the last donation covered, **longer while HMRC has an open enquiry** |
| **Enforced?** | **A review date is computed and stored (`retention_review_at`); nothing acts on it — deliberately.** An open HMRC enquiry extends the period indefinitely and no scheduled job can know about one, so the date is for a human to read. Declarant name and address are stored **here rather than read through to `members`, specifically so they survive an erasure request** and the HMRC evidence is not destroyed. `member_id` is `ON DELETE RESTRICT`. |

This is the only activity in the record where retention has been reasoned
through end to end. The ADR at
`packages/database/src/schema/gift-aid-declarations.ts:17-50` is the model the
other five should eventually match.

### A6 — Platform security, audit and abuse prevention

| | |
|---|---|
| **Purpose** | Authenticating access, detecting and investigating misuse, evidencing consent and administrative actions |
| **Lawful basis** | Article 6(1)(f) legitimate interests — maintaining a secure platform. **No LIA documented** |
| **Data subjects** | Members; **and people with no relationship to the church whatsoever**, because `audit_log.attempted_email` records the address typed on a failed sign-in even when it matches no account |
| **Personal data** | 18 audit action types covering sign-in success and failure, password change, email change, role grant and revoke, and the OAuth authorization-server events — each row carrying **IP address, user agent, country and attempted email**. Request logs carrying `requestId`, path, status, `memberId`, `activeRole` and `branchId`. Consent acceptance records across five types. |
| **Special category** | No |
| **Tables** | `audit_log`, `consent_records`, `oauth_clients`, `oauth_grants`, `oauth_authorization_codes`, `oauth_refresh_tokens` |
| **Recipients** | System administrators; the member themselves for their own events via `GET /api/me/audit-log` |
| **Processors** | Cloudflare (including Workers Logs, which is where request logs stop — Logpush is confirmed not enabled, §3), PlanetScale |
| **Retention (stated)** | **"Sign-in logs and error reports are kept for up to 90 days, then automatically deleted."** |
| **Enforced?** | **No, and the published statement is false.** `audit_log` is genuinely append-only — no code anywhere issues UPDATE or DELETE against it, and no migration deletes from it. Nothing is ever removed. Correcting this is an open decision in `data-retention.md` §2. |

---

## 2. Categories of recipient inside the church

Article 30(1)(d) covers recipients, which includes internal disclosure. Access
is by **capability**, computed from grants at request time, never by job title.
The authoritative reference is `../auth-and-permissions.md`.

| Role | Reaches |
|---|---|
| System administrator (`systemRole = 'admin'`) | **Everything, in every branch.** An unconditional bypass of every scope rule — break-glass, not seniority |
| `BranchAdmin` | Branch data, RBAC within the branch, signup approval, **welfare** records. Deliberately **not** safeguarding |
| `BranchDataAdmin` | Branch data and signup approval. Not welfare, not safeguarding |
| `FellowshipLeader` | Their own fellowship's members, meetings and attendance |
| `DepartmentLeader` / `DepartmentDeputy` | Their own department's members, rotas and uniforms |
| `SafeguardingLead` (branch) / `SafeguardingHead` (church) | **Safeguarding and health records.** Deliberately **not** welfare |
| `BranchPastor` (derived, never stored) | Safeguarding sight, synthesised for whoever holds the `Main Pastor` row in `branch_leadership` |
| `NewBelieversMentor` / `NewBelieversTeacher` | Discipleship pipeline and session notes |
| `MembershipAdmin` (church) / `MembershipChampion` (branch, read-only) | Membership cohorts and the interest pool |
| `giftaid:admin` (church) | Gift Aid declarations only |
| **A child's linked guardian** | The child's full record **and health record, branch-independently** |
| The member | Their own record, their own audit events, their own data export |

Two controls worth recording as Article 32 measures in their own right: grants
are **re-resolved from the database on every request**, so a revocation takes
effect on the next API call with no cached-permission window; and a minor's
date of birth, email, phone, address, postcode and emergency contacts are
**redacted at the service boundary** for any viewer without access.

External recipients that are **not** processors, because they act as controllers
in their own right: **HMRC** (Gift Aid claims) and, where legally required, a
safeguarding authority, a court, or a UK regulator.

---

## 3. Processors

**Four processors. This list and the published privacy notice now agree.** The
notice was wrong in two ways — it named Sentry, which receives nothing, and
omitted Mapbox, which receives personal data. Both were corrected on
8 November 2026, so this table is no longer a deliberate divergence from what
members are told.

| Processor | Role | Personal data it receives | Region | Article 28 evidence held |
|---|---|---|---|---|
| **Cloudflare, Inc.** | Pages (web), Worker (API), Hyperdrive (DB gateway), **Images** (profile photos), Workers Logs | Everything in transit; **profile photographs at rest, including children's**; request logs carrying `memberId`, `branchId`, `activeRole`, path and status | UK/EU edge — **but confirm where Cloudflare Images stores at rest** | **Yes.** Customer DPA **v6.4, 3 April 2026**. Sub-processor list retrieved 8 Nov 2026. |
| **PlanetScale, Inc.** | Postgres — the primary datastore | **All 55 tables, including health and safeguarding records** | Primary store AWS eu-west-2 (London); **sub-processors almost entirely US** — see §4 | **Yes.** Customer DPA, **last updated 15 October 2026**. Sub-processor list retrieved 8 Nov 2026 (published 14 March 2025). |
| **Amazon Web Services, Inc.** | SES transactional email | Recipient name and email; email body content, which includes **children's names** in aging-out notifications | eu-west-2 | **Yes.** GDPR DPA incorporated into the **AWS Service Terms §1.14.1**, with the UK GDPR and Swiss addenda at **§1.14.4** and the June 2021 SCCs included. |
| **Mapbox** | Address autofill and map rendering, on web and mobile | **Partial address strings as a member types them**, plus coordinates. Not named in the privacy notice. | Confirm — likely US | **Yes.** Customer DPA **1 April 2025**. Sub-processor list retrieved 8 Nov 2026. |
| **Expo / EAS** | Mobile app builds | Build artefacts and source. **No member data** — arguably not a processor of personal data at all | US | Not required on that basis |

### Where the evidence is held, and what it does and does not establish

**Retrieved 8 November 2026.** Held by Kharis Ministries outside this
repository, in OneDrive under `Tech/`, as:

| Processor | File as saved | Document version |
|---|---|---|
| Cloudflare | `ikharis_cloudflare_customer_dpa-v6.4_april_3_2026.pdf` | Customer DPA v6.4, 3 April 2026 |
| Cloudflare | `ikharis_cloudflare_subprocessors.pdf` | sub-processor list, retrieved 8 Nov 2026 |
| PlanetScale | `ikharis_planetscale_customer_dpa_october_15_2026.pdf` | DPA last updated 15 October 2026 |
| PlanetScale | `ikharis_planetscale_subprocessors.pdf` | sub-processor list, retrieved 8 Nov 2026 (page dated 14 March 2025) |
| Mapbox | `ikharis_mapbox_customer_dpa_april_1_2025.pdf` | DPA 1 April 2025 |
| Mapbox | `ikharis_mapbox_subprocessors.pdf` | sub-processor list, retrieved 8 Nov 2026 |
| AWS | `ikharis_aws_customer_dpa.pdf` + `ikharis_aws_service_terms.pdf` | DPA at Service Terms §1.14.1; UK GDPR and Swiss addenda at §1.14.4 |

The versions and dates are recorded here so that this record answers "which
version were we relying on, and when" without anyone opening a file. When a
processor publishes a new version, replace the saved copy **and update the row
above** — otherwise the record silently describes a document that has been
superseded.

**All four are incorporated by reference, not separately signed.** PlanetScale's
says so in its own first paragraph; AWS folded its GDPR DPA into the Service
Terms in 2018 and requires no customer action. So **the controller's obligation
here is evidential rather than contractual**: there is nothing to negotiate or
countersign, and what Article 28(9) actually requires is that the terms be in
writing and capable of being produced. Holding dated copies is precisely how
that is discharged, which is why the retrieval date matters as much as the
documents.

> **What this closes, and what it does not.** This discharges the **Article 28
> evidence** requirement for the four processors, and nothing further. It says
> nothing about whether the processing those contracts cover is lawful — that is
> the job of the lawful bases in §1, the Article 9(2) conditions in `dpia.md`
> §3.3, the retention position in §5, and the risk assessment in `dpia.md` §4,
> all of which remain open. A complete set of DPAs over unlawful processing is
> still unlawful processing.

> **~~DECISION NEEDED: retrieve PlanetScale's sub-processor list.~~ CLOSED
> 8 November 2026 — retrieved.** Published at
> `planetscale.com/legal/subprocessors`, referenced from DPA clause 4.1. It
> closes the one asymmetry in the Article 28 evidence set, and it raised two
> things that were not visible before. Both are recorded below rather than
> treated as settled.

**What PlanetScale's sub-processor list establishes.** Twenty entities, of which
the ones that matter for this record are **Amazon Web Services** (data hosting),
**Google LLC** (data hosting and internal infrastructure), **ClickHouse**
(hosting and analytics), **Datadog** and **Sentry** (application monitoring),
**Panther Labs** (security information management), and **Okta** / **WorkOS**
(identity). The remainder are PlanetScale's own sales, support and billing
tooling — Salesforce, Zendesk, Slack, Stripe, Koala, ClearFeed, Fivetran,
SendGrid/Segment, GitHub, Vercel, Pusher — which process PlanetScale's customer
relationship with Kharis Ministries, not member data.

> **DECISION NEEDED: the sub-processor objection window is five calendar days, not thirty.**
> DPA clause 4.3 gives the controller **five calendar days** from notice to
> object in writing to a new sub-processor, on reasonable data-protection
> grounds; if the objection is not resolved, PlanetScale "may, at its option,
> remove the Subprocessor or suspend or terminate the Agreement." Five days is
> short enough that nobody will catch it by accident, and the sub-processor page
> itself states no notice period at all — it says only "This page will be
> updated when Subprocessors are added or removed. Check back frequently for
> changes or subscribe to updates via our Trust Center."
> **Recommended:** subscribe to `trust.planetscale.com` with an address someone
> actually reads, and treat a sub-processor notice as a five-day action rather
> than something to review at the next meeting. Without that, the Article 28(2)
> right to object exists on paper and expires unexercised every time.
> **Trade-off:** none, beyond one more alert to triage.

**A note on the list's own date.** The sub-processor page is dated **14 March
2025**, while the DPA it is referenced from was updated **15 October 2026**. The
page does not say whether the list was reviewed when the DPA changed, so its
currency is asserted rather than demonstrated. Re-check it at the same time as
the DPA rather than assuming the older date means nothing changed.

### Two processors named in documents that receive nothing

Both are excluded on purpose. They are recorded here so that nobody reads them
back into this list from the documents that mention them.

**Sentry, Inc. — excluded.** The privacy notice states that Sentry "receives
error reports when Kairos fails". It does not. There is **no `@sentry`
dependency in any workspace and no Sentry code anywhere in the monorepo** — the
only mention of Sentry in the entire repository is that sentence in the notice.
So the system has no error reporting at all.

**Axiom — excluded, verified.** `../observability.md` describes a Cloudflare
Logpush job streaming request logs to Axiom for 30-day searchable retention.
**It was never wired.** `"logpush": true` appears **nowhere** in
`apps/api/wrangler.jsonc` — not in the top-level production config, not in the
`staging` environment — and a Cloudflare Worker emits to Logpush only when its
own configuration carries that flag, so no account-level Logpush job can be
receiving anything regardless of what exists in the dashboard. Request logs
therefore go no further than **Cloudflare Workers Logs**, which is enabled with
head sampling (`observability.enabled: true` at `wrangler.jsonc:58` and `:118`)
and retained for a short window. Cloudflare is already a processor for
everything else, so this adds no new processor — it narrows where the logs go.

Consequences recorded elsewhere: the Axiom region question in §4 disappears, and
the investigation window in `incident-response.md` §2 is days rather than
thirty, which materially weakens the Article 33 scoping position.

**Article 28(3) content.** Each of the four DPAs covers the subject matter,
duration, nature and purpose of the processing, the types of personal data and
categories of data subject, and the controller's obligations and rights. Because
they are the processors' own standard terms rather than negotiated instruments,
the church's assurance on content rests on those published terms — which is the
normal position for a controller of this size using commodity infrastructure,
and is worth stating rather than implying a bespoke contract exists.

> **DECISION NEEDED: whether to enable Logpush — and if so, this record gains a processor.**
> Logpush is **confirmed not enabled** (§3), so Axiom is not a processor today.
> But `incident-response.md` §2 recommends enabling it precisely because a
> days-long log window is too short to investigate a breach inside the 72-hour
> notification clock.
> **Recommended: enable it**, which means adding `"logpush": true` to both the
> production and `staging` Worker configs *and* creating the account-level job —
> the flag alone does nothing.
> **Trade-off, and it is a real one for this document:** doing so adds a new
> processor receiving `memberId`, `branchId` and `activeRole`, which then needs
> a DPA, a region check against the privacy notice's UK/EEA statement, a
> retention period of its own, and a row added to the notice's processor list.
> Better detection costs a processor. That is the right trade, but it should be
> made deliberately rather than discovered after the fact.

---

## 4. International transfers

**Design intent is that no personal data leaves the UK/EEA.** PlanetScale is in
AWS eu-west-2 (London); SES is in eu-west-2; Cloudflare terminates in the UK.
The privacy notice states this to members.

**Three** qualifications remain — the Axiom region question has closed, because
Axiom receives nothing (§3), but PlanetScale's sub-processor list has opened a
new one:

- **Cloudflare** is a global network. Edge processing for UK traffic stays in UK
  points of presence, but the **Cloudflare Images** store's location needs
  confirming, and that store holds children's photographs. This is still the
  most important of the three, because the data is at rest and it is
  photographs of minors.
- **Mapbox** is likely to process address fragments in the US.
- **PlanetScale's sub-processors are almost entirely United States entities**
  (§3). The *primary store* is AWS eu-west-2 (London) — confirmed from the
  database host `aws-eu-west-2-1.pg.psdb.cloud` — so member records are held in
  the UK. But PlanetScale's own monitoring and infrastructure sub-processors,
  including Datadog, Sentry, ClickHouse and Google, are US-based, and the list
  does not say which of them can see customer data as opposed to PlanetScale's
  own telemetry. **This is the gap that matters most in this section now**,
  because unlike Cloudflare Images and Mapbox it concerns the processor holding
  all 55 tables.

Where a transfer does occur, the notice relies on the **UK International Data
Transfer Agreement or the UK Addendum to the EU Standard Contractual Clauses**,
and the DPAs now held (§3) carry the mechanism: the AWS DPA incorporates the
**UK GDPR addendum at Service Terms §1.14.4** and the **June 2021 SCCs**, and
Cloudflare's v6.4 and Mapbox's carry equivalent transfer terms. So the
*mechanism* is evidenced; what is still unestablished is **whether any transfer
actually occurs**, which is a question about where these services store data,
not about the paperwork.

> **DECISION NEEDED: confirm the storage and processing regions for Cloudflare Images and Mapbox.**
> Narrowed from the earlier version of this marker: the transfer mechanism is no
> longer in question now the DPAs are held (§3), so only the factual region
> question remains.
> **Recommended:** confirm Cloudflare Images first — it is the one holding
> children's photographs at rest, and the only at-rest store whose region is
> unknown. If Mapbox processes address fragments in the US, the privacy notice's
> "stored in the United Kingdom / European Economic Area" statement needs
> qualifying, because at present it reads as covering everything.
> Note that if Logpush is later enabled, the region question returns with the
> new processor.

---

## 5. Retention

Summarised from `data-retention.md`, which holds the per-type detail and the
seven open retention decisions. Repeated here because Article 30(1)(f) requires
the envisaged time limits in the record itself.

| Data | Stated period | Source | Enforced? |
|---|---|---|---|
| Active member records | Duration of membership | Privacy notice | No |
| Archived member records | 6 years after leaving, then anonymise or delete | Privacy notice | **No** |
| Children's records | "In line with our safeguarding policy" | Privacy notice | No — and the notice says the transition happens at 18 while the code transitions at **16** |
| Health and safeguarding records | **None stated** | — | No, and nothing writes to the table at all |
| Follow-ups, welfare and safeguarding concerns | **None stated** | — | No |
| Form submissions | **None stated** | — | No |
| Attendance | **3 years rolling** | Privacy notice | **No** |
| Gift Aid declarations | **6 years** after the accounting period containing the last covered donation; longer during an HMRC enquiry | Privacy notice + `packages/types/src/gift-aid.ts:60` | Date computed and stored; **deliberately not actioned** |
| Consent records | Account lifetime **+ 6 years** | Privacy notice | Partly — the "lifetime" half holds, the tail has no end |
| Audit and sign-in logs | **90 days, "then automatically deleted"** | Privacy notice | **No. The statement is false.** |
| Notification events | **None stated** | — | No |
| Outreach contacts (`souls`) | **None stated** | — | No. No soft-delete column, no delete endpoint. |
| Membership interest pool | 180 days, then soft-deleted after 30 more | `packages/types/src/membership.ts:40` | **Yes** — the only enforced expiry in the system, and it still deletes nothing |
| Profile photos | On the member clock, implicitly | — | **No, and the image outlives the database row** |
| Auth artefacts (tokens, codes, sessions) | Each has an `expires_at` | Various | **No — expiry is a read-time predicate; no row is ever deleted** |

**Overall: one of fifteen categories has enforced retention, and it soft-deletes
rather than removing anything.** Article 5(1)(e) is not met, and this record
says so rather than reproducing the stated periods as though they were applied.

---

## 6. Technical and organisational security measures

Article 30(1)(g) asks for a general description. Full assessment in
`secure-sdlc.md` §4 and `regulatory-mapping.md` §9.

**In place:**

- TLS in transit throughout, Cloudflare-terminated.
- **argon2id** password hashing at OWASP-2025 minimums (m=19456, t=2, p=1),
  constant-time comparison, per-hash parameter agility. No bcrypt anywhere.
- **Capability-based access control with a single matcher** shared by the API,
  web and mobile, with no copies; grants re-resolved from the database on every
  request.
- **Minor field redaction** at the service boundary.
- **Separation of pastoral sight from administrative authority** —
  `BranchAdmin` does not carry `safeguarding:read`.
- **A server-side consent gate** on every `/api/*` route, which verifies the JWT
  itself so it cannot be bypassed by calling the API directly; privileged roles
  must accept a Confidentiality and Data Handling Undertaking, which is an
  Article 29 control.
- **An append-only audit log** of 18 authentication, role-grant and OAuth
  action types, with awaited writes so a Worker cannot drop them.
- **Pseudonymisation on erasure**, reasoned against the foreign-key graph.
- **Branch protection** on `main` that applies to administrators, requires
  code-owner review, and blocks force-push and deletion; a four-command CI gate
  (build, lint, typecheck, test) that deploy workflows cannot skip; production
  deploys held for reviewer approval.
- **Mandatory authorization and branch-isolation tests** per API module.
- **Secrets held write-only** in Cloudflare Worker secrets and GitHub
  Environments; nothing secret is committed.
- **PS-5 three-node high availability** in eu-west-2.
- **Migrations only through `db:bootstrap`**, with a dry-run preview in the
  deploy log before anything changes.

**Known absent, and recorded here rather than omitted:**

- **No retention enforcement** (§5).
- **No rate limiting anywhere** — unlimited credential stuffing, and an
  argon2id-amplified CPU-exhaustion path on unauthenticated endpoints.
- **No security headers** — no CSP, HSTS, X-Frame-Options or Referrer-Policy.
- **Two JWT signing secrets fail open** onto values committed to the repository,
  with no environment check.
- **Profile photos are served unauthenticated and permanently**
  (`requireSignedURLs: false`), with no delete path.
- **The audit log cannot answer a data-access question** — no action type for
  reading, changing or exporting a member record, and the CSV export routes
  write no audit row.
- **`member_roles.end_date` is never enforced**, so a time-limited grant is not.
- **No alerting**, no dependency scanning, no secret scanning in CI, no SAST,
  no penetration test, and **no tested database restore**.
- **No log destination and no error reporting outside Cloudflare.** Logpush is
  not enabled and Sentry is not wired (§3), so request logs stop at Cloudflare
  Workers Logs with a short retention window and unhandled exceptions are
  reported nowhere.
- **Encryption at rest is assumed** from the PlanetScale default and has not
  been verified (`backup-recovery.md` §2).

---

## 7. Adoption and review

> **DECISION NEEDED: every field below. This record is not the controller's Article 30 record until they are completed.**

| Field | Value |
|---|---|
| Adopted by | *unassigned* |
| Date adopted | *unadopted* |
| Owner (keeps it current) | *unassigned* |
| Review frequency | *to be set — recommended annually, and on any change below* |

> **DECISION NEEDED: who owns keeping this current, and by what mechanism.**
> An Article 30 record that is not maintained is worse than none, because it
> misrepresents the processing in a document the controller has signed.
> **Recommended:** tie it to `data-retention.md`, which is already organised per
> data type, and make it a required review item whenever a migration adds a
> table holding personal data — that check is already item 9 on the
> `secure-sdlc.md` §5 review list, so the hook exists.
> **Trade-off:** a per-migration check adds friction to schema changes. The
> alternative is an annual sweep, which will drift for up to a year.

This record must be updated when: a new table holding personal data is added; a
new form type is added; a processor is engaged or dropped (including if Sentry
is ever actually wired); a retention period is decided or enforced; a new
capability or role is introduced; a transfer outside the UK/EEA begins; or
donations are un-descoped, which would add a payment-processing activity and
bring PCI DSS into scope.

## Related

`dpia.md` is the Article 35 assessment of the same processing, and the two should
be reviewed together. `data-retention.md` holds the per-type schedule behind §5.
`regulatory-mapping.md` maps each obligation to where it is met.
`../auth-and-permissions.md` is the authoritative reference for §2.
