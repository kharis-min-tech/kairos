# Roles & Permissions

What you can see and do in Kairos is decided by the **grants** on your account, not by a job title. There is no role switcher, and no step after signing in where you pick who to be. Your permissions are set when your account is configured and take effect from your next sign-in.

## The one thing to understand first

Kairos stores only two system roles: `admin` and `member`. Everyone who is not on the small platform team is a `member`, including the Senior Pastor.

Real authority comes from **grants**: a named role bundle pinned to one branch, one fellowship, one department, or the whole church. Hold a Fellowship Leader grant for Grace K-Group and you can run Grace K-Group. Hold nothing and you can manage your own profile. Hold several grants and you get all of them, each inside its own boundary.

::: warning "Pastor" and "Leader" are not roles
They are useful words for a *pattern* of grants, and this documentation uses them that way. But there is no Pastor role and no Leader role to assign. A member whose profile shows the honorific "Pastor" has exactly the permissions their grants give them, which may be none.
:::

## The four shapes of access

Almost everyone in a church falls into one of four patterns. The rest of this documentation uses these labels as shorthand, including in the "who can do what" tables on each feature page.

| Label | What it actually means | Reach |
|-------|-----------------------|-------|
| **Member** | No grants | Own data only |
| **Leader** | A Fellowship Leader, Department Lead, or Department Deputy grant | The group named on the grant, and nothing else |
| **Pastor** | A Branch System Admin or Branch Data Admin grant | One branch |
| **Admin** | `systemRole` of `admin` | Everything, in every branch |

For the full catalogue of grants, including the church-wide ones that fit none of these four shapes, see [User Permissions](/administration/permissions).

---

## Member

Everyone starts here. After registering and being approved, a member can:

**Can do:**
- View and edit their own profile (name, contact details, photo, emergency info)
- View their own membership status and home branch
- See which departments and fellowships they belong to
- View their own attendance history via **My Attendance**
- Submit forms: First-Time Visitor, New Believers Class, Baptism, Testimony, Baby Naming, Baby Dedication
- Browse membership class cohorts and express interest in joining one
- Request to join a fellowship, a department, or an outreach program within their branch
- Register as a worker on an outreach program
- Export their own data, and request account deletion, from Settings

**Cannot do:**
- View other members' profiles or data
- Manage any group, fellowship, or department
- Approve requests or take administrative actions
- Open the Members directory, the follow-up queues, or the Concerns inbox

::: tip Pending members
Pending members (registered but not yet approved) can only view their own profile until someone with approval rights in their branch approves the account.
:::

---

## Leader

A leader is somebody named as the leader, co-leader, lead, or deputy of a group. Naming them on the group is what creates the grant; there is nothing to assign by hand. Their access is scoped strictly to that group. A leader with no group has the same access as a member.

**Can do:**
- View and manage the roster of their specific department or fellowship
- Approve or reject join requests for their group
- Record meeting attendance and create meetings
- Log follow-ups on members in their group
- View member contact details within their group
- Create and update outreach programs they coordinate

**New Believers and Membership visibility:**
- A fellowship or department leader sees the New Believers and membership class progress of **their own people**, narrowed by who is in their group rather than by branch

**Reports:**
- Data scoped to members of their group only, not the whole branch

**Cannot do:**
- Access data outside their assigned group
- Create branches, approve member registrations, or assign grants
- See other departments' or fellowships' rosters
- Read the welfare or safeguarding inbox

---

## Pastor

"Pastor" here means somebody holding a branch grant. There are two kinds and the difference matters.

**Branch System Admin** is the branch's permissions keyholder:
- Everything a Branch Data Admin can do, plus
- Grant and revoke Branch System Admin within their own branch
- Appoint or end branch leadership (Main Pastor, Minister)
- Read the branch's welfare inbox

**Branch Data Admin** is branch operations without the keys:
- View and manage all members across their branch
- Approve new member registrations
- Deactivate and reactivate members
- Import and export member data via CSV
- Create and manage all fellowships and departments in their branch
- Create outreach programs for their branch
- Record attendance for services and fellowship meetings
- Work the first-timer, no-group, and due follow-up queues
- View and export all form submission types, and manage dormant attendees
- Access branch-level reports: member growth, attendance trends, fellowship activity, new believers pipeline

**Neither can:**
- Access data from any other branch
- Create, edit, or deactivate branches themselves
- Make somebody a platform admin
- View church-wide analytics across all branches
- Administer the membership class programme, which is church-scoped

::: warning Safeguarding is not included
Neither branch grant carries safeguarding sight. The branch's **Main Pastor** gets it automatically from holding that office, and a **Safeguarding Lead** gets it by grant. A Minister holding the same Branch System Admin grant as the Main Pastor does not see the safeguarding queue. See [User Permissions](/administration/permissions#the-derived-grant-branch-pastor).
:::

---

## Admin

Platform admins have full, unrestricted access. Every capability check returns true for them, in every branch. This is break-glass access for the small team that runs the system, not a seniority marker.

**Can do:**
- Create and manage branches and regions
- Assign and remove grants for any member in any branch
- Manage members across all branches
- View church-wide analytics and run cross-branch reports
- Administer the membership class programme
- Manage approval queues across all branches
- Configure system-level settings unavailable to anyone else

---

## Church-wide grants

Two grants belong to nobody's branch, because what they cover is church-wide:

| Grant | Reach |
|-------|-------|
| **Membership Admin** | The whole membership class programme: cohorts, sessions, the interest pool, admission, marking, graduation. Cohorts are church-wide, so no branch grant could describe authority over one. |
| **Safeguarding Head** | Safeguarding across every branch. The escalation route above a branch's Safeguarding Lead, because a concern raised in one branch sometimes has to leave that branch entirely. |

A church-scoped grant reaches every branch. The reverse is never true: holding a branch grant in every branch still does not satisfy a church-scoped check.

---

## Permission Matrix

Using the four shorthand labels above.

| Action | Member | Leader | Pastor | Admin |
|--------|--------|--------|--------|-------|
| Edit own profile | Yes | Yes | Yes | Yes |
| View own attendance | Yes | Yes | Yes | Yes |
| Submit forms | Yes | Yes | Yes | Yes |
| Express interest in a membership class | Yes | Yes | Yes | Yes |
| Export own data / request deletion | Yes | Yes | Yes | Yes |
| View group roster | No | Own group | Yes | Yes |
| Approve join requests | No | Own group | Yes | Yes |
| Record attendance | No | Own group | Yes | Yes |
| Manage members | No | No | Own branch | Yes |
| Approve registrations | No | No | Own branch | Yes |
| Import/export CSV | No | No | Own branch | Yes |
| Create departments | No | No | Own branch | Yes |
| Follow-up queues | No | No | Own branch | Yes |
| Branch-level reports | No | Own group | Own branch | Yes |
| Welfare inbox | No | No | Branch System Admin only | Yes |
| Safeguarding inbox | No | No | Main Pastor or Safeguarding Lead only | Yes |
| Administer membership classes | No | No | No (church-scoped grant) | Yes |
| Grant Branch System Admin | No | No | Branch System Admin, own branch | Yes |
| Appoint branch leadership | No | No | Branch System Admin, own branch | Yes |
| Manage branches | No | No | No | Yes |
| Manage regions | No | No | No | Yes |
| Church-wide analytics | No | No | No | Yes |
| Make somebody a platform admin | No | No | No | Yes |
