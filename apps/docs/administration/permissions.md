# User Permissions

Permissions in Kairos are driven by **functional grants** — not just system roles. Understanding the difference between system roles and grants is key to configuring access correctly.

## System roles

Every member has one of two system roles:

| Role | Who has it |
|------|-----------|
| `admin` | Church administrators with full system access |
| `member` | Everyone else — access comes from grants |

## Functional grants

A grant is a named role bundle tied to a specific scope. Grants are what give a `member` elevated access beyond their own profile.

| Grant | Scope | What it unlocks |
|-------|-------|----------------|
| `BranchAdmin` | Branch | Full branch management — equivalent to Pastor access |
| `BranchDataAdmin` | Branch | Data management for a branch (import/export, member edits) |
| `FellowshipLeader` | Fellowship | Manage a specific fellowship's roster, meetings, and follow-ups |
| `DepartmentLeader` | Department | Manage a specific department's roster, requests, and follow-ups |
| `DepartmentDeputy` | Department | Deputy access for a specific department |
| `SafeguardingLead` | Branch | Access to safeguarding-flagged member records |
| `NewBelieversMentor` | Branch | Mentor access in the New Believers pipeline |
| `NewBelieversTeacher` | Branch | Teacher access in the New Believers pipeline |

## How grants work

When a member logs in, the system computes their capabilities from their grants. The navigation, page access, and available actions update immediately — no re-login required.

A member can hold multiple grants. For example:
- `FellowshipLeader` for "Kharis Express London"
- `DepartmentLeader` for "Choir at Kharis London Central"

They can manage both groups independently, but cannot access data outside their two scoped areas.

## Assigning grants

Only Admins can assign and remove grants. To assign a grant:

1. Go to **Members** and open the member's profile
2. Navigate to their roles section
3. Select the grant type and the scope (which branch, fellowship, or department)
4. Save — the member's access updates immediately

## The pastor honorific

`pastor` is a display-only honorific on a member's profile (`honorific` field). It appears in their title but grants **nothing** on its own. A member with the "Pastor" honorific who only holds a `FellowshipLeader` grant sees exactly what a fellowship leader sees.

For a member to have full branch access, they need a `BranchAdmin` grant — not just the honorific.

## Important: no role switcher

There is no in-app role switcher. A member cannot choose to "act as" a different role. Their single login token contains all their grants and drives everything they see. If their access needs to change, an Admin updates their grants.
