# Kairos observability

Structured logging stack. Errors → Sentry (when wired). Info/warn/error log
lines → Cloudflare Workers Logs → Logpush → Axiom for long-term search.

## Log shape

The API emits one ndjson event per `logger.*` call. Every event carries:

| Field | Source | Why |
|---|---|---|
| `ts` | logger | ISO timestamp |
| `level` | logger | `debug` / `info` / `warn` / `error` |
| `msg` | call site | short, low-cardinality summary |
| `requestId` | middleware | correlate all lines from one request |
| `method` / `path` | middleware | route the request hit |
| `status` / `durationMs` | middleware (exit only) | tail-latency monitoring |
| `memberId` | auth middleware | caller — for audit and per-user replays |
| `activeRole` | auth middleware | one of `admin` / `member` |
| `branchId` | auth middleware | Kairos's primary slicing dimension |
| `fellowshipId` | per-module `patchLoggerContext` | when relevant |
| `departmentId` | per-module `patchLoggerContext` | when relevant |
| `...rest` | call site | ad-hoc structured fields |

This shape lets you ask Axiom things like:

- `branchId == "london-central" and level == "error"` — errors in one branch
- `module == "members" and action == "approve" | summarize count() by branchId` — approvals per branch
- `memberId == "<uuid>"` — full audit trail of one user
- `level == "info" and msg == "request" | summarize p95(durationMs) by path` — tail latency per route

## Log call conventions

```ts
import { logger } from '@kairos/utils';

logger.info('Member approved', {
  module: 'members',
  action: 'approve',
  targetId: memberId,
  outcome: 'success',
});
```

Rules:

- `msg` is a short, **low-cardinality** human label. Don't interpolate IDs into it — put IDs as fields.
- Add `module` and `action` consistently so Axiom can `summarize count() by module, action`.
- Don't log secrets, tokens, password hashes, or PII beyond what's already keyed (memberId is fine; raw email/phone is not).
- Pull request-scoped fields out of the call — middleware already attaches them.

## Adding a domain dimension mid-request

When a module learns something new it wants subsequent log lines to carry:

```ts
import { patchLoggerContext } from '@kairos/utils';

patchLoggerContext({ fellowshipId, departmentId });
```

Every `logger.*` call later in the same request inherits the new fields.

## Cloudflare wiring

### One-time setup

1. Cloudflare dashboard → **Workers & Pages → kairos-api → Logs → Add Logpush job**
2. Destination: **Axiom** (or BetterStack — same job shape)
3. Dataset: `kairos-api`
4. Filter: leave as `*` for now (the level filter happens server-side via `LOG_LEVEL`)
5. Format: `ndjson` (default)
6. Save.

The Logpush job streams every `console.{info,warn,error,debug}` line out to Axiom. Axiom auto-parses the JSON into queryable columns within ~30 seconds of ingest.

### Local dev

The logger writes JSON to stdout. Pipe through `jq` for human-readable output:

```bash
npm run dev:api | jq -c '. | "[\(.level)] \(.path) \(.msg) \(.requestId)"'
```

`LOG_LEVEL=debug` (env var) enables `logger.debug(...)` lines; defaults to `info`.

## Cost notes

- **Workers Logs** (built-in, included): 200k events/day free, 3-day retention. Use for live debugging.
- **Logpush**: enabled by Workers Paid (already on the plan). ~$0.05 per GB egress.
- **Axiom community tier**: 500 GB ingest, 30-day retention, free. Kairos at beta volume (~10 MB/day) is comfortably inside this.

At beta scale total observability cost is **$0/mo on top of Workers Paid**.

## When to escalate

Sentry covers exceptions with stack traces — wire that separately for error
deduplication, regression alerts, and source-map symbolication. Structured
logs cover everything else (requests, audit, performance, business events).
