# Backup and recovery

**Status:** first draft, 2026-11-08. This document is deliberately split into
what the repository proves and what only the PlanetScale and Cloudflare consoles
can confirm. Nothing in the repo configures, schedules or tests a backup, so
almost everything about *backups* is in the second category — while almost
everything about *restore* is constrained by code, and is in the first.

---

## 1. What the repository proves

| Fact | Evidence |
|---|---|
| Production database is PlanetScale Postgres **PS-5, 3-node HA, AWS eu-west-2** | `docs/database-architecture.md` §1, locked 2026-06-24. Provisioned and billed through Cloudflare. |
| The Worker reaches it through **Cloudflare Hyperdrive**, not directly | `apps/api/wrangler.jsonc:18-23` (prod binding), `:108-114` (staging). `apps/api/src/worker.ts:71` passes the Hyperdrive connection string to `withDb()`. |
| Staging is a **separate PlanetScale branch behind a separate Hyperdrive** | `wrangler.jsonc:111`, and the one-time setup note at `:97` — `pscale branch create kairos staging --schema-only` |
| Staging therefore holds **seeded data, not production data** | The branch was created schema-only; it is hydrated by the seed scripts in `packages/database/src/` |
| There are **63 migrations**, `0000`–`0062` | `packages/database/drizzle/*.sql` |
| Migrations run **only** through `db:bootstrap` | `docs/commands.md`; both deploy workflows call `npm run db:bootstrap` (`deploy-staging.yml:53,56`; `deploy-production.yml:60,63`), with a `--dry-run` preview first |
| **No backup, snapshot, export or restore script exists anywhere in the repo** | No `pg_dump`, no `pscale backup`, no scheduled export. The only `scheduled` handler is `apps/api/src/worker.ts:86`, which runs the lifecycle and digest crons and touches no backup. |
| Object storage is **Cloudflare Images only — there is no R2 bucket** | No `r2_buckets` in `wrangler.jsonc`, no `R2Bucket` binding, no `R2Bucket` type reference anywhere in the monorepo. Profile photos go to Cloudflare Images via `apps/api/src/media/service.ts:36`. |

That last row matters and corrects a common assumption: **Cloudflare Images is
not a backed-up store you control.** It has no versioning, no point-in-time
recovery, and the repo contains no code that can enumerate or export its
contents. Profile photos are, today, the one dataset with no recovery story at
all.

### What 3-node HA does and does not give you

PS-5 with 3-node HA protects against the loss of a node. It does **not** protect
against:

- a migration that drops or corrupts a column,
- a bulk update with a wrong `WHERE` clause,
- `db:bootstrap --force` run against the wrong `DATABASE_URL`,
- an application bug writing bad data across many rows,
- a compromised `DATABASE_URL` used to delete data deliberately.

Every one of those replicates to all three nodes immediately. HA is an
availability control; the only recovery control for the above is a backup or
point-in-time recovery, and that is the subject of §2.

---

## 2. What needs confirming in the console

The repository is silent on all of this, and the decision record says so
explicitly. `docs/database-architecture.md` §11 lists as still-open:

> - **Backup retention strategy beyond PlanetScale's default** — set during
>   Phase 2 (#43 in production-readiness cluster).
> - **PITR (point-in-time recovery) window** — PlanetScale defaults are
>   reasonable; revisit if compliance demands custom retention.

"PlanetScale defaults are reasonable" is an assumption that has never been
checked against the console or against a stated recovery objective. Before the
pilot, someone needs to open the PlanetScale dashboard for `kairos-prod` and
record the answers to these, in this document:

- [ ] Are automated backups enabled, and on what schedule?
- [ ] What is the backup **retention period** on the PS-5 plan?
- [ ] Is point-in-time recovery available on PS-5, and if so what is the window?
- [ ] Are backups encrypted at rest, and where are they stored — same region as
      the primary (eu-west-2) or elsewhere? This is a UK GDPR transfer question,
      not just a resilience one, and the privacy notice already tells members
      their data is "stored in the United Kingdom / European Economic Area"
      (`apps/web/src/app/legal/privacy/page.tsx:233-236`).
- [ ] Can a backup be restored **into a new branch** rather than over the
      primary? This determines whether the restore procedure in §4 can be
      rehearsed without an outage.
- [ ] Is there any **export** that leaves PlanetScale, so that a PlanetScale
      account compromise or billing lapse is survivable?

That last one is the gap most likely to be challenged. A backup held only inside
the vendor you are trying to be resilient against is not a complete control, and
`docs/database-architecture.md` §5 Trigger 5 already contemplates PlanetScale
becoming unviable — including "sustained outage or data-integrity incident" as a
trigger. The escape hatch described there (`pg_dump` → RDS Multi-AZ) assumes a
`pg_dump` is possible, which it is, but nothing schedules one.

Also to confirm, outside PlanetScale:

- [ ] **Hyperdrive caching.** Hyperdrive sits in front of the database and caches
      query results. A database restore does not invalidate that cache. Confirm
      the configured cache TTL for `kairos-prod-hyperdrive` so the recovery
      procedure can account for stale reads immediately after a restore.
- [ ] **Cloudflare Images.** Whether any export mechanism exists for the
      account's images, and whether Cloudflare retains deleted images at all.
- [ ] **Worker secrets are not recoverable.** Cloudflare secrets are write-only
      (see `key-management.md` §5). A lost secret must be re-minted, not
      restored. Confirm that every value in `key-management.md` §2 is
      independently recorded in the church's password manager — otherwise the
      recovery procedure for "Cloudflare account lost" has no path back.

> **DECISION NEEDED: RPO (recovery point objective) — how much data the church can afford to lose.**
> **Recommended: 1 hour.** The realistic worst case is a Sunday morning: a
> failure at 11:00 that loses an hour costs one service's attendance records,
> any check-ins, and a handful of form submissions — annoying, re-enterable, and
> nothing irreplaceable. A 24-hour RPO would, on the same Sunday, lose the entire
> service.
> **Trade-off:** a 1-hour RPO essentially requires PITR rather than daily
> snapshots. If PS-5 does not offer PITR, the honest choices are to accept the
> snapshot interval as the RPO and say so, or to upgrade the plan. **Do not write
> down 1 hour until the console confirms it is achievable** — an RPO the
> infrastructure cannot meet is worse than an honest 24 hours.

> **DECISION NEEDED: RTO (recovery time objective) — how long the church can be without Kairos.**
> **Recommended: 8 working hours for data loss, 1 hour for an availability-only outage.**
> The two differ because the recovery paths differ. An availability outage
> (Worker broken, bad deploy) is fixed by redeploying a previous version, which is
> minutes. A data-loss event requires a restore, a schema reconciliation (§3) and
> a verification pass, and 8 hours is realistic for one person doing it carefully
> for the first time.
> **Trade-off:** a tighter RTO means pre-rehearsed runbooks and a second person
> trained on them, which is a staffing commitment, not a technical one. 8 hours
> is only honest if the restore has actually been rehearsed once — otherwise the
> first attempt will take a day. See §5.
> **Context that makes this easier:** the pilot is one branch, on production,
> with structural seeding only and no member import. A day of downtime during
> the pilot is recoverable in a way it will not be at 21 branches.

---

## 3. The constraint that makes recovery harder than it looks

**Migrations run only through `db:bootstrap`** — never raw `psql`, never
`drizzle-kit migrate`. `docs/commands.md` states this for every environment
including local, and the reason is recorded in the script's own header
(`packages/database/src/bootstrap.ts:1-38`):

> Why this exists: `drizzle-kit migrate` reads `drizzle.__drizzle_migrations` to
> decide what to apply. If that journal ever falls out of sync with the actual
> schema (a `public` wipe that spared the `drizzle` schema, a partial apply that
> inserted the journal row before failing, **a snapshot restore that kept only
> some tables**) then `drizzle-kit migrate` cheerfully says "migrations applied
> successfully" and does nothing while your schema stays broken.

That parenthetical names a restore as one of the three ways the journal drifts.
This is not hypothetical: journal-versus-disk drift has been hit three times in
this project's history. So the first thing to understand about recovery here is
that **a restored database can be silently half-migrated, and the standard
migration tool will tell you it is fine.**

The second constraint is sharper, and it is the one that will bite:

> **`db:bootstrap` is NOT safe to run against a database that already has the schema.**

From the same header:

> Replaying is only a no-op for the hand-written migrations (0007+), which do
> guard with `IF NOT EXISTS` / `DO` blocks. The drizzle-kit-GENERATED files do
> not: 0000-0006 carry 28 bare `CREATE TABLE` and 15 bare `ALTER TABLE … ADD
> COLUMN` statements. Against a DB that already has those tables this fails on
> the very first file with "relation already exists".

So the instinct after a restore — "run the migrations to be sure" — fails
immediately on `0000`. Nothing is corrupted (postgres.js sends each file as one
implicit transaction, so it rolls back) but nothing progresses either, and the
operator is left guessing.

Three tools, and when each is correct:

| Command | Writes? | Use it when |
|---|---|---|
| `db:diagnose` | **No. SELECTs only.** | **Always first.** It answers the question the bootstrap dry-run cannot: an empty journal and a missing schema both print `would-apply` for every file, but they call for opposite actions. `packages/database/src/diagnose.ts:1-12`. |
| `db:bootstrap -- --dry-run` | No | After diagnose, to see which files the journal thinks are pending |
| `db:bootstrap -- --only=NNNN` | Yes, one file | The schema is current except for the newest migration. This is the **normal post-restore path** — replaying the whole directory would fail on `0000`. |
| `db:bootstrap` | Yes, all files | Only against a genuinely empty or genuinely incomplete schema |
| `db:bootstrap -- --force` | Yes, replays everything | Only when the journal is stamped as done but the schema was not changed. Safe only for `0007+`. |

### The journal defect that makes the container path actively dangerous

**`apps/api/entrypoint.sh:19` runs `drizzle-kit migrate`** — the one surviving
non-bootstrap migration path. It is **latent**: the script is referenced only by
`apps/api/Dockerfile`, and nothing in `.github/workflows/` builds that image, so
it cannot fire in CI or on Cloudflare. It fires only if someone runs the
container — which is precisely a container-based recovery.

And that path is now known to be unsafe, because `drizzle/meta/_journal.json`
carries a timestamp defect. Verified by reading the journal:

| idx range | `when` values | Decoded dates |
|---|---|---|
| 44–53 | `1801300000000` … `1810300000000`, all round numbers | **2027-01-30 … 2027-05-14 — dates in the future** |
| 54–56 | `1791263375986`, `1791326315506`, `1791363961997` | 2026-10-06 … 2026-10-07 (genuine generated values) |
| 57–62 | `1791450000000` … `1793150000000` | 2026-10-08 … 2026-10-28 |

The maximum `when` in the whole journal belongs to **idx 53**
(`0053_outreach_coordinator_integrity`, `1810300000000`). A block of
hand-authored round timestamps at idx 44–53 was written on a wrong scale and
landed roughly eight months in the future, so everything genuinely authored
since sits *below* the maximum.

**Consequence: nine migrations — `0054` through `0062` — sit after the
maximum-timestamp entry.** `drizzle-kit migrate` applies entries in journal
order against what the `drizzle.__drizzle_migrations` table already records, so
a database stamped up to idx 53 will have those nine **silently skipped**: the
command reports success and the schema stays nine migrations behind, missing
`0054_safeguarding_head_and_minister`, `0056_member_guardians`,
`0057_oauth_authorization_server`, `0059_gift_aid_declarations` and the rest.

That is the exact failure mode `db:bootstrap` was written to prevent, described
in its own header as "cheerfully says 'migrations applied successfully' and does
nothing while your schema stays broken". A container-based recovery would hit
it, and the missing tables include guardianship and Gift Aid.

Carded at <https://trello.com/c/cieH533p>.

**Two actions, neither of which is this document's to take:** fix the idx 44–53
timestamps so the journal is monotonic, and delete the `drizzle-kit migrate`
line from `entrypoint.sh` rather than leaving a path that will skip nine
migrations without complaint. Until the first is done, **`drizzle-kit migrate`
must not be run against any Kairos database**, which is what
`docs/commands.md` already says — but it now has a concrete reason attached
rather than a historical one.

The entrypoint has a second recovery hazard worth noting while it exists: after
migrating it runs `seed.ts` and `seed-souls.ts`. **Seeding a restored
production database is not a recoverable mistake.**

---

## 4. Restore procedure

Written for the realistic case: data loss discovered in production, backup or
PITR available, one person executing. Declare an incident first — see
`incident-response.md`.

**Before anything, stop the writes.** A restore into a database that is still
accepting traffic produces a mixture of old and new data that is worse than
either. There is no maintenance mode in the application, so the containment
options are:

- Delete the Worker's route in the Cloudflare dashboard (fast, reversible,
  returns an error to users), or
- `wrangler deploy` a build that returns 503 on every route (slower, friendlier).

Neither is scripted. The absence of a maintenance-mode switch is a gap worth
noting.

```text
 1. Record the time you want to recover to, and why. Write it in the incident log
    before touching anything — it is the one input you cannot reconstruct later.

 2. Stop writes (above). Note the time.

 3. Restore into a NEW PlanetScale branch, never over the primary, if the plan
    allows it. This keeps the damaged primary available for forensics and makes
    the restore reversible. If it does not allow it, take a pg_dump of the
    damaged database first — you cannot investigate what you have overwritten.

 4. Point a throwaway Hyperdrive config at the restored branch, or connect
    directly with psql for verification only. Do NOT repoint the production
    Hyperdrive yet.

 5. Reconcile the schema — the step most likely to be skipped:
      DATABASE_URL='<restored>' npm run db:diagnose --workspace=@kairos/database
    Read the output. Three outcomes:
      (a) schema intact, journal intact  → nothing to do, go to 6
      (b) schema intact, newest migration missing
                                         → db:bootstrap -- --only=NNNN
      (c) schema genuinely incomplete    → db:bootstrap (full)
    Never run the full bootstrap in case (b). It fails on 0000 and tells you
    nothing useful.

 6. Verify the data, not just the schema. At minimum:
      - row counts on members, service_attendance, form_submissions,
        gift_aid_declarations, audit_log, member_health_records
      - the most recent createdAt in each, compared against the target recovery
        point
      - that gift_aid_declarations survived intact — these are HMRC evidence and
        the only records the church repays tax over if it cannot produce them

 7. Repoint the production Hyperdrive at the restored branch.

 8. Account for the Hyperdrive cache. Query caching sits in front of the
    database and is not invalidated by a restore. Either wait out the configured
    TTL (see §2) or recreate the Hyperdrive config.

 9. Resume writes. Redeploy the Worker to force fresh isolates.

10. Verify from the outside: sign in, load the members directory, record one
    attendance, submit one form.

11. Quantify the loss. Everything written between the recovery point and step 2
    is gone. Identify it by data type and tell the affected branch what they need
    to re-enter. Attendance and check-ins are re-enterable from memory on the
    same day; form submissions are not.

12. Decide whether this is a personal-data breach. Loss of availability or
    destruction of personal data IS a breach under UK GDPR — see
    incident-response.md §4. It is the most commonly missed notifiable category.
```

### What this procedure cannot recover

- **Profile photos.** Cloudflare Images is outside the database restore. A
  database rolled back to last night still references image ids that exist; a
  Cloudflare Images incident is unrecoverable with what is in place today.
- **Worker secrets.** Write-only, not restorable. See §2.
- **Audit trail of the incident itself.** `audit_log` lives in the same database
  as the data it audits, so a restore rolls the audit trail back too. Any
  sign-in, role grant or OAuth event between the recovery point and the failure
  is gone — including, potentially, the attacker's. **Before restoring, export
  `audit_log` for the affected window.** This is the single most important thing
  to do in step 3 and the easiest to forget.

> **DECISION NEEDED: whether `audit_log` should be shipped out of the database.**
> **Recommended:** yes — the structured logger already emits every request to
> Cloudflare Workers Logs with `memberId`, `activeRole` and `branchId` attached
> (`../observability.md`), and the Logpush → Axiom path described there would
> give the audit trail an independent copy with its own retention. Audit evidence
> that shares a failure domain with the data it describes is not independent
> evidence.
> **But note that path does not currently exist.** `"logpush": true` appears
> nowhere in `apps/api/wrangler.jsonc`, for either environment, and a Worker
> emits to Logpush only when its own config carries that flag — so the pipeline
> in `../observability.md` was never wired. Logs stop at Workers Logs,
> head-sampled, retained for days. Enabling it is an open decision in
> `incident-response.md` §9.
> **Trade-off:** enabling it duplicates personal data into a second system with
> its own retention and transfer questions, and adds a processor that needs a
> DPA — see `ropa.md` §3.

---

## 5. Restore testing

**No restore has been tested.** There is no script, no runbook before this one,
and no record of a rehearsal. An untested backup is a hypothesis.

> **DECISION NEEDED: the restore-test schedule, and who runs it.**
> **Recommended:** a full rehearsal before the pilot goes live, then quarterly,
> plus an unscheduled one after any change to the migration set that touches an
> existing table. Each rehearsal restores to a new PlanetScale branch, runs
> `db:diagnose`, runs the verification queries in §4 step 6, records the
> wall-clock time taken, and appends a dated line to §6 of this document.
> **Trade-off:** quarterly is a real time commitment — budget half a day each —
> and it is the first thing dropped when release pressure arrives. Monthly would
> be better practice and will not survive contact with a one-person team;
> quarterly that actually happens beats monthly that does not.

The rehearsal has a second purpose beyond proving the backup: **it is the only
way the 8-hour RTO in §2 becomes a measured number rather than a guess.** Record
the wall-clock time. If the first rehearsal takes two days, the RTO is two days
until it is rehearsed again.

Rehearsing is also where the schema-reconciliation path in §3 gets exercised
safely. Deliberately restore to a point *before* the newest migration, so the
operator hits case (b) in a drill rather than in an incident.

Staging is **not** a substitute. It was created `--schema-only` and is hydrated
by seeds, so it can rehearse the mechanics of a restore but proves nothing about
the fidelity of production data.

---

## 6. Rehearsal log

Nothing to record yet. Each entry should name the date, who ran it, the
recovery point targeted, which `db:diagnose` case was hit, the wall-clock time
from decision to verified, and anything that went wrong.

| Date | Run by | Target point | Diagnose case | Elapsed | Notes |
|---|---|---|---|---|---|
| — | — | — | — | — | No rehearsal has been performed. |

---

## 7. Open decisions, collected

1. Record the PlanetScale backup, retention, PITR and region answers from the
   console (§2 checklist).
2. RPO — recommended 1 hour, pending confirmation that PITR supports it (§2).
3. RTO — recommended 8 hours for data loss, 1 hour for availability; only
   honest once rehearsed (§2).
4. Whether an export leaves PlanetScale, so a vendor-level failure is
   survivable (§2).
5. Whether `audit_log` is shipped out of the database (§4).
6. The restore-test schedule and owner (§5).

Item 1 is a 20-minute task and blocks items 2 and 3. Nothing else in this
document can be finished before it.
