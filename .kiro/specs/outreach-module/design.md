# Design Document: Kairos Outreach Module

## Overview

The Outreach Module adds evangelism program management, soul capture, follow-up tracking, and overdue alert capabilities to the Kairos platform. It follows the existing serverless architecture: individual Lambda functions per operation, Drizzle ORM for database access, Zod schemas for validation, and branch-level data isolation enforced via the Custom Authorizer and `enforceBranchAccess` utility.

**Key Design Decisions:**

1. **Nullable outreach_id on souls:** Ad-hoc soul captures (outside formal programs) store `outreach_id = NULL`. Branch isolation for ad-hoc souls is derived from the capturing member's `home_branch_id`.
2. **Hybrid overdue alert logic:** Uses worker-set `next_follow_up_date` when available, falls back to days since last follow-up (or soul creation). Default threshold: 2 days, configurable per request.
3. **No separate outreach_workers table:** Any church member can participate via `outreach_participants`. Team leader tracked as `coordinator_id` on the program.
4. **Conversion triggers pre-filled registration form:** Setting status to "Converted" does NOT auto-create a member. The frontend presents a pre-filled registration form; the soul's `converted_to_member_id` is linked after the branch admin approves the new member.
5. **Interest level and age group in notes/existing fields:** `age_range` column on souls table, interest level captured in notes or follow-up records rather than new schema columns.

**Existing Infrastructure Leveraged:**
- Database tables: `outreach_programs`, `souls`, `follow_ups`, `outreach_participants` (already defined in `packages/database/src/schema/outreach.ts`)
- Validation schemas: `outreachProgramCreateSchema`, `soulCaptureSchema`, `followUpCreateSchema`, `soulStatusUpdateSchema`, `soulReassignSchema` (in `packages/utils/src/validator/schemas.ts`)
- API client methods: `outreach.*`, `souls.*` (in `packages/api-client/src/api.ts`)
- Lambda functions: Several already implemented in `apps/api/src/outreach/`

## Architecture

### Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                            │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐   │
│  │ Outreach     │ │ Soul Capture │ │ Follow-Up Tracker      │   │
│  │ Programs Page│ │ Page         │ │ Page (Kanban + List)   │   │
│  └──────┬───────┘ └──────┬───────┘ └────────────┬───────────┘   │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          │ @kairos/api-client                   │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────┼─────────────────────────────────────┐
│              API Gateway HTTP API (/v1/)                       │
│              Custom Authorizer (JWT + RBAC)                    │
└──────────────────────────┼─────────────────────────────────────┘
                           │
┌──────────────────────────┼─────────────────────────────────────┐
│                    Lambda Functions                            │
│  ┌─────────────────────┐ ┌─────────────────────┐               │
│  │ outreach-create     │ │ souls-capture       │               │
│  │ outreach-list       │ │ souls-list          │               │
│  │ outreach-get        │ │ souls-get           │               │
│  │ outreach-register   │ │ souls-update-status │               │
│  │ outreach-complete   │ │ souls-reassign      │               │
│  │ outreach-override   │ │ souls-log-followup  │               │
│  └─────────┬───────────┘ │ souls-get-alerts    │               │
│            │             │ souls-conv-funnel   │               │
│            │             └─────────┬───────────┘               │
│            └───────────────────────┘                           │
│                          │ @kairos/database (Drizzle ORM)      │
└──────────────────────────┼─────────────────────────────────────┘
                           │
┌──────────────────────────┼─────────────────────────────────────┐
│           Aurora Serverless v2 (PostgreSQL 15)                 │
│  ┌──────────────────┐ ┌────────┐ ┌───────────┐ ┌─────────────┐ │
│  │outreach_programs │ │ souls  │ │ follow_ups│ │outreach_    │ │
│  │                  │ │        │ │           │ │participants │ │
│  └──────────────────┘ └────────┘ └───────────┘ └─────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### API Endpoints

All endpoints require `Authorization: Bearer <JWT>` header.

| Method | Path | Lambda | Description | Req |
|--------|------|--------|-------------|-----|
| POST | `/v1/outreach/programs` | outreach-create-program | Create outreach program | 1 |
| GET | `/v1/outreach/programs` | outreach-list-programs | List programs (branch-filtered) | 2 |
| GET | `/v1/outreach/programs/{outreachId}` | outreach-get-program | Get program detail with participants & souls | 3 |
| POST | `/v1/outreach/programs/{outreachId}/workers` | outreach-register-worker | Register member as worker | 4 |
| PUT | `/v1/outreach/programs/{outreachId}/complete` | outreach-complete-program | Mark program completed | 5 |
| POST | `/v1/souls` | souls-capture | Capture soul (program-linked or ad-hoc) | 6, 7 |
| GET | `/v1/souls` | souls-list | List souls (branch-filtered, searchable) | 8 |
| GET | `/v1/souls/{soulId}` | souls-get | Get soul detail with follow-up history | 9 |
| PUT | `/v1/souls/{soulId}/status` | souls-update-status | Update soul status in pipeline | 10 |
| PUT | `/v1/souls/{soulId}/reassign` | souls-reassign | Reassign soul to different worker | 12 |
| POST | `/v1/souls/{soulId}/followups` | souls-log-followup | Log follow-up activity | 13 |
| GET | `/v1/souls/alerts` | souls-get-alerts | Get overdue follow-up alerts | 14 |
| GET | `/v1/souls/conversion-funnel` | souls-get-conversion-funnel | Get conversion funnel counts | 15 |
| POST | `/v1/outreach/override-branch` | outreach-override-branch | Admin: override member branch | 16 |



## Components and Interfaces

### Lambda Function Pattern

All outreach Lambda functions follow the established pattern:

```typescript
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  handleError,
  successResponse,
  createdResponse,
  createLogger,
  getDb,
  isAdmin,
} from '@kairos/utils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Resolve auth context (JWT → memberId, branchId, roles)
    const ctx = await resolveAuthContext(event);
    // 2. Parse and validate input (Zod schema)
    const input = validateOrThrow(schema, JSON.parse(event.body || '{}'));
    // 3. Enforce branch isolation
    if (!isAdmin(ctx)) enforceBranchAccess(ctx, targetBranchId);
    // 4. Business logic (Drizzle ORM queries)
    const db = getDb();
    // 5. Return standardized response
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
};
```

### Key Lambda Implementations

#### outreach-complete-program (NEW)

**Path:** `apps/api/src/outreach/outreach-complete-program.ts`
**Route:** `PUT /v1/outreach/programs/{outreachId}/complete`

```typescript
// 1. resolveAuthContext → enforceBranchAccess on program's branchId
// 2. Verify program exists and is not already completed
// 3. Count souls linked to program: SELECT COUNT(*) FROM souls WHERE outreach_id = ?
// 4. UPDATE outreach_programs SET is_completed = true, total_souls_reached = count, updated_at = NOW()
// 5. Return updated program
```

#### souls-capture (MODIFY — add ad-hoc support)

**Path:** `apps/api/src/outreach/souls-capture.ts`
**Route:** `POST /v1/souls`

Current implementation requires `outreach_id`. Modification needed:

```typescript
// Schema change: outreach_id becomes optional in soulCaptureSchema
// If outreach_id provided:
//   - Verify program exists, enforceBranchAccess on program.branchId
//   - Check duplicate phone in same outreach (warn but allow)
// If outreach_id NOT provided (ad-hoc):
//   - Use ctx.branchId for branch isolation (no program to derive from)
//   - Set outreach_id = null in insert
// Always: assignedMemberId = ctx.memberId, status = 'New'
```

#### souls-get-alerts (MODIFY — hybrid overdue logic)

**Path:** `apps/api/src/outreach/souls-get-alerts.ts`
**Route:** `GET /v1/souls/alerts`

Current implementation uses `souls.updatedAt` for threshold. Modification needed:

```typescript
// Hybrid logic:
// 1. Get latest follow-up per soul with next_follow_up_date
// 2. Soul is overdue IF:
//    a. next_follow_up_date IS NOT NULL AND next_follow_up_date < NOW() → overdue
//    b. next_follow_up_date IS NULL AND (NOW() - last_follow_up_date) > threshold_days → overdue
//    c. No follow-ups exist AND (NOW() - soul.created_at) > threshold_days → overdue
// 3. Default threshold: 2 days (changed from current 3)
// 4. Accept ?thresholdDays query param for per-request override
```

### Validation Schemas

Existing schemas in `packages/utils/src/validator/schemas.ts` with modifications:

```typescript
// MODIFY: Make outreach_id optional for ad-hoc capture
export const soulCaptureSchema = z.object({
  first_name: nonEmptyString.max(100),
  last_name: nonEmptyString.max(100),
  phone: z.string().trim().max(20).optional(),
  email: z.string().email().max(100).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  age_range: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
  outreach_id: z.number().int().positive().optional(), // nullable for ad-hoc
});

// NEW: Schema for completing an outreach program
export const outreachCompleteSchema = z.object({
  // No body required — outreachId comes from path parameter
});
```

### Frontend Components

#### Outreach Programs Page (ENHANCE existing)

**Path:** `apps/web/src/app/(dashboard)/evangelism/outreach/page.tsx`

Enhancements to existing page:
- Add stat cards row (Total Programs, Active, Souls Won)
- Add program detail view navigation on card click
- Add completion action for pastors/admins

#### Outreach Program Detail Page (NEW)

**Path:** `apps/web/src/app/(dashboard)/evangelism/outreach/[id]/page.tsx`

- Program header with status badge, stats (Attendees, Souls Won, Follow-ups)
- Location details section
- Participants list with roles
- Souls captured list with status badges and follow-up/contact actions
- Follow-up outcomes summary

#### Soul Capture Page (ENHANCE existing)

**Path:** `apps/web/src/app/(dashboard)/evangelism/souls/capture/page.tsx`

Already supports ad-hoc vs outreach source selection. Enhancements:
- Add gender and age group fields
- Display duplicate phone warning from API response

#### Follow-Up Tracker Page (NEW)

**Path:** `apps/web/src/app/(dashboard)/evangelism/followups/page.tsx`

- Stat cards: Pending Due This Week, Completed This Month
- Tabs: All | Pending | Overdue
- Search bar (soul name, worker name)
- Filter dropdowns (status, contact method)
- Follow-up cards with soul name, assigned worker, due date, type, status
- Overdue cards highlighted with warning indicator
- "Log Follow-Up" modal on card action click

### API Client Extensions

**Path:** `packages/api-client/src/api.ts`

```typescript
// ADD to outreach namespace:
export const outreach = {
  // ... existing methods ...
  getProgram: (id: number) =>
    get<OutreachProgram & { participants: any[]; souls: any[] }>(`/v1/outreach/programs/${id}`),
  completeProgram: (id: number) =>
    put<OutreachProgram>(`/v1/outreach/programs/${id}/complete`, {}),
};

// ADD to souls namespace:
export const souls = {
  // ... existing methods ...
  getFollowUpTracker: (params?: { tab?: string; search?: string; status?: string }) =>
    get<{ pending: number; completed: number; items: any[] }>('/v1/souls/followup-tracker', params),
};
```

## Data Models

### Database Schema (Existing — No Migrations Required)

The outreach module uses four existing tables defined in `packages/database/src/schema/outreach.ts`:

#### outreach_programs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| outreach_id | SERIAL | PK | Program identifier |
| branch_id | INTEGER | FK → branches, NOT NULL | Owning branch |
| program_name | VARCHAR(200) | NOT NULL | Program name |
| program_date | DATE | NOT NULL | Program date |
| location | VARCHAR(300) | NOT NULL | Location name |
| address | TEXT | nullable | Full address |
| city | VARCHAR(100) | nullable | City |
| description | TEXT | nullable | Program description |
| coordinator_id | INTEGER | FK → members, nullable | Team leader |
| total_souls_reached | INTEGER | DEFAULT 0, CHECK ≥ 0 | Souls count |
| notes | TEXT | nullable | Additional notes |
| is_completed | BOOLEAN | DEFAULT false | Completion flag |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Unique constraint:** (branch_id, program_name, program_date, location)

#### souls

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| soul_id | SERIAL | PK | Soul identifier |
| outreach_id | INTEGER | FK → outreach_programs, nullable* | Linked program (NULL for ad-hoc) |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| phone | VARCHAR(20) | nullable | Phone number |
| email | VARCHAR(100) | nullable | Email address |
| address | TEXT | nullable | Address |
| city | VARCHAR(100) | nullable | City |
| gender | VARCHAR(10) | CHECK IN ('Male','Female') | Gender |
| age_range | VARCHAR(20) | nullable | Age group |
| assigned_member_id | INTEGER | FK → members, nullable | Assigned worker |
| converted_to_member_id | INTEGER | FK → members, nullable | Linked member after conversion |
| status | VARCHAR(30) | DEFAULT 'New' | Pipeline status |
| notes | TEXT | nullable | Notes (includes interest level) |
| created_at | TIMESTAMP | DEFAULT NOW() | Capture time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Status values:** New, Following Up, Interested, Not Interested, Converted, Lost Contact

*\*Schema modification required: Change `outreach_id` from NOT NULL to nullable to support ad-hoc captures.*

#### follow_ups

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| follow_up_id | SERIAL | PK | Follow-up identifier |
| soul_id | INTEGER | FK → souls, NOT NULL | Linked soul |
| member_id | INTEGER | FK → members, NOT NULL | Worker who followed up |
| follow_up_date | TIMESTAMP | NOT NULL, DEFAULT NOW() | Date of contact |
| contact_method | VARCHAR(30) | CHECK IN valid methods | How contact was made |
| contact_status | VARCHAR(30) | NOT NULL, CHECK IN valid statuses | Outcome |
| duration_minutes | INTEGER | CHECK > 0 | Call/visit duration |
| notes | TEXT | nullable | Follow-up notes |
| next_follow_up_date | DATE | nullable | Scheduled next follow-up |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Contact methods:** Phone Call, Text Message, Email, WhatsApp, In-Person Visit, Other
**Contact statuses:** Successful, No Answer, Wrong Number, Call Back Later, Not Interested, Interested

#### outreach_participants

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| outreach_id | INTEGER | PK (composite), FK → outreach_programs | Program |
| member_id | INTEGER | PK (composite), FK → members | Worker |
| role | VARCHAR(50) | nullable | Worker role in program |
| notes | TEXT | nullable | Notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Registration time |

### Schema Migration Required

One migration is needed to support ad-hoc soul capture:

```sql
-- Migration: Make outreach_id nullable on souls table
ALTER TABLE souls ALTER COLUMN outreach_id DROP NOT NULL;

-- Add index for ad-hoc souls (null outreach_id) by assigned member
CREATE INDEX idx_souls_assigned_adhoc ON souls(assigned_member_id) WHERE outreach_id IS NULL;
```

Corresponding Drizzle schema change in `packages/database/src/schema/outreach.ts`:

```typescript
// Change from:
outreachId: integer('outreach_id')
  .notNull()
  .references(() => outreachPrograms.outreachId, { onDelete: 'cascade' }),

// Change to:
outreachId: integer('outreach_id')
  .references(() => outreachPrograms.outreachId, { onDelete: 'cascade' }),
```

### Status Pipeline State Machine

```
    ┌─────┐
    │ New │
    └──┬──┘
       │
       ▼
┌─────────────┐
│ Following Up│
└──┬──────┬───┘
   │      │
   ▼      ▼
┌──────────┐  ┌───────────────┐
│Interested│  │Not Interested │ (terminal)
└────┬─────┘  └───────────────┘
     │
     ├──────────────┐
     ▼              ▼
┌──────────┐  ┌───────────────┐
│Converted │  │Not Interested │ (terminal)
└──────────┘  └───────────────┘
  (terminal)
```

Valid transitions:
- `New` → `Following Up`
- `Following Up` → `Interested` | `Not Interested`
- `Interested` → `Converted` | `Not Interested`
- `Converted` → (none — terminal)
- `Not Interested` → (none — terminal)



## Correctness Properties

*Properties that should hold true across all valid executions of the outreach module.*

### Property 1: Branch Isolation for Outreach Data

*For any* non-admin user accessing outreach programs, souls, or follow-up alerts, the system should return only data associated with the user's branch. *For any* non-admin user attempting to create, update, or delete outreach data for a different branch, the system should reject the request with a 403 Forbidden error.

**Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

### Property 2: Soul Auto-Assignment to Capturing Member

*For any* soul capture (both program-linked and ad-hoc), the created soul record's `assigned_member_id` should equal the authenticated user's `memberId`. This holds regardless of whether an outreach_id is provided.

**Validates: Requirements 6.4, 7.3**

### Property 3: Soul Initial Status is New

*For any* newly captured soul, the `status` field should be set to "New". This holds for both program-linked and ad-hoc captures.

**Validates: Requirements 6.5, 7.4**

### Property 4: Status Transition Validation (State Machine)

*For any* soul status update request, the system should accept the transition if and only if it matches the valid pipeline: New → Following Up, Following Up → Interested | Not Interested, Interested → Converted | Not Interested. *For any* soul in a terminal status (Converted, Not Interested), the system should reject all further status updates.

**Validates: Requirements 10.1, 10.2, 10.4**

### Property 5: Converted Status Requires Member Link

*For any* soul status update to "Converted", the request must include a valid `converted_to_member_id`. The system should reject conversion requests without this field.

**Validates: Requirements 10.3**

### Property 6: Duplicate Program Detection

*For any* outreach program creation, if a program with the same (branch_id, program_name, program_date, location) already exists, the system should reject the request with a 409 Conflict error. Conversely, programs with any one differing field should be accepted.

**Validates: Requirements 1.4**

### Property 7: Worker Registration Idempotence Guard

*For any* member attempting to register for an outreach program they are already registered for, the system should reject with a 409 Conflict. *For any* member registering for a completed program, the system should reject with a 400 Bad Request.

**Validates: Requirements 4.2, 4.4**

### Property 8: Follow-Up Overdue Alert Correctness

*For any* soul in an active status (New, Following Up, Interested), the soul should appear in overdue alerts if and only if: (a) `next_follow_up_date` is set and is in the past, OR (b) `next_follow_up_date` is not set and days since last follow-up (or creation) exceeds the threshold. Souls in terminal statuses (Converted, Not Interested) should never appear in alerts.

**Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

### Property 9: Conversion Funnel Count Consistency

*For any* branch, the sum of all status counts in the conversion funnel should equal the total number of souls for that branch. No soul should be counted in more than one status bucket.

**Validates: Requirements 15.1, 15.2**

### Property 10: Follow-Up Refreshes Soul Activity Timestamp

*For any* follow-up logged for a soul, the soul's `updated_at` timestamp should be updated to reflect the new activity. This ensures the overdue alert calculation uses the most recent interaction.

**Validates: Requirements 13.7**

### Property 11: Program Completion Updates Soul Count

*For any* outreach program marked as completed, the `total_souls_reached` field should equal the actual count of soul records linked to that program via `outreach_id`.

**Validates: Requirements 5.3**

### Property 12: Ad-Hoc Soul Branch Derivation

*For any* soul captured without an outreach_id (ad-hoc), the system should derive the soul's branch from the capturing member's `home_branch_id` for branch isolation purposes. The soul should be visible to users of that branch and invisible to users of other branches.

**Validates: Requirements 7.5, 16.5**

### Property 13: Cross-Branch Reassignment Prevention

*For any* soul reassignment, the new assigned worker must belong to the same branch as the soul. If the new worker is from a different branch, the system should reject the reassignment with a 403 Forbidden error.

**Validates: Requirements 12.2, 12.3**

### Property 14: Follow-Up Contact Method and Status Validation

*For any* follow-up creation, the `contact_method` must be one of the six valid methods (Phone Call, Text Message, Email, WhatsApp, In-Person Visit, Other) and `contact_status` must be one of the six valid statuses (Successful, No Answer, Wrong Number, Call Back Later, Not Interested, Interested). Invalid values should be rejected.

**Validates: Requirements 13.3, 13.4**

### Property 15: Duplicate Phone Warning Without Rejection

*For any* soul capture where the phone number matches an existing soul in the same outreach program, the system should create the record successfully AND include a warning in the response. The duplicate should not cause a rejection.

**Validates: Requirements 6.6**

### Property 16: Conversion Preserves Follow-Up History

*For any* soul that transitions to Converted status and is linked to a new member record, all existing follow-up records for that soul should remain intact and queryable. The soul record itself should persist with its full history.

**Validates: Requirements 11.5**
