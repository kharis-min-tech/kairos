# FAQ

## Getting started

**Who can create an account?**

Anyone can register via the login page. After registering, accounts start as **Pending** and require approval from a Pastor or Admin before full access is granted.

**I registered but can't see anything — what's wrong?**

Your account is likely pending approval. Contact your branch pastor or church admin and ask them to approve your registration. Until then, you can only view your own profile.

**Can I change my home branch?**

Not directly — contact your church admin. Branch assignments are managed by Admins and Pastors since they affect which members, departments, and fellowships you can access.

---

## Members

**Can members see other members' profiles?**

No. Members can only see their own profile. Only Pastors and Admins have access to the full member directory.

**How do I join a fellowship?**

Go to **Fellowships**, browse the available groups, and request to join. The fellowship leader will approve or reject your request. You can only be in one fellowship at a time.

**How do I join a department?**

Request to join from the Departments page. The department leader approves requests. You can be in a maximum of two departments at once.

**Can I see my attendance history?**

Yes — go to **My Attendance** in the sidebar. It shows your last 12 weeks of service attendance, your punctuality breakdown, and your current streak.

---

## Leaders

**I'm a department leader — why can't I see members outside my department?**

Leader access is strictly scoped to the groups you lead. You can only see and manage members who are in your department or fellowship. This is by design — it protects member privacy.

**Can I approve members into the church?**

No. Only Pastors and Admins can approve new member registrations. As a leader, you can approve join requests for your own department or fellowship, but not system-level approvals.

**I'm a leader in the Admin department — do I see form submissions?**

Yes. Admin department leaders can review front-desk form submissions including First-Time Visitor, Altar Call, and Baptism forms.

---

## Pastors

**Can I see data from other branches?**

No. Pastors are strictly scoped to their own branch. Cross-branch visibility is an Admin-only capability.

**Can I create new branches?**

No. Branch creation and management is an Admin function. You can manage everything within your branch, but not the branches themselves.

**Can I assign Admin-level roles to members?**

No. Granting system-level admin access is an Admin-only action.

---

## Admins

**How do I give someone fellowship leader access?**

Go to the member's profile, navigate to their roles section, add a `FellowshipLeader` grant, and scope it to the specific fellowship. Their access updates immediately.

**Does giving someone the "Pastor" honorific give them any permissions?**

No. The honorific is display-only. For a member to have pastor-level access to a branch, they need a `BranchAdmin` grant assigned by an Admin.

**Can I see donation history for all members?**

By design, financial data access requires explicit privileges even for Admins. This separation of duties is intentional to protect sensitive member information.

---

## Data & privacy

**Is my data ever deleted?**

Kairos uses soft deletes — deactivating a member or group preserves all historical records. Permanent deletion can be requested by contacting your church admin. An **Export my data** feature (GDPR right to portability) is coming soon.

**Who can see my attendance?**

Your attendance is visible to you, your pastor, and admins. Leaders can see attendance data for members in their own group only.

**Who can see my emergency contact details?**

Your emergency contact information is visible to you, your pastor, and admins. Regular members and leaders cannot see this.
