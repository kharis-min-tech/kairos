# Branch Management

Branch management is an Admin-only function. Pastors manage everything *within* their branch but cannot create, modify, or deactivate branches themselves.

## Creating a branch

Go to **Branches → + New Branch** and fill in:

| Field | Required | Notes |
|-------|----------|-------|
| Branch name | Yes | Unique within the region |
| Region | Yes | Must exist — create the region first |
| Branch type | Yes | Main, Satellite, Cell, Campus, or Online |
| City | No | |
| Address | No | |
| Phone | No | Must be globally unique |
| Email | No | Must be globally unique |
| Established date | No | Historical record only |

## Assigning a pastor

After creating a branch, assign its Main Pastor:

1. Go to **My Branch** (or open the branch from **Branches**)
2. In the **Current Leadership** section, add the pastor
3. Only members who exist in the system can be assigned
4. Each branch can have **one current Main Pastor** at a time
5. Elders can be added in addition to the Main Pastor

Leadership assignments include a start date and optional end date — this creates a complete leadership history for the branch.

## Editing branch details

Click into a branch from the Branches page to edit its name, type, contact details, or region. Only Admins can make these changes.

## Deactivating a branch

Use the **Deactivate** button on the branch card. This is a soft delete — all member records, attendance history, and data for that branch are preserved. The branch is hidden from active views but remains in reports.

## Managing multiple branches

The **All Regions** filter on the Branches page lets you narrow down branches by region. For churches with locations across multiple countries, this keeps the view manageable.

## Branch isolation

Data is strictly isolated by branch. A pastor at Kharis London Central cannot see members, departments, fellowships, or reports from Kharis Accra. Only Admins have cross-branch visibility.

This isolation is enforced at the API level — it is not just a UI filter.
