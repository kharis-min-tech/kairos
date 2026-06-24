# Database Architecture & Hosting Decision

**Status:** Locked 2026-06-24
**Authors:** Daniel Bolarinwa, Claude (Opus 4.7) — Phase 0 production-readiness
**Supersedes:** the "Neon free → RDS Year 3-4" plan from 2026-06-23

This is the durable architectural record. Short-term operational state lives in `.claude/memory/project_phase_0_prod_decisions.md`. If those drift, **this doc wins.**

---

## 1. Decision

**Production database: PlanetScale Postgres PS-5 in AWS eu-west-2 (London), 3-node HA, $15/mo flat — provisioned and billed through Cloudflare.** The database is fronted by Cloudflare Hyperdrive (auto-created by the dashboard flow), giving us connection pooling + edge query caching with a single Cloudflare invoice line item.

Scaling path:

| Year | Branches | Tier | Monthly |
|---|---|---|---|
| 2026 (beta) | 21 | PS-5 | $15 |
| 2027 | 30-40 | PS-10 | ~$48 |
| 2028-29 | 50-60 | PS-20 | ~$78 |
| 2030-31 | 70-80 | PS-40 | ~$135 |
| **2033 target** | **100** | **PS-80** | **~$230-250** |

**Cumulative 7-year DB spend: ~$8-12k.** Escape hatch (if PlanetScale ever fails as a vendor): standard **RDS Postgres Multi-AZ**, **not** Aurora.

---

## 2. The runtime stack this DB plugs into

```
                     ┌──────────────────────────┐
   browsers ───────► │  Cloudflare Pages         │
                     │  (Next.js, edge-cached)  │
                     └─────────────┬────────────┘
                                   │ fetch
                                   ▼
                     ┌──────────────────────────┐
                     │  Cloudflare Workers       │
                     │  (Hono API, V8 isolates) │
                     └─────────────┬────────────┘
                                   │ env.HYPERDRIVE.connectionString
                                   ▼
                     ┌──────────────────────────┐
                     │  Cloudflare Hyperdrive    │
                     │  (pooling + query cache) │
                     └─────────────┬────────────┘
                                   │ postgres.js (prepare: false)
                                   ▼
                     ┌──────────────────────────┐
                     │  PlanetScale Postgres     │
                     │  PS-5, 3-node HA, London │
                     │  (provisioned via & billed │
                     │   through Cloudflare)     │
                     └──────────────────────────┘
                                   │
                                   │ (escape hatch)
                                   ▼
                     ┌──────────────────────────┐
                     │  RDS Postgres Multi-AZ    │
                     │  (only if PS fails)      │
                     └──────────────────────────┘
```

**Cloudflare Hyperdrive IS in the stack.** When you provision PlanetScale Postgres through the Cloudflare dashboard, Cloudflare auto-creates a Hyperdrive configuration that fronts the database. The Worker accesses the connection string via the `HYPERDRIVE` binding in `wrangler.toml`. Hyperdrive handles connection pooling + edge-cacheable read queries; PlanetScale handles HA + storage. Billing: PlanetScale usage appears as a line item on your Cloudflare invoice — same per-tier pricing as buying direct from PlanetScale.

This means the PR 3 design (`bindDbEnv(env.HYPERDRIVE.connectionString)`) is exactly right. The pivot from Neon → PlanetScale didn't change the code path; only the provider behind Hyperdrive changed.

---

## 3. Why PlanetScale (over Neon, over Aurora)

### vs Neon Launch

| Factor | Neon Launch | PlanetScale PS-5 | Winner for Kairos |
|---|---|---|---|
| Beta monthly cost | ~$13-18 variable | **$15 flat** | PS (predictability) |
| HA / durability | Built-in (compute/storage split) | **3-node explicit** | PS (reasoning clarity) |
| Storage included | $0.35/GB-month | **10 GB included** | PS (psychological runway) |
| Scale-to-zero | Yes | No | Neon (but $15/mo makes it moot) |
| Cloudflare integration | Hyperdrive required | **Native binding** | PS (one less moving part) |
| Postgres maturity (vendor) | 3+ years | <1 year | Neon (but PS's MySQL/Vitess heritage is solid) |
| Bill predictability | Variable | **Flat** | PS (church budget) |

**Decisive factor:** flat-bill predictability + included HA at the same beta price as Neon's variable estimate. A church administrator can budget $15/mo; they cannot budget "~$13-18 variable, could spike on a busy Sunday."

### vs Aurora (Serverless v2 or provisioned)

Aurora at 2033 target scale (~$300-600/mo) is **more expensive than PlanetScale PS-80 (~$250/mo)** and buys features Kairos doesn't need:

- **Aurora Global Database** — sub-second cross-region replication. Needs >250 globally distributed write-active branches.
- **Massive vertical scale** — up to 512 GB RAM. Needs >5,000 branches.
- **RDS Proxy / 5,000+ concurrent connections** — needs ~1M concurrent users.
- **Backtrack, parallel query, cluster cache management** — niceties, not needs.
- **HIPAA BAA / FedRAMP** — not church requirements.

**Aurora Serverless v1** (the only Aurora variant with true scale-to-zero) **reached EOL 2024-12-31**. v2's minimum 0.5 ACU floor means always-on cost — its value prop for sporadic-traffic workloads evaporated.

**Conclusion:** Aurora is the right answer for a different shape of customer. If PlanetScale ever fails Kairos, the natural successor is **standard RDS Postgres Multi-AZ** (~$300-400/mo at 2033 scale), not Aurora.

---

## 4. Cost & capacity trajectory to 2033

### Volume estimate at 2033 target

100 branches × ~200 members/branch ≈ **20,000 members**.

| Table | Est. rows at 2033 | Est. size |
|---|---|---|
| `members` | 20,000 | ~40 MB |
| `fellowships` | 1,000 | ~1 MB |
| `branch_departments` | 1,000 | ~1 MB |
| `member_roles` | ~5,000 | ~3 MB |
| `service_attendance` (7 yrs) | ~50-70M | ~25-35 GB |
| audit / sessions / tokens | — | ~5-10 GB |
| **Total** | | **~40-60 GB** |

**Peak QPS** (Sunday service window): write peak ~10-20 QPS; daily reads ~50-100 QPS peak. **Moderate workload — not high-scale SaaS territory.**

**RAM needed at 2033:** working set (hot indexes + recent rows) ~4-8 GB. PS-80 (8 GB/node × 3) fits comfortably.

### Tier ladder math

PlanetScale tier prices (eu-west-2, 3-node HA, single region, retrieved 2026-06-24):

| Tier | $/mo | vCPU/node | RAM/node | Storage incl. | Storage overage |
|---|---|---|---|---|---|
| PS-5 | $15 | 1/16 | 512 MB | 10 GB | $0.435/GB |
| PS-10 | $46 | 1/8 | 1 GB | 10 GB | $0.435/GB |
| PS-20 | $69 | 1/4 | 2 GB | 10 GB | $0.435/GB |
| PS-40 | $116 | 1/2 | 4 GB | 10 GB | $0.435/GB |
| PS-80 | $209 | 1 | 8 GB | 10 GB | $0.435/GB |
| PS-160 | $408 | 2 | 16 GB | 10 GB | $0.435/GB |
| PS-320 | $818 | 4 | 32 GB | 10 GB | $0.435/GB |

Egress: 100 GB/mo included, $0.06/GB after.

**At 2033 target:** PS-80 base ($209) + ~40 GB storage overage ($17.40) = **~$230/mo**. Egress likely stays under 100 GB free quota — a church is not a video service.

### Storage configuration at provisioning

PlanetScale's create-database flow has two storage knobs separate from the tier:

| Setting | Value | Why |
|---|---|---|
| **Minimum disk size** | **10 GB** | Matches the included quota — no reason to set higher and pay for unused capacity |
| **Storage limit (auto-scale ceiling)** | **100 GB** | 2× the 2033 projection (40-60 GB), with hard-cap protection against runaway billing |

**Why the ceiling matters.** The storage limit is the auto-scale ceiling AND a billing fuse. At the default 4096 GB ceiling, a runaway process (data leak, malicious bulk insert, forgotten audit-log retention) could rack up ~$1,700/mo in overage at $0.435/GB. At 100 GB the worst case is ~$39/mo overage — enough headroom to absorb normal spikes (Sunday service writes, bulk imports), tight enough that real growth triggers an alarm-bell review.

**Don't set the ceiling too tight either.** A 20 GB ceiling means a transient spike hits the cap and write outages start. 100 GB is the sweet spot: ~70% headroom over 2033 needs, raises in one click when actually warranted (see §5 Trigger 2a).

---

## 5. Migration triggers (when to step up tiers)

**Watch leading indicators, not the calendar.** Each tier upgrade is a one-click action in the PlanetScale dashboard (or `wrangler`-bound config change). Plan ahead 1-2 weeks to validate, not months.

### Trigger 1: PS-5 → PS-10 (~$15 → $46/mo)
**Signal:** Any of:
- P95 query latency creeping above ~50ms during Sunday service window
- PlanetScale dashboard shows >70% memory utilisation on primary
- OOM events in PlanetScale logs
- DB size approaches 10 GB included quota

**Likely:** Year 1-2 (~2027). Driven by RAM, not storage.

### Trigger 1a: Storage ceiling raise (100 GB → 250 GB)
**Signal:** Used disk reaches **70 GB** (70% of the 100 GB ceiling set at provisioning — see §4 "Storage configuration at provisioning").
**Action:** Raise the storage-limit auto-scale ceiling to 250 GB in the PlanetScale dashboard. One-click; no migration. **Don't raise to 4096 GB (the default)** — the ceiling is the runaway-billing fuse.
**Why:** Buys ~3× headroom over the new used floor and re-establishes the runaway-billing buffer. At 250 GB the worst-case overage stays under ~$110/mo.
**Likely:** Year 4-5 — should be well after 2033 if attendance archival is in place.

### Trigger 2: PS-10 → PS-20 (~$46 → $69/mo)
**Signal:** Same RAM/latency markers OR DB size >15 GB.
**Likely:** Year 2-3.

### Trigger 3: PS-20 → PS-40 → PS-80
**Signal:** Sustained CPU >60% on primary OR P95 latency >80ms during peak.
**Likely:** Year 3-5.

### Trigger 4: Regional read replica for Africa branches
**Signal:** >30% of weekly requests originate from Africa Cloudflare PoPs AND P95 DB query latency from those PoPs >150ms.
**Action:** Add a PlanetScale read replica in a closer region (af-south-1 if available, otherwise eu-central-1). Route reads via region detection in the Worker.
**Likely:** Year 3-5. **Independent of tier upgrades.**

### Trigger 5 (escape hatch): PlanetScale becomes unviable
**Signal:** any of:
- PlanetScale announces Postgres sunset
- Pricing changes adversely (>50% increase or new minimums)
- Sustained outage or data-integrity incident
- Operational complexity grows beyond comfort

**Action:** Migrate to **standard RDS Postgres Multi-AZ** in eu-west-2.
1. Provision RDS db.m6g.large Multi-AZ (~$300/mo) in same region.
2. `pg_dump` from PlanetScale → `pg_restore` to RDS (low-traffic window, ~1-2 hour outage acceptable for beta scale).
3. Swap `DATABASE_URL` Worker secret.
4. Validate, then decommission PlanetScale after 1 week buffer.

Total migration effort: **1-2 days** of careful cutover. Standard Postgres wire protocol means no app-layer changes.

### What Aurora migration is reserved for

**Only if** any of:
- Branches > 500 (5× the 2033 target)
- Sub-second cross-region writes become a requirement
- AWS-specific compliance (HIPAA BAA / FedRAMP) is mandated by a partner

**None of these are on the visible roadmap.** Aurora is documented here so we don't forget it exists, not as a planned destination.

---

## 6. Why the PR 1-3 work is not wasted

The Workers-prep refactors shipped 2026-06-23 were necessary regardless of which Postgres provider we picked:

| PR | Change | Why it's still needed for PlanetScale via Cloudflare |
|---|---|---|
| PR 1 (`8b6256e`) | jsonwebtoken → jose | jose is Workers-compatible; jsonwebtoken needs Node built-ins. Provider-independent. |
| PR 2 (`c46ac69`) | bcrypt → @noble/hashes argon2id | argon2id runs on V8 isolates; native bcrypt doesn't. Provider-independent. |
| PR 3 (`55d3f58`) | Lazy db singleton + `prepare: false` | **`prepare: false` is required for Hyperdrive's pooler** (and PlanetScale's own pooler). Lazy init lets `bindDbEnv()` be called from the Workers fetch handler with a runtime-injected connection string. |

**Net change for PR 4:** `bindDbEnv(env.HYPERDRIVE.connectionString)` — exactly the call shape PR 3 was designed for. The pivot Neon → PlanetScale-via-Cloudflare changed which provider sits behind Hyperdrive; the code path is unchanged.

---

## 7. Architectural invariants (preserve at every stage)

1. **`branchId` scoping in every query** — `enforceBranchScope(auth, branchId?)` per service. Protects tenant isolation as you grow. Already enforced everywhere.
2. **Stateless API** — Hono is stateless. **Don't introduce in-memory caches that assume sticky sessions.** Workers spawn fresh isolates per cold start.
3. **`prepare: false` on postgres.js** — required for any Postgres pooler (PlanetScale, Hyperdrive, PgBouncer transaction mode). Set in `packages/database/src/index.ts`. **Don't remove this.**
4. **Idempotent write endpoints** — important once Cloudflare Queues / SQS are introduced. Most write endpoints are already idempotent via DB uniqueness constraints; preserve that.
5. **Connection string sourced from runtime env, not module load** — `apps/api/src/db.ts` reads via lazy Proxy. Workers can't read `process.env` at module load. **Don't refactor this back to a top-level read.**

## 8. Things explicitly NOT to do

- **Don't shard.** A single well-indexed Postgres handles 100 branches comfortably. Sharding is a >2035 concern if ever.
- **Don't introduce Redis.** Cloudflare Workers KV + Cache API cover all caching needs to 100 branches.
- **Don't go multi-master / Aurora Global Database / Spanner / Cockroach.** Read replicas cover Africa latency; single-region writes are fine to 200+ branches.
- **Don't migrate to microservices.** Module boundaries in the monorepo are sufficient organizational scaling.
- **Don't remove Hyperdrive.** It's auto-provisioned when you create PlanetScale Postgres via Cloudflare and provides connection pooling + edge query caching. Removing it would break the binding model.
- **Don't pre-buy reserved instances on PlanetScale.** Their tier model already amortises; reserved-instance economics are an RDS concept.

---

## 9. Alternatives considered (for the record)

| Option | Beta cost | 2033 cost | Why rejected |
|---|---|---|---|
| Neon Free | $0 | n/a (suspends at 0.5 GB) | Production-hostile suspension behaviour |
| Neon Launch | ~$13-18 variable | ~$500-700 | Variable bill; scale-to-zero useless at sustained scale |
| Supabase Pro | $25 | similar to Neon | Same shape as Neon, slightly worse pricing |
| Aurora Serverless v1 | n/a | n/a | EOL'd 2024-12-31 |
| Aurora Serverless v2 | ~$50/mo idle | ~$300-400 | More expensive than PlanetScale, features unused |
| Aurora provisioned Multi-AZ | n/a | ~$500-600 | Significantly more expensive, no clear benefit |
| RDS db.t4g.micro free tier | $0 (12 mo) | ~$300-400 | No scale-to-zero; free tier ends; manual ops burden |
| Self-hosted Postgres on Hetzner | ~$5-10 | ~$50-100 + ops | Real ops burden; backups, monitoring, upgrades manual |
| PlanetScale MySQL (their other product) | $15 | similar | Would require Drizzle dialect rewrite, lose Postgres-specific features (JSONB, partial indexes) |

---

## 10. Naming conventions

For cloud resources tied to this database. Established 2026-06-24.

### Database resource names (Cloudflare / PlanetScale dashboard)

Pattern: **`{app}-{env}`** — lowercase, hyphenated.

| Resource | Name |
|---|---|
| Production database | **`kairos-prod`** |
| Staging database (if added) | `kairos-staging` |
| Shared dev database (rarely needed; local Postgres preferred) | `kairos-dev` |

**Rules:**
- Lowercase only.
- Hyphens between segments — cloud resources use `-`, not `_`.
- **No org prefix.** The Cloudflare account already namespaces the org; `kharis-kairos-prod` is redundant.
- **No region suffix on the primary** — we're single-region by default. Regional read replicas DO get a region suffix: e.g. `kairos-prod-replica-fra` if we add a Frankfurt replica (see §5 Trigger 4).
- Use the full word `prod`, not `prd` — legibility beats one saved character.

### Inside the resource

| Layer | Name | Why |
|---|---|---|
| Inner Postgres database (connection string path) | `postgres` | PlanetScale's default — don't rename; renaming requires `CREATE DATABASE` inside the cluster for zero practical benefit |
| Hyperdrive config | `kairos-prod-hyperdrive` | Disambiguates from the PlanetScale DB (`kairos-prod`) in the Cloudflare dashboard |
| `wrangler.toml` binding variable | `HYPERDRIVE` | Generic — survives a future provider swap |
| Drizzle table names | snake_case (already established) | `members`, `branch_departments`, `service_attendance` |
| Drizzle TS exports | camelCase (already established) | `branchDepartments` |

### Patterns to avoid

| Pattern | Why skip |
|---|---|
| `kharis-kairos-prod` | Org prefix is redundant inside our own Cloudflare account |
| `kairos-prod-lon` | Region noise on a single-region primary; the dashboard shows region |
| `kairos-prd` | Saves one character at the cost of legibility |
| `kairos-production` | Verbose; "prod" reads instantly |
| `production` (no app prefix) | Ambiguous once a second DB is added to the account |
| Mixing `_` and `-` in the same name | Inconsistent — `-` for cloud resources, `_` for Postgres internals |

### API tokens / secrets

Pattern: **`{app}-{tool-or-purpose}-{context}`** — distinct context per token so they can be rotated independently.

| Use case | Name |
|---|---|
| Local wrangler CLI (developer machine) | `kairos-wrangler-{developer-name}` or `kairos-wrangler-local` for the primary dev |
| CI/CD pipeline deploys | `kairos-wrangler-ci` |
| One-off script / migration runner | `kairos-{purpose}-runner` |
| AWS SES sender IAM user (when moved to IaC) | `kairos-ses-sender` |

**Rules:**
- One token per distinct context — never share a token between local dev and CI.
- Scope-narrow tokens when possible (e.g. CI token can be restricted to `kairos-api` Worker; local token has broader account access for convenience).
- Tokens are rotated by deleting the named token in the Cloudflare dashboard and minting a new one with the same name — names persist, values don't.
- **Avoid** generic names like `wrangler-token`, `prod-token`, `ci-token`: ambiguous once the account hosts more than one project or environment.

---

## 11. Open questions deferred to the right moment

- **When PlanetScale Postgres adds eu-west-2 to its scale-to-zero (if ever)** — re-evaluate Year 2.
- **Africa region availability** — if PlanetScale adds af-south-1 or a closer region, evaluate at Trigger 4 firing time.
- **Backup retention strategy beyond PlanetScale's default** — set during Phase 2 (#43 in production-readiness cluster).
- **PITR (point-in-time recovery) window** — PlanetScale defaults are reasonable; revisit if compliance demands custom retention.

---

## References

- PlanetScale Postgres pricing (eu-west-2, 0 replicas, x86-64), retrieved 2026-06-24
- Neon pricing page, retrieved 2026-06-24
- `.claude/memory/project_phase_0_prod_decisions.md` — operational state of Phase 0 cluster
- `.claude/memory/project_scale_milestones.md` — trigger-based scaling plan
- `.claude/memory/project_pr4_setup_steps.md` — Cloudflare/AWS/PlanetScale signup checklist
- Git commits: `8b6256e` (PR 1 jose), `c46ac69` (PR 2 argon2id), `55d3f58` (PR 3 lazy db)
