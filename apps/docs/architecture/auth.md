# Auth & Permissions

## How authentication works

Login issues a JWT access token and a refresh token. The access token carries a `grants[]` claim, which is what both clients read to decide which affordances to offer. There is no role switcher and no "select your role after login" step. One token carries everything.

Tokens are verified by `authMiddleware` in `apps/api/src/middleware/auth.ts`.

Alongside email and password, three OAuth providers are live: **Google**, **Microsoft**, and **Apple**. They are handled by `apps/api/src/auth/oauth/`, mounted under `/api/auth/oauth/:provider/start` and `/api/auth/oauth/:provider/callback`, and converge on the same member record, so linking a provider to an existing account does not fork the person.

::: warning Grants are re-resolved server-side on every request
`authMiddleware` overwrites `auth.grants` with a fresh `resolveGrants(db, memberId)` call, so the API never trusts the token's copy. The clients do trust it, which is why the refresh path has to populate `grants` too: minting a refreshed token with an empty array silently strips every capability-gated affordance until the user re-logs in. Both `login` and `refresh` in `apps/api/src/auth/service.ts` call `resolveGrants`.
:::

## System roles

`systemRole` has two values, enforced by a CHECK on `members.system_role`:

| Value | Meaning |
|-------|---------|
| `admin` | Global admin with full access across all branches. Break-glass, not seniority. |
| `member` | Everyone else; access via functional grants only |

The former `pastor` / `leader` / `elder` values were collapsed in migration `0029_collapse_system_role.sql`, which also added the `honorific` column and backfilled `'Pastor'` for ex-pastors.

## Functional grants

Real authority comes from **functional grants** stored in `member_roles`. Each grant bundles a named role with a `scope_kind` and `scope_id`.

| Grant | Scope kind | Stored? |
|-------|-----------|---------|
| `BranchAdmin` | branch | yes |
| `BranchDataAdmin` | branch | yes |
| `FellowshipLeader` | fellowship | yes |
| `DepartmentLeader` | department | yes |
| `DepartmentDeputy` | department | yes |
| `SafeguardingLead` | branch | yes |
| `SafeguardingHead` | church | yes |
| `NewBelieversMentor` | branch | yes |
| `NewBelieversTeacher` | branch | yes |
| `MembershipAdmin` | church | yes |
| `MembershipChampion` | branch | yes |
| `BranchPastor` | branch | **no, derived** |

`RoleScope['kind']` has four values: `branch | fellowship | department | church`. A church scope names no entity, so `member_roles.scope_id` stores the nil-UUID sentinel (`CHURCH_SCOPE_ID`) and `branch_id` holds the grantee's home branch purely as a query handle, never as the grant's reach.

`BranchPastor` is synthesised by `resolveGrants` in `apps/api/src/lib/grants.ts` for whoever currently holds the `Main Pastor` row in `branch_leadership`. It is never written to `member_roles`, has no `roles` row, and is not assignable in the RBAC admin UI. It exists because safeguarding sight follows identity rather than authority: a Main Pastor and a Minister can hold the same `BranchAdmin` grant, and no role-to-capability mapping can distinguish them.

## Capabilities

Grants are translated into **capabilities** at request time. The full catalogue lives in `packages/types/src/rbac.ts` and is the only place to add one:

| Capability | Carried by |
|------------|-----------|
| `branch:read` | `BranchAdmin`, `BranchDataAdmin` |
| `branch:write` | `BranchAdmin`, `BranchDataAdmin` |
| `branch:rbac` | `BranchAdmin` |
| `fellowship:read` / `fellowship:write` | `FellowshipLeader` |
| `department:read` / `department:write` | `DepartmentLeader`, `DepartmentDeputy` |
| `safeguarding:read` / `safeguarding:write` | `SafeguardingLead`, `SafeguardingHead`, `BranchPastor` |
| `welfare:read` | `BranchAdmin` |
| `signup:approve` | `BranchAdmin`, `BranchDataAdmin` |
| `newbelievers:mentor` | `NewBelieversMentor` |
| `newbelievers:teach` | `NewBelieversTeacher` |
| `membership:admin` | `MembershipAdmin` |
| `membership:branch:read` | `MembershipChampion` |

There is no `members:write`: member records are branch data and are gated by `branch:write`. `welfare:read` was split out of `branch:write` so a `BranchDataAdmin` stops reading the safeguarding and welfare inboxes it has no pastoral standing for; note that `SafeguardingLead` deliberately does **not** carry `welfare:read`, and `BranchAdmin` deliberately does **not** carry `safeguarding:read`.

### One matcher

`matchesCapability` in `packages/types/src/rbac.ts` is the single implementation. The API's `hasCapability`, `useCapabilities().has` on web, and its mobile twin all delegate to it. It was hand-copied into three places until the church scope arrived; do not reintroduce a copy.

Its rules, in order: `systemRole === 'admin'` wins; no scope argument means any grant carrying the capability suffices; exact `{kind, id}` match; a `branch` grant covers `fellowship`/`department` targets in the same branch when the caller passes the target's parent `branchId`; **a `church` grant satisfies any target at any depth**; and **a `church` target takes no hierarchical match**, so no branch grant ever satisfies a church-scoped check.

### API gating

```ts
// Single capability
requireCapability('branch:write', (c) => c.req.param('branchId'))

// Any of a set
requireAnyCapability(['branch:write', 'safeguarding:read'])

// Inside a service
enforceBranchScope(auth, branchId)
enforceLeaderOrAbove(auth, entity)
```

Some modules gate entirely in the service layer rather than as route middleware: the membership router applies only `authMiddleware` and does all narrowing in `apps/api/src/membership/service.ts`, because one route is legitimately reachable by a Membership Admin, a Membership Champion, and a group leader with three different narrowings. Read the service, not just the router, when auditing who can call something.

### Frontend gating

```ts
const { has } = useCapabilities()

if (has('branch:write', branchId)) {
  // show edit button
}
```

## Honorifics vs permissions

`pastor` is a display-only honorific on `members.honorific`. It grants nothing. A member with the honorific "Pastor" who only holds a `FellowshipLeader` grant sees exactly what a fellowship leader sees, no more.

`honorific` is free text, `varchar(50)`, nullable, with no CHECK and no enum in `packages/types`. "Pastor", "Reverend", and "Elder" are examples, not an allowed set.

Distinct from the honorific is `branch_leadership.role`, which *is* constrained, to exactly two values: `'Main Pastor'` and `'Minister'`. Migration `0054_safeguarding_head_and_minister.sql` renamed `'Elder'` to `'Minister'` and added the CHECK for the first time on existing databases (the Drizzle table-extras CHECK had never actually been emitted as DDL). A partial unique index enforces one current Main Pastor per branch.

## Approval workflow

New member accounts start in a pending approval state. Somebody holding `signup:approve` for the branch must approve the account before the member gets access beyond their own profile. The approval status is tracked on the member record.

## Refresh tokens

The API issues refresh tokens alongside access tokens. Clients call the refresh endpoint to get a new access token without re-entering credentials.
