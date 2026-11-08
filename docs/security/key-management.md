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

**Three secrets violate that principle, and two of them are the session keys.**

| Secret | Behaviour when unbound | Verdict |
|---|---|---|
| `OAUTH_SIGNING_KEY` | `keys.ts:65` generates a per-process ephemeral ES256 keypair. Tokens signed in one isolate do not verify in the next, so the failure is loud and self-limiting. | **Correct.** This is the model. |
| `CF_IMAGES_TOKEN` (+ account id/hash) | `media/router.ts:65-70` returns 503 `MEDIA_NOT_CONFIGURED`. | **Correct — fails closed.** |
| OAuth provider secrets (`GOOGLE_*`, `MICROSOFT_*`, `APPLE_*`) | That provider's `/start` returns 501. | **Correct — fails closed.** |
| `JWT_SECRET` | `lib/auth-secrets.ts:43` substitutes a hardcoded string literal committed to this repository. **No environment check.** | **Fails open.** |
| `JWT_REFRESH_SECRET` | `lib/auth-secrets.ts:44`, same. | **Fails open.** |
| `SELF_CHECK_IN_QR_SECRET` | `attendance/router.ts:72` substitutes a hardcoded literal. The library layer *does* refuse an empty secret (`self-check-in-qr.ts:67`), but the router never passes empty — it passes the literal, so that guard is unreachable. The comment at `:70-71` claims "Worker deploys will emit a warning if it's missing"; **nothing in the codebase implements such a warning.** | **Fails open.** |

The consequence of the first two is not subtle: a production Worker deployed
with `JWT_SECRET` unbound or misspelled signs and verifies real session tokens
with a key that is public to anyone who can read the repository. Because
`signAccessToken` (`apps/api/src/auth/service.ts:89-96`) serialises the whole
`AuthContext` into the payload, and because `matchesCapability`
(`packages/types/src/rbac.ts:183`) returns `true` unconditionally for
`systemRole === 'admin'`, a forged token is a full administrative compromise of
every branch.

This is already a known finding being fixed on a separate branch. It is
restated here because key management is exactly where it belongs, and because
the remediation is a policy requirement, not a code preference:

> **DECISION NEEDED: adopt "fail closed in production" as a binding rule, and decide how production is detected.**
> **Recommended:** `getAuthSecrets` and `readQrSecret` throw on startup when the
> secret is unbound and the runtime is not local development. The detection
> signal matters because Workers has no `NODE_ENV`: the options are a new
> non-secret `ENVIRONMENT` var in `wrangler.jsonc` (explicit, one more thing to
> forget), or treating the presence of the `HYPERDRIVE` binding as the signal
> (automatic, since local dev uses `DATABASE_URL` instead).
> **Recommended: the explicit `ENVIRONMENT` var**, because an implicit signal is
> how this class of bug happens in the first place.
> **Trade-off:** a hard throw turns a silent weakness into a total outage if a
> secret is ever lost. That is the correct trade for a signing key and should be
> stated plainly to whoever runs the deploy.

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
| `.env.example:1-3` | `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` | Placeholders |
| `docker-compose.yml:9-10` | `POSTGRES_USER`, `POSTGRES_PASSWORD` | Both literally `kairos`; local Docker only |
| `docker-compose.demo.yml:16-17, 37-39` | Postgres credentials, `DATABASE_URL`, both JWT secrets | Throwaway demo stack. A committed demo signing key is fine **only** because the demo stack is never reachable from production. |
| `apps/api/src/lib/auth-secrets.ts:43-44` | `JWT_SECRET`, `JWT_REFRESH_SECRET` fallbacks | **Not placeholders — live code paths.** See §1. |
| `apps/api/src/attendance/router.ts:72` | `SELF_CHECK_IN_QR_SECRET` fallback | Same. |

The three in-code fallbacks are the only entries in this table that matter.
A committed placeholder in `.env.example` is documentation; a committed fallback
inside `getAuthSecrets` is a production signing key waiting for one
misconfiguration.

### Secret hygiene gaps found while building this inventory

- **`OAUTH_SIGNING_KEY` is documented nowhere** — not in `wrangler.jsonc`'s
  checklist, not in `interface Env`, not in `docs/`. It is the highest-value key
  in the system and the only record of it is the comment at
  `oauth-server/keys.ts:16-22`. Generate it with
  `node apps/api/scripts/generate-oauth-key.mjs` — **not** via `npm run`, which
  prints a banner into the secret, a mistake already made and fixed once.
- `.env.example` covers 5 of roughly 50 environment variables. There is no
  `.dev.vars.example` anywhere, and no `apps/api/.env.example` despite
  `BETTER_AUTH_SETUP.md:172` instructing the reader to create `apps/api/.env`.
- `APPLE_NATIVE_SERVICES_ID` is documented as an EAS secret to create
  (`BETTER_AUTH_SETUP.md:198`) and is **read by no code**. Stale.
- `PORTAL_URL` (`membership/service.ts:634`) duplicates `FRONTEND_URL`'s job
  under a second name, is set nowhere, and falls back to a hardcoded URL.
- `apps/api/entrypoint.sh:19` runs `drizzle-kit migrate`, contradicting the
  `db:bootstrap`-only rule that `docs/commands.md` states as applying to every
  environment. Not a secrets issue, but it is the one surviving non-bootstrap
  migration path and it matters for recovery — see `backup-recovery.md`.

> **DECISION NEEDED: adopt a named, reviewed secret inventory as the source of truth.**
> **Recommended:** a `.dev.vars.example` listing every Worker-read name with a
> one-line purpose and an empty value, committed, plus a CI step that fails if a
> name read via `readEnv` is absent from it. That turns this document's §2 from a
> point-in-time audit into something that cannot silently rot.
> **Trade-off:** the check needs a tiny AST or grep script and will produce false
> positives on dynamic key names. There are none today.

---

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

1. Adopt "fail closed in production", and choose how production is detected (§1).
2. Implement JWKS key overlap before any OIDC relying party goes live (§4).
3. Name the holders of each secret class and cap Cloudflare account access (§5).
4. Confirm the SES IAM policy is scoped to `ses:SendEmail` on one configuration
   set (§5).
5. Adopt a committed, CI-checked secret inventory (§6).

Items 1 and 3 should not wait. Item 1 is the only one on this list that is
currently a live vulnerability rather than a missing control.
