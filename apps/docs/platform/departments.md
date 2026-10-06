# Departments

Departments are the ministry teams within each branch. Kairos supports the full range of Kharis Church ministries.

<div class="screenshot-window screenshot-light">

![Departments page showing ministry team cards with lead member, member count, and pending badges](/screenshots/departments.png)

</div>

<div class="screenshot-window screenshot-dark">

![Departments page in dark mode showing ministry team cards](/screenshots/departments-dark.png)

</div>

## Ministry types

A department is created from a **catalogue** of ministry types rather than by typing a name, so the same ministry means the same thing in every branch. The catalogue is a managed list; the dropdown on the create form is always the authority for your church.

These are the types Kairos ships with:

| Ministry | Description |
|----------|-------------|
| Admin | Service-day registers and first-timer captures |
| Choir | Music ministry and worship |
| Design | Graphics and creative |
| Drama | Drama and stage performances |
| Follow-Up Team | Contacts first-timers after their visit, and members not yet in a fellowship or department |
| Hospitality | Food, refreshments and guest care |
| Host Team | Greets first-time guests on the day |
| New Believers | New convert care and discipleship |
| Production | Stage production and lighting |
| Sanctuary Keepers | Facility cleaning and preparation |
| Social Media | Online presence and content |
| Sound | Audio engineering and mixing |
| Ushers | Door, seating and order management |
| Welfare | Pastoral care and benevolence |

::: tip Host Team and Follow-Up Team are not the same job
Host Team greets somebody while they are in the building. Follow-Up Team contacts them afterwards, and also works the list of members who belong to no group yet. They are deliberately separate departments because they are separate shifts with separate skills. See [Follow-ups](/platform/follow-ups).
:::

Use the **All Branches** dropdown to filter by branch when managing multiple locations.

## Department cards

Each card shows:
- Department name and branch
- Lead member name
- Number of active members
- Description
- **Deactivate** button (Pastor and Admin only)
- **Pending** badge if there are join requests awaiting approval

## Creating a department

Click **+ New Department** (Pastor and Admin only):

<div class="screenshot-window screenshot-light">

![New Department creation form](/screenshots/set-up-department-light.png)

</div>

<div class="screenshot-window screenshot-dark">

![New Department creation form in dark mode](/screenshots/set-up-department.png)

</div>

| Field | Notes |
|-------|-------|
| Ministry type | Select from the list above |
| Branch | Required |
| Lead member | Required; must be an existing member in the branch |
| Deputy member | Optional; must be different from the lead |
| Start date | Defaults to today |
| Description | Optional |

Each branch can have one active instance of each department type.

## Joining a department

Members can request to join a department from their profile or department page. Requests go to the department leader for approval. Members can be in a maximum of **two departments** at the same time. The system warns leaders if a member already holds two active memberships, though an admin can override this limit.

## Pending join requests

When a department card shows a **pending** badge, the department leader has unapproved join requests.

## Department roster

Leaders can view their full department roster including member contact details, join dates, and follow-up notes.

## Who can manage departments

| Action | Member | Leader | Pastor | Admin |
|--------|--------|--------|--------|-------|
| View department list | Yes | Yes | Yes | Yes |
| Create departments | No | No | Yes | Yes |
| Deactivate departments | No | No | Yes | Yes |
| Approve join requests | No | Own only | Yes | Yes |
| View roster | No | Own only | Yes | Yes |
| Log follow-up notes | No | Own only | Yes | Yes |
