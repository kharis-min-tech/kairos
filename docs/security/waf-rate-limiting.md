# Cloudflare WAF rate-limiting rules

**Status:** specification, ready to implement by hand in the Cloudflare dashboard.
**Closes:** the "rate limiting" item on the pre-release cyber-security audit checklist.
**Zone:** `kharis.org` — **Free plan** at time of writing.
**Last verified against Cloudflare docs:** 2026-11-08.

Rate limiting for Kairos is done at the Cloudflare edge, not in the Worker. That
decision is settled and is not revisited here. It is also the only option that
currently works: `apps/api/wrangler.jsonc` binds Hyperdrive and nothing else —
no KV, no Durable Object, no `ratelimit` binding — so the Worker has nowhere to
keep a counter.

Edge rate limiting has a second benefit worth naming: rate limiting rules
evaluate in Cloudflare's `http_ratelimit` phase, which runs **before** the
Worker is invoked. A blocked request costs no Worker invocation and never
touches Hyperdrive or PlanetScale.

---

## 1. What the surface actually is

Taken from `apps/api/src/app.ts`, `apps/api/src/auth/router.ts` and
`apps/api/src/oauth-server/router.ts` — not from planning docs.

The API is a Worker mounted by route, path-based under the Pages custom domain:

| Environment | Worker route (`wrangler.jsonc`) |
| --- | --- |
| Production | `kairos.kharis.org/api/*` |
| Staging | `staging.kairos.kharis.org/api/*` |

Everything below `/api/` is the Worker; Pages serves the rest of the hostname.

Auth endpoints, all `POST` unless noted, all mounted at `/api/auth` in `app.ts`:

| Path | Authenticated | Notes |
| --- | --- | --- |
| `/api/auth/login` | no | Password login. Primary credential-stuffing target. |
| `/api/auth/signup` | no | Self-service account creation. |
| `/api/auth/forgot-password` | no | **Sends an email via SES.** |
| `/api/auth/reset-password` | no | Consumes a reset token. Token-guessing target. |
| `/api/auth/resend-code` | no | **Sends an email via SES.** |
| `/api/auth/verify-email` | no | Consumes a verification code. |
| `/api/auth/refresh` | no (bearer-free) | Exchanges a refresh token. |
| `/api/auth/change-password` | yes | |
| `/api/auth/email-change` | yes | **Sends an email via SES.** |
| `/api/auth/email-change/confirm` | no | Token in body. |
| `/api/auth/email-change/undo` | no | Token in body. |
| `/api/auth/complete-oauth-profile` | yes | |
| `/api/auth/me` | yes | `GET`. |

OIDC / OAuth2 authorization-server endpoints, mounted at `/api/oauth`:

| Path | Method | Notes |
| --- | --- | --- |
| `/api/oauth/token` | `POST` | **The token endpoint.** `authorization_code` + `refresh_token` grants. |
| `/api/oauth/revoke` | `POST` | |
| `/api/oauth/userinfo` | `GET`, `POST` | |
| `/api/oauth/jwks` | `GET` | Public keys. Cacheable, high read volume. |
| `/api/oauth/.well-known/openid-configuration` | `GET` | Discovery. Cacheable. |

Unauthenticated endpoints outside `/api/auth`, worth knowing before writing a
blanket rule: `GET /api/public/branches`, `/api/public/gift-aid/*`, and `GET /health`
(which is at the root, *not* under `/api/`, so no `/api/*` rule will cover it).

### Two application facts that determine the rules

**1. Every one of these is called by `fetch`/XHR, never by an HTML form post.**
The web app is a Next.js SPA calling `@kairos/api-client`; the mobile app is
React Native. Cloudflare's challenge actions — Managed Challenge, JS Challenge,
Interactive Challenge — need to return an HTML page for the browser to render,
and [Cloudflare documents that they do not work for AJAX/XHR
requests](https://developers.cloudflare.com/use-cases/solutions/stop-account-takeover-attacks/).
A challenge on `/api/*` would not prompt the user; it would return HTML to code
expecting JSON and surface as an unexplained client error.

> **Therefore every rule below uses _Block_, not _Managed Challenge_.** This is
> the opposite of Cloudflare's general advice for login pages, and the reason is
> that their advice assumes a server-rendered form. If a challenge is ever
> wanted on this surface, the mechanism is Turnstile with Pre-Clearance in the
> app, which is a separate decision and not rate limiting.

**2. Congregations share egress IPs.** On the Free plan the counting
characteristic is locked to IP (see §2). A branch running Sunday check-in on one
venue Wi-Fi presents as a single IP for the whole room. Any per-IP threshold is
therefore a *crowd* threshold, not a *person* threshold, and that is why the
numbers below are looser than they would be for a consumer web app. Before a
signup drive or a check-in event, either raise the threshold temporarily or add
the venue IP to a skip rule (§5).

---

## 2. What the Free plan actually allows

From Cloudflare's [rate limiting rules availability
matrix](https://developers.cloudflare.com/waf/rate-limiting-rules/#availability)
and [parameters
reference](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/):

| Capability | **Free** | Pro | Business | Enterprise |
| --- | --- | --- | --- | --- |
| Number of rate limiting rules | **1** | 2 | 5 | 100 |
| Counting characteristics | **IP only (preset, not editable)** | selectable | selectable | selectable + Clearance UUID |
| Counting period | **10 s** | up to 1 h | up to 1 day | up to 1 h |
| Mitigation timeout ("For duration") | **10 s** | up to 1 h | up to 1 day | custom via API |
| Custom counting expression (e.g. count only `401`/`403`) | no | no | **yes** | yes |
| Custom response body/code on Block | no | yes | yes | yes |
| `cf.waf.credential_check.password_leaked` | **yes** | yes | yes | yes |
| `cf.waf.credential_check.username_and_password_leaked` | no | yes | yes | yes |

Three consequences, stated plainly because they are easy to miss:

- **There is exactly one rule slot.** The five-rule target design in §4 cannot
  be implemented on Free. §3 is the one rule to actually deploy today.
- **A 10-second window makes this a burst limiter, not a brute-force
  control.** With a 10 s period and a 10 s timeout, an attacker pacing below the
  threshold — say 2 requests/second against `/api/auth/login` — never trips the
  rule and still gets ~170,000 attempts a day. Free-tier rate limiting stops
  machine-speed credential stuffing and accidental client loops. It does not
  stop a patient attacker. **Do not report this checklist item as fully closed
  on the Free plan**; report it as "burst protection deployed, sustained-rate
  protection requires Pro".
- **The one rule slot is contended.** Cloudflare offers a free
  leaked-credentials rate limiting template (`password_leaked`, 5 requests /
  10 s) under **Security → Security rules**. It is genuinely valuable, but
  deploying it consumes the single Free slot and would displace the rule in §3.
  Of the two, §3 is the better use of the slot because it covers six endpoints
  rather than one condition; revisit once on Pro, where both fit.

Note on an inconsistency in Cloudflare's own docs: the deprecated
[legacy rate limiting
page](https://developers.cloudflare.com/waf/reference/legacy/old-rate-limiting/)
lists Free as allowing a 1-minute period and a 1-hour duration. That table
describes the **retired** product. The current rate limiting rules engine is the
matrix above. Confirm against the dropdown in the dashboard when creating the
rule — if a 1-minute period is offered, take it and adjust §3's threshold to the
§4 `R1` numbers.

---

## 3. The rule to deploy today (Free plan, 1 rule)

One rule, covering the six highest-value unauthenticated POST endpoints with a
shared per-IP counter.

**Name:** `Auth burst limit (sensitive POST endpoints)`

**When incoming requests match** — paste into **Edit expression**:

```txt
http.host in {"kairos.kharis.org" "staging.kairos.kharis.org"}
and http.request.method eq "POST"
and http.request.uri.path in {"/api/auth/login" "/api/auth/signup" "/api/auth/forgot-password" "/api/auth/reset-password" "/api/auth/resend-code" "/api/oauth/token"}
```

| Field | Value | Why |
| --- | --- | --- |
| **With the same characteristics** | `IP` | Preset on Free; not editable. |
| **When rate exceeds → Requests** | `30` | See reasoning below. |
| **When rate exceeds → Period** | `10 seconds` | Only value on Free. |
| **Then take action** | `Block` | Challenges do not work on XHR (§1). |
| **For duration** | `10 seconds` | Only value on Free. |

**Why 30 / 10 s.** The counter is shared across all six paths and across
everyone behind one IP. A single human authenticating does 1–3 POSTs. Twenty
people arriving on one venue Wi-Fi inside the same ten seconds do about twenty.
Credential stuffing and token-grinding run at tens to hundreds of requests per
second and trip this immediately. 30 sits above realistic crowd behaviour and
far below any automated attack — chosen to be a rule nobody has a reason to
switch off, which matters more than a tight number that gets disabled after the
first Sunday it fires.

**Why these six paths.** `login`, `signup` and `oauth/token` are the
credential-and-token attack surface. `forgot-password` and `resend-code` each
send mail through SES, so uncontrolled volume is both a mail-bomb vector against
a member and a direct threat to the sender reputation on the
`kairos-transactional` configuration set. `reset-password` consumes a token and
is the endpoint a token-guessing attack would hammer.

**Why `http.host` is pinned.** Rate limiting rules are zone-scoped. The
`kharis.org` zone also serves `design.kharis.org`, `docs.kairos.kharis.org` and
the main site. Without the host predicate the rule would apply zone-wide. Both
Kairos hostnames are listed so staging is covered too; when staging is retired
the entry simply stops matching and needs no edit.

**Equivalent API call**, for reproducing the rule without clicking through the
dashboard (`PUT /zones/{zone_id}/rulesets/phases/http_ratelimit/entrypoint`):

```json
{
  "rules": [
    {
      "description": "Auth burst limit (sensitive POST endpoints)",
      "expression": "http.host in {\"kairos.kharis.org\" \"staging.kairos.kharis.org\"} and http.request.method eq \"POST\" and http.request.uri.path in {\"/api/auth/login\" \"/api/auth/signup\" \"/api/auth/forgot-password\" \"/api/auth/reset-password\" \"/api/auth/resend-code\" \"/api/oauth/token\"}",
      "action": "block",
      "ratelimit": {
        "characteristics": ["ip.src", "cf.colo.id"],
        "period": 10,
        "requests_per_period": 30,
        "mitigation_timeout": 10
      }
    }
  ]
}
```

> `cf.colo.id` is required in `characteristics` by the API and is what the
> dashboard adds implicitly when it shows "IP". Omitting it is rejected.

---

## 4. Target design (what to deploy on Pro or Business)

The full set the audit item asks for. **Pro gives 2 rules, Business 5.** Deploy
in the priority order given; `R1` and `R2` are the two that matter most if only
two slots exist.

All five share: counting characteristic **IP**, action **Block**, and the host
predicate `http.host in {"kairos.kharis.org" "staging.kairos.kharis.org"}`
(omitted from the expressions below only for brevity — include it).

### R1 — Login brute force · *Pro*

| Setting | Value |
| --- | --- |
| Expression | `http.request.uri.path eq "/api/auth/login" and http.request.method eq "POST"` |
| Characteristic | IP |
| Rate | **10 requests / 1 minute** |
| Action | Block (`429`) |
| Mitigation timeout | **10 minutes** |

A person mistyping a password does 3–5 attempts. 10/min leaves room for a NATed
pair of users and still caps an attacker at 10 guesses per 11 minutes — roughly
1,300/day instead of 170,000.

**On Business**, add a custom counting expression so successful logins do not
burn a user's own budget, which lets the threshold drop to 5/min:

```txt
http.request.uri.path eq "/api/auth/login" and http.request.method eq "POST" and http.response.code in {401 403}
```

### R2 — Password-reset and verification-mail abuse · *Pro*

| Setting | Value |
| --- | --- |
| Expression | `http.request.method eq "POST" and http.request.uri.path in {"/api/auth/forgot-password" "/api/auth/resend-code" "/api/auth/email-change"}` |
| Characteristic | IP |
| Rate | **5 requests / 1 minute** |
| Action | Block (`429`) |
| Mitigation timeout | **1 hour** |

Tight and long, because each request sends an email. This rule protects a member
from being mail-bombed and protects SES sender reputation — a bounce/complaint
spike here degrades deliverability for the whole platform. Nobody legitimately
requests six password resets a minute.

### R3 — Signup abuse · *Business* (needs a 10-minute period)

| Setting | Value |
| --- | --- |
| Expression | `http.request.uri.path eq "/api/auth/signup" and http.request.method eq "POST"` |
| Characteristic | IP |
| Rate | **15 requests / 10 minutes** |
| Action | Block (`429`) |
| Mitigation timeout | **1 hour** |

15, not 5, specifically because of the shared-IP problem: a new-members event
where a cohort signs up on venue Wi-Fi is a *designed* use of this app. On Pro,
use 15 / 1 minute instead. If a signup drive is expected to exceed this, add the
venue IP to the skip rule in §5 for the day.

### R4 — OIDC token endpoint · *Business*

| Setting | Value |
| --- | --- |
| Expression | `http.request.uri.path eq "/api/oauth/token" and http.request.method eq "POST"` |
| Characteristic | IP |
| Rate | **30 requests / 1 minute** |
| Action | Block (`429`) |
| Mitigation timeout | **10 minutes** |

Higher than `R1` because this endpoint carries both `authorization_code`
exchanges and `refresh_token` renewals, and a relying party may be a server
making legitimate back-channel calls from one IP. It still needs a ceiling:
`client_secret` grinding and refresh-token replay both land here.

Keep `/api/oauth/revoke` out of this rule. Revocation is a security action and
throttling it is the wrong trade — an attacker gains by having a revoke call
blocked.

### R5 — General `/api/*` ceiling · *Business*

| Setting | Value |
| --- | --- |
| Expression | `starts_with(http.request.uri.path, "/api/")` |
| Characteristic | IP |
| Rate | **1200 requests / 1 minute** |
| Action | Block (`429`) |
| Mitigation timeout | **1 minute** |

A DoS and runaway-client backstop, not a precision control, and deliberately the
loosest rule here. The dashboard is query-heavy — one Mission Control load fires
tens of requests through TanStack Query — so a room of twenty people behind one
IP refreshing dashboards can legitimately produce several hundred requests a
minute. 1200/min (20 rps) sits above that and still stops a scraper walking the
members directory.

Short timeout on purpose: a false positive here breaks the whole app for that
IP, so it should clear in a minute rather than an hour.

---

## 5. Supporting configuration

**Skip rule for known venue IPs (custom rule, not a rate limiting rule — does
not consume the Free rate-limit slot).** Under **Security → WAF → Custom
rules**, an allowlist is the escape hatch for the shared-IP problem:

```txt
ip.src in {203.0.113.10 198.51.100.0/24}
```

Action: *Skip* → rate limiting rules. Populate with branch venue egress IPs as
they become known. Keep it short and review it; a stale allowlist is a hole.

**Free-plan extras already available on this zone**, worth turning on
independently of the above:

- **Bot Fight Mode** (Free, on/off) — challenges known-bot traffic before rate
  limiting runs.
- **Leaked credentials detection** — the `password_leaked` field works on Free.
  Needs the one rule slot, so it is blocked behind §3 until Pro. Noted here so
  it is not forgotten at upgrade time.
- **Managed Rules / OWASP Core Ruleset** — not available on Free. This is a
  separate audit gap from rate limiting and is worth recording as such.

**Verification after deploying.** Security Events (**Security → Events**) shows
rate-limit matches. Confirm the rule fires by sending 35 rapid POSTs to
`/api/auth/login` with junk credentials from one IP and checking for `429`:

```bash
for i in $(seq 1 35); do
  curl -s -o /dev/null -w '%{http_code} ' \
    -X POST https://kairos.kharis.org/api/auth/login \
    -H 'content-type: application/json' \
    -d '{"email":"ratelimit-test@example.com","password":"wrong"}'
done; echo
```

Expect `401`s turning into `429`s. Run it against staging first. Note that
Cloudflare lets a small number of excess requests through before enforcement
starts, because counters propagate between data centres — so the switch to `429`
will not land exactly on request 31.

---

## 6. Recommendation, and what was decided

**Status: §3 is deployed. Pro is declined for now and the residual risk is
accepted.** Both on 12 November 2026.

### Deployed

The §3 rule is live on zone `kharis.org`:

| | |
|---|---|
| Rule | `Auth burst limit (sensitive POST endpoints)` |
| Rule id | `4da8ab6528a54cbf87da2d61d11cd2ed` |
| Ruleset id | `8ca546c35ab94fbe86e8a027d632a4df` (phase `http_ratelimit`) |
| Deployed | 12 November 2026, via the Cloudflare API |

Verified before deployment: the zone had **no `http_ratelimit` ruleset at
all**, confirming §1's claim that nothing was rate limited, and all six paths
in the expression were checked against `app.ts`, `auth/router.ts` and
`oauth-server/router.ts` rather than taken from this document.

Two settings were checked at the same time and needed no change: **minimum TLS
is already 1.2** and **Always Use HTTPS is on** (set 8 November 2026).

### Pro declined, risk accepted

**Decision: the zone stays on Free for the pilot, and the sustained-rate gap is
accepted.** Taken by the product owner on 12 November 2026, on the basis that
there is nothing further to deploy on Free and the Pro upgrade is not justified
by the pilot's exposure.

**What is accepted, stated plainly.** With a 10-second counting period and a
10-second mitigation timeout, an attacker pacing below the threshold — say two
requests per second against `/api/auth/login` — never trips the rule and still
gets roughly 170,000 attempts a day. The deployed rule stops machine-speed
credential stuffing and accidental client loops. **It does not stop a patient
attacker**, and no configuration available on Free does.

**Report the checklist item as "burst protection deployed, sustained-rate
protection requires Pro" — not as closed.** This is repeated here because it is
the sentence most likely to get rounded up to "rate limiting: yes" by somebody
summarising.

**What makes the residual risk tolerable, for now.** Passwords are argon2id at
OWASP 2025 parameters, so offline cracking of a stolen hash is expensive and
online guessing is slow per attempt. The administrator population is small and
known. `signin_failure` rows are written for every failed attempt, so a
sustained run is reconstructable afterwards even though nothing throttles it —
though note that this leans on the same absent alerting accepted in
`incident-response.md` §2, so nobody is told while it is happening. Those two
accepted risks compound, and should be reviewed together rather than
separately.

**Revisit when:** the pilot opens beyond one branch, any credential-stuffing
attempt is observed in the `signin_failure` rows, or the support model (which
is also what unblocks alerting) is in place to act on one. At $20/month against
a roughly $15/month running cost the decision is a judgement call rather than
an obvious yes, which is exactly why it should be revisited deliberately rather
than drifting.

### The original recommendation, for the record

Deploy §3 now; it is the best available configuration on Free and it closes the
burst-attack half of the checklist item.

Then make an explicit decision about **Cloudflare Pro ($20/month)** before the
production pilot. Pro is what converts this from burst protection into real
brute-force protection: a 1-minute counting period, mitigation timeouts measured
in minutes to hours, and a second rule slot so login and password-reset-mail
abuse can be limited separately. On the Free plan a patient attacker is
unthrottled, and that should be recorded as a known, accepted risk for as long
as the zone stays on Free.

The Pro cost is material against the roughly $15/month beta running cost, so it
is a judgement call rather than an obvious yes — but it should be a decision
someone made on purpose, not a default. Business ($200/month) is only worth
discussing if response-code-based counting (`R1`'s refinement) or all five rules
become a requirement.

---

## 7. Amend the rule when MFA deploys

Added 12 November 2026.

The deployed rule matches an **exact path list**, so a new endpoint is not
covered until it is named. `/api/auth/mfa/verify` is a brute-force target of
exactly the kind this rule exists for: it accepts a six-digit code, which is a
one-in-a-million guess, and a few hundred thousand requests is not a large
number.

**Before the MFA branch is deployed**, add these two paths to the expression:

```
"/api/auth/mfa/verify" "/api/auth/mfa/confirm"
```

Not before. The endpoints do not exist in production yet, and a rule that
names a path nothing serves is a rule nobody can test.

`/confirm` is included because it is the other place a code is checked, during
enrolment. `/enrol`, `/disable` and `/backup-codes` are left out: the first
two are not guessable and the last two already require the account password.

**The edge rule is the second line here, not the first.** `auth/mfa.ts`
throttles per account — five wrong codes and the account is locked for fifteen
minutes — which is the stronger control for this endpoint, because it still
bites when an attempt is distributed across addresses and no single IP trips
the edge rule. The edge rule's job is to keep that volume off the Worker.
