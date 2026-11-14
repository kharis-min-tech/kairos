# Better-Auth setup — Phase 1 (Google / Microsoft / Apple SSO)

Everything you need to wire the OAuth consoles + provider secrets for Phase 1 of Trello card `336mNWGk`. Phase 1 is Kairos-only social sign-in: after the callback we issue our existing Kairos JWTs and the rest of the app is unchanged. OAuth2 authorization-server mode (cross-app SSO) is Phase 2, not covered here.

Once the OAuth apps are registered and secrets are put, no code change is required — the API already reads them from the runtime env.

> **Implementation note.** `better-auth@^1.2.0` is pinned in `apps/api/package.json` as a platform marker (the Better-Auth 1.7.x line requires `drizzle-orm >= 0.45` which conflicts with our `0.38`, so we stayed on 1.2). The Phase 1 OAuth handshake is hand-rolled with the Web Fetch + Crypto APIs (Cloudflare Workers-native, zero bundle overhead) so we can reuse our existing `issueAuthenticatedSession` JWT flow rather than adopting Better-Auth's cookie-session model. Phase 2 (authorization-server mode + a second-app cross-SSO client) is the point at which we'll actually import the library. Nothing here needs to change when we make that migration — the schemas match Better-Auth's default shape.

---

## 0. Redirect URIs (register these in every provider console)

Same three environments for every provider. Path is fixed: `/api/auth/oauth/{provider}/callback`.

| Env | Redirect URI |
|---|---|
| Production | `https://kairos.kharis.org/api/auth/oauth/{provider}/callback` |
| Staging    | `https://staging.kairos.kharis.org/api/auth/oauth/{provider}/callback` |
| Local dev  | `http://localhost:3001/api/auth/oauth/{provider}/callback` |

Substitute `{provider}` with `google`, `microsoft`, or `apple`. That's nine URIs total per environment triple across the three providers.

> The Cloudflare Worker for kairos-api serves `/api/*` on `kairos.kharis.org` and `staging.kairos.kharis.org` (see `wrangler.jsonc` routes). Local dev binds the Hono server on `http://localhost:3001` via `npm run dev` in `apps/api`.

---

## 1. Google — OAuth 2.0 client

**Console**: https://console.cloud.google.com/apis/credentials

1. Select (or create) the "Kairos" Cloud project.
2. **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - App name: `Kairos`
   - User support email: `tech@kharis.org`
   - Developer contact: `tech@kharis.org`
   - Authorized domains: `kharis.org`
   - Scopes: add `openid`, `email`, `profile` (default non-sensitive)
   - Save + Publish (leave in "Testing" while you QA, promote to Production after)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Kairos web client`
   - Authorized JavaScript origins: leave empty (we use redirect flow only)
   - Authorized redirect URIs: paste all three from §0
   - Click **Create**. Copy the client ID + client secret straight into your secret manager — you can regenerate the secret later but the ID is stable.
4. Requested scope in code: `openid email profile`.
5. Provider `sub` claim maps to `oauth_accounts.provider_user_id`. Emails from Google always come with `email_verified: true`.

Secrets:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

---

## 2. Microsoft — OAuth 2.0 app (multi-tenant + personal)

**Console**: https://portal.azure.com → Microsoft Entra ID → App registrations

1. **New registration**
   - Name: `Kairos`
   - Supported account types: **Accounts in any organizational directory (Any Microsoft Entra ID tenant — Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)**
   - Redirect URI: leave blank on the initial screen (we add three below)
   - Register
2. On the app page → **Authentication → Add a platform → Web**
   - Add all three redirect URIs from §0
   - Access tokens (used for implicit flows): **unchecked**
   - ID tokens: **unchecked** (we use the code flow with PKCE)
3. **Certificates & secrets → Client secrets → New client secret**
   - Description: `kairos-api`
   - Expires: **24 months** (calendar reminder to rotate)
   - Copy the **Value** (not the Secret ID) immediately — the console will not show it again.
4. **API permissions**
   - Add: Microsoft Graph → Delegated → `openid`, `email`, `profile`, `User.Read`
   - Grant admin consent is not required for personal + multi-tenant flows — the user consents on first use.
5. Requested scope in code: `openid email profile User.Read`.
6. `sub` claim maps to `oauth_accounts.provider_user_id`. Microsoft returns `email_verified` only for work/school accounts; personal Microsoft accounts we treat as verified iff the `email` claim matches the `preferred_username` claim (documented behavior of MSA).

Secrets:
- `MICROSOFT_CLIENT_ID` — the Application (client) ID from Overview
- `MICROSOFT_CLIENT_SECRET` — the secret Value from step 3

---

## 3. Apple — Sign in with Apple (required for iOS App Store)

Apple's flow is the fiddliest because the client secret is a signed JWT you regenerate every ~6 months from a `.p8` private key.

**Console**: https://developer.apple.com/account/resources/

1. **Certificates, Identifiers & Profiles → Identifiers → App IDs → +**
   - Type: App IDs → App
   - Description: `Kairos`
   - Bundle ID (Explicit): `com.kharis.kairos` (matches `apps/mobile/app.config.ts` `ios.bundleIdentifier`)
   - Capabilities: enable **Sign In with Apple** (Primary App ID)
2. **Identifiers → Services IDs → +**
   - Description: `Kairos Web`
   - Identifier: `com.kharis.kairos.web` (this is the **client_id** for the web/Worker flow — Apple treats mobile bundle IDs and web service IDs as separate clients)
   - Enable **Sign In with Apple → Configure**
     - Primary App ID: `com.kharis.kairos`
     - Web Domain: `kairos.kharis.org` (add `staging.kairos.kharis.org` too if Apple lets you list multiple; otherwise register a second Services ID for staging — see note below)
     - Return URLs: paste all three redirect URIs from §0
3. **Keys → +**
   - Key name: `kairos-signin-with-apple`
   - Enable **Sign In with Apple → Configure → Primary App ID = `com.kharis.kairos`**
   - Continue → Register → **Download the .p8 file** (single download, cannot be re-fetched — losing it means generating a new key)
   - Note the **Key ID** (10-char string)
4. Get the **Team ID** from your Apple Developer account (top right, next to your name — 10-char string).

Notes on runtime behavior:
- Apple's client secret is a JWT (ES256) signed with the .p8 key, valid ≤6 months. The Worker regenerates it on demand from the four inputs below.
- Apple returns `email_verified` = `"true"` or `"false"` (string). Also may return `is_private_email: "true"` — those are `@privaterelay.appleid.com` addresses. We store the private-relay address as-is; account matching still works because it's stable per (developer, Apple ID).
- Apple's `sub` is stable per Services ID + Apple ID; it does NOT match the mobile bundle ID's `sub`. If you later add native "Sign in with Apple" on the iOS app (Phase 2 mobile), you'll need a **separate** app-side registration and a second row in `oauth_accounts` per user.

Local + staging caveat: Apple does not allow `http://localhost` return URLs and is finicky about multiple domains on one Services ID. Two practical options:

- **Option A** (recommended): register **three separate Services IDs** — `com.kharis.kairos.web`, `com.kharis.kairos.web.staging`, `com.kharis.kairos.web.dev`. Each with its own return URL. Set `APPLE_CLIENT_ID` per environment.
- **Option B**: only enable Apple in staging + prod; disable the "Continue with Apple" button in local dev via feature flag. Cheaper if you rarely test Apple locally.

Secrets:
- `APPLE_CLIENT_ID` — the Services ID (e.g. `com.kharis.kairos.web`)
- `APPLE_TEAM_ID` — 10-char Team ID
- `APPLE_KEY_ID` — 10-char Key ID from step 3
- `APPLE_PRIVATE_KEY` — the entire contents of the `.p8` file, including the `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines. Put it in as-is; Wrangler handles the newlines correctly when passed via stdin or a heredoc.

---

## 4. Put secrets — commands

The API reads these from `env` in Workers and from `process.env` in local dev / tests.

### 4a. Production Worker (kairos-api)

```bash
cd apps/api

wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

wrangler secret put MICROSOFT_CLIENT_ID
wrangler secret put MICROSOFT_CLIENT_SECRET

wrangler secret put APPLE_CLIENT_ID
wrangler secret put APPLE_TEAM_ID
wrangler secret put APPLE_KEY_ID
# APPLE_PRIVATE_KEY: paste the .p8 file contents (multi-line) when prompted.
# On macOS/Linux you can pipe it in to skip the interactive prompt:
#   wrangler secret put APPLE_PRIVATE_KEY < path/to/AuthKey_XXXXXXXXXX.p8
wrangler secret put APPLE_PRIVATE_KEY

# Optional but recommended — the branch a new SSO-signup member is placed into
# until an admin re-homes them. Unset => the oldest active branch wins by
# fallback, which is fine for a single-branch instance but noisy at scale.
wrangler secret put DEFAULT_HOME_BRANCH_ID
```

### 4b. Staging Worker (kairos-api-staging)

Same commands with `--env staging`:

```bash
wrangler secret put GOOGLE_CLIENT_ID --env staging
wrangler secret put GOOGLE_CLIENT_SECRET --env staging
wrangler secret put MICROSOFT_CLIENT_ID --env staging
wrangler secret put MICROSOFT_CLIENT_SECRET --env staging
wrangler secret put APPLE_CLIENT_ID --env staging   # If using per-env Services IDs
wrangler secret put APPLE_TEAM_ID --env staging
wrangler secret put APPLE_KEY_ID --env staging
wrangler secret put APPLE_PRIVATE_KEY --env staging
```

### 4c. Local dev

Add to `apps/api/.env` (git-ignored):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
APPLE_CLIENT_ID=com.kharis.kairos.web.dev
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGT... (multi-line, preserve newlines)
-----END PRIVATE KEY-----"
```

If any of these are absent at runtime, that provider's `/start` endpoint returns 501 `Provider not configured` — the button on the web UI stays clickable but the user sees a clean error page. It does not break password login.

### 4d. Mobile (EAS)

Mobile does not hold the client secrets — it opens the system browser to `/api/auth/oauth/{provider}/start` and lets the Worker handle everything. Only the mobile app scheme matters, and it's already configured in `apps/mobile/app.config.ts` (universal-links on `kairos.kharis.org/oauth-callback` and `staging.kairos.kharis.org/oauth-callback` — added by this Phase 1 patch).

If you later add a native "Sign in with Apple" button (Phase 2 mobile), those credentials go into EAS:

```bash
cd apps/mobile
eas secret:create --scope project --name APPLE_NATIVE_SERVICES_ID --value com.kharis.kairos
```

(Placeholder — Phase 1 uses the browser flow for all three providers on mobile.)

---

## 5. What the API does with these

- On `GET /api/auth/oauth/{provider}/start`:
  1. Generate PKCE verifier + challenge.
  2. Generate a signed state cookie containing verifier + optional `returnTo`.
  3. 302 → provider authorize URL with `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`.
- On `GET /api/auth/oauth/{provider}/callback`:
  1. Verify state cookie, extract PKCE verifier.
  2. Exchange code for tokens at the provider's token endpoint (Apple: generate client_secret JWT on the fly from `APPLE_PRIVATE_KEY` + `APPLE_TEAM_ID` + `APPLE_KEY_ID`).
  3. Verify ID token signature against provider JWKS + claims (`iss`, `aud`, `exp`).
  4. Look up `oauth_accounts` by `(provider, provider_user_id)`. If found → sign in that member.
  5. Else look up `members` by verified `email`. If found and IdP flagged the email as verified → auto-link (insert `oauth_accounts` row), sign in, show a toast on next page load.
  6. Else if `email` conflicts with an existing member but the IdP did NOT flag it verified → mint a short-lived `oauth_verification_tokens` row (kind `link_confirmation`), redirect to a "confirm with your password to link" page.
  7. Else create a new pending member (`approvalStatus: 'pending'`, `emailVerified: true` — the IdP is our verifier, `passwordHash: ''`), then follow the existing signup path.
  8. Issue Kairos JWT + refresh pair via the existing `issueAuthenticatedSession(...)` in `apps/api/src/auth/service.ts`.
  9. 302 → `${FRONTEND_URL}/oauth-callback#accessToken=...&refreshToken=...&method={provider}` (tokens in fragment, never in query — never hit logs / server histories).
- On `GET /api/auth/oauth/connections` (authenticated): returns the caller's active `oauth_accounts` rows.
- On `DELETE /api/auth/oauth/connections/{provider}` (authenticated): soft-deletes the row, but refuses if it would lock the user out (no `password_hash` AND only one connection remaining).

## 6. Audit log

Sign-in events now carry `method` in `audit_log.metadata`:

```json
{ "method": "google" | "microsoft" | "apple" | "password", ... }
```

No schema change was required — metadata is `jsonb`.

## 7. Rotation / disaster recovery

- **Google secret**: rotate via Console → Credentials → your client → Reset secret. Update `GOOGLE_CLIENT_SECRET` via `wrangler secret put`. Zero downtime — old secret works until you regenerate.
- **Microsoft secret**: rotate before it expires (24 months). Same wrangler update.
- **Apple key**: the `.p8` never expires but you should still rotate every ~12 months. Generate a new key, update `APPLE_KEY_ID` and `APPLE_PRIVATE_KEY` together (the `kid` header in the client secret JWT must match the file you sign with).
- **Losing `APPLE_PRIVATE_KEY`**: not recoverable. Generate a new key from the Apple console, update both `APPLE_KEY_ID` and `APPLE_PRIVATE_KEY`. Users don't need to reconnect — the change is transparent because Apple's `sub` claim is stable across key rotations.

## 8. Where to look when it breaks

- `apps/api/src/auth/oauth/router.ts` — the two OAuth routes + connections management.
- `apps/api/src/auth/oauth/service.ts` — `findOrCreateMemberFromOAuth` (the linking logic).
- `apps/api/src/auth/oauth/providers.ts` — per-provider config (URLs, scopes, JWKS).
- `apps/api/src/auth/oauth/apple-secret.ts` — Apple client-secret JWT builder (ES256).
- Workers logs (Cloudflare dashboard → kairos-api → Logs) will show:
  - `oauth.start` — user initiated a flow
  - `oauth.callback.match_existing` — linked into an existing member
  - `oauth.callback.create_pending` — new member created via SSO
  - `oauth.callback.reject_conflict` — unverified IdP email collided with an existing account
  - `oauth.callback.error` — anything unexpected (contains provider + error class, never contains tokens or codes)

Nothing in the audit log, application log, or worker log contains OAuth codes, tokens, or Apple private key material — verified by the reviewer pass at the end of Phase 1.

---

## 9. Phase 1.5 — SSO onboarding gate

Phase 1 landed a working handshake but left a gap: SSO signups reached the dashboard while still `approvalStatus='pending'` (password login gated on approved, `issueAuthenticatedSession` did not), and we never captured phone, T&C consent, or a user-confirmed home branch. Phase 1.5 closes both:

- New column `members.must_complete_profile` (BOOLEAN, defaults FALSE). Set to TRUE when `createPendingMemberFromOAuth` mints a shell.
- Dashboard guards (web `apps/web/src/app/(dashboard)/layout.tsx`, mobile root `apps/mobile/app/index.tsx` + `(tabs)/_layout.tsx`) redirect:
  - `mustCompleteProfile === true` → `/profile?onboarding=1` (web) / `/(auth)/complete-profile` (mobile)
  - `approvalStatus !== 'approved'` → `/pending-approval`
- New endpoint `POST /api/auth/complete-oauth-profile` collects phone + homeBranchId + T&C, inserts consent records for the current published Terms + Privacy versions (idempotent — skips if already accepted), then clears the flag. Refuses to run on any account whose flag is already FALSE.
- Scenario 3 — auto-linking a new provider onto an existing member — now fires a silent security notification (`security.oauth_provider_linked`) via the existing SES pipeline. No in-app toast; the user is signed in and routed to dashboard as before.

### Migration apply (staging)

```bash
cd packages/database
# 0045 is idempotent (ADD COLUMN IF NOT EXISTS + DEFAULT FALSE).
psql "$STAGING_DATABASE_URL" < drizzle/0045_oauth_must_complete_profile.sql

# Retroactively flag any pre-existing pending SSO signups on staging so
# their next login walks through onboarding. The `password_hash = ''`
# selector is a reliable SSO-only signal (password signups never persist
# empty hashes).
psql "$STAGING_DATABASE_URL" -c "
  UPDATE members
  SET must_complete_profile = TRUE
  WHERE password_hash = '' AND approval_status = 'pending';
"
```

### Migration apply (production)

Same commands with the production connection string. On PlanetScale, run through the branch → merge deploy request flow rather than direct psql; the SQL is trivially additive so it's a fast merge.

### Verifying the fix

1. Sign in via Google/Microsoft/Apple on a brand-new email → land on `/profile?onboarding=1` (web) or `/(auth)/complete-profile` (mobile). Filling phone + branch + T&C should route to `/pending-approval`.
2. Sign in via a provider whose email matches an existing approved member → dashboard (no change from Phase 1). The user's inbox should show a "New sign-in method added" security email.
3. Sign in via a provider on an unverified-email collision → still the confirm-password page (no change).

