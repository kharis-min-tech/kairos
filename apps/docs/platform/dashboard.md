# Dashboard

The dashboard is the first thing you see after logging in. It gives you an at-a-glance view of what's happening in your church, scoped to your role.

<div class="screenshot-window screenshot-light">

![Kairos admin dashboard showing stats, upcoming fellowships, and mission control reports](/screenshots/dashboard.png)

</div>

<div class="screenshot-window screenshot-dark">

![Kairos admin dashboard in dark mode showing stats, upcoming fellowships, and mission control reports](/screenshots/dashboard-dark.png)

</div>

## One page, built from blocks

The dashboard used to be seven different pages hidden behind one URL, each with its own hard-coded set of numbers. It is now one set of blocks, and which of them appear is decided by the **altitude** your grants put you at.

| Altitude | Who is at it | What they get |
|----------|-------------|---------------|
| Church | Platform admins | Church-wide numbers lead; no personal agenda |
| Branch | Anyone with a branch grant | Branch numbers, the branch queue, and an agenda |
| Group | Fellowship and department leaders | An agenda and a queue, scoped to their own group |
| Personal | Everybody else | Their own week |

Altitude is worked out from capabilities, never from a role field. It is why a fellowship leader now sees their fellowship's numbers: under the old arrangement they fell through to the branch view and saw branch-wide figures that were none of their business.

A badge under the greeting tells you which lens you are looking through. It is display only and gates nothing.

## The blocks

### Pulse

The row of numbers across the top, at branch altitude and above.

**Church pulse** shows Branches, Total congregation, Confirmed members, and Fellowships. **Branch pulse** shows Total congregation, Confirmed members, Attendance last week, and Fellowships.

::: tip Total congregation and Confirmed members are different numbers
Total congregation is the whole roll. Confirmed members counts only the people who have completed the [membership class](/platform/membership). A healthy branch usually has far more of the first than the second. See [Growth Reports](/analytics/growth-reports#congregation-breakdown).
:::

Underneath, Pulse carries **warnings** when something needs attention: a register that was never taken, members drifting out of attendance, branches falling behind, or a branch with no Main Pastor. Each warning is a link straight to the page where you would fix it.

### Needs you

Things actually waiting on you, counted and linked: registrations to approve, flagged concerns, follow-ups that have come due. High-urgency items are marked.

This replaced a pattern where approvals were a number on a card you had to notice, and concerns lived on a page you had to remember to visit.

### Agenda

What is happening, in time order: upcoming fellowship meetings, services, and sessions. At group altitude it is scoped to your own group.

### Groups

At church altitude, a summary per branch. Below that, a summary of the groups you lead.

### Recent activity

A live feed drawn from five real sources: new registrations, form submissions, membership graduations, fellowship meetings, and souls reached.

### Getting started

Only for people who have not finished setting themselves up. It offers the next concrete step: complete your profile, join a fellowship, or express interest in the membership class.

### Streak

Your own run of consecutive services attended.

### Daily verse

A scripture, rotating by day.

## What happened to Mission Control

Earlier versions of the dashboard had a "Mission Control Reports" strip of six mini-charts and a "Mission Summary" engagement band. Both are gone, replaced by Pulse and its warnings. The underlying figures did not disappear; they moved to where they can be interrogated properly:

- Attendance trends and the per-member heatmap: [Attendance Reports](/analytics/attendance-reports)
- Membership growth and the congregation breakdown: [Growth Reports](/analytics/growth-reports)
- The souls funnel: [Souls Dashboard](/platform/souls-dashboard)
