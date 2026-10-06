# Core Concepts

Understanding these six concepts will make the rest of the documentation much easier to follow.

## 1. Branches

A **branch** is a single church location. Every piece of data in Kairos (members, departments, fellowships, outreach programs, attendance records) belongs to a branch. Branches are the primary unit of organisation.

Each branch has:
- A name, type (Main, Satellite, Campus, etc.), city, and contact details
- A home region
- A Main Pastor and optional Ministers
- Its own set of members, fellowships, and departments

Branches cannot see each other's data unless you are an Admin.

## 2. People, and what "Member" means

Everybody in Kairos lives in one list. A person has a home branch, and can belong to one fellowship and up to two departments within it.

Where it gets subtle is the word *Member*. In this church, a Member is specifically somebody who has **completed the four-week membership class**. Attending for years, serving in a department, or even leading a fellowship does not make somebody a Member in that formal sense. See [Membership Classes](/platform/membership).

So each person carries two independent labels, and it is worth keeping them apart:

**What kind of person they are:**
- **Member**: completed the membership class
- **Returner**: attends without having done the class yet. Most of the congregation, usually.
- **Visitor**: an occasional attendee, often created by a First-Time Visitor form
- **Child**: tracked separately, with their own protections

**Whether they can sign in:**
- **Pending**: registered but not yet approved
- **Approved / Active**: full access granted
- **Inactive**: soft-deleted, history preserved

Visitors and children stay visible in the directory and in attendance totals, because they are part of the church and need counting. They are simply labelled so the difference is obvious.

## 3. Roles & Grants

Kairos uses two system-level roles (`admin` and `member`) but real permissions come from **functional grants**. A grant is a named role bundle tied to a specific scope, and there are four kinds of scope: a **branch**, a **fellowship**, a **department**, or the whole **church**.

For example, a member with a `FellowshipLeader` grant for "Grace K-Group" can manage that fellowship but nothing outside it. The same member with a `DepartmentLeader` grant for "Choir at Kharis London" can manage that department separately.

The church scope exists for the two things that genuinely are not per-branch: the membership class programme, whose cohorts draw from every branch, and the Safeguarding Head, because a concern raised in one branch sometimes has to leave that branch entirely. A church grant reaches every branch. The reverse never holds: holding a branch grant in every branch still does not satisfy a church-scoped check.

See [Roles & Permissions](/getting-started/roles-permissions) for the full breakdown.

## 4. The Souls Pipeline

Kairos tracks the journey of people reached through evangelism. A **soul** is someone captured during an outreach event. They move through a pipeline:

**New → Following Up → Interested → Converted**

Once converted, they can be enrolled in the **New Believers** discipleship track, which has four sessions before they integrate into a department. Note that finishing New Believers is a different thing from finishing the membership class: the first is discipleship for a new convert, the second is what formally makes somebody a Member.

## 5. Follow-ups and Concerns

A **follow-up** is a record of pastoral contact: who reached out, how, what happened, and what should happen next. Every follow-up names the setting it happened in, which is a fellowship, a department, or just the branch. The branch option matters: it means somebody who belongs to no group at all can still be followed up.

Any follow-up can be flagged as a **welfare** concern or a **safeguarding** concern, independently. Those two flags feed two separate inboxes, read by deliberately different people. See [Follow-ups](/platform/follow-ups) and [Concerns](/platform/concerns).

## 6. Soft Deletes

Nothing is permanently deleted in Kairos. Deactivating a member, fellowship, or department preserves all history. Attendance records, follow-up notes, and role assignments remain intact. This is important for reporting and accountability.
