# Audit And Fix Requirements Gaps

Use this prompt to compare requirements against the implemented code and produce a fix plan.

## Scope

Default modules:

- Branches
- Members
- Fellowships
- Departments
- Reports/Analytics
- Outreach/Souls
- New Believers

Narrow the scope if the user asks for a specific module.

## Inspect

- `requirements/`
- `AGENTS.md`
- `DESIGN.md` if UI gaps are involved
- Current API modules under `apps/api/src`
- Current frontend routes under `apps/web/src/app`
- Shared contracts in `packages/types` and `packages/api-client`

## Output

Produce a table with:

- Gap ID
- Requirement
- Current implementation evidence
- Severity
- Proposed fix
- Files likely touched
- Test coverage needed
- Parallelization lane

Then group fixes into phases:

1. Contract/data prerequisites.
2. Backend behavior.
3. API client/hooks.
4. Frontend UI.
5. Tests and verification.

## Decision Rules

- Do not implement future AWS-only requirements unless requested.
- Mark donations, real notifications, S3 uploads, Cognito, and full deployment work as future/deferred unless present in current code.
- Branch isolation and role permissions are high severity.
- Missing tests for existing behavior are a gap if the behavior is security-sensitive.
