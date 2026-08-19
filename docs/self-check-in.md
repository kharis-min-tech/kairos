# Self-check-in — honour system + rotating QR

Kairos supports two ways for a signed-in member to record their own attendance:

1. **Honour system** — the member taps "I'm here" on the mobile Check-in tab or
   the web `/attendance/check-in` page. `POST /api/attendance/services/:id/self-check-in`.
2. **Rotating QR** — the admin desk displays a QR that rotates every 30 seconds;
   the member scans it, and their client posts the encoded token to
   `POST /api/attendance/services/:id/self-check-in-qr`.

Both call the same core (`performSelfCheckIn` in `apps/api/src/attendance/service.ts`),
so the branch-configured window, the Late-after threshold, and idempotency all
behave the same. The QR path just adds a signature-verify step in front.

## Branch config

Each branch owns four settings on the `branches` table:

| Column | Meaning |
| --- | --- |
| `self_check_in_enabled` | Master switch. Falsy → both endpoints throw 403. |
| `self_check_in_open_minutes_before` | Window opens `start − N` minutes. |
| `self_check_in_close_minutes_after` | Window closes `start + N` minutes. |
| `self_check_in_late_after_minutes` | Status flips to `Late` after `start + N`. |

Managed at `/my-branch` → Attendance settings.

## Rotating QR — token shape

Tokens are **stateless HMAC-SHA256**, no DB. The signed payload is
`${serviceId}.${bucket}` where `bucket = floor(now_ms / 30_000)`. The wire
format is `${bucket}.${base64url(hmac)}`. Verifier accepts the current OR
previous bucket, so a scan on the second before rotation still succeeds.

Client encodes the QR as `kairos://check-in/{serviceId}/{token}`. On scan the
mobile / web scanner parses that string, drops the scheme, and posts
`{ token }` to `POST /api/attendance/services/{serviceId}/self-check-in-qr`.

The admin-desk QR page polls `GET /api/attendance/services/:id/qr-token` every
~30s and re-renders the QR. The endpoint is gated by the same authority as
`/services/:id/roster` — system admin, pastor (branch:read), or Admin-dept
volunteer.

## Setting the secret

The HMAC secret lives in `SELF_CHECK_IN_QR_SECRET`. It's a bearer secret — set
it once per environment via Wrangler:

```bash
# Generate a strong secret
openssl rand -base64 48

# Production
cd apps/api
wrangler secret put SELF_CHECK_IN_QR_SECRET
# (paste when prompted)

# Staging
wrangler secret put --env staging SELF_CHECK_IN_QR_SECRET
```

If you rotate the secret, any QR currently on screen becomes invalid after 60
seconds (one bucket + the grace bucket). No further action needed — no cache
to bust, no DB rows to invalidate.

Local Node dev falls back to `dev-self-check-in-qr-secret` (see
`apps/api/src/attendance/router.ts:readQrSecret`); don't rely on that in any
deployed environment.

## Why not store the tokens?

We considered a `self_check_in_tokens` table with `(serviceId, token, expiresAt)`
rows written every 30s. Stateless HMAC gives the same rotation guarantee for
zero writes and zero read latency. The only trade-off is that revoking a
single leaked token is impossible — but rotating the secret revokes them all
within one bucket, and the tokens themselves already expire in 30s.
