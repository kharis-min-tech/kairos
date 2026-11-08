# Security and data protection

Written for the pre-release cyber-security review, 2026-11-08. Nine documents
covering the questions that are about the **organisation** rather than the
software, which is why code fixes alone could not close them.

Every factual claim in these documents was checked against the code at the time
of writing, and each file says where it could not be checked — a Cloudflare or
PlanetScale dashboard setting, or a commitment only the church can make.

| | |
|---|---|
| [Key management](key-management.md) | Every secret the system uses, where it lives, who can change it, how it rotates, and what to do when one leaks — including the two rotations that invalidate things. |
| [Data retention](data-retention.md) | A schedule per data type with its legal basis, and an honest account of the gap between the periods the privacy notice publishes and the almost total absence of enforcement. |
| [Incident response](incident-response.md) | Detection, severity, containment and recovery, with a concrete UK GDPR Article 33 decision procedure for the 72-hour clock and a tabletop exercise built around children's safeguarding records. |
| [Backup and recovery](backup-recovery.md) | What PlanetScale provides, what still needs confirming in the console, and the restore procedure — including why `db:bootstrap` cannot simply be re-run after a restore. |
| [Secure SDLC](secure-sdlc.md) | The lifecycle as it actually operates — branch protection, the four-command gate, the agent workflow — plus a threat model using the vulnerability classes a real review found here as worked examples. |
| [Regulatory mapping](regulatory-mapping.md) | UK GDPR obligation by obligation, mapped to where it is met, partly met, or not met. Confirms PCI DSS is out of scope and says why. |
| [WAF rate limiting](waf-rate-limiting.md) | The rate-limiting rules to create by hand in the Cloudflare dashboard, derived from the actual route surface. Edge rules rather than in-Worker counters, because the Worker binds Hyperdrive and nothing else — there is nowhere to keep a counter. |

## The two statutory records

These are the documents the pilot genuinely cannot start without, because
processing that begins without them is non-compliant from day one and cannot be
fixed retrospectively. **Both are drafts and neither is signed.**

| | |
|---|---|
| [DPIA](dpia.md) | The Article 35 assessment, mandatory here because the pilot processes children's health data. Describes the processing, scores nine risks against defects that actually existed in this codebase, and leaves sign-off, residual-risk acceptance and the DPO question open. |
| [ROPA](ropa.md) | The Article 30 record: six processing activities with their lawful bases, recipients, processors, transfers, retention and security measures. The processor list is deliberately accurate rather than matching the privacy notice. |

## How to read these

**Three statuses, used consistently.** "Met" means implemented and verified.
"Partly met" means something real exists with a named gap. "Not met" means it
does not exist — said plainly, because a document that hedges is one nobody
acts on.

**`> **DECISION NEEDED:**` marks a commitment only the church can make** — a
retention period, a recovery objective, a named role. Each one carries a
recommended value and the trade-off, but **the recommendation is not a
decision**, and none of them should be cited as settled policy until someone
with the authority to decide has done so.

There were **45 such markers** across these documents, covering 43 distinct
decisions — two appear in more than one file because they are a prerequisite for
both. Each document collects its own at the end, and a few further
recommendations appear only in those collected lists where they were too small
to interrupt the text for.

**Six have since closed with real answers**, and the documents record them
rather than still asking:

- The **DPO is Tianna Johnson**. Her contact details are still outstanding, and
  Article 13(1)(b) requires them to be published.
- The **controller is Kharis Ministries**, ICO registration **ZB659958**,
  renewing **12 February 2027**. "Kharis Church" is the operating name — one
  body, two names, so there is no Article 26 or 28 question between them. The
  privacy notice has been corrected to match — merged as #76 and deployed to
  staging on 8 November 2026. Other statements in that notice are still wrong
  and are tracked separately.
- **All four processor DPAs are held**, retrieved 8 November 2026, with versions
  recorded in `ropa.md` §3. That closes Article 28 *evidence* and nothing else.
- **Logpush is confirmed not enabled**, so Axiom is not a processor and the
  breach-investigation window is days rather than thirty.
- The `drizzle-kit migrate` path in `entrypoint.sh` is **latent, not live** —
  though it is now known to be unsafe if ever used, because of the journal
  defect in `backup-recovery.md` §3.

Two of those answers raised sharper questions than they settled — the evidence
window, and PlanetScale's missing sub-processor list — so they appear in the
lists rather than disappearing from them.

**What has since shipped.** This section opened as a four-item backlog. Three
of the four are done and the fourth is a people task, so **no item on it is a
code change any more.** The record is kept rather than quietly edited, because
the order things were fixed in is itself audit evidence.

1. **Get the DPIA consulted on and signed** (`dpia.md` §2 and §6) — **still
   open, and now the only genuine pilot gate in this document set.** It is
   drafted and the controller is settled, so what remains is people work:
   **Article 35(2) advice from the DPO is mandatory**, because one is
   designated, and Article 35(9) consultation with parents and guardians has not
   happened. Adopting the ROPA follows the same signature.
2. ~~**Make the JWT signing secrets fail closed**~~ (`key-management.md` §1) —
   **done 8 November 2026.** All three fail-open secrets, including
   `SELF_CHECK_IN_QR_SECRET`, now resolve through `lib/secret-env.ts` and throw
   rather than fall back to a value committed to this repository. §1 of that
   document records why the fix did not take the shape it first recommended.
3. ~~**Add `member_exported` and `member_updated` audit actions**~~
   (`incident-response.md` §2) — **done 8 November 2026**, plus
   `submissions_exported` for the forms export, which had the same defect.
   Migration 0064 widened `audit_log_action_check`, without which the inserts
   would have failed silently. Both bulk-export paths and every member edit now
   leave a trail; none of them records field values or member ids, so the audit
   log does not become a second copy of the data it describes. `member_viewed`
   was considered and rejected — a row per read is an access log, not an audit
   log.
4. ~~**Merge and deploy the remediation PRs**~~ — **done 8 November 2026.**
   #71 (`fix/security-blockers-round-1`), #72 (`fix/guardian-attachment`), #73
   (`feat/guardian-confirm-link`, carrying migration 0063), #74
   (`ci/security-gates`), #75 (`docs/security-policies`) and #76
   (`fix/privacy-controller-identity`) are all merged to `staging` and deployed.
   **Production is still behind `staging`**, so the fixes are one gate from the
   pilot, not zero.


## Related

`../auth-and-permissions.md` is the reference for the capability model these
documents assume. `../database-architecture.md` is the hosting decision record.
`../observability.md` covers the logging that incident response depends on.
`DESIGN.md` and `AGENTS.md` at the repository root hold the conventions that
`secure-sdlc.md` treats as controls.
