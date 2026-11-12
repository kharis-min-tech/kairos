# Incident response

**Status:** first draft, 2026-11-08. Written against what Kairos can actually
detect and contain today, which is less than a mature plan would assume. Where
a step depends on a capability that does not exist, this document says so
rather than describing the step as if it worked.

The operative regime is **UK GDPR** plus the Data Protection Act 2018. The
church is the data controller
(`apps/web/src/app/legal/privacy/page.tsx:33-36`). No card data is processed,
so PCI DSS does not apply — see `regulatory-mapping.md` §8. The most sensitive
data held is **children's safeguarding and health records**, which is why the
tabletop in §7 is built around them.

---

## 1. Roles

A plan that names no one is not a plan. These are roles, not people, so the
table survives staffing changes — but somebody has to be written into each one.

| Role | Responsible for |
|---|---|
| **Incident Lead** | Declares the incident and its severity, owns the timeline, decides when it is closed. Does **not** make the Article 33 notification call — see §4. |
| **Technical Lead** | Containment and recovery. Holds Cloudflare, PlanetScale and GitHub access. |
| **Data Protection Officer** — **Tianna Johnson** | Owns the breach assessment in §4, **makes the Article 33 notification call**, drafts the ICO notification, and drafts the Article 34 communication to members. |
| **Safeguarding Lead** | Mandatory participant whenever children's data is in scope. Decides whether a safeguarding referral is needed independently of the data-protection question. |
| **Church Leadership / Trustees** | Informed at Severity 1 and 2. Approve any external communication. |

> **DECISION NEEDED: name the four remaining roles and a deputy for each, with contact details and an out-of-hours route.**
> **The DPO is settled — Tianna Johnson.** Her contact details are still
> outstanding (`dpia.md` §6), and the 72-hour clock in §4 does not pause for a
> weekend, so an out-of-hours route for her specifically is the one that matters
> most.
> **Recommended:** Incident Lead and Technical Lead may be the same person at
> current scale, but the **DPO must not also be the Technical Lead** — the person
> who caused or fixed a breach should not be the sole judge of whether it is
> notifiable. With a designated DPO that separation now exists by construction,
> which is a real improvement on the position this document was first drafted in.
> The Safeguarding Lead role already exists in the system as an RBAC grant
> (`SafeguardingLead` / `SafeguardingHead`), so the natural holder is whoever
> holds that grant.
> **Trade-off:** a deputy for each role needs people who may not exist at current
> scale. Where there is no deputy, write that down as an accepted
> single-point-of-failure rather than leaving the cell blank.

Contact point already published to data subjects: **privacy@kharis.org**, with a
one-calendar-month response commitment (`privacy/page.tsx:357-366`). The ICO
complaint route is published at `privacy/page.tsx:367-380`, and again in the
Acceptable Use Policy and the Confidentiality Undertaking.

---

## 2. Detection — what we would actually notice

Honest assessment first, because the rest of the plan depends on it.

### What exists

| Source | What it gives | Where |
|---|---|---|
| `audit_log` | 18 action types: sign-in success/failure, password change, email change, role grant/revoke, and the OAuth authorization-server events. Each row carries `ip`, `user_agent`, `country`, `attempted_email`. | `packages/types/src/audit.ts:10-29` |
| Structured request logs | One ndjson event per request with `requestId`, `method`, `path`, `status`, `durationMs`, `memberId`, `activeRole`, `branchId` | `docs/observability.md` |
| New-device security email | A member is emailed when a sign-in comes from a user agent not seen before — `hasPriorSigninFromUserAgent` | `apps/api/src/audit/service.ts`, used at `auth/router.ts:36` |
| Admin-edit notification | A member is notified when an admin changes their contact or identity fields | `members/service.ts:473-508` |
| Member-visible audit trail | A member can read their own security events | `GET /api/me/audit-log`, `me/router.ts:121` |
| SES reputation monitoring | Bounce/complaint metrics and auto-pause on the `kairos-transactional` configuration set | AWS-side; referenced at `packages/utils/src/mailer.ts:17` |

The two user-facing notifications are worth calling out: **the most likely way
this church learns about an account compromise is a member saying "I got an
email about a sign-in I didn't make."** That is a real detection channel and it
should be treated as one — see §3.

### Accepted for the pilot, 12 November 2026

**Decision: the absence of active detection and alerting below is accepted for
the pilot.** Taken by the product owner on 12 November 2026, on the stated
basis that **the church is in the process of forming its support model and
operational processes**, and that alerting without a named person rostered to
receive it is theatre rather than a control.

That reasoning is sound and worth preserving, because it is the argument
against the obvious quick fix: wiring an email alert on `signin_failure`
volume would let this checklist item be reported as closed while nobody is
on the other end of it. An alert nobody is accountable for answering is worse
than a known gap, because it converts an open risk into a false assurance.

**What is accepted, stated plainly.** Today, a credential-stuffing run, an
anomalous export, or an administrator acting outside their remit is detected
only if a member complains or somebody happens to look. There is no automatic
notification to anyone.

**What this is NOT.** It is not a decision that detection is unnecessary, and
it does not close the two checklist items it covers — they remain **Fail**,
with a compensating control that is honest rather than flattering: the pilot
is one branch, the administrator population is small and known by name, and
`audit_log` now records member edits and all three export paths, so an
incident can be reconstructed after the fact even though nothing announces it
in the moment.

**The dependency is a person, not a system.** The work here is small — a
threshold on `signin_failure` rows and a Cloudflare notification — and it is
deliberately deferred until the support model names who receives it, with an
out-of-hours route. That is the same gap as the unnamed roles in §1 and the
notification decision in §5, and it should be closed in the same conversation
rather than separately.

### What does not exist

These are not quibbles; each one changes what an investigation can conclude.

- **The audit log could not answer a data-access question. Partly closed on
  8 November 2026.** There were no `member_updated`, `member_viewed` or
  `member_exported` action types, and the CSV export wrote no audit row at all,
  so **a branch admin could export the entire member directory and leave no
  trace in `audit_log`.**

  `member_updated` and `member_exported` now exist (migration 0064), and both
  `updateMember` and `exportMembersCsv` record them. The export row carries the
  actor, the IP, the row count and the branch scope; the update row carries the
  actor, the subject and the names of the fields touched. **Neither carries
  field values or member ids** — deliberately, because an audit log holding the
  data would be a second copy of it under a different retention period, which
  enlarges the breach it exists to describe.

  **All three bulk-export paths are now audited**, each with its own action
  rather than a shared one, because each carries a different population and an
  investigator filtering the log should not have to read `targetType` to tell
  the files apart:

  | Action | Path | Why it is separate |
  |---|---|---|
  | `member_exported` | `GET /api/members/export` | The directory — every member the caller can reach, children included |
  | `submissions_exported` | `GET /api/forms/submissions/export` | First-timer contact details, baby-dedication records naming children and their parents, testimonies |
  | `donor_register_exported` | `GET /api/gift-aid/register` and `/register.csv` | Donor names and **home addresses**, which the directory export does not carry; HMRC-facing evidence with its own six-year retention |

  The Gift Aid one matters disproportionately: it is the path the
  cyber-security checklist asks about by name — "who exported or accessed
  donor/giving data" — and it was the last of the three still writing nothing.

  **One gap remains, deliberately.** `member_viewed` does not exist and is not
  planned: a row per directory read would be an access log rather than an audit
  log, and the volume would bury the events that matter. Reads stay in the
  request log, with its short retention — which is the argument for Logpush
  below, not for a `member_viewed` action.
- **No alerting.** Nothing pages anyone. No threshold alert on sign-in failures,
  no alarm on export volume, no Cloudflare notification configured in the repo.
  Detection is entirely either a member complaining or someone happening to look.
- **No Sentry.** The privacy notice names Sentry as a processor receiving error
  reports (`privacy/page.tsx:244-246`), but there is **no `@sentry` dependency
  in any workspace and no Sentry code anywhere in the monorepo**. Unhandled
  exceptions are not reported anywhere outside the request log.
- **Logpush is NOT enabled — verified, not assumed.** `../observability.md`
  describes a Logpush job to Axiom giving 30-day searchable retention. It was
  never wired. **`"logpush": true` appears nowhere in `apps/api/wrangler.jsonc`**
  — not in the top-level production config, not in the `staging` environment —
  and a Cloudflare Worker emits to Logpush only when its own configuration
  carries that flag, so no account-level job can be receiving anything whatever
  exists in the dashboard. Request logs therefore stop at **Cloudflare Workers
  Logs**, which is enabled with head sampling (`observability.enabled: true` at
  `wrangler.jsonc:58` and `:118`) and retains a window measured in **days, not
  thirty**.

  **This is a finding, not a caveat, and it is the one that most weakens the
  Article 33 position.** The notification clock is 72 hours from awareness, and
  most breaches are not discovered the day they happen — the `incident-response`
  tabletop in §7 turns on a Sunday discovered on a Tuesday, which is already at
  the edge of the window. Combined with the audit log's inability to record a
  read or an export, the honest statement is: **for a data-access or
  exfiltration incident more than a few days old, this system retains no
  evidence from which to scope it.** Head sampling compounds it — sampled logs
  are not a complete record even inside the window.
- **No rate limiting anywhere.** Confirmed by grep across the whole monorepo and
  `wrangler.jsonc`: no Hono middleware, no Cloudflare rate-limiting rule in
  config, no Turnstile. So credential stuffing against `POST /api/auth/login`
  produces unlimited `signin_failure` rows and no automatic response. The rows
  are the detection; there is nothing stopping the attack while you read them.

> **DECISION NEEDED: enable Logpush before the pilot.**
> No longer a question of confirming — it is confirmed off. Enabling it needs
> **both** halves: `"logpush": true` added to the production and `staging`
> Worker configs in `apps/api/wrangler.jsonc`, **and** an account-level Logpush
> job created in the dashboard. The flag alone sends nothing; the job alone
> receives nothing. `../observability.md` has the dashboard steps but does not
> mention the flag, which is probably why this was missed.
> **Recommended: yes, and before the pilot.** It is the cheapest
> incident-response capability available and nothing else on this page extends
> the evidence window.
> **Trade-off:** it adds a processor receiving `memberId`, `branchId` and
> `activeRole`, which needs a DPA, a region check and a retention period of its
> own — see `ropa.md` §3. Better detection costs a processor; make that trade
> deliberately.

> **~~DECISION NEEDED: confirm whether Cloudflare WAF rate-limiting rules are
> configured at the edge.~~ ANSWERED 8 November 2026: there are none, and
> creating them is deliberately deferred.**
> Confirmed rather than assumed. Nothing in the codebase or `wrangler.jsonc`
> rate-limits anything, and no edge rules exist.
> **The rules are now fully specified** in `waf-rate-limiting.md`, derived from
> the real route surface, as Cloudflare edge rules rather than in-Hono counters —
> the Worker binds Hyperdrive and nothing else, so there is nowhere to keep a
> counter, and the `http_ratelimit` phase runs *before* the Worker, which is the
> whole point against the argon2id amplification path in `secure-sdlc.md` §4.6.
> **Deferred by decision, not oversight:** the zone is on the Cloudflare Free
> plan, and the church's position is to create these rules at the production
> rollout rather than pay for them against synthetic staging traffic. **This is
> the only Fail on the cyber-security checklist that is deferred rather than
> outstanding**, and it is flagged in that document for the cyber team to
> challenge if they disagree.
> **What remains, therefore, is not a question but a task with a trigger:**
> create the rules when production takes real traffic. Until then login,
> forgot-password and the OIDC token endpoint are unthrottled, and detection of
> a credential-stuffing run depends on §2's absent alerting.

> **~~DECISION NEEDED: add `member_exported` and `member_updated` to the audit
> taxonomy before the pilot.~~ CLOSED 8 November 2026 — implemented.**
> Both actions exist, migration 0064 widened the CHECK constraint, and the two
> call sites record them. `members/service.test.ts` asserts both the presence of
> the rows and the absence of field values from them.
> The forms export and the Gift Aid register, which had the same defect, were
> closed in the same change as `submissions_exported` and
> `donor_register_exported`. All three bulk-export paths now leave a trail, and
> none of them records field values, member ids or donor details.

---

## 3. Triage

Anyone noticing something wrong raises it to the Incident Lead. There is no
on-call rotation, so the practical route is direct contact.

The first three questions, in order, because they determine everything else:

1. **Is personal data involved?** If no, this is an outage, not a breach — run
   the recovery path in `backup-recovery.md` and stop.
2. **Is children's data involved?** If yes, the Safeguarding Lead joins
   immediately, regardless of severity. This is a safeguarding question in
   parallel with a data-protection one, and the safeguarding referral decision
   is not the Incident Lead's to make.
3. **Is it ongoing?** An active compromise is contained before it is
   investigated. A finished one is investigated before anything is changed,
   because changing things destroys evidence.

Start a timestamped log immediately, in a shared document outside Kairos. Every
entry gets a time and an author. **The 72-hour clock in §4 runs from awareness,
and "awareness" is the first entry in this log** — which is why the log matters
more than it looks.

### Severity

| | Definition | Examples | Response |
|---|---|---|---|
| **S1** | Confirmed unauthorised access to, or loss of, special-category or children's data. Or total system compromise. | Children's health records read or exported by someone with no lawful reason. `JWT_SECRET` compromise (forgeable admin tokens — see `key-management.md` §1). `DATABASE_URL` or `CLOUDFLARE_API_TOKEN` leak. | Immediate. Incident Lead + Technical Lead + DPO + Safeguarding Lead + Trustees informed. Assume notifiable until shown otherwise. |
| **S2** | Unauthorised access to member PII without special-category data, or a confirmed availability loss with data loss. | A branch admin accessing another branch's directory. Member records exposed by a broken access-control bug. Database data loss requiring a restore. | Within 4 hours. Lead + Technical + DPO. Article 33 assessment required. |
| **S3** | A vulnerability with no evidence of exploitation; a near miss. | A missing authorisation check found in review. A secret committed and immediately rotated. Credential stuffing attempt with no successful sign-in. | Within 1 working day. Technical Lead, DPO informed. Usually not notifiable; **record why**. |
| **S4** | Availability only, no personal data at risk. | Bad deploy, Worker erroring, PlanetScale outage. | Normal working hours. Technical Lead. Not a breach. |

The five vulnerability classes found in the recent pre-release review —
privilege escalation via mass assignment, incomplete authentication gates across
multiple sign-in doors, broken access control and excessive data exposure,
client/server gate divergence, and token leakage in responses — were all found in
review rather than in production, so each was S3. The same classes found after
the pilot starts, with real data behind them, would mostly be S2, and the
cross-branch safeguarding read would be S1.

---

## 4. The Article 33 decision — the part that matters most

**UK GDPR Article 33(1): a personal data breach must be notified to the ICO
without undue delay and, where feasible, not later than 72 hours after becoming
aware of it, unless it is unlikely to result in a risk to the rights and
freedoms of natural persons.**

Four things people get wrong about this, so they are stated before the
procedure:

1. **The clock starts at awareness, not at confirmation.** Awareness means a
   reasonable degree of certainty that a security incident involving personal
   data has occurred — not a completed investigation. You do not get to stop the
   clock while you investigate.
2. **72 hours is wall-clock**, including weekends. A Friday-evening discovery is
   due Monday evening.
3. **Loss and destruction count**, not just unauthorised access. An
   unrecoverable database loss is a notifiable breach even with no attacker.
   This is the most commonly missed category and the one `backup-recovery.md`
   §4 step 12 exists to catch.
4. **An incomplete notification is still a notification.** Article 33(4)
   expressly permits notifying in phases. **Never miss the deadline to improve
   the detail** — notify with what you have and supplement.

### The procedure

Run in order. Record the answer and the evidence for each step in the incident
log; that record is the defence if the decision is ever challenged.

```text
Q1. Is personal data involved?
    Personal data = anything identifying a living individual. In Kairos that
    includes member records, children's records, health records, follow-up and
    safeguarding notes, form submission payloads, attendance, gift-aid
    declarations, and audit-log rows (which carry ip, user_agent, country and
    attempted_email — including for people who have no account).
    NO  → not a personal data breach. Log the reasoning. Stop.
    YES → Q2.

Q2. Has there been a breach of security leading to accidental or unlawful
    destruction, loss, alteration, unauthorised disclosure of, or access to it?
    All four limbs count. "Loss" includes losing access to it yourself.
    NO  → a vulnerability, not a breach. Fix it; log the reasoning. Stop.
    YES → the 72-hour clock is running from the moment of awareness. Q3.

Q3. Scope it. Write down, with evidence:
      - which data types (name them from data-retention.md §2)
      - how many data subjects, and how many are under 16
      - whether special-category data (member_health_records) is in scope
      - whether the data was merely accessible or actually accessed/taken
      - whether it is still exposed
    If you cannot answer "accessed or merely accessible", say so explicitly.
    Today, for a data-read or export incident, you probably cannot — see §2.
    An unanswerable scope question pushes Q4 toward "notify".

Q4. Is it UNLIKELY to result in a risk to rights and freedoms?
    Note the double negative: notification is the default. You must be able to
    affirmatively conclude there is no risk in order not to notify.

    Treat as NOTIFIABLE — do not deliberate:
      - any children's data (members where member_type='child' or
        isMinorMember() is true, member_guardians, or any record linked to a
        child)
      - any member_health_records content
      - any member_followups row with safeguarding_concern or welfare_concern
        set, or its free-text notes
      - home addresses of a non-trivial number of members
      - any credential: password hashes, session tokens, reset tokens
      - any case where Q3 could not establish whether data was taken

    Likely NOT notifiable, but record the reasoning:
      - data that was encrypted at rest and in transit with keys that were not
        also compromised
      - a single member's own data disclosed to that member
      - attendance records alone, for a small number of adults
      - a vulnerability with log evidence positively showing no access

    Still unsure after this list → NOTIFY. The ICO treats a good-faith
    notification that turns out not to have been required far more kindly than a
    late or absent one.

Q5. If notifiable: the DPO notifies the ICO within 72 hours of
    awareness, via the ICO's online breach-reporting service at ico.org.uk, or
    its helpline (0303 123 1113) if the service is unavailable.
    Article 33(3) requires: the nature of the breach; the categories and
    approximate number of data subjects and records; the DP contact point; the
    likely consequences; and the measures taken or proposed.
    Keep the submission reference in the incident log.

Q6. Article 34 — do the data subjects have to be told?
    Required where the breach is likely to result in a HIGH risk to their
    rights and freedoms, without undue delay and in clear plain language.
    For this system, assume YES for anything involving children's data,
    health records, safeguarding notes, or credentials.
    The channel is email to the affected members, which means SES, which means
    the Technical Lead must confirm SES is not auto-paused before this is
    promised. Where contacting individuals is disproportionate, Article 34(3)(c)
    permits a public communication instead.

Q7. Record it regardless of outcome. Article 33(5) requires a record of EVERY
    personal data breach, including those not notified, with the facts, the
    effects, and the remedial action. A non-notified breach still has to be
    documented. §8 is where.
```

> **DECISION NEEDED: who makes the final notification call, and who can be reached at a weekend.**
> **Recommended:** the DPO decides and the Incident Lead cannot
> override; a disagreement escalates to the Trustees, who decide within the
> remaining clock. Both roles need an out-of-hours contact route, because the
> 72 hours do not pause.
> **Trade-off:** requiring two people slows the decision. It is the right trade:
> the failure mode this guards against is a technical lead who has just fixed
> something concluding, understandably, that it was not that bad.

---

## 5. Containment

Pick by what is compromised. Most of these are dashboard actions, not scripted
ones — the absence of a scripted kill switch is itself a finding.

| Situation | Action | Note |
|---|---|---|
| Session tokens forgeable or stolen | Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` (`key-management.md` §4) | Logs out every user. Refresh tokens are stateless with no revocation list, so rotation is the **only** bulk revocation. |
| One account compromised | Set `members.is_active = false` for that member | Blocks refresh within ≤15 min (the access-token TTL) and sign-in on every door. A grant revocation takes effect on the **next API call**, because `authMiddleware:64` re-resolves grants from the database every request. |
| Over-broad role grant | Revoke the `member_roles` row | Immediate, same reason. This is a genuine strength: there is no cached-permission window. |
| Leaked QR check-in secret | Rotate `SELF_CHECK_IN_QR_SECRET` | Invalidates every displayed QR within 60s. Cheap. Not during a service unless necessary. |
| Database credential leaked | Rotate the PlanetScale password; review PlanetScale query insights | Direct DB access bypasses all application RBAC, so assume everything was readable. |
| Cloudflare API token leaked | Revoke it; review the Cloudflare audit log for deploys | Equivalent to arbitrary code execution with the database binding. Treat as S1. |
| Malicious or broken deploy | `wrangler rollback`, or redeploy a known-good commit | `main` blocks force-push and deletion, so the good commit is still there. |
| Need to stop all traffic | Delete the Worker's route in the Cloudflare dashboard, or deploy a 503 build | **There is no maintenance mode.** Both options are manual. |
| Data destroyed or corrupted | `backup-recovery.md` §4 | **Export `audit_log` for the affected window before restoring** — the audit trail shares a database with the data, so a restore rolls the evidence back too. |

**Preserve evidence before you fix, and treat it as urgent.** For a finished
incident, export the relevant `audit_log` rows and request logs *first*. The
audit log is append-only in practice — no code anywhere issues UPDATE or DELETE
against it — but a database restore will overwrite it. And because Logpush is
not enabled, **Workers Logs is the only copy of the request logs and it ages
out within days**, so pulling them is the first action in any incident that
might involve data access, before containment and before investigation. There
is no second chance at this evidence.

---

## 6. Recovery and post-incident review

Recovery is complete when the vulnerability is closed, access is restored, the
affected data is verified, and the Incident Lead says so in the log.

A written review happens for every S1 and S2, within 10 working days, and
answers five questions:

1. **What happened**, as a timeline from first cause to resolution.
2. **How was it detected** — and how long had it been happening before that?
   If the answer is "a member told us", say so; that is the most important
   finding a review can produce.
3. **Why did the existing controls not catch it?** Map it to a vulnerability
   class in `secure-sdlc.md` §4. If the class is new, add it.
4. **What changes, concretely** — with an owner and a date. A review that
   produces no dated action is a document, not a control.
5. **Was the notification decision right in hindsight?** Including for
   non-notified breaches. This is how the Q4 list in §4 gets better.

Anything structural goes into the backlog as a card, not only into the review
document.

---

## 7. Tabletop exercise: unauthorised access to children's safeguarding records

Designed to be run in 90 minutes with the roles in §1. It targets this system
specifically, and it is built around the scenario the church is least able to
investigate today — which is the point.

### Setup

Read out, with no further detail:

> It is 14:10 on a Tuesday. A Fellowship Leader at the pilot branch emails
> privacy@kharis.org. She says that last Sunday she was shown, on another
> leader's phone, a Kairos screen listing the medical conditions and allergies
> of several children in the Sunday school — including two who are not in her
> fellowship and one whose family specifically asked that her epilepsy not be
> discussed outside the safeguarding team. She does not know which screen it
> was. She names the other leader: he holds a `DepartmentLeader` grant for the
> Children's Ministry department at that branch, and he is also the registered
> guardian of one child in the group.

Nothing else is given. Participants must ask for what they want.

### Injects, released when asked for or on a timer

**Inject 1 — the permission model.** `member_health_records` is reachable only
through `GET /api/members/:id/health-record`, gated by
`hasSafeguardingAccess` (`apps/api/src/members/service.ts:1086-1106`), which
permits exactly two kinds of caller: the child's **linked guardian**
(branch-independent), or a **`SafeguardingLead` scoped to the child's own
branch**. A `DepartmentLeader` grant carries `department:read` /
`department:write` and **not** `safeguarding:read`
(`docs/auth-and-permissions.md`). So on the current model he could lawfully see
exactly one child's record — his own — and not the others.

**Inject 2 — the awkward one.** The branch's `SafeguardingLead` grant is held by
someone who is on holiday, and three weeks ago an administrator granted the
Children's Ministry leader a temporary `SafeguardingLead` grant for the branch
so that the Sunday school could run. Nobody revoked it. `audit_log` has the
`role_granted` row, with actor, target and timestamp.

**Inject 3 — when asked "what did he actually look at".** This is the inject the
exercise exists for. `audit_log` has 18 action types and **none of them records
reading a member record or a health record.** The request logger would show
`GET /api/members/:id/health-record` lines with a `memberId` and a `branchId` —
but **Logpush is not enabled**, so the only copy is Cloudflare Workers Logs,
head-sampled, retained for days. The Sunday in question was two days ago. **The
data is there now and will not be there by the end of the week**, and somebody
in the room has to notice that and pull it before the exercise moves on. If
nobody does, let it expire and make that the debrief.

**Inject 4 — scope.** If the team pulls the logs in time: eleven
`health-record` reads across nine distinct children, over 20 minutes on Sunday
morning — and note that head sampling means even this may be incomplete. If
they do not pull them in time: **there is no way to establish how many children
were affected, and the Article 34 letter to families cannot say whose child was
involved.**

**Inject 5 — released at 60 minutes.** The leader, asked, says he was "checking
allergies before snack time" and that he did not know he was not supposed to.
He did not take screenshots. He cannot say who else saw the screen.

### What the exercise should surface

- **The 72-hour clock started at 14:10 on Tuesday**, when the email arrived —
  not when the team finishes investigating. Due 14:10 Friday.
- **Q4 of §4 short-circuits.** Children's data plus health records plus a
  documented family request for confidentiality. Notifiable; no deliberation
  needed. Teams reliably waste 20 minutes debating this. Note how long yours
  takes.
- **This is also a safeguarding matter**, and the Safeguarding Lead's referral
  decision is separate from and parallel to the ICO question. A team that treats
  it as purely a data-protection incident has made the characteristic mistake.
- **Article 34 almost certainly applies** — the affected families should be told,
  including the family who had asked for confidentiality. Who writes that email,
  and in whose name?
- **The root cause is not the leader.** It is a temporary privilege grant that
  nothing expired and nobody reviewed. And here the system is worse than merely
  missing a feature: `member_roles` **has** an `end_date` column
  (`packages/database/src/schema/member-roles.ts:20`), but
  `selectRoleGrants` in `apps/api/src/lib/grants.ts` filters only on
  `memberRoles.isActive` and `roles.isActive` — **it never reads `end_date`**.
  The column is written only as a record of when a revocation happened
  (`members/service.ts:723`, `:833`). So an administrator who sets an end date
  intending a time-limited grant gets a grant that stays fully live forever. A
  column that reads as an expiry and is not is exactly the failure mode
  `apps/api/CLAUDE.md` records for `requireRole`: "a gate that reads as a gate
  and is not will eventually be trusted."
- **The investigation capability is the second finding, and it is now known to
  be worse than conditional.** The audit log cannot record a read, and Logpush
  is confirmed not enabled, so the only evidence is head-sampled Workers Logs
  with a retention window of days. The team can scope this incident **only if
  somebody pulls the logs within the first day or two**, and even then only
  approximately. There is no version of this exercise in which the current
  system gives a complete answer.
- **Containment is easy and should be done in the first ten minutes:** revoke
  the `SafeguardingLead` grant. It takes effect on his next API call. If nobody
  does this early, point it out.

### Debrief

Run against §6's five questions. Then three specific ones:

1. How long did it take to decide the incident was notifiable? Why that long?
2. Could you say how many children were affected? With what evidence?
3. What would have had to exist on Sunday for you to answer question 2 on
   Tuesday?

> **DECISION NEEDED: the tabletop schedule.**
> **Recommended:** run this one before the pilot goes live, and one exercise
> every six months thereafter, alternating this scenario with a credential
> compromise (`JWT_SECRET` leak) and a data-loss scenario that exercises
> `backup-recovery.md`. Record the date and the actions in §8.
> **Trade-off:** 90 minutes of several people's time, twice a year. The
> alternative is that the first time anyone runs the Article 33 procedure is
> during a real breach, against a clock.

---

## 8. Breach register

Article 33(5) requires a record of **every** personal data breach, including
those not notified to the ICO. This is that record. An empty register is
correct; an absent one is a finding.

| Date aware | Severity | Data types | Subjects (u16) | Notified ICO? | Reasoning | Actions |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | No incidents recorded. |

Tabletop exercises are logged here too, marked as exercises, so the register
also evidences that the plan is tested.

---

## 9. Open decisions, collected

1. Name the four remaining roles in §1 and a deputy for each, with out-of-hours
   contact. **The DPO is settled — Tianna Johnson** — but her contact details
   and out-of-hours route are still outstanding.
2. **Enable Logpush before the pilot** (§2). Confirmed off: it needs
   `"logpush": true` in both Worker configs *and* an account-level job. Adds a
   processor — see `ropa.md` §3.
3. Confirm whether Cloudflare WAF rate-limiting rules exist at the edge (§2) —
   still genuinely unknown, unlike Logpush.
4. ~~Add `member_exported` and `member_updated` to the audit taxonomy before the
   pilot~~ — **CLOSED 8 November 2026**, together with `submissions_exported`
   and `donor_register_exported` for the forms and Gift Aid exports, which had
   the same defect (§2). All three bulk-export paths now leave a trail; none
   records field values, member ids or donor details.
5. Confirm the DPO is reachable at a weekend, since the 72-hour clock does not
   pause (§4). *The question of who decides is settled: the DPO decides, and the
   Incident Lead cannot override.*
6. Set the tabletop schedule (§7).
7. Decide whether `member_roles.end_date` should be enforced, or dropped.
   **Recommended: enforced** — add `or(isNull(endDate), gte(endDate, today))` to
   `selectRoleGrants`, so a time-limited grant means what an administrator
   reading the field would assume. **Trade-off:** any grant already carrying a
   past `end_date` alongside `is_active = true` would stop working the moment
   this ships, so the change needs a query to find those rows first. The
   alternative — dropping the column — removes the trap but also removes the
   ability to grant temporary authority, which the §7 scenario shows the church
   genuinely needs.

Items 2 and 4 are prerequisites for the §7 tabletop producing a useful answer
rather than just demonstrating that it cannot. They are also the two that
determine whether an Article 33 notification can state the scope of a breach or
has to admit it is unknown.
