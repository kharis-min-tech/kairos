# User Permissions

Permissions in Kairos are driven by **functional grants**, not by a job title. Understanding the difference between a system role, a grant, and a scope is the key to configuring access correctly.

## The two system roles

Every member row carries a `systemRole`, and it has only two possible values:

| Role | Who has it |
|------|-----------|
| `admin` | The small platform team. Bypasses every check, in every branch. Treat it as break-glass access, not as a job title. |
| `member` | Everyone else, from a first-time attendee to the Senior Pastor. All of their authority comes from grants. |

::: warning There is no Pastor or Leader role
Kairos used to have `pastor`, `leader`, and `elder` as system roles. They are gone. If a document, a spreadsheet, or an old screenshot refers to someone's "role" as Pastor or Leader, it is describing a **pattern of grants**, not a field in the database.
:::

## Functional grants

A grant is a named role bundle tied to a specific scope. Grants are what give a `member` any access beyond their own profile. A member can hold several at once and each one is independent.

| Grant | Name in the role list | Scope | What it unlocks |
|-------|----------------------|-------|-----------------|
| `BranchAdmin` | Branch System Admin | Branch | Everything operational in that branch, plus the ability to grant Branch System Admin and appoint branch leadership. Also reads the welfare inbox. |
| `BranchDataAdmin` | Branch Data Admin | Branch | Branch operations without the permissions keys: member edits, import and export, approvals. No role granting, and **no** welfare or safeguarding sight. |
| `FellowshipLeader` | Fellowship Leader | Fellowship | Manage one fellowship's roster, meetings, attendance, and follow-ups. |
| `DepartmentLeader` | Department Lead | Department | Manage one department's roster, join requests, rota, uniform, and follow-ups. |
| `DepartmentDeputy` | Department Deputy | Department | The same reach as the lead, for one department. |
| `SafeguardingLead` | Safeguarding Lead | Branch | The branch's safeguarding inbox, and nothing else. Not the directory, not reports, not welfare. |
| `SafeguardingHead` | Safeguarding Head | Church | Safeguarding across every branch. The escalation route above a branch's lead. |
| `NewBelieversMentor` | New Believers Mentor | Branch | Mentor duties in the New Believers pipeline. |
| `NewBelieversTeacher` | New Believers Teacher | Branch | Teaching duties in the New Believers pipeline. |
| `MembershipAdmin` | Membership Admin | Church | Runs the [membership class programme](/platform/membership) end to end: cohorts, sessions, the interest pool, admission, marking, graduation. |
| `MembershipChampion` | Membership Champion | Branch | Read-only sight of one branch's membership waitlist and admitted members, plus that branch's membership notifications. Never a mutation. |

### The derived grant: Branch Pastor

There is an eleventh grant that nobody assigns. Kairos works it out.

Whoever currently holds the **Main Pastor** row in a branch's leadership is given a `BranchPastor` grant automatically, every time they make a request. It carries safeguarding sight for that branch and nothing else.

It exists because safeguarding sight has to follow identity rather than authority. A Main Pastor and a Minister may hold exactly the same Branch System Admin grant, yet only the Main Pastor should see the branch's safeguarding queue. No role-to-permission mapping can tell those two people apart, so the leadership record does the talking.

Practical consequences:

- You cannot add or remove Branch Pastor in the roles list. It will not appear there.
- To give someone safeguarding sight, either make them the branch's Main Pastor or grant them Safeguarding Lead.
- Ending someone's Main Pastor appointment removes their safeguarding sight at the same time.

## Scopes

Every grant is pinned to a scope, and there are four kinds:

| Scope kind | Names | Used by |
|------------|-------|---------|
| `branch` | One branch | Most grants |
| `fellowship` | One fellowship | Fellowship Leader |
| `department` | One department | Department Lead, Department Deputy |
| `church` | Nothing; there is one church | Membership Admin, Safeguarding Head |

A branch-scoped grant also reaches the fellowships and departments **inside** that branch. A church-scoped grant reaches everything. The containment runs one way only: holding Branch System Admin for every branch in the church still does not satisfy a church-scoped check, because the church is not inside a branch.

See the [Capability Reference](/administration/capabilities) if you need the exact rules.

## Assigning grants

Where a grant is assigned depends on what it is scoped to.

**Branch-scoped and church-scoped grants** are assigned from the member's profile:

1. Go to **Members** and open the member's profile
2. Open their roles section
3. Choose the role and the branch
4. Save

A platform admin can do this for any member in any branch. A Branch System Admin can grant and revoke **Branch System Admin** within their own branch, and can appoint or end branch leadership there, but cannot reach other branches.

::: tip Church-scoped grants still ask for a branch
When you grant Membership Admin or Safeguarding Head, the form still asks which branch. That branch is only a filing handle so the grant shows up in the right place. It does not limit the grant, which reaches the whole church either way.
:::

**Fellowship-scoped and department-scoped grants are not assigned here.** Trying to add Fellowship Leader from a member profile is refused with a message telling you where to go. Those grants are written for you when you name someone as the leader, co-leader, lead, or deputy on the group itself:

- Fellowship Leader and co-leader: set on the fellowship, from **Fellowships**
- Department Lead and Deputy: set on the department, from **Departments**

Removing them from the group removes the grant.

## Revoking a grant

Remove the grant from the member's roles section, or remove them from the group that conferred it. Nothing is deleted: the assignment is marked inactive so the history of who had what, and when, survives.

The system refuses to remove the last active Branch System Admin from a branch. A branch must always have someone who can hand out permissions.

## When a change takes effect

Two things happen at different speeds, and it is worth knowing which is which.

- **The API re-reads grants from the database on every single request.** The moment you save, the server stops honouring a revoked grant and starts honouring a new one. There is no window where stale permissions are still enforced.
- **The person's own screen is driven by their sign-in token.** Buttons, menu items, and pages appear or disappear when that token is next renewed, which happens in the background during normal use, or immediately if they sign out and back in.

So a revoked grant is enforced instantly, even if the now-forbidden button is briefly still on their screen; pressing it fails. A newly added grant is honoured by the server instantly, but the new menu items show up on the next token renewal. If someone says "you gave me access but I can't see it", ask them to sign out and back in.

## The Pastor honorific

`pastor` survives in exactly one place: the **honorific** on a member's profile, alongside "Reverend", "Elder", and anything else you care to type. It is a display title, up to 50 characters, and it grants **nothing**.

A member with the honorific "Pastor" who holds only a Fellowship Leader grant sees exactly what a fellowship leader sees. For branch-wide access they need a Branch System Admin grant.

Note that the honorific is a separate thing from a branch **leadership** appointment. The honorific is how someone is addressed; the leadership record (Main Pastor or Minister) is who holds office in a branch, and only Main Pastor carries the derived safeguarding sight described above.

## No role switcher

There is no in-app role switcher and no "choose your role" step after signing in. A member cannot act as somebody else. One token carries all of their grants, and everything they see follows from it. If their access needs to change, change their grants.
