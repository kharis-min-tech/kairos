# Auth & Permissions

## How authentication works

Login issues a JWT access token and a refresh token. The access token contains a `grants[]` claim that drives all UI and API behaviour. There is no role switcher and no "select your role after login" step — one token carries everything.

Tokens are verified by `authMiddleware` in `apps/api/src/middleware/auth.ts`.

## System roles

`systemRole` has two values:

| Value | Meaning |
|-------|---------|
| `admin` | Global admin — full access across all branches |
| `member` | Everyone else — access via functional grants only |

## Functional grants

Real authority comes from **functional grants** stored in `member_roles`. Each grant bundles a named role with a `scope_kind` and `scope_id`.

| Grant | Scope kind |
|-------|-----------|
| `BranchAdmin` | branch |
| `BranchDataAdmin` | branch |
| `FellowshipLeader` | fellowship |
| `DepartmentLeader` | department |
| `DepartmentDeputy` | department |
| `SafeguardingLead` | branch |
| `NewBelieversMentor` | branch |
| `NewBelieversTeacher` | branch |

## Capabilities

Grants are translated into **capabilities** at request time. Examples:

- `branch:write`
- `branch:read`
- `fellowship:write`
- `fellowship:read`
- `department:write`
- `safeguarding:read`
- `members:write`

### API gating

```ts
// Single capability
requireCapability('branch:write', (c) => c.req.param('branchId'))

// Any of a set
requireAnyCapability(['branch:write', 'members:write'])

// Inside a service
enforceBranchScope(auth, branchId)
enforceLeaderOrAbove(auth, entity)
```

### Frontend gating

```ts
const { has } = useCapabilities()

if (has('branch:write', branchId)) {
  // show edit button
}
```

## Honorifics vs permissions

`pastor` is a display-only honorific on `members.honorific`. It grants nothing. A member with the honorific "Pastor" who only holds a `FellowshipLeader` grant sees exactly what a fellowship leader sees — no more.

## Approval workflow

New member accounts start in a pending approval state. An admin must approve the account before the member can log in fully. The approval status is tracked on the member record.

## Refresh tokens

The API issues refresh tokens alongside access tokens. Clients call the refresh endpoint to get a new access token without re-entering credentials.
