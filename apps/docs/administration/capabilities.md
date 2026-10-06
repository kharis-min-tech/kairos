# Capability Reference

This page is the precise version of [User Permissions](/administration/permissions). It is written for whoever has to answer "why can this person see that?" with certainty, and for developers extending the system.

Grants are not checked directly. Every grant is translated into a set of **capabilities**, and every gate in Kairos, on the server and in both apps, asks the same question: does this person hold this capability, at this scope?

## The capability catalogue

These are all of them. There are no others.

| Capability | What it gates |
|------------|---------------|
| `branch:read` | Reading a branch's data across branch boundaries |
| `branch:write` | Branch operations: member records, import and export, attendance, the follow-up queues |
| `branch:rbac` | Granting Branch System Admin, and appointing or ending branch leadership |
| `fellowship:read` | Reading one fellowship's roster and meetings |
| `fellowship:write` | Managing one fellowship: roster, join requests, meetings, attendance |
| `department:read` | Reading one department's roster |
| `department:write` | Managing one department: roster, join requests, rota, uniform, recruitment |
| `safeguarding:read` | The safeguarding tab of the [Concerns](/platform/concerns) inbox |
| `safeguarding:write` | Acting on a safeguarding concern |
| `welfare:read` | The welfare tab of the [Concerns](/platform/concerns) inbox |
| `signup:approve` | Approving or rejecting a self-registration |
| `newbelievers:mentor` | Mentor duties in the New Believers pipeline |
| `newbelievers:teach` | Teaching duties in the New Believers pipeline |
| `membership:admin` | Everything administrative on the [membership class programme](/platform/membership) |
| `membership:branch:read` | A Membership Champion's read-only view of one branch's membership progress |

Two absences are deliberate:

- **There is no `members:write`.** Member records are branch data, so they are gated by `branch:write`.
- **`membership:admin` has no read/write split.** Every member-facing membership surface needs no capability at all, so anything the capability gates is by definition administration.

## Which grant carries which capability

| Grant | Capabilities |
|-------|--------------|
| `BranchAdmin` | `branch:read`, `branch:write`, `branch:rbac`, `signup:approve`, `welfare:read` |
| `BranchDataAdmin` | `branch:read`, `branch:write`, `signup:approve` |
| `FellowshipLeader` | `fellowship:read`, `fellowship:write` |
| `DepartmentLeader` | `department:read`, `department:write` |
| `DepartmentDeputy` | `department:read`, `department:write` |
| `SafeguardingLead` | `safeguarding:read`, `safeguarding:write` |
| `SafeguardingHead` | `safeguarding:read`, `safeguarding:write` |
| `BranchPastor` (derived) | `safeguarding:read`, `safeguarding:write` |
| `NewBelieversMentor` | `newbelievers:mentor` |
| `NewBelieversTeacher` | `newbelievers:teach` |
| `MembershipAdmin` | `membership:admin` |
| `MembershipChampion` | `membership:branch:read` |

### Why welfare and safeguarding are separate

`welfare:read` used to ride on `branch:write`. That meant a Branch Data Admin, a pure operations role with no pastoral standing, could read both the welfare and the safeguarding inbox. Splitting welfare into its own capability fixed that.

The current arrangement is deliberate on both sides:

- `BranchAdmin` holds `welfare:read` but **not** `safeguarding:read`. Welfare is pastoral care and belongs to branch leadership.
- `SafeguardingLead` holds `safeguarding:read` but **not** `welfare:read`. Safeguarding is protection and belongs to somebody independent of branch leadership. The Safeguarding Lead is always a different person from the branch's Main Pastor, by design.
- A Main Pastor gets safeguarding sight through the derived `BranchPastor` grant, so a Minister holding the same Branch System Admin grant does not.
- `BranchDataAdmin` holds neither.

## How a check is decided

One function decides every capability check in the product: `matchesCapability` in `packages/types/src/rbac.ts`. The server enforces with it, and the web app and the mobile app gate their buttons with it, so a button either app offers is a button the server will honour. It was hand-copied into three places until the church scope arrived; the copies are gone, and new copies should not appear.

The rules, in order:

1. **`systemRole` is `admin`.** Always allowed. This is the break-glass bypass.
2. **No scope was asked for.** Any grant carrying the capability is enough.
3. **Exact match.** The grant's scope kind and id equal the target's.
4. **Hierarchical match.** A `branch` grant satisfies a `fellowship` or `department` target in the same branch, provided the caller passes the target's parent branch along with it.
5. **A church grant reaches anything.** There is one church and it is the root, so a church-scoped grant satisfies a target at any depth: any branch, any fellowship, any department. This is how a Safeguarding Head reads every branch's queue from one grant.
6. **A church target takes no hierarchical match.** Containment runs one way. No branch-scoped grant, however many of them somebody holds, ever satisfies a church-scoped check. Only a church grant, or a platform admin, does.

Rule 6 is the one that surprises people. A member who is Branch System Admin of every branch in the church still cannot administer the membership programme, because the programme is church-scoped and the church is not inside any branch.

## Where grants come from

Grants are resolved from the database on every request, by `resolveGrants` in `apps/api/src/lib/grants.ts`. It combines two sources:

1. **Stored grants** in the `member_roles` table: the rows you create when you assign a role. Church-scoped rows store a placeholder id for the scope, and the branch recorded on the row is only a filing handle, not the grant's reach.
2. **The derived Branch Pastor grant**, synthesised for whoever currently holds the Main Pastor row in `branch_leadership` for a branch. It is never written to `member_roles` and never appears in the roles list.

## How code gates on this

On the server:

```ts
// One capability, scoped to a route parameter
requireCapability('branch:write', (c) => c.req.param('branchId'))

// Any one of a set is enough
requireAnyCapability(['branch:write', 'safeguarding:read'])

// Inside a service, where the entity is already loaded
enforceBranchScope(auth, branchId)
enforceLeaderOrAbove(auth, entity)
```

In the web app:

```ts
const caps = useCapabilities()

if (caps.has('branch:write', { kind: 'branch', id: branchId })) {
  // show the edit control
}
```

Both call into the same matcher. Note that some modules, the membership module in particular, do their gating inside the service layer rather than as route middleware, because one route can be legitimately reachable by several different holders with different narrowing applied. Read the service, not just the router, when you need to know who can call something.
