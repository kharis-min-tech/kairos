# Key management

**Status:** first draft, 2026-11-08. The inventory below was built by reading
every `c.env` / `process.env` access in `apps/api`, every `secrets.*` reference
in `.github/workflows/`, and `apps/mobile/app.config.ts` + `eas.json`. It is not
copied from the comment block in `wrangler.jsonc` — though that block turned out
to be accurate, with one exception noted in §6.

Two structural facts shape everything here:

1. **No Worker secret is ever set by CI.** Both deploy workflows run
   `wrangler deploy` with a `CLOUDFLARE_API_TOKEN` from a GitHub Environment,
   but every `wrangler secret put` is a manual operator action. There is no
   inventory of what is actually bound, and no drift check. The list in §2 is
   what the code *reads*; whether each is *set* can only be confirmed with
   `wrangler secret list`.
2. **There is no single `Env` type.** `apps/api/src/worker.ts:19-52` declares
   `interface Env`, but handlers read through four near-identical `readEnv(c, key)`
   helpers (`lib/auth-secrets.ts:26`, `auth/oauth/env.ts:39`,
   `oauth-server/config.ts:15`, and an inline one in `attendance/router.ts:60`),
   each falling back to `process.env`. Four secrets are therefore live but absent
   from `interface Env`: `SELF_CHECK_IN_QR_SECRET`, `OAUTH_SIGNING_KEY`,
   `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`. Adding a secret to the interface is
   not what makes it work, so the interface is not a reliable inventory either.

---

## 1. The failure-mode problem, first

Before the inventory, the thing an auditor should be told without having to ask.

Kairos has three different behaviours when a secret is missing, and the
codebase states the correct principle in its own words. `apps/api/src/oauth-server/keys.ts:21`:

> That is the safe failure: nothing silently signs with a well-known key.

**Three secrets violated that principle, and two of them were the session keys.
All three were closed on 8 November 2026** — the table records both states,
because an auditor reading this needs to know what was wrong as well as what is
now true.

| Secret | Behaviour when unbound | Verdict |
|---|---|---|
| `OAUTH_SIGNING_KEY` | `keys.ts:65` generates a per-process ephemeral ES256 keypair. Tokens signed in one isolate do not verify in the next, so the failure is loud and self-limiting. | **Correct.** This is the model. |
| `CF_IMAGES_TOKEN` (+ account id/hash) | `media/router.ts:65-70` returns 503 `MEDIA_NOT_CONFIGURED`. | **Correct — fails closed.** |
| OAuth provider secrets (`GOOGLE_*`, `MICROSOFT_*`, `APPLE_*`) | That provider's `/start` returns 501. | **Correct — fails closed.** |
| `JWT_SECRET` | **Was:** `lib/auth-secrets.ts:43` substituted a hardcoded string literal committed to this repository, with no environment check. **Now:** `requireSecret` throws. | **Fixed — fails closed.** |
| `JWT_REFRESH_SECRET` | **Was:** `lib/auth-secrets.ts:44`, same. **Now:** `requireSecret` throws. | **Fixed — fails closed.** |
| `SELF_CHECK_IN_QR_SECRET` | **Was:** `attendance/router.ts:72` substituted a hardcoded literal. The library layer *did* refuse an empty secret (`self-check-in-qr.ts:67`), but the router never passed empty — it passed the literal, so that guard was unreachable. The comment claimed "Worker deploys will emit a warning if it's missing"; nothing implemented such a warning. **Now:** `requireSecret` throws, and the stale comment is gone. | **Fixed — fails closed.** |

The consequence of the first two was not subtle: a production Worker deployed
with `JWT_SECRET` unbound or misspelled would sign and verify real session
tokens with a key that is public to anyone who can read the repository. Because
`signAccessToken` (`apps/api/src/auth/service.ts:89-96`) serialises the whole
`AuthContext` into the payload, and because `matchesCapability`
(`packages/types/src/rbac.ts:183`) returns `true` unconditionally for
`systemRole === 'admin'`, a forged token was a full administrative compromise of
every branch.

### How it was closed, and why not the way this document first recommended

`apps/api/src/lib/secret-env.ts` now owns secret resolution for all three.
`requireSecret(c, key, devDefault)` returns the environment value if present,
returns `devDefault` **only** where it can positively prove the process is not
deployed, and otherwise throws. Every caller is per-request, so the failure is a
500 on that request rather than a Worker that will not boot.

This document originally recommended adding an explicit non-secret
`ENVIRONMENT` var to `wrangler.jsonc` as the detection signal, and rejected
implicit detection on the grounds that "an implicit signal is how this class of
bug happens in the first place". **That recommendation was not followed, and the
reasoning that rejected implicit detection is the reason why.**

An `ENVIRONMENT` var is a value that must be *present and correct* for the check
to be strict. Forget it in a new environment and the code reads "not
production" — so the var that exists to make the system fail closed is itself a
thing that fails open when forgotten. The detection used instead inverts the
default:

- `isLocalOrTest()` is an **allowlist**. It returns true only for
  `process.env.VITEST` (set by the test runner alone) or `NODE_ENV` of exactly
  `test` or `development`.
- `src/server.ts` — the Node entry, which wrangler never deploys — sets
  `NODE_ENV ??= 'development'` for itself. The declaration lives in the only
  file that can honestly make it.
- A deployed Worker reports neither signal, so it is strict **by default**. If
  the detection logic is ever broken, dropped, or ported to a new runtime, the
  failure direction is a refusal to serve, not a silent public key.

**Trade-off, unchanged and stated plainly to whoever runs the deploy:** a hard
throw turns a silent weakness into a total outage if a signing secret is ever
lost. That is the correct trade for a signing key. All three secrets were
verified bound in both the production and staging Workers before this shipped
(`wrangler secret list`, 8 November 2026), so the change could not take either
environment down on deploy.

`secret-env.test.ts` holds the proof, including the case that actually matters:
the tests strip `VITEST` and set `NODE_ENV=production` to assert the deployed
path throws, because a test written under Vitest without that would pass whether
the fix existed or not.

---

## 2. Inventory — Cloudflare Worker secrets

Set with `wrangler secret put NAME` from `apps/api/`, and
`wrangler secret put --env staging NAME` for staging. Staging and production
hold **different values for every one of these**; `wrangler.jsonc:91` records
that this is deliberate, so a staging token cannot unlock production.

| Secret | What it does | Read at | Rotation |
|---|---|---|---|
| `JWT_SECRET` | HS256 key for access tokens. Also signs the OAuth `state` blob (`auth/oauth/state.ts:68`). | `lib/auth-secrets.ts:43` | 12 months / on compromise. **Rotation logs every user out.** §4 |
| `JWT_REFRESH_SECRET` | HS256 key for refresh tokens. | `lib/auth-secrets.ts:44` | 12 months / on compromise. **Forces a password sign-in for every user**, including biometric users. §4 |
| `OAUTH_SIGNING_KEY` | Private **ES256 JWK, as a JSON string**. Signs the OIDC ID tokens and access tokens Kairos issues as an authorization server; the public half is published at the JWKS endpoint (`oauth-server/keys.ts:70-72`). | `oauth-server/keys.ts:61` | 12 months. **Single-key JWKS — rotation invalidates every token it has issued.** §4 |
| `SELF_CHECK_IN_QR_SECRET` | HMAC-SHA256 key over `` `${serviceId}.${bucket}` `` for the rotating check-in QR. | `attendance/router.ts:63` | 6 months, or immediately on leak. **Invalidates every QR on screen within 60s.** §4 |
| `AWS_ACCESS_KEY_ID` | IAM key for SES `SendEmail`. | `worker.ts:61`, `packages/utils/src/mailer.ts:42` | 90 days (long-lived IAM key — see §5) |
| `AWS_SECRET_ACCESS_KEY` | IAM secret for SES. | `worker.ts:62`, `mailer.ts:43` | 90 days, with `AWS_ACCESS_KEY_ID` |
| `MFA_ENCRYPTION_KEY` | **AES-256 key, 32 bytes base64.** Seals the TOTP secrets in `member_mfa`. Deliberately not in the database, so a database backup on its own yields no working second factors. | `lib/mfa-key.ts:24` | On compromise only. **Rotation invalidates every enrolled factor at once** — nothing records which key a row was sealed with, so every privileged member re-enrols from a backup code or an admin reset. Treat it as a break-glass action, not a routine one. §4 |
| `CF_IMAGES_TOKEN` | Cloudflare API token with `Images:Edit`. Mints direct-upload URLs for profile photos. | `media/router.ts:62` | 12 months |
| `GOOGLE_CLIENT_SECRET` | Google SSO client secret. | `auth/oauth/providers.ts:48` | Provider-driven; no forced expiry |
| `MICROSOFT_CLIENT_SECRET` | Microsoft/Entra client secret. | `auth/oauth/providers.ts:88` | **Forced: Entra caps these at 24 months.** Diarise. |
| `APPLE_PRIVATE_KEY` | The `.p8` ES256 key, full PEM including boundaries. Signs Apple's client-secret JWT on demand. | `auth/oauth/apple-secret.ts:30`, imported at `:55` | On compromise. The *derived* JWT is short-lived (≤6 months) and minted per request, so the key itself has no forced expiry. |

Set as Worker secrets but **not actually secret** — they are identifiers or
public config. Listed so nobody treats their exposure as an incident:

| Name | What it is |
|---|---|
| `CF_IMAGES_ACCOUNT_ID` | Numeric Cloudflare account id; an API path segment (`media/router.ts:56`) |
| `CF_IMAGES_ACCOUNT_HASH` | The **public** delivery hash in every `imagedelivery.net` URL (`media/router.ts:59`) |
| `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID` | Public OAuth client identifiers |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` | Apple Services ID, team id, and the `kid` header of the client-secret JWT |
| `MFA_REQUIRED_FROM` | The date after which a privileged member with no second factor is held at enrolment instead of signed in (`auth/service.ts`, `mfaCutoverPassed`). **Unset means not yet**, and an unparseable value also means not yet and logs loudly — a typo here must not lock the church out of its own system. |
| `MFA_ISSUER` | The name an authenticator app shows next to the code. Defaults to `Kairos`. |
| `EMAIL_FROM` | The From address on transactional mail |
| `FRONTEND_URL` | Base URL for every email deep link, **and the OIDC issuer** (`oauth-server/config.ts:39-41`). Changing it breaks token validation for every OAuth client. |
| `DEFAULT_HOME_BRANCH_ID` | Optional; the branch a new SSO signup is filed under |

## 3. Inventory — everything else

### Non-secret Worker vars (in `wrangler.jsonc`, visible in the repo)

`AWS_REGION` = `eu-west-2` (`:53`, `:115`) and `SES_CONFIGURATION_SET` =
`kairos-transactional` prod / `kairos-staging` staging (`:54`, `:116`). The
`HYPERDRIVE` binding ids (`:21`, `:111`) are also committed — they are resource
identifiers, not credentials, and their exposure is accepted deliberately. Same
for the EAS project id and the App Store Connect `ascAppId` in
`apps/mobile/eas.json:57`.

### GitHub Actions

Only two environments exist: **`staging`** and **`production`**.

| Secret | Scope | Used by | What it does |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Environment (both) | `deploy-staging.yml:33`, `deploy-production.yml:42` | `wrangler deploy`, and polling the Pages deployment API |
| `CLOUDFLARE_ACCOUNT_ID` | Environment (both) | same | Account id in the Pages API path. Not really a secret. |
| `DATABASE_URL` | Environment (both) | same | Postgres DSN. **Runs `db:bootstrap` against the live database.** |
| `PAGES_DEPLOY_HOOK_URL` | Environment (`production` only) | `deploy-production.yml:74` | A bearer-URL: anyone holding it can trigger a production web build |
| `EXPO_TOKEN` | **Repository-level** | `mobile-build.yml:46` | Authenticates `eas-cli build` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Repository **variable** (not a secret) | `ci.yml:26` | Public `pk.` token, correctly stored as a var |

Three things about this worth a policy line:

- **`EXPO_TOKEN` is repository-scoped, not environment-scoped**, because
  `mobile-build.yml`'s job declares no `environment:`. `deploy-staging.yml:94`
  calls it with `secrets: inherit`, and the workflow is also
  `workflow_dispatch`-able. Anyone who can dispatch a workflow can use the
  Expo token. Moving the job under an environment would gate it behind the same
  approval as everything else.
- **The migration credential and the deploy credential live in the same job.**
  `DATABASE_URL` sits in plaintext job env alongside `CLOUDFLARE_API_TOKEN`
  while `db:bootstrap` runs. A compromised action in that job has both.
- **`production` is the only gated environment**, by design: the deploy is
  `workflow_dispatch` only, guarded to `main` at `deploy-production.yml:21-29`,
  and the environment requires a reviewer. Staging deploys on every push.

### Pages (web) and EAS (mobile)

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_MAPBOX_TOKEN` are set in the Cloudflare
Pages project and are compiled into the browser bundle — public by construction.
Mobile reads `EXPO_PUBLIC_API_URL` from `eas.json` per profile, and three
Mapbox names from EAS secrets set out of band: `MAPBOX_PUBLIC_TOKEN` /
`EXPO_PUBLIC_MAPBOX_TOKEN` (public `pk.`) and **`MAPBOX_DOWNLOAD_TOKEN`**, an
`sk.` token that authenticates the native SDK download at build time and is the
only genuinely secret value in the mobile build.

### Operator-supplied at the CLI

`db:seed-admin` requires `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`,
`ADMIN_LAST_NAME` and optionally `ADMIN_REGION_NAME`, `ADMIN_REGION_COUNTRY`,
`ADMIN_BRANCH_NAME`, `ADMIN_RESET_PASSWORD` (`packages/database/src/seed-admin.ts:34-54`).
`ADMIN_PASSWORD` is the bootstrap break-glass credential for the whole system
and is passed on a command line, so it lands in shell history. It should be
supplied from a password manager, used once, and the account's password changed
at first sign-in.

### Governance config that is not documented anywhere

Five `CONSENT_VERSION_*` env vars (`apps/api/src/consent/service.ts:19-24`)
control which version of the terms, privacy notice, AUP and confidentiality
undertaking members are prompted to re-accept. **Nothing sets them**, so the
in-code defaults (`2026-07-v1`) apply. These are not secrets, but bumping one
re-prompts every member in the system, which makes them a change-controlled
value rather than a configuration detail.

---

## 4. Rotation procedure, and the two hazards

General procedure for a Worker secret, which has no overlap mechanism:

```bash
# from apps/api/
wrangler secret put NAME --env staging    # staging first, always
# verify the affected flow on staging.kairos.kharis.org
wrangler secret put NAME                  # production
wrangler deploy                           # not strictly required; forces a fresh isolate
wrangler secret list                      # confirm
```

Cloudflare and Mapbox API tokens follow the naming convention already set out
in `docs/database-architecture.md` §10 — `{app}-{purpose}-{context}`, one token
per context, rotated by deleting the named token and minting a new one with the
same name. Names persist, values do not.

### Hazard 1 — the OIDC signing key invalidates every token it has issued

`OAUTH_SIGNING_KEY` is published through a **single-key JWKS**
(`oauth-server/keys.ts:71` returns `{ keys: [publicJwk] }`, and the cache at
`:30` holds one entry keyed on the raw secret string). There is no
`kid`-indexed key set and no previous-key grace window, so the moment the
secret changes, every unexpired ID token and access token Kairos has issued
stops verifying — up to one hour for ID tokens
(`ID_TOKEN_TTL_SECONDS`, `oauth-server/tokens.ts:8`), and relying applications
will see signature failures, not expiry, which is the harder error to diagnose.

The asymmetry is worth noting: OAuth **client** secrets *do* get an overlap
window — `SECRET_ROTATION_OVERLAP_SECONDS = 24h` at `oauth-server/config.ts:13`.
The signing key did not get the same treatment.

> **DECISION NEEDED: whether to implement JWKS key overlap before any OIDC relying party goes live.**
> **Recommended:** publish both the current and previous key in the JWKS, keyed
> by `kid`, with the previous key retained for one hour (one ID-token lifetime).
> Sign only with the current key. This makes rotation a non-event.
> **Trade-off:** it is real work in `keys.ts` for a system that currently has
> few or no external relying parties. If the answer is "not yet", the
> compensating control is to schedule rotation in a maintenance window and tell
> relying parties in advance — which is only acceptable while the set of
> relying parties is small enough to tell.

### Hazard 2 — rotating the QR secret invalidates every outstanding QR code

`SELF_CHECK_IN_QR_SECRET` signs a stateless token over
`` `${serviceId}.${bucket}` `` where the bucket is a 30-second window
(`attendance/self-check-in-qr.ts:16`), and the verifier accepts the current or
previous bucket (`:98`). Rotating the secret therefore invalidates **every QR
currently displayed, across every branch, within 60 seconds**. There is no
cache to bust and no rows to clean up, which is the design's strength:
`docs/self-check-in.md` is explicit that rotation is the *only* revocation
primitive, and that revoking a single leaked token is impossible.

Operationally this means: never rotate it during a Sunday service. Mid-week is
free. Conversely, if a QR secret leak is suspected *during* a service,
rotating immediately is correct and cheap — the displays re-render on their
next poll and the blast radius is 60 seconds of attendance data integrity, not
account access. No member identity is in the token; it authenticates the desk,
not the person.

### The session-key hazard, for completeness

`JWT_SECRET` and `JWT_REFRESH_SECRET` are HS256 symmetric keys with no `kid`
and no JWKS, so rotation is all-or-nothing. Rotating `JWT_SECRET` logs
everyone out within 15 minutes (the access-token TTL). Rotating
`JWT_REFRESH_SECRET` is heavier: the refresh TTL is **365 days**
(`lib/auth-secrets.ts:24`, with a 12-line justification), and refresh tokens
are stateless JWTs with no server-side store — so rotation is the only way to
revoke them in bulk, and it forces a password sign-in for every user, including
biometric-armed mobile users whose sealed token becomes worthless.

---

## 5. Who can access what

Access is by role, not by name, so this survives people joining and leaving.

| Secret class | Who can read the value | Who can change it |
|---|---|---|
| Worker secrets | **Nobody.** Cloudflare write-only: `wrangler secret put` sets, `wrangler secret list` shows names only. A value that is lost must be re-minted. | Anyone with a Cloudflare API token carrying Workers Scripts:Edit on the account |
| GitHub Environment secrets | **Nobody** — write-only in the UI, masked in logs | Repository admins. The `production` environment's reviewer requirement gates *use*, not *change*. |
| EAS secrets | Write-only | Expo project owners |
| PlanetScale credentials | Readable in the PlanetScale console by anyone with database access | PlanetScale organisation admins |
| AWS SES IAM key | Readable once at creation, then never | AWS account admins |
| `ADMIN_PASSWORD` | Whoever runs the seed | n/a — one-shot |

> **DECISION NEEDED: name the people, and cap how many hold Cloudflare account-level access.**
> This document cannot invent an access list. What the cyber team will ask for is
> a named holder per row above and a maximum.
> **Recommended:** two people with Cloudflare account-level Workers edit rights
> (one primary, one break-glass), two GitHub repository admins, and exactly one
> named AWS account admin. Two is the smallest number that survives one person
> being unavailable.
> **Trade-off:** at current team size this may be one person wearing every hat,
> which is a single point of failure that should be written down as an accepted
> risk rather than left implicit.

### Known gap: long-lived AWS keys

`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are long-lived IAM user
credentials held as Worker secrets. The intended replacement is IAM Roles
Anywhere with a bring-your-own CA, which was deferred deliberately and is the
reason the 90-day rotation above is manual. Until then, the compensating
controls are that the IAM user's policy should permit only `ses:SendEmail` on
the one configuration set, and that SES reputation monitoring with auto-pause
is configured on `kairos-transactional` on the AWS side.

> **DECISION NEEDED: confirm the SES IAM user's policy is scoped to `ses:SendEmail` on `kairos-transactional` only.**
> This cannot be verified from the repository — the policy lives in AWS. If it
> is broader (for example `ses:*`, or unscoped), a leaked Worker secret becomes
> a reputation-destruction incident rather than a spam incident.

---

## 6. Committed values, and what is not committed

**Nothing resembling a live credential is committed.** No `pk.`/`sk.` Mapbox
token, no `AKIA…`, no `ghp_…`, and the only PEM boundaries in the repo are a
documentation placeholder in `apps/api/BETTER_AUTH_SETUP.md` and a code comment
in `auth/oauth/apple-secret.ts`.

What *is* committed, and should be understood as deliberate:

| Location | Name | Note |
|---|---|---|
| `.env.example` | `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SELF_CHECK_IN_QR_SECRET` | Placeholders for local development only |
| `docker-compose.yml:9-10` | `POSTGRES_USER`, `POSTGRES_PASSWORD` | Both literally `kairos`; local Docker only |
| `docker-compose.demo.yml:16-17, 37-39` | Postgres credentials, `DATABASE_URL`, both JWT secrets | Throwaway demo stack. A committed demo signing key is fine **only** because the demo stack is never reachable from production. |
| `apps/api/src/lib/auth-secrets.ts` | `JWT_SECRET`, `JWT_REFRESH_SECRET` dev defaults | **Were live code paths; now unreachable once deployed.** Passed to `requireSecret`, which returns them only under the test runner or a declared `development`. See §1. |
| `apps/api/src/attendance/router.ts` | `SELF_CHECK_IN_QR_SECRET` dev default | Same. |

The three in-code dev defaults were the only entries in this table that ever
mattered. A committed placeholder in `.env.example` is documentation; a
committed fallback that a deployed Worker could reach was a public signing key.
Since 8 November 2026 they are documentation too — `requireSecret` cannot return
them from a deployed environment, and `secret-env.test.ts` asserts that
directly. They are kept rather than deleted so local development and the test
suite need no secret provisioning.
## 7. On compromise

The severity ladder and notification duties are in `incident-response.md`; this
section is only the per-secret containment action.

| Compromised | Immediate action | Blast radius |
|---|---|---|
| `JWT_SECRET` | Rotate. Everyone is logged out within 15 min. | **Total.** Forgeable admin tokens for any member id until rotated. Treat as a confirmed breach of all member data, including children's records. |
| `JWT_REFRESH_SECRET` | Rotate. Every user must sign in with a password. | **Total**, and the 365-day TTL means a token stolen a year ago still worked. There is no revocation list to consult and no reuse detection, so you cannot tell whether it was used. |
| `OAUTH_SIGNING_KEY` | Rotate, and notify relying parties — their verification will fail, not expire. | Forgeable ID/access tokens for any relying application. |
| `SELF_CHECK_IN_QR_SECRET` | Rotate immediately; it is cheap. | Attendance-data integrity only. No account access, no member identity in the token. |
| `AWS_*` SES keys | Delete the IAM key in AWS first, then rotate the Worker secret. Check SES sending statistics for a spike. | Email sent as `@kharis.org`: phishing against the congregation is the realistic harm, plus domain reputation damage. |
| `CF_IMAGES_TOKEN` | Revoke the token in the Cloudflare dashboard. | Upload and delete of images in the account. Note that **reading** profile photos needs no token at all — see below. |
| `CLOUDFLARE_API_TOKEN` | Revoke in the dashboard. Review the Cloudflare audit log for deploys. | Worker code replacement, i.e. arbitrary code with the database binding. Equivalent to total compromise. |
| `DATABASE_URL` | Rotate the PlanetScale password. Review PlanetScale query insights. | Direct read/write of every table, bypassing all application RBAC. |
| `PAGES_DEPLOY_HOOK_URL` | Delete and recreate the hook. | Triggers a build of `main`; cannot change what is built. Low. |
| `EXPO_TOKEN` | Revoke in the Expo dashboard. | Can submit a build to TestFlight / Play under the church's identity. High reputational, low data. |
| `ADMIN_PASSWORD` | Change the password; review `audit_log` for `signin_success` on that account. | Total, but **this one is visible**: sign-ins are audited. |

Two asymmetries worth internalising, because they determine where
investigation effort goes:

- **The audit log covers authentication but not data access.** After any
  compromise above, `audit_log` can tell you who signed in, from which IP and
  user agent, and which roles were granted. It **cannot** tell you who read,
  changed or exported member data — there are no `member_updated` or
  `member_exported` action types, and the CSV export routes
  (`members/router.ts:85`, `forms/router.ts:74`) write no audit row. Scoping an
  exfiltration incident from the audit log alone is not possible. This is the
  single most important thing to fix before the pilot, and it is also a
  retention question — see `data-retention.md` §2.
- **Profile photos need no secret to read.** `requireSignedURLs` is set to
  `'false'` (`apps/api/src/media/service.ts:41`), so every
  `imagedelivery.net/{accountHash}/{imageId}/public` URL is an unauthenticated,
  non-expiring capability. The image id is a Cloudflare-generated UUID, so URLs
  are not enumerable — but a leaked URL is permanent, and these are member
  profile photos including those of under-16s. Rotating `CF_IMAGES_TOKEN` does
  nothing to contain such a leak. The only containment is deleting the image,
  and **there is no delete call anywhere in the codebase.**

---

## 8. Open decisions, collected

1. ~~Adopt "fail closed in production", and choose how production is detected~~
   — **CLOSED 8 November 2026.** Implemented as a positive allowlist in
   `lib/secret-env.ts` rather than the `ENVIRONMENT` var this document first
   recommended; §1 records why the recommendation was overruled.
2. Implement JWKS key overlap before any OIDC relying party goes live (§4).
3. Name the holders of each secret class and cap Cloudflare account access (§5).
4. Confirm the SES IAM policy is scoped to `ses:SendEmail` on one configuration
   set (§5).
5. Adopt a committed, CI-checked secret inventory (§6).

Item 3 should not wait. With item 1 closed, **nothing on this list is a live
vulnerability** — the remainder are missing controls and unnamed
responsibilities, which is a materially different posture from the one this
document opened with.

---

## 9. The MFA cutover date

Added 12 November 2026, when TOTP for privileged accounts shipped.

The mechanism is complete and enforced at all three doors — password login,
the OAuth callback, and the OAuth confirm-link exchange — as well as at token
refresh, so the mobile app's year-long biometric session is not exempt. What is
**not** decided is when having a factor stops being optional.

Today `MFA_REQUIRED_FROM` is unset, which means a privileged member with no
authenticator is still signed in, and the response tells the client to nag.
That is deliberate: on the day this shipped nobody was enrolled, so enforcing
immediately would have locked every leader out of the system at once.

**Updated 14 November 2026: the web enrolment UI has shipped.** A member can
now set up an authenticator from Settings > Security, and a privileged member
without one sees a banner on every dashboard page that dismisses only for the
browser session. The sign-in challenge and the forced-enrolment path at /mfa
are both live, so the date below is now a scheduling question rather than a
blocked one. Mobile is not done: a privileged member on the app is told to
sign in on the web, which is why the clock should start from the mobile
release and not from this one.

> **DECISION NEEDED:** the date to set `MFA_REQUIRED_FROM` to.
>
> **Recommended: four weeks after the enrolment UI reaches the people who
> need it**, not four weeks after it is merged. Web enrolment merged on
> 14 November 2026; "reaches them" means deployed, announced, and with the
> mobile path done, since a leader who only uses the app cannot enrol at all
> until then. The set is wider than it
> sounds — it is every holder of any grant, which includes fellowship leaders
> and department deputies, who are volunteers rather than staff. The trade is
> straightforward: too early and volunteers are locked out of a system they
> use on a Sunday with nobody to call; too late and the control is advisory,
> which is the state the checklist asked about in the first place.
>
> Setting it needs `wrangler secret put` or a `wrangler.jsonc` var and a
> deploy, so it is reversible within one deploy if the first attempt is too
> aggressive.

Two things worth knowing before choosing a date:

- **Enrolment is a support task, not a feature flag.** It needs a written
  guide and, realistically, somebody walking people through it in person. A
  date set without that attached is a date that will be moved.
- **Backup codes are the recovery path, and they are shown once.** A member
  who loses their phone and never saved the codes needs an admin to remove
  the factor.

  **That admin capability now exists** (`POST /api/members/:id/mfa-reset`,
  added 14 November 2026). Until that date this paragraph described something
  the code could not do: `disableMfa` was reachable only from the member's
  own password-gated endpoint, so a locked-out leader could be recovered only
  by hand-editing the database. The gate is `requireRole('admin')` rather
  than a branch capability, the member is emailed, and it is audited as
  `mfa_reset` whether or not a factor was there to remove.

  Two things it does not do. It **does not end existing sessions**, because
  nothing in Kairos does: there is no token version to bump, and a refresh
  token already minted keeps working until it expires. For a lost phone that
  costs nothing; for a *stolen* phone with a live app session it is a real
  gap, and it is the same gap a password change has. And it does not help
  **the single system admin**, who would need another admin to reset them.
  Their codes genuinely must be kept somewhere offline.
