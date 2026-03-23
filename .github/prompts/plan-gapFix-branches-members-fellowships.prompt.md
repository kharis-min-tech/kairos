# Plan: Gap Fix — Branches, Members & Fellowships Modules

## TL;DR

Fix 18 identified gaps across three MVP modules (Branches, Members, Fellowships) in a phased
approach: database migrations first, then types and API client, then API backend, then frontend.
The gaps span three user personas (Admin, Pastor, Regular Member) and include new DB tables,
new API routes, permission fixes, UI forms, and label corrections.

---

## Deferred Items (explicitly out of scope for this plan)

| ID  | Gap                                      | Reason deferred                              |
|-----|------------------------------------------|----------------------------------------------|
| M3  | Profile photo upload                     | Requires S3 integration — not yet built      |
| M7  | Member donation history                  | Donations module not yet fully implemented   |
| M9  | Pending member access restriction        | Deferred for later priority review           |
| F4  | Follow-up notes on fellowship members    | Deferred for later priority review           |
| F8  | Member self-remove from fellowship       | Deferred for later priority review           |
| F9  | Broadcast messaging to fellowship        | Requires notifications module                |

Track these in a follow-up review before v1 release.

---

## Decisions

- **F6 (one fellowship per member):** Enforce at the service level in `addFellowshipMember` by
  querying `fellowshipMembers` for any active record with `memberId=X` (across all fellowships in
  the same branch), not just within the target fellowship. Use `ConflictError`.
- **F1 (leader permissions):** Add `enforceLeaderOrAbove(auth, fellowship)` helper to
  `fellowships/service.ts` that passes if `admin | pastor | leaderId === auth.memberId |
  coLeaderId === auth.memberId`. Apply to all write operations in that service.
- **F7 (join requests):** Members self-request via `POST /api/fellowships/:id/join-requests`.
  Admin/pastor/leader review via `GET` + `PATCH`. Store in a new `fellowship_join_requests` table.
  The actual `fellowshipMembers` insert only happens on approval.
- **B4/B5 (my branch):** One shared `my-branch/page.tsx` page; render a "Manage Branch" actions
  section conditionally for pastors. Admins do not need it (they have `/admin/branches`).
- **M1 (CSV import):** Use the `csv-parse` npm package (sync/stream) in the API. Return a summary
  `{ created: number, errors: Array<{ row: number, message: string }> }`. Do not abort on partial
  failure — skip bad rows and report them.
- **M2 (CSV export):** Stream CSV from API with `Content-Disposition: attachment` header.
  Frontend triggers download via a hidden `<a>` click using a blob URL.
- **Leadership history (B2):** Add optional `?includeHistory=true` query param to
  `GET /api/branches/:id/leadership`. When absent/false, only `isCurrent=true` rows are returned
  (existing default). All other behaviour unchanged.

---

## Phase 1 — Database Migrations

Steps 1.1 and 1.2 are independent and can be executed in sequence, but both must be completed
before any later phase begins.

### Step 1.1 — Migration 0006: emergency_contact_relationship column

**File:** `packages/database/drizzle/0006_add_emergency_contact_relationship.sql`
- Add `ALTER TABLE members ADD COLUMN IF NOT EXISTS emergency_contact_relationship varchar(50);`

**File:** `packages/database/src/schema/members.ts`
- Add `emergencyContactRelationship: varchar('emergency_contact_relationship', { length: 50 })` to
  the Drizzle table definition, immediately after `emergencyContactPhone`.

**File:** `packages/database/src/schema/index.ts` (or however the schema barrel exports are
structured)
- No new export needed — the column addition is part of the existing `members` table export.

### Step 1.2 — Migration 0007: fellowship_join_requests table

**File:** `packages/database/drizzle/0007_add_fellowship_join_requests.sql`

Create table `fellowship_join_requests` with columns:
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `fellowship_id uuid NOT NULL REFERENCES fellowships(id) ON DELETE CASCADE`
- `member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE`
- `status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))`
- `notes text`
- `reviewed_by uuid REFERENCES members(id) ON DELETE SET NULL`
- `reviewed_at timestamp`
- `created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`

Add unique constraint: `UNIQUE (fellowship_id, member_id)` — one pending/approved request per
member per fellowship at a time. Add trigger call:
`CREATE TRIGGER set_fellowship_join_requests_updated_at BEFORE UPDATE ON fellowship_join_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`

**File:** `packages/database/src/schema/fellowshipJoinRequests.ts` *(create new)*
- Define `fellowshipJoinRequests` Drizzle table matching the SQL above. Use `pgTable`,
  `uuid`, `varchar`, `text`, `timestamp`, `boolean`. Status as `varchar(20)`.
- Export the table and its inferred types (`FellowshipJoinRequestInsert`,
  `FellowshipJoinRequestSelect`).

**File:** `packages/database/src/index.ts`
- Add `export * from './schema/fellowshipJoinRequests';` alongside other table exports.

---

## Phase 2 — Type & API Client Updates

*Depends on Phase 1. Steps 2.1–2.5 are independent of each other.*

### Step 2.1 — emergencyContactRelationship in types

**File:** `packages/types/src/entities.ts`
- Add `emergencyContactRelationship: string | null;` to the `Member` entity interface, after
  `emergencyContactPhone`.

**File:** `packages/types/src/api.ts`
- Add `emergencyContactRelationship?: string;` to `UpdateMemberRequest` (after
  `emergencyContactPhone` on line ~23).
- Add `emergencyContactRelationship?: string;` to `CreateMemberRequest` (after
  `emergencyContactPhone` on line ~138).

### Step 2.2 — FellowshipJoinRequest types + API client methods

**File:** `packages/types/src/entities.ts`
- Add new `FellowshipJoinRequest` entity interface:
  ```
  id, fellowshipId, memberId, status ('pending'|'approved'|'rejected'), notes, reviewedBy,
  reviewedAt, createdAt, updatedAt
  ```
- Add `FellowshipJoinRequestWithMember` extending `FellowshipJoinRequest` with
  `memberFirstName`, `memberLastName`, `memberEmail`.

**File:** `packages/types/src/api.ts`
- Add `CreateJoinRequestRequest { notes?: string }`.
- Add `ReviewJoinRequestRequest { status: 'approved' | 'rejected'; notes?: string }`.

**File:** `packages/api-client/src/api.ts`
- Add import for `FellowshipJoinRequestWithMember`, `CreateJoinRequestRequest`,
  `ReviewJoinRequestRequest` from `@kairos/types`.
- Inside the `fellowships` block, add a `joinRequests` sub-object:
  - `create(fellowshipId, data: CreateJoinRequestRequest)` → `POST /api/fellowships/:id/join-requests`
  - `list(fellowshipId)` → `GET /api/fellowships/:id/join-requests`
  - `review(fellowshipId, requestId, data: ReviewJoinRequestRequest)` →
    `PATCH /api/fellowships/:id/join-requests/:requestId`

### Step 2.3 — fellowshipId filter in MemberListParams

**File:** `packages/types/src/api.ts`
- Add `fellowshipId?: string;` to the `MemberListParams` interface (line ~181).

**File:** `packages/api-client/src/api.ts`
- In `members.list()` URLSearchParams builder, add:
  `if (params?.fellowshipId) qs.set('fellowshipId', params.fellowshipId);`

### Step 2.4 — CSV import/export API client methods

**File:** `packages/api-client/src/api.ts`
- In the `members` block, add:
  - `importCsv(formData: FormData)` → `POST /api/members/import` using `client.postForm` (or
    raw fetch with multipart). Returns `{ created: number; errors: Array<{ row: number; message: string }> }`.
  - `exportCsv(params?: MemberListParams)` → `GET /api/members/export` returning `Blob`.

**File:** `packages/api-client/src/client.ts`
- Add a `postForm<T>(path, formData)` method that sets no `Content-Type` header (let browser set
  multipart boundary automatically) and calls `fetch`.
- Add a `getBlob(path)` method that returns the raw `Blob`. Check how existing `get<T>` is
  implemented and follow the same error-handling pattern.

### Step 2.5 — includeHistory param for leadership list

**File:** `packages/api-client/src/api.ts`
- Update `leadership.list(branchId)` signature to
  `list(branchId: string, params?: { includeHistory?: boolean })`.
- Append `?includeHistory=true` to the URL if param is set.

---

## Phase 3 — API Backend Fixes

*Depends on Phase 1 and Phase 2. Apply steps in order within this phase.*

### Step 3.1 — B2: Leadership history query param

**File:** `apps/api/src/branches/service.ts`
- Update `getBranchLeadership(db, branchId, auth, options?: { includeHistory?: boolean })`.
- When `includeHistory` is false/absent, keep existing `.where(... isCurrent=true)`.
- When `includeHistory=true`, remove the `isCurrent=true` filter so all records are returned.
  Add `.orderBy(branchLeadership.startDate, 'desc')`.

**File:** `apps/api/src/branches/router.ts`
- In the `GET /:id/leadership` handler, parse `includeHistory` boolean from query params and
  pass it to `getBranchLeadership`.

### Step 3.2 — F1: Leader permission helper

**File:** `apps/api/src/fellowships/service.ts`
- Replace the existing `enforceBranchScope` guard that only passes `admin | pastor` in write ops
  with a new helper:
  ```ts
  function enforceLeaderOrAbove(auth: AuthContext, fellowship: { leaderId: string | null; coLeaderId: string | null }) {
    if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
    if (auth.memberId === fellowship.leaderId || auth.memberId === fellowship.coLeaderId) return;
    throw new ForbiddenError('Only admins, pastors, or the fellowship leader can perform this action');
  }
  ```
- Apply `enforceLeaderOrAbove(auth, fellowship)` in:
  - `addFellowshipMember` (replacing the `admin | pastor` check)
  - `removeFellowshipMember` (replacing the `admin | pastor` check)
  - `createMeeting` (replacing the `admin | pastor` check)
  - `updateMeeting` (replacing the `admin | pastor` check)
  - `recordAttendance` (replacing the `admin | pastor` check, if it exists)
- Keep `createFellowship`, `updateFellowship`, `deactivateFellowship` gated to `admin | pastor`
  only — leaders should not be able to create or destroy fellowships.

### Step 3.3 — F6: One-fellowship-per-member enforcement

**File:** `apps/api/src/fellowships/service.ts`
- In `addFellowshipMember`, after the existing "duplicate membership in same fellowship" check,
  add a second check:
  ```ts
  const [otherActive] = await db
    .select({ id: fellowshipMembers.id, fellowshipId: fellowshipMembers.fellowshipId })
    .from(fellowshipMembers)
    .innerJoin(fellowships, eq(fellowshipMembers.fellowshipId, fellowships.id))
    .where(and(
      eq(fellowshipMembers.memberId, data.memberId),
      eq(fellowshipMembers.isActive, true),
      eq(fellowships.branchId, fellowship.branchId),
    ));
  if (otherActive) throw new ConflictError('Member is already in a fellowship in this branch');
  ```
- This check must use branch scope so that members in multi-branch scenarios are not incorrectly
  blocked.

**File:** `apps/api/src/fellowships/service.test.ts`
- Add a test case: attempting to add a member who is already active in another fellowship in the
  same branch throws `ConflictError`.

### Step 3.4 — M5: fellowshipId filter in listMembers

**File:** `apps/api/src/members/schemas.ts`
- Add `fellowshipId: z.string().uuid().optional()` to `listMembersQuerySchema`.

**File:** `apps/api/src/members/service.ts`
- In `listMembers`, import `fellowshipMembers` from `@kairos/database`.
- If `query.fellowshipId` is provided, add an `exists(...)` subquery filter checking
  `fellowshipMembers` for `memberId = members.id AND fellowshipId = query.fellowshipId AND
  isActive = true`. Follow the same `exists` pattern already used in `fellowships/service.ts`
  `listFellowships`.

### Step 3.5 — M1: CSV import endpoint

**File:** `apps/api/src/members/router.ts`
- Add `POST /import` route (before the `/:id` param routes to avoid route conflicts).
- Role guard: `admin | pastor` only.
- Parse multipart body using Hono's built-in `c.req.parseBody()` which handles `multipart/form-data`.
- Extract `file` field, read as text, pass to new `importMembers` service function.
- Return `200` with `{ created, errors }` summary.

**File:** `apps/api/src/members/service.ts`
- Add `importMembers(db, auth, csvText: string)`:
  - Parse CSV using `csv-parse/sync` (`parse(csvText, { columns: true, skip_empty_lines: true })`).
  - Validate each row against `createMemberSchema` (transform row object to match schema).
  - Batch-insert valid rows using `db.insert(members).values([...])`. Use a loop with individual
    inserts to collect per-row errors without aborting the whole batch.
  - Return `{ created: number, errors: Array<{ row: number, message: string }> }`.
- Expected CSV columns: `firstName, lastName, email, homeBranchId, phone, gender, dateOfBirth,
  middleName, address, city, postalCode, emergencyContactName, emergencyContactPhone,
  emergencyContactRelationship`.

**File:** `apps/api/package.json`
- Add dependency `csv-parse` if not already present.

### Step 3.6 — M2: CSV export endpoint

**File:** `apps/api/src/members/router.ts`
- Add `GET /export` route (before `/:id` param routes).
- Role guard: `admin | pastor` only.
- Parse same filter params as `listMembersQuerySchema` minus `page`/`limit` (unlimited).
- Call new `exportMembersCsv(db, auth, filters)` service function.
- Return response with headers `Content-Type: text/csv` and
  `Content-Disposition: attachment; filename="members-export.csv"`.

**File:** `apps/api/src/members/service.ts`
- Add `exportMembersCsv(db, auth, filters)`:
  - Reuse the `listMembers` query logic (same `where` conditions) but without pagination.
  - Stringify result rows into CSV format using `csv-stringify/sync` (or manual join — depends on
    existing packages; prefer `csv-stringify` for correctness with quoting).
  - Return plain CSV string.

### Step 3.7 — F7: Fellowship join requests routes and service

**File:** `apps/api/src/fellowships/service.ts`
- Add import for `fellowshipJoinRequests` from `@kairos/database`.
- Add `createJoinRequest(db, auth, fellowshipId, data: { notes? })`:
  - Verify fellowship exists and is active (call `getFellowship`).
  - Check requester is not already an active member of the fellowship.
  - Check no existing `pending` request for `(fellowshipId, memberId)` (ConflictError).
  - Insert row with `status='pending'`, `memberId=auth.memberId`.
- Add `listJoinRequests(db, auth, fellowshipId)`:
  - Call `getFellowship`, then `enforceLeaderOrAbove`.
  - Return all `pending` requests joined with member details (`firstName`, `lastName`, `email`).
- Add `reviewJoinRequest(db, auth, fellowshipId, requestId, data: { status, notes? })`:
  - Call `getFellowship`, then `enforceLeaderOrAbove`.
  - Find the join request by `requestId`, verify it is `pending`.
  - If `status='approved'`: call `addFellowshipMember` logic (or insert directly into
    `fellowshipMembers`), then update request to `approved`.
  - If `status='rejected'`: update request to `rejected`.
  - Set `reviewedBy=auth.memberId`, `reviewedAt=new Date()`.

**File:** `apps/api/src/fellowships/router.ts`
- Add three routes:
  - `POST /:id/join-requests` — auth required, any role; calls `createJoinRequest`
  - `GET /:id/join-requests` — auth required; calls `listJoinRequests`
  - `PATCH /:id/join-requests/:requestId` — auth required; calls `reviewJoinRequest`
- Use `zValidator` with Zod schemas for request bodies.

---

## Phase 4 — Frontend: Branches

*Depends on Phases 1–3. Steps 4.1–4.5 are independent of each other.*

### Step 4.1 — B1: Assign Leadership form

**File:** `apps/web/src/app/(dashboard)/admin/branches/[id]/page.tsx`
- In the Leadership section (below the current leaders list), add an "Assign Leader" button
  visible to `admin | pastor`.
- Clicking opens a `Dialog` (`@kairos/ui`) with a form containing:
  - Role select: `Main Pastor | Elder` (string enum).
  - Member search: combobox/select populated by `api.members.list({ branchId })` (use a
    `useQuery` call inside the dialog to avoid unnecessary fetches).
  - Start date: date input, defaults to today.
  - Notes: optional textarea.
- On submit, call `api.leadership.assign(branchId, { role, memberId, startDate, notes })`.
- Invalidate `['leadership', branchId]` TanStack Query key on success.

### Step 4.2 — B2: Leadership history toggle

**File:** `apps/web/src/app/(dashboard)/admin/branches/[id]/page.tsx`
- Add a "Show History" toggle switch next to the Leadership section heading.
- When toggled on, refetch with `api.leadership.list(branchId, { includeHistory: true })`.
- Show a `Table` with columns: Member Name, Role, Start Date, End Date, Status badge
  (`isCurrent` → "Current" in green, else "Past" in grey).

### Step 4.3 — B3: Regions management page

**File:** `apps/web/src/app/(dashboard)/admin/regions/page.tsx` *(create new)*
- Admin-only page (add auth guard at top of layout or via metadata).
- List existing regions in a `Table` (regionName, country, createdAt).
- Add "+ New Region" button that opens a `Dialog` with a form:
  - `regionName`: text input (required)
  - `country`: text input (required, default "Nigeria" or leave blank)
- POST via `api.regions.create(data)`. Invalidate `['regions']` on success.

**File:** `apps/web/src/app/(dashboard)/layout.tsx`
- Add "Regions" nav link pointing to `/admin/regions` in the admin navigation section. Visible
  only when `systemRole === 'admin'`.

### Step 4.4 — B4/B5: My Branch page

**File:** `apps/web/src/app/(dashboard)/my-branch/page.tsx` *(create new)*
- Accessible to all authenticated users (all roles).
- Read `branchId` from auth context; call `api.branches.get(branchId)` and
  `api.leadership.list(branchId)` in parallel via `Promise.all`.
- Render:
  - **Branch info card**: name, type badge, city, phone, email, established date.
  - **Current leadership card**: list of `isCurrent=true` leaders with role badge + member name.
  - **Pastor actions section** (conditional, visible to `pastor | admin`): quick links → "View
    Members", "View Fellowships", "View Departments" pointing to scoped list pages.

**File:** `apps/web/src/app/(dashboard)/layout.tsx`
- Add "My Branch" nav link pointing to `/my-branch`. Visible to all roles.

---

## Phase 5 — Frontend: Members

*Depends on Phases 1–3. Steps 5.1–5.5 are independent of each other.*

### Step 5.1 — M1: CSV import page

**File:** `apps/web/src/app/(dashboard)/members/import/page.tsx` *(create new)*
- Accessible to `admin | pastor` only.
- "Download CSV Template" button: generates a sample CSV string with the expected column headers
  and one example row; triggers browser download.
- File upload `<input type="file" accept=".csv">`.
- On file select, show a preview (table of first 5 rows parsed client-side with
  `papaparse` or plain `.split('\n')`).
- "Import Members" submit button: builds `FormData` with `file` field and calls
  `api.members.importCsv(formData)`.
- Show result summary: "X members created" + error list if any rows failed.

**File:** `apps/web/src/app/(dashboard)/members/page.tsx`
- Add "Import CSV" button next to existing "Add Member" button — links to `/members/import`.

### Step 5.2 — M2: CSV export button

**File:** `apps/web/src/app/(dashboard)/members/page.tsx`
- Add "Export CSV" button next to "Import CSV" and "Add Member" buttons.
- On click, call `api.members.exportCsv(currentFilters)` which returns a `Blob`.
- Trigger download:
  ```ts
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'members.csv';
  a.click();
  URL.revokeObjectURL(url);
  ```

### Step 5.3 — M4 + M8: emergencyContactRelationship field

After Phase 1 migrations, add the new field in three places:

**File:** `apps/web/src/app/(dashboard)/members/new/page.tsx`
- In the Emergency Contact section of the create member form, add a text input for
  `emergencyContactRelationship` labelled "Relationship to Member" (e.g. "Spouse", "Parent").
  Place it between `emergencyContactName` and `emergencyContactPhone`.

**File:** `apps/web/src/app/(dashboard)/members/[id]/page.tsx`
- In edit mode, add the same `emergencyContactRelationship` field in the Emergency Contact section.

**File:** `apps/web/src/app/(dashboard)/profile/page.tsx`
- Add the same `emergencyContactRelationship` field in the Emergency Contact section of the
  self-edit form (between `emergencyContactName` and `emergencyContactPhone`).

### Step 5.4 — M5: Fellowship filter on members list

**File:** `apps/web/src/app/(dashboard)/members/page.tsx`
- Fetch fellowship list with `api.fellowships.list({ branchId: auth.branchId })` (or all for
  admin) via a separate `useQuery`.
- Add "Filter by Fellowship" dropdown (`Select` from `@kairos/ui`) to the filter bar.
- On change, set `fellowshipId` in the URL search params (alongside existing `search`,
  `approvalStatus` filters).
- Pass `fellowshipId` when calling `api.members.list(params)`.

### Step 5.5 — M6: Fellowship assignment visible to self

**File:** `apps/web/src/app/(dashboard)/members/[id]/page.tsx`
- Determine if viewer is viewing their own profile: `auth.memberId === params.id`.
- If yes (or if `admin | pastor | leader`), show a "Fellowship" section in the profile view.
- Call `api.fellowships.list({ memberId: params.id })` to get this member's fellowship.
- Render fellowship name + type badge. If no fellowship, show "No fellowship assigned".

---

## Phase 6 — Frontend: Fellowships

*Depends on Phases 1–3. Steps 6.1–6.5 are independent of each other.*

### Step 6.1 — F2: Create Meeting form

**File:** `apps/web/src/app/(dashboard)/fellowships/[id]/page.tsx`
- In the Meetings tab, add a "+ Schedule Meeting" button visible when
  `isLeaderOrAbove(auth, fellowship)` (a helper function: returns true for admin/pastor, or when
  `auth.memberId === fellowship.leaderId || auth.memberId === fellowship.coLeaderId`).
- Button opens a `Dialog` with form fields:
  - `meetingDate` — date input (required)
  - `meetingTitle` — text input (optional)
  - `meetingTopic` — text input (optional)
  - `location` — text input (optional)
  - `durationMinutes` — number input (optional)
- On submit, call `api.fellowships.meetings.create(fellowshipId, data)`.
- Invalidate `['fellowship-meetings', fellowshipId]` on success.

### Step 6.2 — F3: Record Attendance UI

**File:** `apps/web/src/app/(dashboard)/fellowships/[id]/page.tsx`
- In the Attendance tab, show a list of past meetings. Next to each meeting, add a
  "Record Attendance" button visible to `isLeaderOrAbove`.
- Clicking opens a `Sheet` (not Dialog, to accommodate a long member list).
- Inside the Sheet: list all fellowship members (from `api.fellowships.members.list(fellowshipId)`)
  each with a radio group: `Present | Absent | Late | Excused`. Default to `Present`.
- "Save Attendance" button calls `api.fellowships.attendance.record(fellowshipId, meetingId, {
  attendances: [{ memberId, status }] })`.
- Invalidate attendance queries on success; close Sheet.

### Step 6.3 — F5: Co-leader field in create/edit forms

**File:** `apps/web/src/app/(dashboard)/fellowships/new/page.tsx`
- The form already has a `leaderId` member select. Add a second member select for `coLeaderId`
  (optional, labelled "Co-Leader"). Populate from `api.members.list({ branchId })`.
- Wire to `coLeaderId` field in the `CreateFellowshipRequest`.

**File:** `apps/web/src/app/(dashboard)/fellowships/[id]/page.tsx`
- In the edit dialog/form for fellowship details, add the same `coLeaderId` member select if not
  already present.

### Step 6.4 — F7: Join Requests UI

**File:** `apps/web/src/app/(dashboard)/fellowships/[id]/page.tsx`

**For regular members (not leader/admin/pastor):**
- On the fellowship detail page, show a "Request to Join" button when the member is not already
  in the fellowship (`api.fellowships.members.list()` result does not include `auth.memberId`) AND
  has no pending request.
- Clicking calls `api.fellowships.joinRequests.create(fellowshipId, {})`.
- After requesting, replace button with "Request Pending" badge.

**For admin/pastor/leader:**
- Add a "Join Requests" badge/tab on the fellowship detail page showing count of pending requests.
- List pending requests: member name, request date, optional notes.
- Each row has "Approve" (green) and "Reject" (red) action buttons.
- Approve calls `api.fellowships.joinRequests.review(fellowshipId, requestId, { status: 'approved' })`.
- Reject calls `api.fellowships.joinRequests.review(fellowshipId, requestId, { status: 'rejected' })`.
- Invalidate both `['join-requests', fellowshipId]` and `['fellowship-members', fellowshipId]` on
  approve so the member list refreshes.

### Step 6.5 — F10: Fix "Cell Groups" label → "K-Groups"

**File:** `apps/web/src/app/(dashboard)/fellowships/page.tsx`
- Find any hardcoded string `"Cell Groups"` or `"Cell Group"` in type label mappings and change to
  `"K-Groups"`.

**File:** `apps/web/src/app/(dashboard)/fellowships/new/page.tsx`
- Find the fellowship type select options. Change the option with value `"K-Groups"` or
  `"Cell Groups"` to display label **"K-Groups"** with value `"K-Groups"` (matching the DB
  constraint exactly).

Verify no other frontend files reference "Cell Groups" by searching with `grep -r "Cell Group"
apps/web/src`.

---

## Relevant Files

**Database / Schema**
- `packages/database/drizzle/` — add `0006_*.sql`, `0007_*.sql`
- `packages/database/src/schema/members.ts` — add `emergencyContactRelationship`
- `packages/database/src/schema/fellowshipJoinRequests.ts` *(create)*
- `packages/database/src/index.ts` — export new table

**Types & API Client**
- `packages/types/src/entities.ts` — `Member`, `FellowshipJoinRequest`, `FellowshipJoinRequestWithMember`
- `packages/types/src/api.ts` — `UpdateMemberRequest`, `CreateMemberRequest`, `MemberListParams`, `CreateJoinRequestRequest`, `ReviewJoinRequestRequest`
- `packages/api-client/src/api.ts` — add `fellowships.joinRequests`, `members.importCsv`, `members.exportCsv`, `leadership.list` history param, `members.list` fellowshipId
- `packages/api-client/src/client.ts` — add `postForm`, `getBlob` methods

**API Backend**
- `apps/api/src/branches/service.ts` — `getBranchLeadership` history param
- `apps/api/src/branches/router.ts` — parse `includeHistory` query param
- `apps/api/src/fellowships/service.ts` — `enforceLeaderOrAbove`, F6 one-fellowship check, join request service functions
- `apps/api/src/fellowships/router.ts` — join request routes
- `apps/api/src/members/schemas.ts` — add `fellowshipId`
- `apps/api/src/members/service.ts` — fellowship filter, `importMembers`, `exportMembersCsv`
- `apps/api/src/members/router.ts` — `POST /import`, `GET /export` routes

**Frontend**
- `apps/web/src/app/(dashboard)/admin/branches/[id]/page.tsx` — B1 assign form, B2 history toggle
- `apps/web/src/app/(dashboard)/admin/regions/page.tsx` *(create)* — B3
- `apps/web/src/app/(dashboard)/my-branch/page.tsx` *(create)* — B4/B5
- `apps/web/src/app/(dashboard)/layout.tsx` — nav links for regions, my-branch
- `apps/web/src/app/(dashboard)/members/page.tsx` — M2 export, M5 fellowship filter, import link
- `apps/web/src/app/(dashboard)/members/import/page.tsx` *(create)* — M1
- `apps/web/src/app/(dashboard)/members/new/page.tsx` — M4 relationship field
- `apps/web/src/app/(dashboard)/members/[id]/page.tsx` — M4 relationship field, M6 fellowship section
- `apps/web/src/app/(dashboard)/profile/page.tsx` — M8 relationship field
- `apps/web/src/app/(dashboard)/fellowships/[id]/page.tsx` — F2 meeting form, F3 attendance sheet, F5 co-leader, F7 join requests UI
- `apps/web/src/app/(dashboard)/fellowships/new/page.tsx` — F5 co-leader field, F10 label fix
- `apps/web/src/app/(dashboard)/fellowships/page.tsx` — F10 label fix

---

## Verification

1. **Migrations**: Run `npx drizzle-kit migrate` against local Docker PostgreSQL. Inspect `\d members` and `\d fellowship_join_requests` to verify columns and constraints.
2. **Unit tests (API)**: Run `npx turbo test --filter=api` and confirm all existing tests pass; add new tests for F6 conflict case and F7 join-request flow.
3. **Type safety**: Run `npx turbo build --filter=types --filter=api-client` to verify no type errors introduced in Phase 2.
4. **Import/Export**: Call `POST /api/members/import` with a well-formed CSV and a CSV with bad rows; verify `{created, errors}` response.  Call `GET /api/members/export` and verify CSV response headers and content.
5. **Leader permissions (F1)**: Log in as a fellowship leader (not admin/pastor) and verify they can access Record Attendance and Create Meeting. Verify a non-leader regular member cannot.
6. **One fellowship rule (F6)**: Attempt to add an already-fellowshiped member via admin; verify `409 ConflictError`.
7. **Leadership history (B2)**: Toggle "Show History" in branch detail page; verify all past leaders appear.
8. **Join request flow (F7)**: As member, request to join; as leader, approve; verify member appears in fellowship member list.
9. **Emergency contact relationship (M4/M8)**: Create a member with `emergencyContactRelationship`; verify it persists and appears in edit form.
10. **F10 label**: Open fellowship type dropdown in `/fellowships/new` and confirm "K-Groups" is shown, not "Cell Groups".
11. **E2E smoke**: Run `npx playwright test e2e/walkthrough-admin.spec.ts` and `walkthrough-pastor.spec.ts` in headed mode to verify no regressions in existing flows.
