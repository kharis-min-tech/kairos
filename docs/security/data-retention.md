# Data retention

**Status:** first draft, 2026-11-08. Written for the pre-release cyber-security
review. Every "enforced today" claim below was checked against the code, not
against intent.

Two things get confused in retention conversations, so this document keeps them
apart:

- A **defined** period is one somebody has written down. Several of ours are
  written down in a place that matters a great deal — the published privacy
  notice at `apps/web/src/app/legal/privacy/page.tsx`, which members accept at
  sign-in.
- An **enforced** period is one the system actually applies.

Kairos has a reasonable set of defined periods and almost no enforcement. That
gap is the finding. It is not, by itself, a breach: UK GDPR Article 5(1)(e)
requires that data not be kept longer than necessary, and a church can meet
that with a documented manual review. It becomes a problem the moment a
published notice says something the system does not do, because that is an
accuracy failure under Article 5(1)(a) and the easiest thing in the world for a
regulator to check.

---

## 1. The honest summary

Across 55 tables there are exactly three mechanisms that remove or obscure
personal data, and one that looks like retention but is not.

| Mechanism | What it does | What it does not do |
|---|---|---|
| `deleteMyAccount` — `apps/api/src/me/service.ts:241-309` | Member-initiated. Scrubs 18 PII columns on the `members` row, replaces email with `deleted-<uuid>@deleted.kairos.local`, invalidates the password hash, sets `is_active=false`. Hard-deletes `notification_preferences`. | Touches nothing else. Attendance, form payloads, follow-up notes, health records, consent records and audit rows all keep pointing at the anonymised shell. Does not delete the profile photo from Cloudflare Images. |
| `lapseExpiredInterest` — `apps/api/src/membership/service.ts:302-345` | `waiting → lapsed` at 180 days (`MEMBERSHIP_INTEREST_WINDOW_DAYS`, `packages/types/src/membership.ts:40`), then `is_active=false` 30 days after that. | Deletes nothing. The row, its notes and its stated preferences stay in `membership_interest` permanently. Deliberately not a cron — it runs at the top of every pool read and write. |
| `deactivateMember` — `apps/api/src/members/service.ts:833-861` | Admin-initiated soft delete, cascading `is_active=false` to `member_roles`, `new_believer_enrollments`, `department_members`. | Clears no PII at all. A deactivated member's name, address, phone and date of birth remain exactly as they were. |
| `retentionReviewAt` on `gift_aid_declarations` | Stores the date six years past the end of the accounting period containing the last covered donation (`retentionReviewDateFor`, `packages/types/src/gift-aid.ts:280`). | **Nothing reads it except the DTO mapper.** This is deliberate and correct — see §3. It is a date for a human, not a trigger. |

The single `scheduled` handler in the repo is `apps/api/src/worker.ts:86`. Both
declared crons (`0 3 * * *` lifecycle, `0 8 * * *` digest) were read end to
end. **Neither deletes, purges or anonymises anything.** The lifecycle cron
reclassifies `member_type` `child → attendee` at 16 and `visitor → attendee`
after six attendances in 90 days; the digest cron only stamps `sent_at`. The
lifecycle cron in fact *creates* personal data nothing ever removes — it writes
a child's full name into a `notification_events` payload
(`apps/api/src/cron/lifecycle.ts:57`).

Repo-wide greps confirming the shape of this:

- `DELETE FROM` — one hit, a one-off data cleanup inside migration `0052`.
- `db.delete(...)` in `apps/api` — seven call sites, all per-row and
  user-initiated (two follow-up deletes, notification preferences, a region, a
  uniform schedule row, rota assignments, an OAuth client). None is
  retention-driven.
- `pseudonym` — **zero hits.** The thing `deleteMyAccount` does has no name in
  this codebase, which is part of why its limits are easy to miss.

---

## 2. The schedule

"Published" means the period is stated to data subjects in the privacy notice
and is therefore already a commitment. "Recommended" means this document is
proposing it and nobody has agreed it yet.

### Members — core PII

| | |
|---|---|
| **Tables** | `members` (`packages/database/src/schema/members.ts:8`) |
| **Data** | Name, middle name, date of birth, gender, email, phone, home and secondary address, profile photo URL, emergency contact name/phone/relationship, honorific, profession, password hash, last login |
| **Period** | **Published:** active for the duration of membership; archived records "up to 6 years after you leave", after which the notice promises to "anonymise or delete the record" (`privacy/page.tsx:270-274`) |
| **Basis** | Legitimate interests (church administration and pastoral care); the 6-year tail is justified in the notice by safeguarding queries and demonstrating compliance |
| **Enforced** | **No.** Nothing expires an inactive member row. A member deactivated in 2026 still holds full PII in 2040. `deleteMyAccount` is the only scrub and only the member can trigger it. |

### Children's records and guardianship

| | |
|---|---|
| **Tables** | `members` where `member_type='child'`; `member_guardians` (`member-guardians.ts:19`, migration `0056`) |
| **Data** | Everything above, plus the guardianship graph with a free-text `relationship` and `notes` |
| **Threshold** | 16, from `MINOR_AGE_THRESHOLD` (`packages/types/src/minor.ts:10`) via `isMinorMember` |
| **Period** | **Published:** "in line with our safeguarding policy", then transitioning to the adult schedule — but the notice says that happens "when a child turns 18" (`privacy/page.tsx:276-279`) while the code transitions at 16. See §4. |
| **Basis** | Legal obligation under safeguarding law, plus legitimate interests |
| **Enforced** | **Partly, and not as retention.** The 03:00 cron flips `member_type` at 16 (`cron/lifecycle.ts:105-131`). Guardianship rows survive untouched, with no end date and no review prompt. `safeguarding_reviewed_at` drives a 90-day re-surfacing on `/members/safeguarding`, which is a review nudge, not a retention control. |

> **DECISION NEEDED: the retention period for children's records, and the clock it runs on.**
> The safeguarding-sector norm is to keep records relating to children until the
> subject's 25th birthday, and significantly longer — often 75 years from the
> date of the record — where a safeguarding concern was raised, because the
> IICSA-era expectation is that allegation records outlive the people who could
> be asked about them. Kairos currently distinguishes neither case.
> **Recommended:** ordinary child records to the 25th birthday; any record
> attached to a safeguarding concern retained for 75 years from creation and
> flagged as undeletable.
> **Trade-off:** the long tail means a child's record cannot honour an erasure
> request, which has to be said plainly in the privacy notice rather than left
> under the existing "except where we are required to keep it for safeguarding
> or legal reasons" caveat. The alternative — a shorter period — is cheaper to
> hold but risks destroying the only record of a concern before anyone asks for it.
> Only the church's safeguarding lead and trustees can settle this.

### Safeguarding and health records (UK GDPR Article 9)

| | |
|---|---|
| **Tables** | `member_health_records` (`member-health-records.ts:16`), 1:1 with a member |
| **Data** | `medical_conditions`, `allergies`, `medications`, `dietary_needs`, `additional_notes`, plus three nullable consent flags (`photo_media_consent`, `medical_treatment_consent`, `data_processing_consent`) with `consent_recorded_by` and `consent_date` |
| **Period** | **Not published and not defined anywhere.** The privacy notice §2.5 describes this category but §5 gives it no period. |
| **Basis** | Article 9(2)(g)/(h) territory — substantial public interest in safeguarding, and protection of vital interests for medical treatment consent. The lawful basis is not recorded against the table. |
| **Enforced** | **No, and nothing writes to it either.** There is no `is_active=false` write, no update and no delete against `member_health_records` anywhere in `apps/api`. `deleteMyAccount` does not touch it. The only removal path is the `member_id` FK cascade, which no code triggers because no member is ever hard-deleted. |

This is the most sensitive table in the system and the one with the least
retention machinery. It is also where disability data lands, since there is no
dedicated column for it.

> **DECISION NEEDED: the retention period for health records, and whether they should outlive the activity that justified them.**
> A child's allergy record exists so that a Sunday-school leader can act on it.
> Once the child stops attending, the justification ends, but the record of what
> consent was given may still be needed as evidence.
> **Recommended:** split the two. Health detail (`medical_conditions`,
> `allergies`, `medications`, `dietary_needs`, `additional_notes`) cleared 12
> months after the member goes inactive; the consent flags, recorder and date
> retained on the same clock as the member record, because they are the evidence
> that processing was lawful.
> **Trade-off:** clearing health detail means a returning member re-enters it.
> Keeping it means holding special-category data about someone who left years ago.

### Follow-ups, including welfare and safeguarding concerns

| | |
|---|---|
| **Tables** | `member_followups` (`member-followups.ts:37`), `follow_ups` (souls pipeline, `follow-ups.ts:6`), `mentor_followups` (`mentor-followups.ts:13`) |
| **Data** | Free-text `notes`, contact methods, visit arrival/departure times, companion member ids, interest level, outcome, next follow-up date. On `member_followups`: `welfare_concern` and `safeguarding_concern`, the two orthogonal flags feeding the `/concerns` inboxes. |
| **Period** | **Not defined.** Not mentioned in the privacy notice's retention section, though §2.3 tells members that safeguarding notes are collected. |
| **Basis** | Legitimate interests and safeguarding legal obligation |
| **Enforced** | **No, and the delete coverage is uneven.** `member_followups` has no soft-delete column at all. Two hard deletes exist — `fellowships/followups-service.ts:242` and `departments/followups-service.ts:239` — both per-row and user-initiated. **There is no branch-context delete path**, so a `context_kind='branch'` follow-up, which is where a branch-level safeguarding concern lives, cannot be removed through the API at all. `follow_ups` has neither a soft-delete column nor any delete. `mentor_followups` soft-deletes via `DELETE /api/new-believers/mentor-followups/:id`. |

A safeguarding concern that can never be deleted is arguably the right
behaviour. It is not the right behaviour by accident, and the asymmetry between
the three context kinds is an accident.

### Form submissions

| | |
|---|---|
| **Tables** | `form_submissions` (`form-submissions.ts:6`). Form *definitions* are code (`FORM_DEFINITIONS`, `packages/types/src/form-engine.ts`) — there is no definitions table. |
| **Data** | `payload` jsonb, carrying the entire submission for nine form types (altar call, baptism, testimony, baby naming, baby dedication, first-time visitor, signature request, marriage pack, K-group host). Plus `notes` and a consent snapshot: `consent_given_at`, `consent_by`, `consent_policy_version`. |
| **Period** | **Not defined.** |
| **Basis** | Varies by form — legitimate interests for most, explicit consent where the form captures special-category detail |
| **Enforced** | **No.** No soft-delete column, no delete, no expiry. The only mutation is a status/notes update. `deleteMyAccount` leaves payloads intact, so an erased member's baptism application still contains their name. Testimony anonymisation at `forms/service.ts:1348-1354` applies **only to CSV export** — it substitutes `(anonymous)` at render time and leaves the stored payload unchanged. |

> **DECISION NEEDED: retention per form type, because one period cannot be right for all nine.**
> **Recommended:** baptism and baby-dedication records retained permanently as
> sacramental registers, which is what churches do with them and what members
> expect; marriage pack retained 6 years after the event; first-time visitor
> submissions purged at 24 months if the person never became an attendee;
> testimony retained while the member is active, then on the member clock;
> altar-call responses purged at 24 months.
> **Trade-off:** a permanent sacramental register is a legitimate-interest case
> that should probably be recorded as a separate purpose in the privacy notice
> rather than inheriting the member record's 6-year tail.

### Attendance

| | |
|---|---|
| **Tables** | `service_attendance` (`service-attendance.ts:13`), `fellowship_meeting_attendance` (`fellowship-meeting-attendance.ts:6`) |
| **Data** | Presence, arrival time, first-time-visitor flag, who recorded it, free-text notes on fellowship attendance. Present-only rows — there is no "absent" record. |
| **Period** | **Published: 3 years on a rolling basis for reporting** (`privacy/page.tsx:281-282`) |
| **Basis** | Legitimate interests in running services and ministries |
| **Enforced** | **No.** Neither table has a soft-delete column. Nothing deletes or expires a row. The only path is an FK cascade from `services` or `members`, and `deleteService` is itself a soft delete (`attendance/service.ts:470-477`). |

Of all the published periods this is the easiest to enforce and the one most
clearly already broken: "3 years on a rolling basis" describes a job that does
not exist. Self-check-in adds nothing to retain — the QR flow is a stateless
HMAC over `{serviceId, timeBucket}` and writes an ordinary attendance row.

### Gift Aid declarations

| | |
|---|---|
| **Tables** | `gift_aid_declarations` (`gift-aid-declarations.ts:51`) |
| **Data** | Declared title, first and last name, full address, postcode, country, email, phone — stored here rather than read through to `members` **on purpose**. Plus the evidence of the act: `declaration_text`, `source_ip`, `user_agent`, `declared_at`. |
| **Period** | **Published: 6 years after the end of the accounting period containing the last donation covered, longer while HMRC has an open enquiry** (`privacy/page.tsx:291-297`) |
| **Basis** | **Legal obligation** under UK tax law — explicitly not consent, and explicitly not something a donor can stop by asking |
| **Enforced** | **The date is computed and stored; nothing acts on it, and that is correct.** `retentionReviewAt` is written at four sites in `gift-aid/service.ts`. The schema comment at `:117-122` states the reason no cron touches it: an open HMRC enquiry extends the period indefinitely and no scheduled job can know about one. `member_id` is `onDelete: 'restrict'`, so a declarant can never be hard-deleted. `is_active` exists only to satisfy repo convention and is never flipped. |

This is the one data type in Kairos where retention has actually been reasoned
about, and the reasoning is worth copying. The ADR comment at
`gift-aid-declarations.ts:17-50` is the model for the rest of this document:
it states what survives erasure, why, and what would break if it did not.

### Audit log

| | |
|---|---|
| **Tables** | `audit_log` (`audit-log.ts:18`) |
| **Data** | 18 action types (`packages/types/src/audit.ts:10-29`) covering authentication, password change, email change, role grant/revoke and the OAuth authorization-server events. Each row carries `ip`, `user_agent`, `country`, `attempted_email` and a `metadata` jsonb. |
| **Period** | **Published: "Sign-in logs and error reports are kept for up to 90 days, then automatically deleted"** (`privacy/page.tsx:299-301`) |
| **Basis** | Legitimate interests in maintaining a secure platform |
| **Enforced** | **No — and this published sentence is false.** `grep` for `update(auditLog` and `delete(auditLog` across `apps/` and `packages/` returns zero hits, and no migration contains `DELETE FROM audit_log`. The table is genuinely append-only, which is the right property for an audit log and the wrong property for a 90-day promise. |

Two further points the audit team will ask about:

- `attempted_email` captures the email typed on a **failed** sign-in, including
  addresses that match no account. The audit log therefore holds personal data
  about people who have no relationship with the church and no way to know the
  record exists.
- Append-only is enforced by convention, not by database grants. The
  application never updates or deletes; the application's database role could.

> **DECISION NEEDED: reconcile the audit log's retention with the 90-day published claim.**
> These cannot both stand. Three ways out, in order of preference:
> **(a)** Keep the log append-only and correct the privacy notice to say
> security events are retained for as long as the account exists plus 6 years,
> matching the consent-record rationale — they are the evidence that access was
> controlled. **(b)** Keep the 90-day promise and write the purge job, accepting
> that a breach discovered in month four has no sign-in history to investigate,
> which is the opposite of what an incident-response capability needs.
> **(c)** Split the table: a 90-day window for high-volume `signin_*` rows and a
> long retention for role grants, OAuth authorizations and email changes.
> **Recommended: (a) now, (c) later.** Whichever is chosen, `attempted_email`
> for non-existent accounts should be purged on a short clock regardless —
> 30 days is enough to investigate a credential-stuffing run.

### Consent records

| | |
|---|---|
| **Tables** | `consent_records` (`consent-records.ts:16`) — one immutable row per (member × type × version × grant) |
| **Data** | `consent_type`, `version`, `granted`, `granted_at`. Five types: `terms`, `privacy`, `marketing`, `acceptable_use`, `admin_confidentiality` (`packages/types/src/consent.ts:25`). Versions come from `CONSENT_VERSION_*` env vars, defaulting to `2026-07-v1`. |
| **Period** | **Published: lifetime of the account plus 6 years** (`privacy/page.tsx:285-287`) |
| **Basis** | Legitimate interests — they are the evidence that other processing was lawful |
| **Enforced** | **The "lifetime" half holds; the "plus 6 years" half has no end.** Nothing writes `is_active=false` and nothing deletes. `deleteMyAccount` keeps them deliberately (`me/service.ts:238-240`), which is right — erasing the proof of consent along with the data would be self-defeating. The `member_id` cascade would remove them if a member were ever hard-deleted, and none ever is. |

Note the drift: the schema comment at `consent-records.ts:8` says three consent
types. There are five.

Per-form consent snapshots also live on
`form_submissions.consent_given_at/consent_by/consent_policy_version` and the
three flags on `member_health_records`. Neither is covered by any period.

### Souls pipeline, outreach and new believers

| | |
|---|---|
| **Tables** | `souls` (`souls.ts:9`), `outreach_participants`, `new_believer_enrollments`/`_sessions`/`_attendance` (`new-believers.ts:21,65,95`) |
| **Data** | `souls` holds the PII of **non-members**: name, phone, email, address, city, gender, age range, free-text notes. New-believer tables hold session notes, feedback and removal reasons. |
| **Period** | **Not defined.** The privacy notice §1 says it covers "anyone who submits information through a public Kairos form", which reaches these people, but §5 gives them no period. |
| **Basis** | Legitimate interests in evangelism and pastoral follow-up — the hardest basis to defend for someone who never asked to be recorded |
| **Enforced** | **No.** `souls` has no soft-delete column, no delete endpoint and no expiry: a contact's phone number and home address are stored forever. `new_believer_sessions` and `new_believer_attendance` likewise have no soft-delete column. `removeFromPipeline` soft-deletes an enrollment with a required reason. |

> **DECISION NEEDED: how long an outreach contact who never engaged is kept.**
> This is the weakest lawful-basis position in the system. Someone who gave their
> number at a street outreach and never came back has a strong Article 21
> objection and no realistic way to exercise it, because they have no account.
> **Recommended:** purge a `souls` row 24 months after the last recorded
> follow-up where the status never advanced past initial contact, and add a
> delete endpoint so a contact who asks can be removed immediately.
> **Trade-off:** a longer window helps a church re-engage someone years later;
> a shorter one is far easier to defend.

### Notification events

| | |
|---|---|
| **Tables** | `notification_events` (`notification-events.ts:15`) |
| **Data** | `payload` jsonb carrying member names, **children's names** (`cron/lifecycle.ts:57`) and portal URLs, plus `sent_at`, `batch_id`, `send_error` |
| **Period** | **Not defined and not mentioned in the privacy notice.** |
| **Basis** | Legitimate interests in operating the platform |
| **Enforced** | **No.** The digest cron only updates `sent_at`. Nothing deletes a delivered event. This is an unbounded, permanently growing log of personal data that duplicates data held elsewhere. |

> **DECISION NEEDED: purge delivered notification events.**
> **Recommended:** delete rows 90 days after `sent_at`. The payload is a
> rendering convenience, not a record — everything in it is derivable from the
> source tables, so nothing of value is lost.
> **Trade-off:** losing the ability to answer "what exactly did we email this
> person 18 months ago". If that matters, keep the envelope (member, category,
> event type, `sent_at`) and null the payload.

### Auth artefacts

Every one of these tables has an `expires_at`, and **not one has any code that
deletes expired rows.** Expiry is a read-time predicate; the rows remain.

| Artefact | Table | Enforced |
|---|---|---|
| First-party refresh tokens | **No table** — stateless JWTs signed with `JWT_REFRESH_SECRET`. Revocation relies on `members.is_active` being filtered on refresh. | N/A, nothing stored |
| Email verification token | `members.email_verification_token` (hashed) + `_expiry` | NULLed on success. An unused token is never cleared, and `deleteMyAccount` does not clear it. |
| Password reset token | `members.password_reset_token` + `_expiry` | Cleared by `deleteMyAccount`. No sweep of expired tokens. |
| Email change requests | `email_change_requests` — holds **both old and new email** plus token hashes | Lazily marked `status='expired', is_active=false` on access (`auth/email-change-service.ts:73`). Both addresses retained forever. |
| Linked OAuth accounts | `oauth_accounts` — holds provider access and refresh tokens | Disconnect is a soft delete (`auth/oauth/service.ts:369`). Provider tokens are never removed. |
| OAuth sessions | `oauth_sessions` — holds `session_token`, `ip`, `user_agent` | Table unused in Phase 1. Its own schema comment at `:13-14` says cleanup "is a cron responsibility once sessions become active". **That cron does not exist.** |
| OAuth verification tokens | `oauth_verification_tokens` | Consumed → `is_active=false`. Expired-but-unconsumed rows never removed. |
| OAuth2 authorization codes | `oauth_authorization_codes` | Redemption stamps `consumed_at`. **No row is ever deleted; expired codes accumulate indefinitely.** |
| OAuth2 refresh tokens | `oauth_refresh_tokens` | Rotation and revocation are updates. Never deleted. |
| Biometric keys | **Not in the database.** Per-user sealed refresh token in the device keychain via `expo-secure-store` (`apps/mobile/lib/biometric.ts:189`), `requireAuthentication: true`, `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`, 1-year TTL. | Removed by `deleteItemAsync`. No server-side record to retain. |

> **DECISION NEEDED: a single expired-artefact sweep.**
> **Recommended:** one job, hung off the existing 03:00 cron, that hard-deletes
> rows past `expires_at` in `oauth_authorization_codes` (immediately — a consumed
> or expired code has no evidential value), `oauth_verification_tokens` (30 days),
> `oauth_sessions` (on expiry), and nulls the token columns on expired
> `email_change_requests` while keeping the status row.
> **Trade-off:** essentially none. This is the cheapest retention win available
> and the one with the least to argue about. It is listed as a decision only
> because adding a cron step is a deployment change.

### Profile photos

| | |
|---|---|
| **Where** | Cloudflare Images. `apps/api/src/media/service.ts:31-65` mints a 30-minute direct-upload URL; the delivery URL is `https://imagedelivery.net/{accountHash}/{imageId}/public`. CF metadata stamps `{purpose, memberId}`. The URL lands in `members.photo_url`. |
| **Period** | On the member clock, implicitly. Not stated. |
| **Enforced** | **No, and this one leaves data outside the database.** There is no Cloudflare Images delete call anywhere in the repo — the only CF Images call is the `direct_upload` POST. `deleteMyAccount` nulls `photo_url`; the image stays, publicly fetchable at its `imagedelivery.net` URL, because `requireSignedURLs` is set to `'false'` at `media/service.ts:42`. And because the URL is no longer recorded anywhere, **it cannot be found and cleaned up later.** |

The comment at `media/service.ts:28-29` says the metadata exists "so
unused/abandoned uploads can be swept later". No such sweep exists.

`members/schemas.ts:21-23` additionally accepts a base64 data URI up to 270 KB,
so some photos are stored inline in the database column rather than in
Cloudflare Images. Those at least disappear when `photo_url` is nulled.

---

## 3. What "deletion" means here, and why

Account deletion in Kairos is **pseudonymisation, not erasure**, and the
foreign-key graph forces it. At least seven FKs into `members` are `restrict` or
`no action` — gift-aid declarations, branch leadership, member follow-ups
(`recorded_by_id`), mentor follow-ups, form submissions, services and service
attendance. `audit_log.actor_member_id` is `on delete set null`.

A genuine `DELETE FROM members` would therefore fail, and the alternative —
cascading — would destroy the attendance history of every service a leader
recorded, the follow-up trail of everyone they pastored, and the HMRC evidence
behind tax already reclaimed. The gift-aid ADR
(`packages/database/src/schema/gift-aid-declarations.ts:17-50`) works this
through properly and is worth reading before anyone proposes changing it.

This is a defensible position under UK GDPR: Article 17(3) permits retention
where processing is necessary for compliance with a legal obligation or for
reasons of public interest, and safeguarding plus HMRC evidence covers most of
it. It is only defensible if it is **described accurately to members**, which
at present it mostly is — the privacy notice §6 carries both the general
safeguarding caveat and an explicit Gift Aid paragraph.

What is not described: that form submission payloads, follow-up notes,
attendance history, health records and the profile photo in Cloudflare Images
all survive a deletion request intact.

---

## 4. Where the published notice over-promises

These are the statements an auditor can disprove by reading the code. Each is a
potential Article 5(1)(a) accuracy finding and all four are cheap to fix.

| Claim | Location | Reality |
|---|---|---|
| "Sign-in logs and error reports are kept for up to 90 days, then automatically deleted" | `privacy/page.tsx:299-301` | `audit_log` is append-only. Nothing is ever deleted. |
| "**Sentry, Inc.** receives error reports when Kairos fails" | `privacy/page.tsx:244-246` | **Sentry is not wired.** There is no `@sentry` dependency in any workspace and no Sentry code anywhere; the only mention of Sentry in the repo is this sentence. `docs/observability.md` is honest about this ("when wired"). Naming a processor that receives nothing is an accuracy problem in the opposite direction from the usual one. |
| "Archived member records are kept for up to 6 years after you leave. After that period we anonymise or delete the record." | `privacy/page.tsx:270-274` | No job does this. Nothing has ever anonymised a member record except at the member's own request. |
| "Attendance records are kept for 3 years on a rolling basis" | `privacy/page.tsx:281-282` | Nothing expires attendance. |
| "When a child turns 18, their record transitions to the standard adult retention" | `privacy/page.tsx:276-279` | The threshold is **16** (`packages/types/src/minor.ts:10`) and the cron transitions at 16. The notice's own §7 correctly says under 16. |
| "Kairos uses a single first-party cookie to keep you signed in during a session" | `privacy/page.tsx:397-398` | The web app keeps tokens in browser storage via Zustand `persist` (`apps/web/src/lib/auth-store.ts:45`), not a cookie. The only cookie is the short-lived OAuth state cookie (`apps/api/src/auth/oauth/state.ts:103`), which protects the OAuth flow and is not mentioned. |
| "Access to Kairos administration is gated by role-based permissions and audit-logged" | `privacy/page.tsx:408-410` | The first half is true and well built (see `docs/auth-and-permissions.md`). The second is not: the audit log covers authentication, role grants and OAuth, and **does not cover member data changes or CSV exports**. |

All four legal pages already carry a "Draft for review" banner saying they have
not been reviewed by a data-protection professional, which is the right
disclosure. These corrections should go in before that review, not after it.

---

## 5. What enforcing any of this would require

Deliberately sketched rather than specified, because the periods are not agreed
yet. The shape matters for estimating.

1. **A retention runner, not a retention cron per table.** One job hung off the
   existing `0 3 * * *` handler (`apps/api/src/worker.ts:86`), with one rule per
   data type, each rule logging what it touched. The dispatch at
   `worker.ts:95-110` falls through to the lifecycle cron for any unrecognised
   expression, so a new rule is a function call, not a new trigger.
2. **A scrub that is not `deleteMyAccount`.** The member-initiated path is
   interactive and password-gated. Time-based archival needs a non-interactive
   equivalent that scrubs the same columns plus the ones `deleteMyAccount`
   currently misses (`email_verification_token`, `last_login_at`).
3. **An "undeletable" marker.** Safeguarding and Gift Aid records must survive
   every rule. The gift-aid FK already enforces this structurally; safeguarding
   needs something equivalent, or the first retention job to run will be the
   incident.
4. **A Cloudflare Images delete call**, and a backfill for the photos already
   orphaned by `photo_url` being nulled. The orphans cannot be found from the
   database; they can be enumerated from CF Images metadata, which stamps
   `memberId`.
5. **The soft-delete columns that do not exist.** `souls`, `form_submissions`,
   `service_attendance`, `fellowship_meeting_attendance`, `member_followups`,
   `follow_ups`, `new_believer_sessions`, `new_believer_attendance`,
   `membership_sessions`, `membership_session_records` and
   `outreach_participants` have no `is_active`, contrary to the repo convention
   in `packages/database/CLAUDE.md`. A retention rule needs somewhere to record
   that it acted.

---

## 6. Open decisions, collected

Every `DECISION NEEDED` above, in one place, for whoever takes this to the
church's trustees:

1. Retention period for children's records, and whether safeguarding-linked
   records get the 75-year tail (§2, children).
2. Retention period for health records, and whether health detail and consent
   evidence come apart (§2, health).
3. Reconciling the audit log's append-only design with the published 90-day
   claim (§2, audit log).
4. Retention per form type, including whether baptism and baby-dedication
   records are permanent sacramental registers (§2, forms).
5. How long an outreach contact who never engaged is kept, and whether they get
   a delete endpoint (§2, souls).
6. Whether delivered notification events are purged at 90 days (§2,
   notifications).
7. Whether to add the expired-auth-artefact sweep (§2, auth artefacts).

Items 3 and 7 are the cheapest and should not wait for the rest.
