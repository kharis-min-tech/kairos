# Members

The Members page is the church's directory. It shows the people in your branch (or across all branches for Admins) with their status, contact details, and fellowship assignment.

::: tip Who is in the directory
The directory covers **confirmed Members** (people who have completed the [membership class](/platform/membership)) and **Returners** (people who attend without having done the class yet). Visitor and child records, which are usually created automatically by a First-Time Visitor form or a safeguarding process, stay behind their own surfaces instead, so the roll is not flooded with rows that have no sign-in. Use the filters to narrow to one kind.
:::

<div class="screenshot-window screenshot-light">

![Members page showing member cards with approval status, contact info, and Deactivate buttons](/screenshots/members.png)

</div>

<div class="screenshot-window screenshot-dark">

![Members page in dark mode showing member cards with approval status, contact info, and Deactivate buttons](/screenshots/members-dark.png)

</div>

## The member directory

Each member card shows:
- Name and avatar initials
- Home branch
- Email and phone
- Approval status badge (Approved, Pending)
- **Deactivate** button, for anyone with a branch grant

## Searching and filtering

Use the search bar to find members by name or email. Filter using the dropdowns:

- **All Fellowships**: narrow to members of a specific fellowship
- **Branch**: filter by branch (Admin only)
- **All Statuses**: filter by Approved, Pending, or Inactive

## Adding a member

Click **+ Add Member** to create a member manually. Required fields:

| Field | Notes |
|-------|-------|
| First name, Last name | Required |
| Email | Must be unique |
| Phone | Recommended |
| Home branch | Required; sets their branch scope |
| Gender | Male or Female |
| Date of birth | Optional |
| Address | Optional |
| Emergency contact | Name, phone, and relationship |

Members added manually by somebody with a branch grant are automatically approved.

## Self-registration

Members can register themselves via the login page. Self-registered members start with **Pending** status and must be approved before they get full access. Pending members can only view their own profile.

## Approval Queue

The **Approval Queue** button in the Members page header shows all pending registrations. Click it to review and approve or reject each request. See [Approvals](/administration/approvals) for more detail.

## Importing members via CSV

Click **Import CSV** to bulk-upload members. The CSV should include columns for first name, last name, email, phone, gender, date of birth, and home branch. The system validates each row before importing and shows a preview with any errors highlighted.

## Exporting members

Click **Export CSV** to download the current filtered view as a CSV file. Useful for reporting or migrating data.

## Safeguarding review

The **Safeguarding review** button opens a filtered view of records with safeguarding notes or flags.

This is separate from the [Concerns](/platform/concerns) inbox. Safeguarding review is about the records themselves, principally visitor and child shells awaiting a decision; the Concerns inbox is about follow-ups somebody flagged. The two are read by different people: Concerns needs safeguarding sight, which a branch grant does not confer.

## Deactivating a member

Deactivating a member is a soft delete. Their profile, attendance history, follow-up notes, and group memberships are all preserved. They lose access to the system but their data remains intact for reporting.

Deactivating requires a branch grant, or platform admin.
