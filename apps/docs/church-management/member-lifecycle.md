# Member Lifecycle

This guide covers the full journey of a member in Kairos, from first registration through approval, active membership, and eventual deactivation.

## 1. Registration

A new member can register themselves via the login screen by clicking **Create account**. They fill in:

- First and last name
- Email address
- Password
- Phone number
- Date of birth and gender
- Home branch selection
- Address (optional at registration)

After submitting, their account is created with **Pending** status. They receive a confirmation and can log in, but their access is restricted to their own profile only until approved.

Alternatively, a Pastor or Admin can add a member directly via **Members → + Add Member**. Members added this way are automatically approved.

## 2. Approval

Pending registrations appear in the **Approval Queue** accessible from the Members page header. Approving needs a branch grant, or platform admin.

Approving a member:
1. Go to **Members → Approval Queue**
2. Review the member's submitted details
3. Click **Approve**. They immediately gain full member access
4. Or click **Reject**. Their account is removed

Once approved, the member sees the full navigation for their role and can:
- View and edit their profile
- See their fellowships and departments
- Submit forms
- View their attendance history

## 3. Active membership

An active, approved member can:
- Keep their profile up to date (contact details, photo, emergency info)
- Request to join a fellowship
- Request to join up to two departments
- Express interest in a membership class
- Register for outreach programs in their branch
- Submit forms (First-Time Visitor, Baptism, Testimony, etc.)
- View their attendance history via My Attendance

## 4. Role assignment

Where a grant is assigned depends on what it is scoped to.

- **Branch and church-scoped grants** are assigned from the member's roles section. A platform admin can do this anywhere; a Branch System Admin can grant Branch System Admin within their own branch.
- **Fellowship and department grants are conferred by the group.** Name somebody as a fellowship's leader or co-leader, or a department's lead or deputy, and the grant is written for you. Removing them from the group removes it. These cannot be added from a member profile.

Examples:
- Named leader of a fellowship → unlocks that fellowship's roster, meetings, and follow-ups
- Named lead of a department → unlocks that department's roster, rota, and follow-ups
- `BranchAdmin` scoped to a branch → branch-wide operations, plus the ability to grant it to others

**When the change takes effect:** the server re-reads grants from the database on every request, so a new or revoked grant is enforced instantly. The person's own menus and buttons are drawn from their sign-in token, so those change on the next token renewal, or immediately if they sign out and back in.

## 4b. Becoming a Member

Being on the roll is not the same as being a Member. The formal step is the four-week membership class: express interest, be admitted to a cohort by a membership administrator, attend and pass the four sessions, pass the final test, attend the induction, and graduate.

Until then the person is counted as a **Returner** in the dashboard and reports, not as a Member. See [Membership Classes](/platform/membership).

## 5. Deactivation

Deactivating a member is a soft delete. All their data (attendance records, follow-up notes, department history, class record) is preserved. They lose login access but nothing is removed from reports or historical records.

Deactivating requires a branch grant, or platform admin.

A member can also delete their own account from **Settings → Privacy & Data**, and download a copy of their data before doing so.

To deactivate: open the member card on the Members page and click **Deactivate**. Confirm the action.

To reactivate: find the member using the **Inactive** status filter and click **Reactivate**.

## 6. CSV import and export

For bulk operations:

- **Import CSV**: upload a spreadsheet of members to create multiple accounts at once. The system validates each row and shows a preview before importing.
- **Export CSV**: download the current filtered member list. Useful for reporting, external mail merges, or migrating data.

Both are available from the Members page header to anyone with a branch grant.
