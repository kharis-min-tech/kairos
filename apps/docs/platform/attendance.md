# Attendance

The Attendance page covers service attendance: Sunday services, midweek services, and special services. Fellowship meeting attendance is managed separately from within each fellowship.

<div class="screenshot-window screenshot-light">

![Service Attendance page showing a list of Sunday services across branches with Check In links](/screenshots/attendance.png)

</div>

<div class="screenshot-window screenshot-dark">

![Service Attendance page in dark mode showing Sunday services with Check In links](/screenshots/attendance-dark.png)

</div>

## Service list

Each row in the attendance list shows:
- Service type badge (e.g. **Sunday**)
- Service name and theme
- Date, branch, and sermon title
- **Check In →** link to open the attendance roll for that service

## Filtering

Filter the service list by:
- **Type**: All types, Sunday Service, Midweek Service, Special Service
- **From / To**: Date range

## Recording a service

Click **+ Record a service** (Pastor and Admin only) to create a new service entry:

| Field | Notes |
|-------|-------|
| Branch | Required |
| Service type | Sunday, Midweek, Special, Prayer Meeting, Other |
| Date | Required |
| Service title / theme | Optional |
| Preacher | Optional; link to a member |
| Sermon topic | Optional |
| Expected attendance | Optional |

## Checking in members

After creating a service, open it via **Check In →**. Mark each member as:
- **Present**
- **Absent**
- **Virtual**

You can also flag a member as a **First-Time Visitor** during check-in.

Recording attendance for a service needs a branch grant, or platform admin.

## Reports

For the detailed report surface, including the per-member heatmap, attendance frequency bands, and the first-time versus returning split, open **Reports** from the Attendance page. See [Attendance Reports](/analytics/attendance-reports#the-detailed-report-surface).

## Self check-in

Members can check themselves in, so the welcome desk is not the only route onto the register. **Check in** is in everybody's sidebar.

There are two ways:

- **Tap to check in.** One tap records the member at a service whose check-in window is currently open.
- **Scan the desk QR code.** An administrator opens the service and shows **Self check-in QR** on a screen at the desk. The code refreshes every 30 seconds, and the member scans it from **Check in → Scan QR at the desk**. The previous code stays valid for a moment after a refresh, so somebody mid-scan is not rejected.

The rotating code is what stops a member checking in from home: a screenshot taken last Sunday is no longer valid.

### Branch settings

Each branch controls its own self check-in from **My Branch → Attendance settings**:

| Setting | What it does |
|---------|--------------|
| Self check-in enabled | The master switch. Off means neither route works for this branch. |
| Opens before start | How many minutes before the service starts the window opens |
| Closes after start | How many minutes after the start the window closes |
| Late after | How many minutes after the start a check-in is recorded as **Late** rather than **Present** |

Checking in twice does not create two records, and the Late threshold is applied by the server, so it is the same whichever route was used.

## My Attendance

Every member has a personal **My Attendance** page in the sidebar. This is private: only the member, their pastor, and the admin team can see it.

<div class="screenshot-window screenshot-light">

![My Attendance page showing 67% attendance rate, punctuality breakdown, streak, and service history](/screenshots/my-attendance.png)

</div>

<div class="screenshot-window screenshot-dark">

![My Attendance page in dark mode showing attendance rate, punctuality breakdown, and service history](/screenshots/my-attendance-dark.png)

</div>

### What it shows

- **Attendance Rate**: percentage over the last 12 weeks with a motivational note
- **Attended vs Total**: e.g. "2 attended of 3 services"
- **Last seen**: date and service of last attendance

### Punctuality breakdown

A bar chart showing how your services split across Present, Late, Virtual, and Missed.

### Current streak

How many consecutive services you've attended in a row.

### Service history

A list of every service in the 12-week window, oldest first, with the attendance status for each (Missed, Present, Virtual, Late).
