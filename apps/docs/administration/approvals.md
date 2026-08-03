# Approvals

The approval queue is where Pastors and Admins review new member registrations before granting full access.

## Why approvals exist

When someone self-registers via the login page, they are not immediately given full access. Their account starts as **Pending**. This prevents unknown users from accessing member data before the church has verified who they are.

## Accessing the queue

Go to **Members** — the **Approval Queue** button appears in the page header. The count of pending requests is shown on the button.

The Admin dashboard also shows pending approvals in the top-right summary card. A count of **0** means no action is needed.

## Reviewing a request

Click **Approval Queue** to see all pending registrations. Each entry shows:

- Member name and profile photo (if provided)
- Email and phone
- Home branch they selected
- Registration date

You can **Approve** or **Reject** each request individually.

## Approving a member

Click **Approve**. The member's status changes to **Approved** immediately. They can now log in with full member access — their navigation expands and they can view their profile, fellowships, and submit forms.

## Rejecting a request

Click **Reject**. The account is removed. The email address becomes available for re-registration. Use this for duplicate registrations, spam accounts, or mistaken sign-ups.

## Members added by staff

Members added directly by a Pastor or Admin (via **Members → + Add Member**) are automatically approved. The approval queue only applies to self-registrations.

## Pending member access

Until approved, a pending member can only view their own profile. They cannot see the member directory, fellowships, departments, or any reports. This is enforced at the API level, not just the UI.
