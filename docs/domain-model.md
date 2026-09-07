# Kairos — Domain Model

A working map of personas, entities, and lifecycle transitions, grounded in the
code (not aspirational). Last updated 2026-06-23.

Open this file in a Mermaid-aware Markdown viewer (GitHub, VSCode preview,
Obsidian, etc.) to see the diagrams render.

---

## 0. CRITICAL DOMAIN CLARIFICATION — what "Member" actually means

In this church, **a Member is specifically someone who has completed the 4-week
membership class and received their membership certificate.** Nothing else
makes you a Member:

- Attending every Sunday for a year → NOT a Member
- Serving in a department → NOT a Member
- Leading a fellowship → NOT a Member (unusual, possible)
- Self-signing up via `/signup` → NOT a Member
- Completing the New Believers programme → NOT a Member

You can be a fully active participant in church life and still not be a
"Member" in the formal sense, because that title is gated by one specific
act: completing the class and receiving the certificate.

**The `memberType='member'` field is MISNAMED for this domain.** It actually
means "row was originated through self-signup / admin-add" — a provenance tag,
not a membership status. The true Membership signal is
`members.membershipClassCompletedAt`, stamped by graduating a membership
cohort (migration 0047, reworked in 0048) or by the manual admin override.

Implications:
- The `Member` entity in this doc is the row in `members` — i.e. "any person
  attached to the church," regardless of formal membership status.
- "Confirmed Member" / "Class-completed Member" refers to someone with a
  populated `membershipClassCompletedAt`.
- Visitors STAY visible everywhere (directory, attendance rollups) — they're
  in the church, they need to be counted. They're just clearly labelled as
  Visitor / Prospect / Member so the difference is obvious.

---

## 1. The four classifiers on a Member row

Every person in Kairos lives in one table — `members`. Four orthogonal fields
classify them:

```mermaid
graph LR
  M[Member row]
  M --> MT[memberType<br/>WHAT KIND<br/>member · prospect · visitor · child]
  M --> AS[approvalStatus<br/>CAN LOG IN?<br/>pending · approved · rejected]
  M --> IA[isActive<br/>SOFT-DELETE<br/>true · false]
  M --> SR[systemRole<br/>BREAK-GLASS<br/>admin · member]
  M --> HN[honorific<br/>DISPLAY TITLE<br/>Pastor · Reverend · Elder · null]

  classDef note fill:#f8b537,stroke:#9a6b04,color:#1a1a1a
  class MT,AS,IA,SR,HN note
```

A row's "real" persona is the **combination** of these — e.g. a long-serving
volunteer might be `memberType=visitor`, `approvalStatus=approved`,
`isActive=true`, `systemRole=member`, `honorific=null` — yet hold a
`DepartmentLeader` grant in `member_roles`. The row's classifier fields and
its grants are independent stores.

---

## 2. Operational personas — what you can DO

Authority lives in `member_roles` rows, NOT in `systemRole`. A person can hold
multiple grants at multiple scopes simultaneously.

```mermaid
graph TD
  subgraph "Platform-level"
    SA["System Admin<br/>(systemRole=admin)<br/>Admin shim — bypasses all gates"]
  end

  subgraph "Branch-scoped"
    BSA["BranchAdmin<br/>branch:read/write/rbac<br/>+ member:approve"]
    BDA["BranchDataAdmin<br/>branch:read/write<br/>+ member:approve"]
    SGL["SafeguardingLead<br/>safeguarding:read/write<br/>(minor data access)"]
    NBM["NewBelieversMentor<br/>newbelievers:mentor"]
    NBT["NewBelieversTeacher<br/>newbelievers:teach"]
  end

  subgraph "Fellowship-scoped"
    FL["FellowshipLeader<br/>fellowship:read/write"]
  end

  subgraph "Department-scoped"
    DL["DepartmentLeader<br/>department:read/write"]
    DD["DepartmentDeputy<br/>department:read/write"]
  end

  classDef plat fill:#5D3FD3,stroke:#451ebb,color:#fff
  classDef branch fill:#f8b537,stroke:#9a6b04,color:#1a1a1a
  classDef fell fill:#10b981,stroke:#047857,color:#fff
  classDef dept fill:#3b82f6,stroke:#1e40af,color:#fff

  class SA plat
  class BSA,BDA,SGL,NBM,NBT branch
  class FL fell
  class DL,DD dept
```

---

## 3. The Member lifecycle (current state vs. proposed)

This is the **most important diagram** for the question "what classifies a
member." It shows what flips `memberType` today and what doesn't.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Prospect: Outreach forms<br/>(altar call, testimony, baby naming)
  [*] --> Visitor: First-timer form<br/>OR walk-in attendance
  [*] --> Child: under-16 in first-timer<br/>OR baby naming/dedication
  [*] --> MemberSignup: Self-signup<br/>(/signup)

  state "Member (memberType='member')" as Member
  state "Prospect (memberType='prospect')" as Prospect
  state "Visitor (memberType='visitor')" as Visitor
  state "Child (memberType='child')" as Child
  state "Member — pending approval" as MemberSignup

  MemberSignup --> Member: member:approve<br/>(admin/BSA/BDA)
  MemberSignup --> [*]: rejected

  Prospect -.->|🟥 NO AUTO PATH TODAY<br/>manual flip only| Member
  Visitor -.->|🟥 NO AUTO PATH TODAY<br/>manual flip only| Member
  Child -->|age ≥ 16 + opt-in| Member

  Member --> Inactive: isActive=false
  Inactive --> Member: reactivate
```

**Red dashed arrows = gaps the codebase doesn't fill.** Today a visitor who
joins a fellowship, serves in a department, AND completes the new-believers
program stays tagged as `memberType='visitor'`. Stats counters (which filter
`memberType='member'`) silently exclude them.

### The lifecycle, as built

The **only** trigger that turns someone into a confirmed Member is completing
the 4-week membership class. Department/fellowship joining and NB completion
do NOT promote — those are independent participation tracks.

Enrolment is not self-service. Getting into a class is two stages: you express
interest, which puts you in a church-wide pool belonging to no cohort, and a
Membership Admin later admits you into a specific intake. The gap is
deliberate — somebody who signed up and then stopped attending for a season
must not roll silently into the next intake, so pool entries carry an expiry
and lapse on their own (see migration 0048).

```mermaid
flowchart TD
  P[Person in DB<br/>memberType: visitor/prospect/child/member<br/>membershipClassCompletedAt: NULL]

  P -->|expresses interest| W[Waiting in the pool<br/>membership_interest: waiting]
  W -->|admin admits into a cohort| C[Enrolled<br/>membership_enrollments]
  W -.->|180 days pass| L[Lapsed<br/>must express interest again]
  L -.->|re-expresses interest| W
  P -->|admin admits directly<br/>paper signup| C
  C -->|4 sessions + coursework + final test + induction| M[Confirmed Member<br/>membershipClassCompletedAt: NOW]

  P -.->|joins fellowship| P
  P -.->|joins department| P
  P -.->|completes NB programme| P
  P -.->|attends regularly for years| P

  M -.->|admin unmarks if needed<br/>POST /members/:id/unmark-as-member| P

  classDef pre fill:#f8b537,stroke:#9a6b04,color:#1a1a1a
  classDef post fill:#5D3FD3,stroke:#451ebb,color:#fff
  class P,W,L,C pre
  class M post
```

Dashed self-loops emphasise: **none of these activities promote you to
Confirmed Member**. They're parallel participation tracks. Only the
membership class does.

Graduating a cohort is what stamps `membershipClassCompletedAt`. The admin
override on `POST /members/:id/mark-as-member` remains as the manual escape
hatch, for people who did the class before the module existed.

**Who runs it.** `MembershipAdmin`, the one CHURCH-scoped role. Cohorts are
church-wide, so no branch, fellowship or department grant can describe
authority over one — which is why `RoleScope` has a fourth kind, `church`,
used by nothing else. Marking is an admin action; teaching is recorded per
session (`membership_sessions.teacher_id`, different people teach different
sessions of one cohort) and confers no permissions.


---

## 4. Soul → Member conversion (today: manual)

```mermaid
sequenceDiagram
  participant W as Outreach Worker
  participant S as Soul row
  participant M as Members table
  participant L as Linker

  Note over W: Soul "Jane" responds to follow-up
  W->>M: Manually create Member row<br/>(via /signup OR directory Add Member)
  M-->>W: returns memberId
  W->>S: PATCH soul: status='Converted'<br/>convertedToMemberId=<memberId>
  S->>L: validate: status='Converted' REQUIRES convertedToMemberId
  L-->>S: ✓ link saved (bidirectional)
```

**No automation.** The worker has to consciously create the Member row first.
A reasonable improvement is a "Convert to Member" button on the soul card
that runs both steps in one transaction (creates member shell + sets link).

---

## 5. Entities — the full landscape (grouped by module)

```mermaid
graph TB
  subgraph "Hierarchy"
    Region --> Branch
    Branch --> BranchLeadership
  end

  subgraph "People"
    Branch --> Member
    Member -.guardian.-> Member
    Member --> MemberHealthRecord
    Member --> MemberRole
    MemberRole --> Role
  end

  subgraph "Fellowships"
    Branch --> Fellowship
    Fellowship --> FellowshipMember
    Member --> FellowshipMember
    Fellowship --> FellowshipMeeting
    FellowshipMeeting --> FellowshipMeetingAttendance
    Fellowship --> FellowshipJoinRequest
    Fellowship --> FellowshipFollowup
  end

  subgraph "Departments"
    Department[Department catalog<br/>GLOBAL — shared across branches]
    Department --> BranchDepartment
    Branch --> BranchDepartment
    BranchDepartment --> DepartmentMember
    BranchDepartment --> DepartmentJoinRequest
    BranchDepartment --> DepartmentFollowup
    BranchDepartment --> DepartmentUniformOutfit
    BranchDepartment --> DepartmentUniformSchedule
    BranchDepartment --> RotaTemplate
    RotaTemplate --> RotaTemplateSlot
    RotaTemplate --> RotaInstance
    RotaInstance --> RotaAssignment
    RotaAssignment --> RotaSwapRequest
    BranchDepartment --> RotaPoolMember
  end

  subgraph "Service Attendance"
    Branch --> Service
    Service --> ServiceAttendance
    Member --> ServiceAttendance
  end

  subgraph "Outreach"
    OutreachProgram --> OutreachParticipant
    OutreachProgram --> Soul
    Soul -.convertedTo.-> Member
    Soul --> FollowUp
  end

  subgraph "New Believers"
    Member --> NewBelieverEnrollment
    NewBelieverEnrollment --> NewBelieverSession
    NewBelieverSession --> NewBelieverAttendance
    NewBelieverEnrollment --> MentorFollowup
  end

  subgraph "Forms"
    FormSubmission -.linked.-> Member
  end

  classDef catalog fill:#f8b537,stroke:#9a6b04,color:#1a1a1a
  class Department,Role catalog
```

Yellow boxes = **global catalogs** (one row per "kind of thing"). Everything
else is branch-scoped or person-scoped.

---

## 6. Tracked gaps (all in backlog as of 2026-06-23)

| # | Task | Impact | Effort |
|---|---|---|---|
| #33 | **Membership class signifier** — `membershipClassCompletedAt` column + admin mark/unmark workflow | The actual missing definition of "Member" in this church | Phase 1+2 ~3 days; Phase 3 (full Class module) uncosted |
| #34 | **Visitors visible in directory + rollups** — clearly marked, not excluded | Today's `memberType='member'` filter silently hides visitors who attend regularly | ~1 day (couples with #33) |
| #35 | **Rename `member:approve` → `signup:approve`** | Disambiguates from the new `member:promote` capability coming in #33 | ~30 min |
| #36 | **Soul → Member one-click conversion** | Today's flow is two manual steps; orphan rows + friction | ~3-4 hrs |
| #37 | **Tighten `system_role` CHECK constraint** | Schema drift: enforced constraint still allows old `'pastor'/'leader'` values | ~15 min |
| #38 | **Extract `is_real_member()` predicate helper** | 6+ sites implicitly filter; easy to forget in new queries | ~2 hrs (must follow #33 Phase 2) |

**Sequencing recommendation:** #35 (cheap, no dependencies) → #37 (one-line migration) → #33 Phase 1 → #34 → #33 Phase 2 → #38 → #36 (can land anytime). Phase 3 of #33 (full Membership Class module) is a future feature build, not in this cluster.
