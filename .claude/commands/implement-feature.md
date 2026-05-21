---
description: Dispatch a module agent to deliver a feature end-to-end. Assumes a plan has been agreed.
argument-hint: <module> [optional context]
---

The user invoked `/implement-feature $ARGUMENTS`. The first token is the module name (one of: `auth`, `branches`, `members`, `fellowships`, `departments`, `outreach`, `new-believers`, `reports`). The rest is additional context — usually a recap of the agreed plan from a previous `/plan-feature` exchange.

## Method

1. **Confirm scope.** If you don't have a clear, recently-agreed plan from the conversation, STOP and tell the user to run `/plan-feature` first. Don't invent a plan in a `/implement-feature` invocation.

2. **Dispatch the module agent.** Use the `Agent` tool with `subagent_type` set to `{module}-feature`. The prompt must include:
   - A self-contained recap of the agreed plan (don't reference "the plan above" — the subagent doesn't see the parent conversation).
   - The specific file paths and contract details from the plan.
   - Any open decisions the user already resolved.
   - The reviewer's job at the end.

3. **Wait for the module agent's report.** Surface its handoff summary to the user.

4. **Run verification.** After the module agent returns:
   - `npx turbo typecheck`
   - `npx turbo test --filter=@kairos/<affected-workspace>`
   - For UI changes: start the dev server, open the page, exercise the golden path + one edge case in the browser. If you can't test in a browser, say so explicitly.

5. **Dispatch the `reviewer`** with the diff scope (`git diff main...HEAD`). Surface the punch list to the user.

6. **Final summary**:
   - What changed (one paragraph).
   - Verification results (typecheck, tests, manual smoke).
   - Reviewer punch list status (resolved / deferred).
   - What's next (if anything's still open).

## Rules

- **Module agents orchestrate layer agents.** Don't replicate that orchestration here — give the module agent the plan, let it do its work.
- **Don't commit.** Stop at "ready for review" — the user commits.
- **If a phase fails**, return to the user with the failure and a specific next step. Don't loop on a broken plan.
- **Don't extend scope.** If the module agent's work surfaces adjacent issues (other modules need changes, unrelated bugs, doc drift), list them as follow-ups — don't fix them here.
- **Match scope to what was approved.** If the plan didn't include schema work, don't add it. If a new schema need appears, stop and re-plan.
