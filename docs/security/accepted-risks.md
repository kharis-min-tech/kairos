# Accepted risks

**Status:** opened 2026-11-19, after the 18 November cyber-security
self-assessment. This is a register of risks the controller has looked at and
decided not to close yet, with the reasoning attached.

## Why this document exists separately

The other documents in this directory are written to find gaps, and they are
good at it. What they are not good at is recording that somebody has since
looked at a gap and made a decision about it. Several of the entries below were
already described somewhere in this set as findings, in the present tense,
with no indication that anyone had read them.

That difference matters in a way that is easy to underestimate:

- **A gap** is a defect nobody has priced. The correct response to finding one
  is to fix it or to decide about it.
- **An accepted gap** is a decision. It has an owner, a date, a reason, a set
  of controls that stand in for the missing one, and a trigger that reopens it.

Read six months from now, an undocumented acceptance and an oversight are
indistinguishable, and the next reviewer re-raises it from scratch. Worse, the
*reasoning* is usually the valuable part and it is the first thing lost: three
of the entries below turn on a technical constraint that explains why the
obvious fix is not available, and none of that reasoning was written down
anywhere in this repository before today.

**Nothing here is a judgement that the risk does not matter.** Every entry
names what is genuinely exposed, in plain terms, without the softening that
makes a register useless.

## The register

| # | Risk | Decided | Where the detail is |
|---|---|---|---|
| A1 | No detection of a stolen or replayed refresh token | Product owner, 2026-11-18 | §A1 below |
| A2 | No administrator alerting, no anomalous-login detection, no log review cadence | Product owner, 2026-11-12 | [`incident-response.md`](incident-response.md) §2, plus §A2 below |
| A3 | Cloudflare SSL mode is Full, not Full (strict) | Product owner, 2026-11-18 | §A3 below |
| A4 | No scripted kill switch or maintenance mode | Product owner, 2026-11-18 | §A4 below |
| A5 | Logpush not enabled, so request logs are short-lived | Product owner, 2026-11-18 | §A5 below |
| A6 | Image delivery URLs carry no authentication | Product owner, 2026-11-18 | §A6 below, **and read the warning there** |

Three further acceptances predate this register and are recorded in full where
they belong. They are listed here so that this page is a complete index rather
than a partial one:

| # | Risk | Decided | Where |
|---|---|---|---|
| A7 | No backup is exported out of PlanetScale | Product owner, 2026-11-12 | [`backup-recovery.md`](backup-recovery.md) §2 |
| A8 | Profile photographs have no backup or recovery path | Product owner, 2026-11-12 | [`backup-recovery.md`](backup-recovery.md) §8 |
| A9 | Cloudflare Pro declined, so no sustained-rate limiting | Product owner, 2026-11-12 | [`waf-rate-limiting.md`](waf-rate-limiting.md) §6 |

**Every entry carries the same review trigger in addition to its own: before
real member data is entered into any environment.** At the time of writing no
environment holds real member data, and that fact is doing a great deal of the
work in several of these decisions. It stops being available as an argument the
day it stops being true.

---

## A1. No detection of a stolen or replayed refresh token

**Decision: refresh-token rotation with reuse detection is not implemented, and
the residual risk is accepted.** Taken by the product owner on 18 November 2026
after a spike established that the change could not ship safely.

**The gap, stated without softening.** A refresh token has a 365-day TTL
(`lib/auth-secrets.ts:24`) and there is no server-side store, no rotation and
no reuse detection. If one is stolen it is valid for a year against that
member, and **nobody learns that it was used.** `secure-sdlc.md` §4 puts the
contrast sharply and correctly: the OAuth2 server in this same codebase has
rotating refresh tokens with reuse detection, an `oauth_token_reuse` audit
action, and idle and absolute bounds. The first-party session path does not
meet the standard the same repository set for third parties.

**Why the obvious fix is not available, which is the part that was missing.**
This is recorded here because the spike was deliberately not merged, so the
reasoning exists nowhere in the tree.

Rotation means issuing a new refresh token on every refresh and treating a
second presentation of a retired one as theft. On mobile that collides with how
biometric sign-in works. The refresh token is sealed in the OS keychain behind
a biometric requirement, and it is **deliberately never re-sealed**, because on
Android every keychain write prompts the user. Re-sealing on each refresh would
mean a biometric prompt in the background on a schedule, which is why the
design avoids it.

Put rotation on top of that and the stale sealed token is presented on the next
app restart, because the keychain still holds the pre-rotation value. The
consequences compound:

- every biometric user is logged out on every restart;
- each one trips reuse detection, so the system concludes a theft has occurred;
- the audit log fills with fabricated `reuse` events, which is worse than
  having none, because it destroys the signal the control exists to provide.

A control that fires constantly on legitimate behaviour is not a weak control,
it is an anti-control: it trains whoever reads the log to ignore it.

**Compensating controls, all verified in code.**

- **Bulk and per-member session revocation exists** (PR #93, merged
  14 November 2026). `members.token_version` is a generation counter carried in the
  refresh token and compared on every refresh, so a single member's sessions
  can be ended without rotating a shared secret and without affecting anyone
  else. `incident-response.md` §5 uses it as the narrowest containment row.
- **A password change now issues fresh tokens and invalidates every prior
  generation**, so "change your password" is real containment rather than
  advice.
- A password reset and an administrator's second-factor reset do the same.
- Access tokens are short-lived (15 minutes), so a revocation takes effect
  immediately for anything needing a refresh and within fifteen minutes
  otherwise.
- The mobile token is sealed behind the OS biometric requirement, so stealing
  it requires the device **and** the enrolled biometric.

**What is accepted, stated plainly.** Containment is solved and detection is
not. If a refresh token is stolen, Kairos can end that member's sessions
promptly once it knows, and it will only know because a human noticed something
else: a member reporting an email about a sign-in they did not make, or an
administrator looking. Nothing announces the theft.

**Review triggers.**

- The biometric re-seal constraint is solved, or a rotation design emerges that
  does not require re-sealing on the mobile client (for example, a rotation
  scheme that keys on device identity rather than on token value).
- Before real member data is entered into any environment, at which point the
  cost of the gap changes even if the technical constraint has not.
- Any change to the mobile biometric flow, which may remove the constraint as a
  side effect and should trigger a re-read of this entry rather than being
  noticed later.

---

## A2. No administrator alerting, no anomalous-login detection, no log review cadence

**This acceptance is recorded in full in [`incident-response.md`](incident-response.md)
§2, "Accepted for the pilot, 12 November 2026", and that text is not reproduced
here.** It carries the decision, the date, the product owner's own reasoning
(the church is forming its support model, and alerting with nobody rostered to
receive it is theatre rather than a control), and an explicit statement that it
is not a decision that detection is unnecessary.

Three things have changed since it was written, and they belong with it:

1. **It is now three checklist items, not two.** That section says it covers
   two. The 18 November 2026 self-assessment scored **5.4 (logs retained for an
   adequate period and reviewed), 7.1 (anomalous login detection) and 7.2
   (administrator alerting)** as the only three Fails on the checklist. 5.4
   fails only on its review half: retention is met and automated, and nobody is
   rostered to review. All three are the same underlying gap counted three
   ways, which is worth saying out loud, because three Fails read as three
   problems.

2. **Two compensating controls now exist that did not when it was written.**
   Per-account lockout after five failed MFA attempts, and Cloudflare edge rate
   limiting deployed against the eight most sensitive POST paths
   (`waf-rate-limiting.md` §3). Neither detects anything, but both raise the
   cost of the attack the absent detection would have caught.

3. **The revisit trigger is now explicit.** When the support rota exists, and
   in any case before real member data is entered into any environment.

The compensating control that does the most work is easy to miss and should not
be: **security-relevant events notify the affected member directly and
immediately**, by email. A password change, an administrator's reset of their
second factor, a new-device sign-in, and a profile change made by a leader all
send mail. The person best placed to recognise an illegitimate action is
therefore told, even though no administrator is. `incident-response.md` §3
already treats that as a genuine detection channel rather than a courtesy, and
it is the right reading.

---

## A3. Cloudflare SSL mode is Full, not Full (strict)

**Decision: the zone stays on Full. The risk is accepted and no backlog item
was raised.** Taken by the product owner on 18 November 2026, on the stated
basis that **"the attack surface is slim."**

**What the two settings actually differ on.** Both encrypt the connection from
Cloudflare to the origin, so neither leaves traffic in the clear, and this is
not a question about what members' browsers negotiate (that is the edge
connection, covered separately and verified: TLS 1.2 minimum, Always Use HTTPS,
HSTS at 180 days). The difference is **whether Cloudflare validates the
origin's certificate**:

- **Full** encrypts but accepts any certificate the origin presents, including
  one that is self-signed, expired, or issued for a different hostname.
- **Full (strict)** requires a certificate that is valid, unexpired and matches
  the hostname.

So Full leaves a window for an attacker who is **already positioned between
Cloudflare and the origin** and can present their own certificate. They would
see and could alter traffic that Cloudflare believes is securely delivered.

**Why the exposure is genuinely small here, rather than just asserted.** The
origin is not a self-managed host on someone else's network. It is Cloudflare's
own platform: the API is a Worker, the web app is Pages, and the certificate
Cloudflare validates would be Cloudflare's own, presented inside its own
network. There is no separately administered origin certificate to spoof and no
third-party network segment between edge and origin to occupy. The attack Full
(strict) defends against largely presupposes an origin topology that Kairos
does not have.

**What is accepted, stated plainly.** The zone is configured in a way that
would be a real finding on a conventional origin, and an auditor reading the
setting alone cannot tell that it is not one here. It is also one toggle, with
no migration and no downtime, so the cost of the decision is almost entirely
the cost of explaining it.

**Review triggers.**

- Any origin that is not Cloudflare Workers or Pages is introduced, including a
  self-hosted service, a VPS, or a third-party API fronted by this zone. **This
  is the trigger that matters**, because it invalidates the whole argument
  above in one move.
- A reviewer asks about the setting and the explanation costs more than the
  toggle would have, which on current evidence it already has.

---

## A4. No scripted kill switch or maintenance mode

**Decision: temporarily accepted.** Taken by the product owner on
18 November 2026. **Backlog: Trello card "Scripted kill switch / maintenance
mode"**, raised specifically so that this is deferred rather than dropped.

**The gap, stated without softening.** `incident-response.md` §5 already names
it: the containment table is dashboard and database actions rather than
scripted ones, and "there is no maintenance mode" is recorded against the one
row that needs to stop all traffic. Today, taking Kairos down means deleting
the Worker's route in the Cloudflare dashboard or deploying a 503 build. Both
are manual, neither is rehearsed, and both are performed by someone under
pressure who has not done it before.

**What the control would buy.** A single rehearsed command, with a known
blast radius and a known recovery step, to put the service into read-only or
take it offline during an active incident. Its value is not that it is faster
than the dashboard: it is that **it removes improvisation from the worst ten
minutes.** An incident is exactly when an unfamiliar manual procedure gets
performed wrongly, and the two options available today both have failure modes
that are worse than the incident (deleting the wrong route, or deploying a
build that cannot be rolled back cleanly).

**What stands in today.**

- `wrangler rollback`, or redeploying a known-good commit. `main` blocks
  force-push and deletion, so the good commit is still there.
- Per-member containment that is narrower than a kill switch and usually the
  correct response anyway: `revokeSessions`, `is_active = false`, revoking a
  `member_roles` row.
- Cloudflare's dashboard, which can block traffic at the edge without a deploy.
- A small, known administrator population, so "tell everyone to stop" is
  actually viable at current scale in a way it will not be later.

**What is accepted, stated plainly.** In an active incident, containment
depends on a person correctly performing an unrehearsed manual procedure in a
dashboard. There is no measured time for that and no drill has been run.

**Review triggers.**

- Before real member data is entered into any environment.
- The incident-response tabletop exercise is run (`incident-response.md` §7),
  which is the cheapest way to discover whether the manual path actually works.
  If the tabletop finds it does not, this stops being a deferral.
- Kairos carries more than one branch, at which point "tell everyone to stop"
  is no longer a control.

---

## A5. Logpush not enabled, so request logs are short-lived

**Decision: Logpush is not enabled. The risk is accepted.** Taken by the
product owner on 18 November 2026, with a **Trello backlog card raised
specifically so this is not forgotten**, which was the stated condition of the
acceptance.

**Correcting the existing framing.** `backup-recovery.md` §7 and `dpia.md` §5
both already establish that `"logpush": true` appears nowhere in
`wrangler.jsonc` and that the Axiom pipeline described in `../observability.md`
does not exist. Both are accurate and both stop there, which reads as an
unexamined finding. It is not one: the path does not exist, **and there is now
a decision not to build it yet.**

**The gap, stated without softening, and precisely.** Cloudflare retains
request logs on the current plan for a short window measured in days rather
than the thirty an investigation would want. That window is the only place
individual **read** activity is visible, because reads are deliberately not
audited: `member_viewed` was considered and rejected on the grounds that a row
per directory read is an access log rather than an audit log, and the volume
would bury the events that matter. That reasoning is still right.

The consequence is specific. **Writes, exports, permission changes and
erasures are durably audited and are not affected by this at all.** What is
affected is the question "who looked at this record, and when", asked more than
a few days after the fact. For an exfiltration-by-reading scenario, where
somebody with legitimate access browses records they have no business reading,
the evidence expires before most incidents are even discovered. `dpia.md` notes
that incidents routinely surface months later.

**Compensating controls.**

- Every write, export, permission change and erasure is audited durably, with
  no retention limit (`cron/retention.ts` can only ever delete `signin_success`
  and `signin_failure` rows, by design).
- The three export paths are individually audited, which covers bulk removal,
  the most damaging read-shaped action.
- Scope is enforced per request from grants re-resolved on every call, so a
  read outside a member's scope is prevented rather than merely recorded.
- The administrator population is small and known by name.

**What is accepted, stated plainly.** Kairos cannot answer "who read this
member's record last month." It can answer "who changed, exported or erased
it", at any distance in time.

**Review triggers.**

- Before real member data is entered into any environment.
- Any upgrade of the Cloudflare plan for another reason, at which point the
  marginal cost of enabling this drops to near zero.
- Adding a processor to receive the logs reopens the ROPA and transfer
  questions in `ropa.md` §3, so the decision is not purely technical and
  should be taken with that in view rather than as a toggle. Note that
  enabling Logpush to Axiom **makes Axiom a processor**, which is why
  `README.md` currently records "Logpush is confirmed not enabled" as closing a
  transfer question. Reopening this reopens that.

---

## A6. Image delivery URLs carry no authentication

> **Read this entry carefully: it reverses a position this document set took
> on 12 November 2026.** `backup-recovery.md` §8 stated that while the
> *availability* of profile photographs was an accepted risk, "confidentiality
> and erasure are **not** accepted", and that unauthenticated delivery was
> being fixed. It also warned, in those words, "do not let 'images: accepted
> risk' be read as covering R5." That warning was correct when written and the
> change of position below is what it was guarding against, so the reversal is
> recorded explicitly rather than by quietly editing that paragraph.

**Decision: delivery stays unauthenticated for now, accepted as-is with
remediation planned rather than abandoned.** Taken by the product owner on
18 November 2026. **Backlog: Trello card.**

**The gap, stated without softening.** `requireSignedURLs` remains `'false'`,
so a profile photograph is served from
`imagedelivery.net/{accountHash}/{imageId}/public` with no authentication and
no expiry. **Anyone holding the URL can fetch the image without a Kairos
session**, from anywhere, indefinitely, until the image is deleted. Some of
these are photographs of children. This is **DPIA risk R5**, scored **High**,
and it remains at High: nothing in this acceptance lowers it, and the scoring
is the DPO's to change, not the controller's to argue away.

**What has genuinely closed, because the residual is much narrower than it
was.** R5 originally described a *permanent, unrevocable* exposure. Three of
its four defects are fixed and verified (see `dpia.md` §4 R5 for the detail):

- **Revocation exists.** `deleteImage` and `deleteStoredImage` destroy the
  object in Cloudflare Images, wired into erasure and into replacement, so a
  leaked URL stops working once the image is deleted.
- **The erasure is evidence.** A `member_erased` audit action records the image
  deletion outcome, and the row's outcome is *failure* when the image survived,
  so an incomplete erasure is distinguishable from a complete one.
- **`Referrer-Policy: no-referrer`** is set on the Pages app and on every API
  response, so our own pages do not leak URLs carrying member and branch UUIDs.

The residual is therefore **a leak in the window between upload and deletion**,
rather than a permanent exposure with no revocation path. URLs are also not
enumerable: the image id is a Cloudflare-generated UUID.

**Why the fix has not shipped, which is a technical blocker and not a
priority call.** Authenticated delivery means signing a time-limited URL on
every read, and roughly 29 API sites return a photo URL. The viable
implementation is Cloudflare's Images binding, whose `signedUrl()` signs on
Cloudflare's side so the account signing key never enters this system, which is
materially better than holding another secret. The blocker is one fact that
cannot be established from the documentation: **whether `signedUrl()` is a
local operation or a network round-trip.** A member directory page needs
roughly fifty signatures per request. If it is a network hop per image the
approach is unusable, and the alternative is a hand-rolled HMAC whose exact
string-to-sign Cloudflare does not publish, where guessing wrong produces a
signature that silently 403s every photograph in the system.

**That question is unchanged by this acceptance and is still the next step.**
It is a half-day of measurement, not a project, and it is the single thing
standing between this entry and its closure.

**Compensating controls.**

- URLs are unguessable (Cloudflare-generated UUIDs), so exposure requires a
  leak rather than enumeration.
- Deletion on erasure and on replacement means a leak is revocable, and the
  revocation is audited.
- `Referrer-Policy: no-referrer` closes the leak path we control.
- No environment currently holds real member data, and therefore no
  photographs of real children exist in any deployed system today. **This is
  the control doing most of the work, and it expires on first real use.**

**Review triggers.**

- **Before any real photograph of any member is uploaded to any environment.**
  This trigger is stricter than the register's general one, deliberately. The
  general trigger is about member data; this one is about a single upload,
  because one photograph of one child is enough to make the residual real.
- The `signedUrl()` question is answered either way, which unblocks the fix or
  redirects it to the HMAC route.
- Any change that puts a photo URL somewhere we do not control, for example an
  email body, an export, or a third-party integration such as the analytics
  OIDC client.

---

## How to maintain this register

**Add an entry when a gap is decided about, not when it is found.** A finding
belongs in the document that covers its subject. It moves here, or gains a
section there and a row in the index above, when somebody with the authority
to accept it has done so.

**Keep the reasoning in the decider's own terms.** Several entries above turn
on a sentence the product owner said (`"the attack surface is slim"`, alerting
that nobody receives being "theatre rather than a control"). Paraphrasing those
into neutral risk language loses the thing a later reader most needs, which is
how the decision was actually reached.

**Never close an entry silently.** Strike it through in place, as the rest of
this document set does, because the order things were decided in is itself
audit evidence.

**Re-read the whole register on any trigger firing, not just the entry that
fired.** Several of these lean on the same two facts: that no environment holds
real data, and that the administrator population is small and known by name.
When either stops being true, more than one entry changes at once.
