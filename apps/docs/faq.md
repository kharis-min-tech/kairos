# FAQ

## Getting started

**Who can create an account?**

Anyone can register via the login page. After registering, accounts start as **Pending** and require approval from a Pastor or Admin before full access is granted.

**I registered but can't see anything. What's wrong?**

Your account is likely pending approval. Contact your branch pastor or church admin and ask them to approve your registration. Until then, you can only view your own profile.

**Can I change my home branch?**

Not directly. Contact your church admin. Branch assignments are managed by Admins and Pastors since they affect which members, departments, and fellowships you can access.

---

## Members

**Can members see other members' profiles?**

No. A member with no grants sees only their own profile, and the Members directory is not in their sidebar. Group leaders see the people in the fellowship or department they lead, including contact details. The full branch directory needs a branch grant.

**Who shows up in the Members directory?**

Confirmed Members and Returners: the people who have signed in and belong to the branch. Visitor and child records, which are usually created automatically by a form or a safeguarding process, stay behind their own surfaces rather than flooding the directory. You can narrow the list to one kind with the filters.

**How do I join a fellowship?**

Go to **Fellowships**, browse the available groups, and request to join. The fellowship leader will approve or reject your request. You can only be in one fellowship at a time.

**How do I join a department?**

Request to join from the Departments page. The department leader approves requests. You can be in a maximum of two departments at once.

**Can I see my attendance history?**

Yes. Go to **My Attendance** in the sidebar. It shows your last 12 weeks of service attendance, your punctuality breakdown, and your current streak.

---

## Membership classes

**Am I a "Member"?**

Only if you have completed the four-week membership class. It is a specific thing with a specific certificate, and nothing else confers it: not years of attendance, not serving in a department, not leading a fellowship, not completing the New Believers programme. See [Membership Classes](/platform/membership).

**How do I join a membership class?**

You cannot enrol yourself. Go to **Membership**, look at the cohorts, and express interest. That puts you on the waitlist. A membership administrator then admits people from the waitlist into a specific cohort.

**How long does my place on the waitlist last?**

180 days. If it lapses you can express interest again, and the clock restarts.

**What do I have to do to graduate?**

Six things: attend all four sessions, pass the homework for each, pass the quiz for each, pass the final test, take that test before the deadline if the cohort set one, and attend the induction. Your own Membership page shows which of the six are still outstanding.

---

## Leaders

**I'm a department leader. Why can't I see members outside my department?**

Leader access is strictly scoped to the groups you lead. You can only see and manage members who are in your department or fellowship. This is by design: it protects member privacy.

**Can I see my own group's New Believers and membership class progress?**

Yes. A fellowship or department leader sees that progress for their own people, narrowed by who is in their group rather than by branch.

**Can I approve members into the church?**

No. Only Pastors and Admins can approve new member registrations. As a leader, you can approve join requests for your own department or fellowship, but not system-level approvals.

**I'm a leader in the Admin department. Do I see form submissions?**

Yes. Admin department leaders can review front-desk form submissions including First-Time Visitor, Altar Call, and Baptism forms.

---

## Pastors

**Can I see data from other branches?**

No. A branch grant is strictly scoped to that branch. Cross-branch visibility belongs to platform admins, and to the two church-wide grants: Membership Admin and Safeguarding Head.

**I administer my branch. Why can't I see the safeguarding inbox?**

Because safeguarding sight does not come from a branch grant. The branch's current **Main Pastor** gets it automatically from holding that office, and a **Safeguarding Lead** gets it by grant, deliberately as somebody independent of branch leadership. A Minister holding the same branch grant as the Main Pastor does not see it. The welfare inbox is separate again, and belongs to the Branch System Admin.

**Can I create new branches?**

No. Branch creation and management is an Admin function. You can manage everything within your branch, but not the branches themselves.

**Can I assign Admin-level roles to members?**

No. Granting system-level admin access is an Admin-only action.

---

## Admins

**How do I give someone fellowship leader access?**

Not from their profile. Fellowship and department grants are conferred by the group, so go to **Fellowships**, open the fellowship, and name them as its leader or co-leader. The grant is written for you, and removing them from the group removes it. The same applies to Department Lead and Deputy, from **Departments**. Attempting to add those grants from a member profile is refused with a message pointing you to the group.

Branch-scoped and church-scoped grants, such as Branch System Admin or Membership Admin, *are* assigned from the member's roles section.

**I added a grant but the person says nothing changed.**

The server honoured it immediately; their screen did not. Menu items and buttons are drawn from their sign-in token, which renews in the background during normal use. Asking them to sign out and back in makes it appear at once. Revocation is the other way round: the server stops honouring a removed grant instantly, even if a now-useless button is briefly still on their screen.

**Does giving someone the "Pastor" honorific give them any permissions?**

No. The honorific is display-only. For a member to have pastor-level access to a branch, they need a `BranchAdmin` grant assigned by an Admin.

**Does Kairos handle giving or donations?**

No. Financial records are deliberately out of scope, and there is no donation data in the system.

---

## Data & privacy

**Is my data ever deleted?**

Kairos uses soft deletes, so deactivating a member or group preserves all historical records. You can download a copy of your own data, and request deletion of your account, from **Settings → Privacy & Data**.

**Who can see my attendance?**

Your attendance is visible to you, your pastor, and admins. Leaders can see attendance data for members in their own group only.

**Who can see my emergency contact details?**

Your emergency contact information is visible to you, your pastor, and admins. Regular members and leaders cannot see this.
