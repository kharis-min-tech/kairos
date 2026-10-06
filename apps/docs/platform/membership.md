# Membership Classes

The Membership page runs the four-week membership class: the programme that makes somebody a Member of the church in the formal sense.

::: warning What "Member" means here
In this church, a Member is specifically somebody who has completed the four-week membership class and received their certificate. Nothing else confers it. Attending every Sunday for a year does not. Serving in a department does not. Leading a fellowship does not. Completing the New Believers programme does not. Signing up for an account certainly does not.

Everybody with a record in Kairos is listed in the directory and counted in attendance, because they are part of the church and need to be counted. But the **Members** figure on the dashboard and in reports counts class graduates, and the **Returners** figure counts the faithful regulars who have not done the class yet. Both are real; they are not the same number.
:::

## Who runs it

The programme is **church-wide**, not per-branch. Cohorts draw from every branch, so there is no branch grant that could describe authority over one.

| Who | What they can do |
|-----|-----------------|
| **Membership Admin** (church-scoped grant) | Everything: create cohorts, schedule sessions, work the interest pool, admit people, mark attendance and homework, record the final test, graduate the cohort |
| **Membership Champion** (per-branch grant) | Read-only. Sees their own branch's waitlist and admitted members, and receives that branch's membership notifications. Cannot create cohorts or mark anything. |
| **Fellowship and department leaders** | See the class progress of their own group members only |
| **Platform admin** | Everything, as always |
| **Everybody else** | Browse cohorts, express interest, follow their own progress |

::: tip A Branch System Admin is not a Membership Admin
Because the programme is church-scoped, a branch grant does not reach it, no matter how many branches somebody administers. The Membership Admin grant has to be given explicitly. See [User Permissions](/administration/permissions).
:::

## Enrolment is not self-service

This is the part that most often surprises people. A member cannot put themselves into a cohort. The route in is always:

1. **The member expresses interest.** One tap from the Membership page. This puts them in the **interest pool**, which is not attached to any cohort.
2. **An admin admits them.** From the pool, a Membership Admin picks people and admits them into a specific cohort.

The pool being cohort-independent is the point: somebody can say "yes, I want to do this" the week they decide, without having to wait for a cohort to be scheduled or guess which one they will be able to attend.

Expressing interest is refused if the person has already completed the class, or already has an open enrolment.

### The waiting window

A pool entry lasts **180 days**. After that it lapses.

Lapsing is not a nightly job. It is applied the moment anybody reads or writes the pool, which means the list an admin is looking at is always already correct, with no window in which a stale entry looks live. A lapsed entry is archived about a month later.

Lapsed, withdrawn, and admitted are all final. If somebody's interest lapses and they want back in, they express interest again and the 180 days restart.

### Admitting people

Open the cohort and admit from the waitlist. Notes worth knowing:

- Admission is refused if the cohort is completed or cancelled, or if its enrolment is closed.
- Anybody who has already completed the class is filtered out.
- Anybody with an open enrolment in a different cohort is flagged rather than silently moved.
- Admitting the same person twice is harmless.
- You can admit somebody who never joined the pool, for the person who signed up on paper at the welcome desk. They are recorded as not having come through the pool, so the two routes stay distinguishable in reporting.

Withdrawing is possible for the member themselves or an admin, with a reason: stopped attending, withdrew, moved away, deferred to the next cohort, or other. A graduate cannot be withdrawn.

## Cohorts

A cohort is one run of the class. Create it from **Membership**, then schedule its sessions.

| Field | Notes |
|-------|-------|
| Name | Required |
| Description | Optional |
| Start date | Required |
| Graduation date | The induction or certificate ceremony |
| Final test deadline | Optional; if set, a test taken after it does not count |
| Status | Planned, Active, Completed, or Cancelled |
| Enrolment open | Turn off to stop admissions without cancelling the cohort |
| Homework pass mark | Out of 100, defaults to 50 |
| Quiz pass mark | Out of 100, defaults to 50 |
| Final test pass mark | Out of 100, defaults to 50 |

Pass marks live on the cohort, so a particular run can set its own bar. Changing a pass mark later does **not** re-grade work already marked: a pass or fail is decided and stored at the moment you enter the score.

A cohort cannot be deleted while anybody is still enrolled in it. Deleting is a soft delete in any case; the history survives.

### Sessions

Every cohort has **four** sessions, numbered 1 to 4. This is fixed and not configurable. Each session takes a title, a date, a location, an optional teacher, and notes.

Naming somebody as a session's teacher is a scheduling fact and nothing more. It confers no permissions. Marking is done by admins.

## Marking the register

Open a session and record, per person:

- Attended, yes or no
- Homework score, which sets a pass or fail against the cohort's homework pass mark
- Quiz score, which sets a pass or fail against the cohort's quiz pass mark
- Notes

The final test is recorded once per person, not per session, along with the date it was taken. The induction is recorded as attended or not.

## Graduating

Graduation is gated. A person is ready only when **all six** of these are true:

1. They attended every scheduled session
2. They passed the homework for every session
3. They passed the quiz for every session
4. They passed the final test
5. They took the final test on or before the deadline, if the cohort set one
6. They attended the induction

If you try to graduate somebody who is not ready, Kairos refuses and tells you which of the six is outstanding, per person, so you can see at a glance who is waiting on what.

::: tip Scheduled, not theoretical
"Every session" means every session you actually scheduled. If a cohort only ever got two sessions on the calendar, readiness only asks about those two. Schedule all four before you start marking.
:::

### The override

An admin can graduate somebody who is not ready, but must give a written reason, which is stored on their record. Use it for the genuine edge cases, such as somebody who sat a session at another branch, and not to clear a backlog.

### What graduation does

Graduating stamps the date the class was completed on the member's record. That stamp is the single signal that makes somebody a confirmed Member, and it is what the Members figure in reports counts. There is also a manual admin override on the member record itself, for historical members who completed the class long before Kairos existed.

## Notifications

Four moments generate a notification to the member's branch Main Pastor and to that branch's Membership Champions:

- Somebody joins the waitlist
- Somebody is admitted into a cohort
- Somebody graduates
- Somebody withdraws, or their interest lapses

## What a member sees

From **Membership**, with no grant at all, a member can:

- Browse cohorts and their session schedules
- Express interest, and withdraw it
- See their own enrolment, their marks, and exactly what is still outstanding before they can graduate
- See the date they completed the class, once they have
