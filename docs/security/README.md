# Security and data protection

Written for the pre-release cyber-security review, 2026-11-08. Six documents
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

There are **33 such markers** across the six documents, covering 32 distinct
decisions — the audit-action item appears in both `incident-response.md` and
`regulatory-mapping.md`, because it is a prerequisite for both. Each document
collects its own at the end, and a few further recommendations appear only in
those collected lists where they were too small to interrupt the text for.

**The three things to do first**, if the list is read as a backlog:

1. **Commission a DPIA** before the pilot processes real member data
   (`regulatory-mapping.md` §11). Article 35 requires one for children's and
   special-category data, and it is cheapest now, while the pilot is one branch
   with no member import.
2. **Add `member_exported` and `member_updated` audit actions**
   (`incident-response.md` §2). Without them a data-exfiltration incident
   cannot be scoped, so the Article 33 assessment has no evidence to work from.
3. **Make the JWT signing secrets fail closed** (`key-management.md` §1). The
   only item in this set that is a live vulnerability rather than a missing
   control.

## Related

`../auth-and-permissions.md` is the reference for the capability model these
documents assume. `../database-architecture.md` is the hosting decision record.
`../observability.md` covers the logging that incident response depends on.
`DESIGN.md` and `AGENTS.md` at the repository root hold the conventions that
`secure-sdlc.md` treats as controls.
