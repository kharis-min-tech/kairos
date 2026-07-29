# Core Concepts

Understanding these five concepts will make the rest of the documentation much easier to follow.

## 1. Branches

A **branch** is a single church location. Every piece of data in Kairos — members, departments, fellowships, outreach programs, attendance records — belongs to a branch. Branches are the primary unit of organisation.

Each branch has:
- A name, type (Main, Satellite, Campus, etc.), city, and contact details
- A home region
- A Main Pastor and optional Elders
- Its own set of members, fellowships, and departments

Branches cannot see each other's data unless you are an Admin.

## 2. Members

A **member** is any registered person in the system. Members have a home branch and can belong to one fellowship and up to two departments within that branch.

Member status can be:
- **Pending** — registered but not yet approved
- **Approved / Active** — full access granted
- **Inactive** — soft-deleted, history preserved

## 3. Roles & Grants

Kairos uses two system-level roles (`admin` and `member`) but real permissions come from **functional grants**. A grant is a named role bundle tied to a specific scope — a branch, fellowship, or department.

For example, a member with a `FellowshipLeader` grant for "Grace K-Group" can manage that fellowship but nothing outside it. The same member with a `DepartmentLeader` grant for "Choir at Kharis London" can manage that department separately.

See [Roles & Permissions](/getting-started/roles-permissions) for the full breakdown.

## 4. The Souls Pipeline

Kairos tracks the journey of people reached through evangelism. A **soul** is someone captured during an outreach event. They move through a pipeline:

**New → Following Up → Interested → Converted**

Once converted, they can be enrolled in the **New Believers** discipleship track, which has four sessions before they integrate into a department as a full member.

## 5. Soft Deletes

Nothing is permanently deleted in Kairos. Deactivating a member, fellowship, or department preserves all history — attendance records, follow-up notes, and role assignments remain intact. This is important for reporting and accountability.
