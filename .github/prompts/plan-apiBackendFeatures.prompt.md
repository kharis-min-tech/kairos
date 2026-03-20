# Plan: Backend API Features — Steps 10–22

## Overview

Implement all backend API changes required for Steps 10–22 of the Kairos rebuild MVP. No new database tables or migrations — all data exists in the current Drizzle schema. Work is **backend API first** (types → schemas → services → routes → API client), frontend follows separately.

## User Decisions

- **Implementation order**: Backend API first, then frontend in a separate pass
- **Step 14 (Admin creates member)**: Auto-generate a random password (no email sending for MVP — return generated password in response for admin to share)
- **Step 12 (Reports Giving tab)**: Show mock/placeholder data for donations
- **Dependency order**: Types → API routes → API client

---

## Phase 1: Shared Types (`packages/types/src/`)

All new types go in existing files. No new files needed.

### 1a. `entities.ts` — Add to existing interfaces

- **`Branch`**: Add `serviceSchedule?: ServiceSchedule[]` field
- **New type**: `ServiceSchedule = { day: string; time: string; type: string }`
- **`FellowshipWithBranch`**: Add `leaderFirstName?: string | null; leaderLastName?: string | null`

### 1b. `api.ts` — New request/response types

- **`CreateMemberRequest`**: `{ firstName, lastName, email, homeBranchId, phone?, gender?, dateOfBirth?, middleName?, address?, city?, postalCode?, emergencyContactName?, emergencyContactPhone?, systemRole? }`
- **`CreateMemberResponse`**: `{ member: MemberProfile; generatedPassword: string }`
- **`ChangePasswordRequest`**: `{ currentPassword: string; newPassword: string }`
- **`ReactivateMemberRequest`**: (empty — member ID comes from URL param)
- **`MemberStatsResponse`**: Same shape as `MemberDashboardStats` (reuse the type: `export type MemberStatsResponse = MemberDashboardStats`)
- **`BranchDashboardStats`**: Extend with `attendanceTrend: { week: string; rate: number }[]`
- **`UpdateBranchRequest`**: Already `Partial<CreateBranchRequest>`, need to add `serviceSchedule` to `CreateBranchRequest` → `serviceSchedule?: ServiceSchedule[]`
- **Reports types**:
  - `ReportsMemberGrowth`: `{ month: string; newSignups: number }[]`
  - `ReportsAttendanceTrend`: `{ week: string; rate: number }[]`
  - `ReportsFellowshipActivity`: `{ fellowshipName: string; meetingCount: number; avgAttendees: number }[]`

---

## Phase 2: API Routes (all in `apps/api/src/`)

### 2a. Members — `POST /api/members` (admin-create) — Step 14

**Files**: `members/schemas.ts`, `members/service.ts`, `members/router.ts`

**Schema** (`createMemberSchema`):
```
firstName: z.string().min(1).max(100)
lastName: z.string().min(1).max(100)
email: z.string().email()
homeBranchId: z.string().uuid()
phone: z.string().max(20).optional()
gender: z.enum(['Male', 'Female']).optional()
dateOfBirth: z.string().date().optional()
middleName: z.string().max(100).optional()
address: z.string().optional()
city: z.string().max(100).optional()
postalCode: z.string().max(20).optional()
emergencyContactName: z.string().max(150).optional()
emergencyContactPhone: z.string().max(20).optional()
systemRole: z.enum(['admin', 'pastor', 'leader', 'member']).default('member')
```

**Service** (`createMember`):
1. Guard: `auth.systemRole` must be `admin` or `pastor`
2. Pastor guard: if pastor, `input.homeBranchId` must equal `auth.branchId`
3. Check email uniqueness (same pattern as `signup()` in auth/service.ts)
4. Check phone uniqueness if provided
5. Generate random password: `randomBytes(12).toString('base64url')`
6. `bcrypt.hash(generatedPassword, 10)`
7. Insert with `approvalStatus = 'approved'`, `isActive = true`, `emailVerified = true`
8. Return `{ member: toMemberProfile(created), generatedPassword }`

**Router**: `membersRouter.post('/', requireRole('admin', 'pastor'), zValidator('json', createMemberSchema), ...)`

### 2b. Members — `GET /api/members/:id/stats` — Step 15

**Files**: `members/service.ts`, `members/router.ts`

**Service** (`getMemberStats`):
- Parameterized version of `analytics/service.ts → getMemberStats()` but accepts any memberId
- Same queries: fellowships joined + attendance records (last 30 days)
- Auth: admin sees any member; others only their own

**Router**: `membersRouter.get('/:id/stats', ...)`

### 2c. Members — `POST /api/members/:id/reactivate` — Step 16

**Files**: `members/service.ts`, `members/router.ts`

**Service** (`reactivateMember`):
1. Guard: `admin` only
2. Find member where `isActive = false`
3. Set `isActive = true`, `approvalStatus = 'approved'`
4. Return updated member

**Router**: `membersRouter.post('/:id/reactivate', requireRole('admin'), ...)`

### 2d. Auth — `POST /api/auth/change-password` — Step 20

**Files**: `auth/schemas.ts`, `auth/service.ts`, `auth/router.ts`

**Schema** (`changePasswordSchema`):
```
currentPassword: z.string().min(1)
newPassword: z.string().min(8)
```

**Service** (`changePassword`):
1. Fetch member's `passwordHash` by `auth.memberId`
2. `bcrypt.compare(currentPassword, hash)` → UnauthorizedError if mismatch
3. `bcrypt.hash(newPassword, 10)`
4. Update member's `passwordHash`

**Router**: `authRouter.post('/change-password', authMiddleware, zValidator('json', changePasswordSchema), ...)`

### 2e. Analytics — Extend `getBranchStats()` — Step 10

**File**: `analytics/service.ts`

**Change**: Add weekly attendance trend query (last 8 weeks):
```sql
SELECT date_trunc('week', fm.meeting_date) AS week,
       COUNT(*) FILTER (WHERE fma.attendance_status = 'Present') * 100.0 / NULLIF(COUNT(*), 0) AS rate
FROM fellowship_meetings fm
JOIN fellowships f ON fm.fellowship_id = f.id
LEFT JOIN fellowship_meeting_attendance fma ON fm.id = fma.meeting_id
WHERE f.branch_id = $branchId AND fm.meeting_date >= CURRENT_DATE - INTERVAL '8 weeks'
GROUP BY week ORDER BY week
```

Add result as `attendanceTrend` to return object.

### 2f. Fellowships — Extend `listFellowships()` — Step 17

**File**: `fellowships/service.ts`

**Change**: Add LEFT JOIN to `members` table on `fellowships.leaderId = members.id`. Add to select:
```ts
leaderFirstName: members.firstName,
leaderLastName: members.lastName,
```

### 2g. Branches — Expose `serviceSchedule` — Step 22

**Files**: `branches/service.ts`, `branches/schemas.ts`

**Changes**:
1. `getBranch()`: Add `serviceSchedule: branches.serviceSchedule` to select
2. `updateBranchSchema`: Add `serviceSchedule: z.array(z.object({ day: z.string(), time: z.string(), type: z.string() })).optional()`

### 2h. Reports Router (NEW) — Step 12

**New file**: `apps/api/src/analytics/reports-router.ts`
**Mount**: in `app.ts` as `app.route('/api/reports', reportsRouter)`

**3 endpoints** (all `requireRole('admin', 'pastor')`, pastor scoped to own branch):

1. `GET /api/reports/members` — monthly new signups (last 12 months)
   ```sql
   SELECT date_trunc('month', created_at) AS month, COUNT(*) AS new_signups
   FROM members WHERE is_active = TRUE
   AND created_at >= CURRENT_DATE - INTERVAL '12 months'
   [AND home_branch_id = $branchId for pastors]
   GROUP BY month ORDER BY month
   ```

2. `GET /api/reports/attendance` — weekly attendance % (last 12 weeks)
   Same pattern as Step 10 query but longer window + optional branch filter

3. `GET /api/reports/fellowships` — fellowship activity summary
   ```sql
   SELECT f.fellowship_name, COUNT(fm.id) AS meeting_count,
     ROUND(AVG(sub.attendee_count), 1) AS avg_attendees
   FROM fellowships f
   LEFT JOIN fellowship_meetings fm ON f.id = fm.fellowship_id
   LEFT JOIN (SELECT meeting_id, COUNT(*) AS attendee_count FROM fellowship_meeting_attendance GROUP BY meeting_id) sub ON fm.id = sub.meeting_id
   WHERE f.is_active = TRUE [AND f.branch_id = $branchId]
   GROUP BY f.id, f.fellowship_name
   ```

---

## Phase 3: API Client (`packages/api-client/src/api.ts`)

Add new methods to existing client object:

```ts
auth: {
  ...existing,
  changePassword: (data: ChangePasswordRequest) => client.post<ApiResponse<void>>('/api/auth/change-password', data),
},
members: {
  ...existing,
  create: (data: CreateMemberRequest) => client.post<ApiResponse<CreateMemberResponse>>('/api/members', data),
  reactivate: (id: string) => client.post<ApiResponse<Member>>(`/api/members/${id}/reactivate`, {}),
  stats: (id: string) => client.get<ApiResponse<MemberStatsResponse>>(`/api/members/${id}/stats`),
},
reports: {
  memberGrowth: (branchId?: string) => ...,
  attendanceTrend: (branchId?: string) => ...,
  fellowshipActivity: (branchId?: string) => ...,
},
```

---

## Dependency Graph

```
Phase 1 (Types) ──┬── Phase 2a (POST /members)        ── independent
                  ├── Phase 2b (GET /members/:id/stats) ── independent
                  ├── Phase 2c (POST /members/:id/reactivate) ── independent
                  ├── Phase 2d (POST /auth/change-password)    ── independent
                  ├── Phase 2e (Extend getBranchStats)         ── independent
                  ├── Phase 2f (Extend listFellowships)        ── independent
                  ├── Phase 2g (Expose serviceSchedule)        ── independent
                  └── Phase 2h (Reports router)                ── independent
                  
Phase 2 (all) ──── Phase 3 (API Client methods)
```

All Phase 2 steps are **independent** of each other — can be parallelized.

---

## Verification

1. TypeScript compile check: `npx turbo build --filter=@kairos/types --filter=@kairos/api-client --filter=api`
2. Existing tests pass: `npx turbo test`
3. Manual smoke test each new endpoint via Postman/curl
4. Check that existing routes still work (no regressions)

---

## Files Modified

| File | Steps |
|------|-------|
| `packages/types/src/entities.ts` | 17, 22 |
| `packages/types/src/api.ts` | 10, 12, 14, 15, 20, 22 |
| `apps/api/src/members/schemas.ts` | 14 |
| `apps/api/src/members/service.ts` | 14, 15, 16 |
| `apps/api/src/members/router.ts` | 14, 15, 16 |
| `apps/api/src/auth/schemas.ts` | 20 |
| `apps/api/src/auth/service.ts` | 20 |
| `apps/api/src/auth/router.ts` | 20 |
| `apps/api/src/analytics/service.ts` | 10 |
| `apps/api/src/fellowships/service.ts` | 17 |
| `apps/api/src/branches/service.ts` | 22 |
| `apps/api/src/branches/schemas.ts` | 22 |
| `apps/api/src/app.ts` | 12 |
| `packages/api-client/src/api.ts` | all |

## Files Created

| File | Step |
|------|------|
| `apps/api/src/analytics/reports-router.ts` | 12 |
