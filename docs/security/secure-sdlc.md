# Secure development lifecycle and threat model

**Status:** first draft, 2026-11-08. The lifecycle in §1–§3 describes what
actually happens, including the parts that are not controls. The threat model in
§4–§6 is grounded in the vulnerability classes a real pre-release review found
in this codebase, not in a generic catalogue.

`requirements/software_spec.md:411` already commits the church to periodic
audits against industry benchmarks, so this document discharges an existing
requirement rather than inventing a new one.

---

## 1. The lifecycle as it operates

### Branch protection — the one control that is genuinely enforced

| | `staging` | `main` |
|---|---|---|
| Pull request required | yes | yes |
| Approving reviews | 1 | 1 |
| Code-owner review | — | **required** |
| Last-push approval | — | **required** |
| Stale reviews dismissed on new commits | — | **yes** |
| Conversation resolution required | — | **yes** |
| Applies to administrators | — | **yes** |
| Force-push | allowed | **blocked** |
| Branch deletion | allowed | **blocked** |
| Required status checks | "Build, lint, typecheck, test" + "Cloudflare Pages build" | same |

That `main` applies to administrators matters more than any other row: it is the
difference between a policy and a control. Force-push being blocked is also what
makes the rollback path in `incident-response.md` §5 trustworthy — the
known-good commit is still there.

### CI — the four-command gate

`.github/workflows/ci.yml` runs on every pull request and on push to `main`, and
is called by both deploy workflows so the gate cannot be skipped by deploying.
Two jobs:

- **`check`** — `npx turbo build`, then `npx turbo lint typecheck --continue`,
  then `npx turbo test --continue --concurrency=1`. The sequencing is
  deliberate and documented in the workflow: build first because the web
  typecheck reads `.next/types` while `next build` is still rewriting it;
  `--continue` so every failing task is reported in one run rather than turbo
  cancelling at the first; one test suite at a time because the web, mobile and
  API suites each spawn workers and starve each other into meaningless timeouts
  on a 2–4 core runner.
- **`pages`** — reproduces the Cloudflare Pages build via
  `npm run pages:build`, because `next build` passing does not mean Pages will
  accept the app: `next-on-pages` rejects any dynamic route not on the edge
  runtime, and that otherwise fails only at deploy time.

The locally equivalent gate, which is the standing rule before declaring work
done, is `npx turbo build test lint typecheck` — all four, not per-package
scripts.

### Deployment

**Staging** deploys on every push to `staging`: CI, then `db:bootstrap --dry-run`,
then `db:bootstrap`, then `wrangler deploy --env staging`. Mobile builds are
queued only if the push touched `apps/mobile/`, `packages/{ui-native,api-client,types,core,utils}/`
or `package-lock.json`.

**Production** is `workflow_dispatch` only, guarded to `main` by an explicit
`GITHUB_REF` check (`deploy-production.yml:21-29`), and the `deploy` job runs
under the `production` GitHub Environment, which requires a reviewer before it
starts. Order is migration → Worker → web, so the web never runs ahead of the
API. The Pages deploy is triggered by hook and then **polled to completion**, so
a failed web build fails the run instead of passing silently.

`concurrency: cancel-in-progress: false` on both deploys, with the comment
"Never cancel a deploy half way through a migration; queue the next one." That
is the right call and worth preserving.

### What is not a control

Said plainly, because a document that implies otherwise is worse than useless:

- **No dependency scanning.** No Dependabot config, no `npm audit` step, no SCA
  in CI. Nothing tells anyone about a known CVE in a transitive dependency.
- **No secret scanning in CI.** GitHub's push protection may be on at the
  account level — that cannot be determined from the repo — but nothing in the
  pipeline fails a build for a committed credential.
- **No SAST.** Lint is ESLint for code style and correctness, not a security
  analyser. There is no CodeQL or Semgrep.
- **No container or artefact scanning.**
- **A branch named `ci/security-gates` exists and is at or behind the current
  HEAD with no unique commits.** The name suggests this gap was identified; the
  work has not landed.
- **No penetration test** has been performed, and before this document set there
  was no `SECURITY.md`, no threat model and no incident runbook in the
  repository.

> **~~DECISION NEEDED: which automated security gates to add, and in what
> order.~~ MOSTLY CLOSED 8 November 2026.** Shipped: **Dependabot** with grouped
> updates; **CodeQL** — not the default setup but the `security-extended` suite,
> on every pull request, on every push to `main` and `staging`, and weekly on a
> schedule (the schedule matters because CodeQL ships new queries continuously,
> so an unchanged codebase can still acquire findings); and an **npm audit**
> gate failing on high or critical.
>
> **The noise trade-off this marker predicted turned out to be real, and the
> mitigation is configuration rather than discipline.** CodeQL's first
> `security-extended` run produced seven results. Three were genuine and are
> fixed — a stored XSS reachable by naming a fellowship, an open redirect after
> sign-in, and a duplicate of the first. One was a CSS selector in a test file.
> Rather than dismiss that by hand every week, `.github/codeql/codeql-config.yml`
> excludes test files, generated output and the e2e drivers, with the trade
> stated in the file: a real flaw in a test helper is now invisible to CodeQL,
> which is acceptable because test code does not ship.
>
> **CodeQL is deliberately NOT a required check yet.** A first scan on a
> never-scanned codebase produces a backlog, and promoting it to required before
> that backlog is cleared is how a gate gets bypassed by habit. It is promoted
> once a scan comes back clean. The npm-audit gate is the opposite case —
> verified green and firing only on *new* high or critical advisories — so that
> one should be made required immediately; required is what gives it teeth.
>
> **Still open from this list:** GitHub secret scanning with push protection
> (repository setting, not yet confirmed enabled), and a lint rule banning
> `sql.raw` outside a small allowlist (§4.7).

### The accepted criticals

**"The npm audit gate is green" needs one qualification, because on its own the
sentence is misleading.** The gate is green *against a baseline*, and that
baseline — `.github/npm-audit-baseline.json`, generated 8 November 2026 — holds
**124 accepted advisories, of which 5 are critical**. It exists so CI can fire
on a *new* advisory rather than on the standing backlog of a monorepo this size,
which is the right design. But a register that records "Next.js: Unauthenticated
Remote Code Execution, accepted" with no rationale beside it is a finding in its
own right, and an auditor reading it should escalate.

So here is the rationale, checked rather than assumed. **All five are
unreachable in this deployment, and none of the reasoning depends on the
advisory being wrong.**

| Advisory | Package | Why it does not reach production here |
|---|---|---|
| `GHSA-2464-fhr4-w9xw` (SVG) | `next` | Both are in the **Image Optimization API**, i.e. `/_next/image`. That endpoint **does not exist in this deployment**: `curl` returns **404 on both `kairos.kharis.org` and `staging.kairos.kharis.org`**. `@cloudflare/next-on-pages` does not ship the Next.js image optimizer, and `next/image` is imported **zero times** anywhere in `apps/web`. There is no code path to reach. |
| `GHSA-2xp9-vwfh-vxw4` (AVIF) | `next` | As above — same endpoint, same 404. |
| `GHSA-p293-qw3h-jr36` | `next` | **Windows-hosted servers only.** The API runs on Cloudflare Workers and the web app on Cloudflare Pages; there is no Windows host anywhere in the stack. |
| `GHSA-5gmw-xhrv-c9v3`, `GHSA-85c8-ppgw-ccpr` | `tinypool` | Reached only via `vitest` — the test runner. It is a dev dependency and appears in no deployed bundle. Exploiting it requires already being able to run the test suite, which means already having the repository. |
| `GHSA-pqg4-j6r4-53mv` | `shell-quote` | Reached via `drizzle-kit → gel` (a local CLI) and `react-native → react-devtools-core` (dev only). Neither ships. |

**Two things follow, and neither is "do nothing".**

**The Next.js advisories should still be patched**, because unreachable is a
property of today's configuration, not a property of the dependency. The moment
someone adds a `next/image` tag, two unauthenticated RCEs become live and
nothing in CI will say so — the gate is already green on them. The fixes are
`15.5.24` for the AVIF and Windows advisories and **above `15.5.27`** for the
SVG one; `15.5.22` is installed.

**That upgrade is not free, and the reason is worth recording.**
`@cloudflare/next-on-pages@1.13.16` declares a peer range of
`>=14.3.0 && <=15.5.2`, so the installed `15.5.22` **already violates it** and
`npm ls` reports `invalid`. Moving further from the supported range to fix an
unreachable vulnerability, days before a pilot, trades a real deployment risk
for a theoretical one. **Recommended: schedule the Next.js upgrade together
with a `next-on-pages` version that supports it, after the pilot is stable, and
treat "nobody adds `next/image` before then" as the compensating control** —
which is weak, because it depends on a person remembering. A lint rule banning
`next/image` imports would make it an enforced control instead, and belongs with
the `sql.raw` rule above.

> **DECISION NEEDED: when the Next.js upgrade happens, and whether to enforce the
> `next/image` ban in the meantime.**
> **Recommended:** add the lint rule now (cheap, and it makes the compensating
> control real), and schedule the framework upgrade for after the pilot
> stabilises, paired with a `next-on-pages` release that supports the target
> version.
> **Trade-off:** the lint rule forbids a standard Next.js feature, which will
> surprise whoever next wants an optimised image. The rule's message should say
> why and point here. Deferring the upgrade means the repository carries three
> accepted critical advisories for longer, which has to be explained every time
> somebody reads the register.

### The agent workflow, treated as part of the lifecycle

Much of this codebase is written by coding agents under the conventions in
`AGENTS.md` and `CLAUDE.md`, with module agents orchestrating layer agents
(`schema-author → api-implementer → web-implementer → test-author → reviewer`).
Treating that as a security-relevant fact rather than an implementation detail:

**What it adds.** The conventions files are a written, enforced-by-review record
of the invariants that matter — `/api/*` not `/v1/*`, capabilities not role
names, `enforceBranchScope`, the one `matchesCapability` matcher, branch
isolation on every non-admin query. The `reviewer` agent audits a diff against
exactly those invariants. In practice this is a more consistent checklist than
most human review applies, and the "things commonly gotten wrong" sections of
each `CLAUDE.md` are a living record of real regressions.

**What it does not change.** A human still approves every PR, and `main`
requires a code owner. The agent workflow is not a substitute for review and
must not be described as one in an audit response.

**What it makes worse.** Three things, specifically:

1. **Plausible code passes review more easily than wrong-looking code.** The
   `requireRole('admin', 'pastor', 'leader', 'member')` gate that guarded
   `/api/reports/*` and passed for every authenticated caller is the canonical
   example — it reads exactly like a gate. `apps/api/CLAUDE.md` records the
   lesson in one line worth keeping: *"A gate that reads as a gate and is not
   will eventually be trusted."*
2. **Parallel agents share a git index.** `git add <paths>` is not enough in a
   shared tree, because `git commit` commits the whole index. Committing with an
   explicit pathspec, or checking `git diff --cached` first, is a required
   habit — an accidental commit of another agent's in-flight work is how an
   unreviewed change reaches a PR.
3. **Stale conventions become vulnerabilities.** The documentation drift found
   while writing these documents is not cosmetic. `docs/architecture-overview.md`
   still says auth is "bcrypt + jsonwebtoken" when it has been argon2id and
   `jose` since PR 2/PR 3 (commits `c46ac69`, `8b6256e`). Four code comments
   still reason about bcrypt — and one of them,
   `apps/api/src/auth/service.ts:498` ("Sequential hash compares are fine:
   bcrypt is fast enough at O(hundreds)"), carries performance reasoning that is
   now **actively wrong and actively harmful**: those compares are now 19 MiB
   argon2id, on an unauthenticated endpoint, with no rate limiting. A stale
   comment masked a denial-of-service vector. That is a security finding caused
   by documentation drift.

> **DECISION NEEDED: whether the `reviewer` agent's invariant list should be extended with an explicit security pass.**
> **Recommended: yes**, and specifically with the seven classes in §4 as named
> checks, because each one is a class this codebase has actually shipped.
> **Trade-off:** a longer checklist dilutes attention. Capping it at the classes
> with real history here, rather than importing OWASP wholesale, is what keeps
> it usable.

---

## 2. Testing as a security control

Vitest throughout, tests co-located, failing test first for behaviour changes.
`apps/api/CLAUDE.md` requires backend tests to cover, per module: happy path,
validation, **authorization**, **branch isolation**, and soft-delete behaviour.

The authorization and branch-isolation requirements are the security-relevant
ones, and they are the right two: cross-branch data access is this system's
most likely access-control failure, because every non-admin query must filter
by the caller's branch context and the filter is written by hand in each
service.

The pattern to generalise is commit `c8c2922f` — *"never offer a destination
the page will refuse, **and add a test that catches the next one**"*. A fix plus
a regression test for the class, not just the instance.

Gaps: `zValidator` covers 18 of 20 routers. The two without it are
`apps/api/src/analytics/router.ts` and `apps/api/src/reports/router.ts` — both
read-only, so the exposure is unvalidated query parameters reaching service
code rather than unvalidated writes. Worth closing anyway, and `reports` is
notable because it is the module whose gate was historically broken.

---

## 3. Change control for data

Two rules that are security controls even though they read as operational ones:

- **Migrations run only through `db:bootstrap`**, never raw `psql` or
  `drizzle-kit migrate`, in every environment including local. The reason is
  silent journal drift, which has bitten three times. Both deploy workflows run
  `--dry-run` first so the pending set is visible in the job log before
  anything changes. See `backup-recovery.md` §3 for why this constrains
  recovery.

  One loose end, now characterised precisely: `apps/api/entrypoint.sh:19` runs
  `drizzle-kit migrate`, the only surviving non-bootstrap migration path. It is
  **latent, not live** — the script is referenced only by `apps/api/Dockerfile`
  (`ENTRYPOINT ["./entrypoint.sh"]`), and **nothing in `.github/workflows/`
  builds that image**; both deploy workflows run `db:bootstrap`. So it cannot
  fire in CI or on Cloudflare. It fires if anyone runs the container — which is
  exactly the container-based recovery scenario in `backup-recovery.md` §4, and
  it is now known to be actively unsafe there because of the journal defect
  recorded in that document. Worth deleting the two lines rather than leaving a
  trap.
- **Soft delete by default.** `isActive` rather than `DELETE`. Across the whole
  API there are seven `db.delete(...)` call sites, all per-row and
  user-initiated. This is good for recoverability and is also why
  `data-retention.md` exists: nothing ever actually goes away.

---

## 4. Threat model

### Assets, in order of what their loss costs

1. **Children's safeguarding and health data** — `member_health_records`
   (medical conditions, allergies, medications, dietary needs, free-text
   notes), `member_guardians`, `member_followups` rows flagged
   `safeguarding_concern` or `welfare_concern`, and the `members` rows of
   under-16s. Loss is unrecoverable: it is a safeguarding failure, a reportable
   breach, and the end of the congregation's trust. Threshold is **16**
   (`packages/types/src/minor.ts:10`), not 18.
2. **The authentication system** — `JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `OAUTH_SIGNING_KEY`, `members.password_hash`, and the grant resolution in
   `apps/api/src/lib/grants.ts`. Compromise yields everything in 1, 3 and 4 at
   once.
3. **Member PII** — names, dates of birth, home addresses, phone numbers,
   emergency contacts, profile photos, and the `souls` table's PII of people who
   are not members and have no account.
4. **Gift Aid financial records** — `gift_aid_declarations`. The church repays
   reclaimed tax, with interest, if it cannot produce a declaration a claim
   rested on. These are the only records in the system with a direct financial
   loss attached.

### Actors

| Actor | Has | Wants | Realistic worst case |
|---|---|---|---|
| **Ordinary member** | A valid session, their own data, the member directory | Curiosity about other members; occasionally a safeguarding-relevant motive toward a specific child | Reads data they should not: another branch's directory, a child's record, aggregate counts they cannot act on |
| **Branch administrator** | `branch:read`/`branch:write` over one branch, CSV export | Legitimate work, almost always | **Bulk exfiltration of the member directory with no audit trace**, or lateral reach into another branch |
| **Leader (fellowship / department / safeguarding)** | Narrow scoped grants | Legitimate work | Scope confusion — seeing members of a group they no longer lead, or safeguarding data their role does not carry |
| **External unauthenticated attacker** | The public internet | Credentials, then data; or disruption | Credential stuffing (unlimited), CPU exhaustion on unauthenticated endpoints, exploiting a missing authorisation check |
| **Compromised CI or vendor** | A leaked token | Varies | `CLOUDFLARE_API_TOKEN` is arbitrary Worker code with the database binding; `DATABASE_URL` bypasses all application RBAC |
| **Well-meaning insider** | Whatever they were granted | To get the job done | The §7 tabletop in `incident-response.md`: a temporary grant nobody revoked, used in good faith |

The last row is not filler. For a church system it is the **most likely** real
incident, and it is the one the controls are weakest against.

### The vulnerability classes, as worked examples

These are not hypotheticals. Each is a class this codebase has actually shipped
and that a recent review found, which makes them the right test of whether the
lifecycle works. The fixes live on a branch that is **not yet merged to `main`
or `staging`**, so for the purposes of describing current production posture,
assume each is still open.

#### 4.1 Privilege escalation via mass assignment

*"never take `systemRole` or an unvalidated branch from input"* (`616bf37f`).
A client-supplied `systemRole` or `branchId` trusted on a write. The highest
severity class here, because `matchesCapability` returns `true`
unconditionally for `systemRole === 'admin'` (`packages/types/src/rbac.ts:183`)
— one accepted field is total compromise.

**What the lifecycle must catch:** any write path where a request field names an
authority or a scope. The structural fix is that `schemas.ts` is the whole
surface — if a field is not in the Zod schema it cannot arrive — so the review
question is "does this create schema include anything the caller should not be
able to choose".

#### 4.2 Incomplete gate coverage across multiple entry points

*"refuse sign-in for deactivated members on **every door**"* (`3e7b816a`). A
deactivated member could still sign in through at least one of the several auth
paths: password, Google, Microsoft, Apple, biometric. The same shape appears in
`7577d8dc`, which had to *"require an approved member throughout the OAuth
server"*.

**The lesson is in the phrasing:** multi-provider auth multiplies the number of
places a single check must exist, and adding a provider does not prompt anyone
to re-audit the others. **What the lifecycle must catch:** any new
authentication entry point must enumerate the checks the existing ones perform.
A shared `assertMemberMayAuthenticate(member)` helper called by every door
would turn this from a review question into a compile-time one.

#### 4.3 Broken access control and excessive data exposure

The largest cluster, and the one most specific to this system's shape:

- the member directory ungated by any pastoral capability (`fa4c88db`),
- whole member rows served where a projection was needed — fixed by
  *"least-privilege field projection"* (`b77fca9a`, `8137ce5e`),
- the safeguarding surface conflated with the directory surface (`4cb6f2fe`),
- **the safeguarding bypass not scoped to the subject's own branch**
  (`23093ec0`) — a cross-branch read of children's data, the worst outcome in
  this document's asset list,
- minors not redacted in the CSV export (`f005ef26`),
- aggregate counts and cohort lists returned to members who cannot act on them
  (`31b781e8`) — exposure through aggregates, which review reliably misses
  because no individual record is returned.

**What the lifecycle must catch:** every read path needs the same scrutiny as
every write path. The branch-isolation test requirement in
`apps/api/CLAUDE.md` is the right control; the failures above are cases where it
was not applied, or where the "subject's branch versus viewer's branch"
distinction was got wrong. Note that `hasSafeguardingAccess`
(`apps/api/src/members/service.ts:1086-1106`) correctly scopes to the
*subject's* branch — that asymmetry is easy to invert and a named review check
is cheaper than finding it again.

#### 4.4 Client/server gate divergence

*"gate the directory screen and its nav row together"* (`7b7ac543`);
*"never offer a destination the page will refuse"* (`c8c2922f`). The UI offered
something the API would refuse — or, worse, would not.

This class is *structurally* well-defended here and that is worth stating:
`matchesCapability` in `packages/types/src/rbac.ts:177` is genuinely the single
matcher, and the API (`lib/grants.ts:170`), web
(`hooks/use-capabilities.ts:60`) and mobile (`lib/capabilities.ts:57`) each
delegate to it with exactly one call and no reimplementation. It was hand-copied
into three places until the church scope arrived and added a rule all three
would have had to learn separately. **Do not reintroduce a copy** — that is the
single most important invariant in this codebase's security design.

What divergence remains is not about the matcher but about *which* capability a
surface checks, and whether it checks one at all.

#### 4.5 Secret and token leakage in responses

*"stop returning the reset token when the mailer is live"* (`4490db6f`) —
`apps/api/src/auth/service.ts:550` returns the plaintext password-reset token
from `forgotPassword`, with the comment "Return plain token for local dev easy
testing — omit in production". The same shape at `:323` returns
`verificationToken` when the mailer is not live.

**What the lifecycle must catch:** any dev-convenience branch in a response
path. This is the same root cause as the fail-open secrets in
`key-management.md` §1 — a local-development affordance with no enforced
boundary between dev and production. The class-level fix is the same:
**no behaviour may differ between dev and production except by an explicit,
centrally-read environment flag that fails safe.**

#### 4.6 Unauthenticated-surface hardening, absent

Not from the review — from reading the code. Three controls are simply not
present anywhere:

- **No rate limiting.** Confirmed by grep across the monorepo and
  `wrangler.jsonc`: no middleware, no Cloudflare rule in config, no Turnstile.
  So `POST /api/auth/login` allows unlimited password guessing, and
  `POST /api/auth/forgot-password` unlimited email sending at the church's SES
  cost and reputation. **And the verify-email and reset paths fetch all
  candidate rows and compare sequentially** (`auth/service.ts:473-498`,
  `:557-572`) — each compare now a 19 MiB, 2-iteration argon2id. That is a
  cheap, unauthenticated CPU-exhaustion vector, and the stale bcrypt comment at
  `:498` is what hid it.
- **No security headers.** No CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy or Permissions-Policy anywhere.
  `apps/web/public/_headers` exists but sets only `Content-Type:
  application/json` on the two app-association files. The absence of
  `Referrer-Policy` compounds the profile-photo exposure in §4.8.
- **CORS is hardcoded to localhost** (`apps/api/src/app.ts:36-43`): any
  `http://localhost:<port>` origin is reflected, everything else gets the
  literal `http://localhost:3002`, with `credentials: true`. This is inert today
  *only* because production is same-origin path-based routing, so no preflight
  occurs. It is a latent misconfiguration with a tripwire: origin reflection
  plus `credentials: true` becomes a real cross-origin credential leak the
  moment any surface moves off-origin — a separate mobile web host, a partner
  embed, a new subdomain.

The unauthenticated surface to enumerate when assessing any of this:
`/health`, `/api/public/branches`, the public Gift Aid declaration form (mounted
before the consent gate by design, because its users have no account), and the
whole of `/api/auth/*`.

`_headers` already exists, which makes the second item the cheapest high-value
fix available.

#### 4.7 Injection — the one pattern worth a rule

No injectable SQL surface was found. Drizzle parameterises every `sql` template
placeholder, and all ten `sql.raw` sites interpolate a number via `String(n)`.
Nine of those are module-level integer constants and are not attacker-reachable.

**One is request-derived**, and it is the worked example:

```ts
// apps/api/src/departments/service.ts:1161
const endDate = sql<string>`(CURRENT_DATE + INTERVAL '${sql.raw(String(probationDays))} days')::date`;
```

It is **not exploitable**, on three independent grounds: the value is a
TypeScript `number`, so `String()` cannot produce a quote; the write path is
Zod-constrained to `int().min(1).max(365)`
(`apps/api/src/departments/schemas.ts:69`); and there is a redundant runtime
guard at `service.ts:1086`.

It is worth documenting precisely *because* it is safe-by-accident-of-three-things.
It is the only `sql.raw` whose argument originates in a request, and it breaks
the moment the column type widens to `string` or a future caller skips the
schema. The correct form is one line away and already used elsewhere —
`apps/api/src/membership/service.ts:414` binds the interval as a parameter
rather than raw. **A lint rule banning `sql.raw` outside a small allowlist
closes this class permanently**, which is a better outcome than three
independent coincidences.

#### 4.8 Design-level exposures that are not bugs

These were decided deliberately and should be re-decided rather than fixed
quietly.

- **`requireSignedURLs: false`** (`apps/api/src/media/service.ts:41`). Every
  profile photo is served from `imagedelivery.net/{accountHash}/{imageId}/public`
  with no authentication and no expiry. The image id is a Cloudflare-generated
  UUID, so URLs are not enumerable — but any leak is permanent, there is no
  revocation, and **there is no delete call anywhere in the codebase**. These
  are member photos including under-16s. The 30-minute expiry at `:37` applies
  to the *upload* URL only and is easy to misread as protecting the image.
  Pair this with the missing `Referrer-Policy`.
- **Stateless refresh tokens with a 365-day TTL** (`lib/auth-secrets.ts:24`).
  The justification at `:11-23` is genuine — consumer-app norms, and the mobile
  app seals the token behind the OS keychain's biometric requirement, so an
  attacker needs the phone *and* the enrolled biometric. But there is **no
  server-side store, no rotation, no reuse detection and no revocation list**,
  so a stolen refresh token is valid for a year against any active member and
  you cannot tell whether it was used. Deactivating the member is the only
  containment, and it works within 15 minutes.
  The instructive contrast is inside this same repository: the OAuth2 server
  has rotating refresh tokens *with* reuse detection, idle (30d) and absolute
  (90d) bounds, and an `oauth_token_reuse` audit action. **The first-party
  session path does not meet the standard the same codebase set for third
  parties.**
- **Tokens in browser storage.** The web app persists `accessToken` and
  `refreshToken` via Zustand `persist` (`apps/web/src/lib/auth-store.ts:45`),
  i.e. `localStorage`. That makes any XSS a full session theft — which is what
  makes the missing CSP in §4.6 more than a checklist item. Note also that the
  privacy notice tells members Kairos "uses a single first-party cookie to keep
  you signed in", which is not what happens.
- **The audit log cannot answer a data-access question.** No
  `member_updated`, no `member_viewed`, no `member_exported`; the CSV export
  routes write no audit row. This is a design gap, not a bug, and it is the one
  that makes a branch administrator the most dangerous actor in the table above:
  they can export the full directory and leave no trace in the security log.

### What is genuinely good, and should be generalised

An honest threat model says what works, both because it is true and because
these are the patterns to copy:

- **argon2id at OWASP-2025 minimums** (m=19456, t=2, p=1, 32-byte output,
  16-byte salt; `packages/utils/src/password.ts:9-13`), pure-JS for Workers,
  constant-time comparison, PHC-string storage, and per-hash parameter agility
  so stronger legacy hashes still verify. **No bcrypt exists anywhere** — only
  four stale comments claiming otherwise.
- **One capability matcher**, delegated to by all three clients, with correct
  asymmetric church-scope containment: a church grant reaches everything, and
  *no* branch grant ever satisfies a church check, because the church is not
  inside a branch (`rbac.ts:198-202`).
- **Grants re-resolved from the database on every request**
  (`apps/api/src/middleware/auth.ts:64`), so the token's copy is never trusted
  for enforcement and a revocation takes effect on the next API call. There is
  no cached-permission window. This is the single best containment property the
  system has.
- **The OAuth2/OIDC server**: PKCE-only, ES256, public JWKS, rotating refresh
  tokens with reuse detection, 60-second authorization codes, client-secret
  rotation with a 24-hour overlap. This is the security design baseline the rest
  of the system should be held to.
- **`keys.ts` fails closed on purpose, with the reasoning written down.**
- **Audit writes are awaited** so a Worker cannot drop them (`c0ef727e`) — a
  fix for a security control that was failing silently, which is the hardest
  kind to notice.

---

## 5. Required review checks

Distilled from §4. These are the questions a reviewer — human or agent — should
be able to answer "yes" to, and each exists because this codebase got it wrong
once.

1. Does any write schema accept a field naming an authority (`systemRole`, a
   role, a capability) or a scope (`branchId`, `scopeId`) that the caller
   should not choose? (§4.1)
2. If this adds an authentication entry point, does it perform every check the
   existing doors perform — active, approved, not a minor? (§4.2)
3. Does every new read path filter by the caller's branch context, and where
   safeguarding is involved, by the **subject's** branch rather than the
   viewer's? (§4.3)
4. Do aggregates and counts respect the same scope as the records behind them?
   (§4.3)
5. Does any response include a token, hash or secret on a dev-convenience
   branch? (§4.5)
6. Does any new `sql.raw` exist at all, and if so is its argument a
   module-level constant? (§4.7)
7. **If this adds a JWT claim, is it minted in both `login` and `refresh`?**
   The standing comment at `apps/api/src/auth/service.ts:454-461` records what
   happened last time: a refreshed token with an empty `grants` array stripped
   every capability-gated button the moment the first refresh landed, and
   logging out and back in "fixed" it because only the login path filled it in.
8. Does a new dynamic `[id]` route set `runtime = 'edge'`? Turbo passes without
   it; the Pages build fails.
9. Does any new table hold personal data, and if so is it in
   `data-retention.md` §2 with a period? (Nothing currently enforces retention,
   so the control is that the table is at least *listed*.)

---

## 6. Open decisions, collected

1. Which automated security gates to add, and in what order — recommended
   Dependabot, secret scanning, CodeQL, then a `sql.raw` lint rule (§1).
2. Whether the `reviewer` agent's invariant list gains the §5 checks (§1).
3. Whether the first-party session path adopts the OAuth server's refresh-token
   discipline — server-side store, rotation, reuse detection (§4.8).
   **Recommended: yes, before the 365-day TTL meets real congregational data.**
   **Trade-off:** it means a refresh-token table and a write on every refresh,
   which the stateless design deliberately avoided; the `oauth_refresh_tokens`
   schema is already a working model to copy.
4. Whether `requireSignedURLs` becomes `true`, with signed-URL minting on read
   (§4.8). **Recommended: yes for a system holding children's photos.**
   **Trade-off:** existing images were uploaded with the flag false and would
   need a re-flagging pass alongside `apps/api/scripts/backfill-media-to-cf.ts`;
   and every photo render becomes an authenticated mint rather than a plain URL.
5. Whether to add rate limiting, and at which layer (§4.6).
   **Recommended: Cloudflare WAF rate-limiting rules at the edge** rather than
   Hono middleware, because the edge stops the request before it costs Worker
   CPU — which is the whole point against the argon2id amplification vector.
   **Trade-off:** edge rules are dashboard configuration, invisible to the repo
   and to CI, so they need recording here to be auditable.
6. Whether `_headers` gains a CSP, HSTS and Referrer-Policy (§4.6).
   **Recommended: yes — the file already exists**, and `Referrer-Policy:
   strict-origin-when-cross-origin` alone materially reduces the profile-photo
   leak surface. **Trade-off:** a CSP tight enough to be useful will break
   something on first deploy; ship it report-only first.
7. Fix the stale documentation identified in §1 — `architecture-overview.md`'s
   bcrypt claim and the four bcrypt comments, one of which masks §4.6's
   finding.

Items 5 and 6 are the two cheapest, and item 5 closes the largest single gap in
the model.
