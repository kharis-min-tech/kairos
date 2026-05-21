---
description: Dispatch the reviewer subagent over the current branch's diff. Returns a punch list — does not edit code.
argument-hint: [base-branch — default main]
---

The user invoked `/review-branch $ARGUMENTS`. If `$ARGUMENTS` is empty, base is `main`; otherwise it's the supplied branch.

## Method

1. **Quick orientation.** Run:
   ```
   git log <base>..HEAD --oneline
   git diff <base>...HEAD --stat
   ```
   Surface a one-line summary of the change scope to the user before dispatching.

2. **Dispatch `reviewer`** via the Agent tool, `subagent_type: "reviewer"`. Pass a prompt that:
   - Names the base branch.
   - Includes the diff stat output as context (so the reviewer doesn't have to rediscover scope).
   - Asks for the full audit per the invariants in `.claude/agents/reviewer.md`.

3. **Surface the reviewer's punch list verbatim** — it's already structured. Add nothing.

4. **Offer next steps** to the user:
   - If blockers exist: "Want me to address these via the relevant module agents?"
   - If only suggested fixes exist: "Defer these or fix them now?"
   - If clean: "Looks ready — commit?"

## Rules

- **Don't edit code in this command.** The reviewer is read-only by design. If the user wants fixes, they accept the offer and you dispatch the appropriate agents.
- **Don't run `git commit` or `git push`.** Not even after a clean review. The user decides.
- **If the diff is empty**, tell the user there's nothing to review and stop.
- **If the diff is huge** (>50 files), warn the user and offer to scope the review to a sub-path.
