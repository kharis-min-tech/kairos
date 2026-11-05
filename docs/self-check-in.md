# Self-check-in — rotating QR

A signed-in member records their own attendance one way: **the rotating QR**.
The admin desk displays a code that rotates every 30 seconds; the member scans
it and their client posts the encoded token to
`POST /api/attendance/services/:id/self-check-in-qr`.

It runs the core in `apps/api/src/attendance/service.ts` —
`performSelfCheckIn`, deliberately unexported — so the branch-configured
window, the Late-after threshold and idempotency all apply, behind a
signature-verify step.

## Why there is no "I'm here" button

There used to be a second path: an honour-system `POST
/api/attendance/services/:id/self-check-in` that recorded the caller present
with no proof of presence at all, surfaced as an "I'm here" button on both
clients.

It wrote a row **byte-identical** to the QR-verified one — same `recordedBy`
(the member), same `attendance_status`, which is only `Present | Late |
Virtual`. So the verify step was performed and then discarded, and no
attendance row could afterwards be told apart from one tapped at home. The
effect was that every figure in every attendance report had to be read as
self-asserted.

Removed 2026-11-05: the route, the `selfCheckIn` service export, the
`api.attendance.selfCheckIn` client method, and the button on both clients.
A regression test in `attendance/service.test.ts` asserts the export is gone,
because removing the route alone would have left the service callable.

Attendance is now only recorded where somebody was seen:

- the member scans the rotating desk code (this document), or
- an usher scans the member's own code and records them through
  `recordAttendance` on the admin side.

**If a fallback is ever wanted**, it must be distinguishable in the data — a
column recording that presence was asserted rather than witnessed, not another
endpoint writing the same row. Reports have to be able to separate the two, or
the fallback silently sets the trust level of the whole dataset again.

## Branch config

Each branch owns four settings on the `branches` table:

| Column | Meaning |
| --- | --- |
| `self_check_in_enabled` | Master switch. Falsy → the QR endpoint throws 403. |
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
