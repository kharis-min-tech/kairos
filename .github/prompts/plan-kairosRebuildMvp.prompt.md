# Plan: Kairos Rebuild — MVP from Scratch

## TL;DR
Rebuild Kairos Church Administration Platform from a clean branch with 4 MVP modules: **Auth, Branches, Members, Fellowships** — across Admin, Pastor/Leader, and Member personas. Fellowships have 5 subtypes: K-Groups, Kharis Express, New Breeds, Kharis on Campus, Kharis on Campus Colleges. **Local-first development**: Docker PostgreSQL + Hono API server + Next.js frontend — no AWS dependencies until deployment phase. Strict TDD throughout. Web-first responsive design with purple + gold theme informed by Figma mobile screens.

---

## Phase 0: Repository Setup

**Goal**: Clean branch with only requirements and fresh scaffolding.

1. Create new branch `rebuild-v2` from `main`, then **rebase onto `db_release`** to pull the latest database schema updates
2. Remove all existing source code (apps/, packages/src/, infrastructure/src/, e2e/, scripts/) — keep `requirements/`, `database/*` (Drizzle schemas + migrations from db_release), root configs
3. Write fresh `AGENTS.md` reflecting rebuild conventions (local-first, Hono API, 4 MVP modules, TDD mandate)
4. Write fresh `.github/instructions/` files for the rebuild context
5. Update `turbo.json` and root `package.json` if workspace structure changes
6. Add `docker-compose.yml` — PostgreSQL 15 container (port 5432), with volume for persistence
7. Add `.env.example` — `DATABASE_URL=postgresql://kairos:kairos@localhost:5432/kairos`, `JWT_SECRET`, `PORT=3001`

**Files to preserve**: `requirements/*`, `database/*` (from db_release), `package.json` (root), `turbo.json`, `tsconfig.base.json`, `playwright.config.ts`, `.github/workflows/*`

**Dev startup**: `docker compose up -d` → `npx turbo dev` (starts both API on :3001 and Next.js on :3002)

---

## Phase 1: Foundation (all parallelizable internally)

**Goal**: Shared packages, database schema, local dev server — all buildable and testable before any feature work.

### Step 1.1: `@kairos/types` — Shared TypeScript types *(no dependencies)*
- Entity interfaces matching DB schema (camelCase as per convention): `Region`, `Branch`, `BranchLeadership`, `Member`, `Role`, `MemberRole`, `Fellowship`, `FellowshipMember`, `FellowshipMeeting`, `FellowshipMeetingAttendance`
- API request/response types for each module's endpoints
- Enum types: `BranchType`, `Gender`, `AttendanceStatus`, `MembershipStatus`, `LeadershipRole`, `FellowshipType`
- `FellowshipType` values: `K-Group`, `Kharis Express`, `New Breeds`, `Kharis on Campus`, `Kharis on Campus Colleges`
- Auth context type: `AuthContext` with `userId`, `memberId`, `branchId`, `roles[]`
- **Test**: Type compilation check (tsc --noEmit)

### Step 1.2: `@kairos/database` — Drizzle ORM schemas *(no dependencies)*
- Drizzle schema files mirroring `database/schema.sql` tables: `regions`, `branches`, `branchLeadership`, `members`, `roles`, `memberRoles`, `fellowships` (with `fellowship_type` varchar column), `fellowshipMembers`, `fellowshipMeetings`, `fellowshipMeetingAttendance`
- Relations definitions for Drizzle relational queries
- Migration baseline from `db_release` branch (latest Drizzle schemas + migrations)
- **Source of truth**: `db_release` branch's database package — includes `fellowship_type` column already added via migration `0003_add_fellowship_type.sql`
- **Test**: Schema compilation, migration generation dry-run

### Step 1.3: `@kairos/utils` — Shared utilities *(depends on @kairos/types)*
- `auth-context.ts`: Extract `AuthContext` from Hono context (JWT claims via middleware → userId, memberId, branchId, roles)
- `branch-access.ts`: `enforceBranchAccess(authContext, targetBranchId)` — throws 403 if non-admin accessing another branch's data
- `error-handler.ts`: Standardized error responses (400, 401, 403, 404, 500) with consistent JSON shape
- `validator.ts`: Zod-based request body validation wrapper (complements `@hono/zod-validator`)
- `logger.ts`: Structured JSON logger
- `db-client.ts`: Drizzle client factory (connects to Docker PostgreSQL locally, Aurora in production via `DATABASE_URL`)
- `response.ts`: Standard API response builder `{ success, data, error, pagination }`
- **Tests**: Unit tests for each utility (auth context extraction, branch access enforcement, error formatting, validation)

### Step 1.4: Hono API server scaffold *(parallel with 1.1-1.3)*
- `apps/api/src/app.ts` — Root Hono app that mounts module routers (`app.route('/v1/auth', authRouter)` etc.)
- `apps/api/src/server.ts` — Local dev entry point: `serve({ fetch: app.fetch, port: 3001 })` via `@hono/node-server`
- `apps/api/src/middleware/auth.ts` — JWT verification middleware using `jsonwebtoken` (validates Bearer token, injects `AuthContext` into Hono context)
- `apps/api/src/middleware/error-handler.ts` — Global error handler middleware
- `apps/api/src/middleware/cors.ts` — CORS config for local dev (allow `localhost:3002`)
- Each module gets its own Hono router file (e.g., `apps/api/src/auth/router.ts`) — same code works locally and on Lambda
- **Lambda entry points** (created but not deployed yet): `apps/api/src/auth/lambda.ts` exports `handle(authApp)` — one per module for future module-grouped Lambda deployment
- **Test**: Server starts, health check endpoint (`GET /health`), CORS headers present

### Step 1.5: `@kairos/api-client` — Typed HTTP client *(depends on @kairos/types)*
- Client class with auth token injection, base URL config
- Method stubs for each module (implemented as modules are built)
- Error handling with typed error responses
- **Test**: Client instantiation, request building, error parsing

### Step 1.6: `@kairos/ui` — Shared component library *(parallel)*
- Shadcn/ui setup with **purple + gold theme**: Purple #6D28D9 (primary), Gold #D97706 (accent/warning), Emerald #059669 (success), Rose #E11D48 (errors), Gray scale #111827→#F9FAFB
- Base components: Button, Input, Card, Dialog, Badge, Avatar, Tabs, Select, Table
- Layout components: PageHeader, StatCard, BottomNav (responsive — sidebar on desktop), SearchBar
- Form components: FormField, FormSection, PasswordInput (with strength indicator per Figma)
- **Test**: Component render tests with Vitest + React Testing Library

---

## Phase 2: Auth Module

**Goal**: Complete authentication flow — signup, login, verification, password reset, admin approval, role-based access.

### Figma Screens
- Welcome Page, Login (without role selector), Signup (3-step), Email Verification, Forgot Password, Reset Password

### Step 2.1: Auth Hono router *(depends on Phase 1)*
Hono router at `apps/api/src/auth/router.ts`:
- `POST /v1/auth/signup` — Hash password with `bcrypt`, create member record (is_active=false pending approval), generate email verification token. Stores credentials in `members` table (email + password_hash columns)
- `POST /v1/auth/login` — Verify password with bcrypt, auto-detect role from `member_roles` table → sign JWT (access + refresh tokens) using `jsonwebtoken`
- `POST /v1/auth/verify-email` — Confirm email with 6-digit code (stored in DB with expiry)
- `POST /v1/auth/resend-code` — Regenerate and store new verification code
- `POST /v1/auth/forgot-password` — Generate password reset token (stored in DB with expiry). (Email sending stubbed for local dev — logs token to console)
- `POST /v1/auth/reset-password` — Validate reset token + update password hash
- `POST /v1/auth/refresh` — Verify refresh token → issue new access token
- `POST /v1/auth/logout` — Invalidate refresh token (stored in DB or in-memory blocklist)
- `GET /v1/auth/me` — Get current user profile with roles (uses JWT auth middleware)
- **Branch isolation**: Not applicable for most auth endpoints (pre-auth), but `GET /me` returns branch-scoped data
- **Auth middleware**: JWT verification via Hono middleware — public routes (`signup`, `login`, `verify-email`, `forgot-password`, `reset-password`) excluded
- **Tests**: Unit tests for each route, password hashing, JWT signing/verification, token expiry, refresh flow

### Step 2.2: Auth API client methods *(depends on 2.1)*
- `signup()`, `login()`, `verifyEmail()`, `resendCode()`, `forgotPassword()`, `resetPassword()`, `refreshToken()`, `logout()`, `getMe()`
- Token storage/refresh logic in client
- **Test**: Method signatures, request/response type safety

### Step 2.3: Auth frontend pages *(depends on 2.2)*
**Pages** (Next.js App Router):
- `/` — Welcome/landing page
- `/login` — Email + password form (NO role selector — role auto-detected after login)
- `/signup` — 3-step form: Step 1 (personal info + branch selection), Step 2 (emergency contact, ministry interest, additional personal details), Step 3 (password creation with strength indicator + terms acceptance)
- `/verify-email` — 6-digit code entry with countdown timer, resend option
- `/forgot-password` — Email entry → send reset link
- `/reset-password` — New password with strength indicator + requirements checklist
- `/pending-approval` — Post-signup waiting state (admin must approve)

**Shared auth components**: AuthLayout, PasswordStrengthIndicator, OTPInput, StepIndicator

**Auth state management** (Zustand store):
- `useAuthStore`: token storage, user profile, login/logout, role detection
- Auto-redirect based on auth state + role (admin → admin dashboard, pastor → branch dashboard, member → member dashboard)

**Tests**: Component render tests, form validation, auth flow integration tests (mock API)

### Step 2.4: Admin approval flow
- Admin endpoint: `PATCH /v1/members/:id/approve` — sets `is_active=true` on member record
- Admin UI: Pending members list with approve/reject actions (part of Members module UI, but auth-dependent)
- **Notification**: (future — out of MVP scope, just set the flag)

---

## Phase 3: Branches Module

**Goal**: Branch CRUD, pastor assignment, branch-level data isolation for Admin and Pastor personas.

### Figma Screens
- Branch Settings (create/edit form with location, contact, leadership, service schedule, capacity)

### Database Tables
- `regions` (lookup), `branches`, `branch_leadership`

### Step 3.1: Branches Hono router *(depends on Phase 1)*
Hono router at `apps/api/src/branches/router.ts`:
- `GET /v1/branches` — List all active branches (admin: all, pastor: own branch only, member: own branch only). Include region name, pastor name, member count
- `GET /v1/branches/:id` — Get branch detail with leadership, service schedule stats
- `POST /v1/branches` — Create branch *(admin only)*. Fields: name, regionId, branchType, address, city, postalCode, phone, email, establishedDate
- `PUT /v1/branches/:id` — Update branch *(admin or branch pastor)*
- `DELETE /v1/branches/:id` — Soft-delete (set is_active=false) *(admin only)*. Validate no active members before deactivation
- `GET /v1/branches/:id/leadership` — Get branch leadership (current pastor, elders)
- `POST /v1/branches/:id/leadership` — Assign leadership *(admin only)*. Enforces one Main Pastor per branch (partial unique index)
- `DELETE /v1/branches/:id/leadership/:leadershipId` — Remove leadership assignment (set is_current=false)
- **Branch isolation**: `enforceBranchAccess()` on all non-admin requests
- **Tests**: CRUD operations, branch isolation enforcement, leadership assignment rules (one pastor constraint), soft-delete validation

### Step 3.2: Regions Hono router *(depends on Phase 1)* — *small, included in branches router*
- `GET /v1/regions` — List all regions (for branch creation dropdown)
- `POST /v1/regions` — Create region *(admin only)*
- **Tests**: CRUD, uniqueness validation

### Step 3.3: Branches API client methods *(depends on 3.1)*
- `getBranches()`, `getBranch(id)`, `createBranch()`, `updateBranch()`, `deleteBranch()`, `getBranchLeadership()`, `assignLeadership()`, `removeLeadership()`, `getRegions()`, `createRegion()`
- **Test**: Type safety

### Step 3.4: Branches frontend pages *(depends on 3.3)*
**Pages**:
- `/admin/branches` — Branch list with stats (admin only)
- `/admin/branches/new` — Create branch form (matching Figma: Basic Info, Location, Contact, Leadership, Service Schedule, Capacity)
- `/admin/branches/:id` — Branch detail/edit
- `/admin/branches/:id/settings` — Branch settings (matching Figma Branch Settings screen)

**Components**: BranchCard, BranchForm, LeadershipAssignment, ServiceScheduleEditor, BranchStats

**Tests**: Component renders, form validation, branch isolation in UI (pastor sees only their branch)

---

## Phase 4: Members Module

**Goal**: Member directory, CRUD, profile management, approval workflow across all 3 personas.

### Figma Screens
- Members Directory (search, filters, alphabetical grouping, stats pills)
- Member Profile (contact, attendance, follow-up notes, financial summary, ministry involvement)
- Add New Member form
- Member Status modal (activate/deactivate)

### Database Tables
- `members`, `member_roles`, `roles`

### Step 4.1: Members Hono router *(depends on Phase 1, Phase 2 for auth)*
Hono router at `apps/api/src/members/router.ts`:
- `GET /v1/members` — List members with pagination, search (name/email/phone), filters (active/inactive, branch). Admin: all branches. Pastor: own branch. Member: own branch directory
- `GET /v1/members/:id` — Get member detail with roles, fellowship memberships
- `POST /v1/members` — Create member *(admin or pastor)*. Validates email/phone uniqueness among active members
- `PUT /v1/members/:id` — Update member *(admin, pastor for own branch, member for own profile only)*
- `PATCH /v1/members/:id/status` — Activate/deactivate member *(admin or pastor)*. Soft-delete (is_active toggle). Warning about suspending access per Figma modal
- `PATCH /v1/members/:id/approve` — Approve pending member from signup *(admin or pastor)*
- `GET /v1/members/:id/roles` — Get member's roles
- `POST /v1/members/:id/roles` — Assign role *(admin only)*
- `DELETE /v1/members/:id/roles/:roleId` — Remove role *(admin only)*
- **Branch isolation**: All queries filtered by branch for non-admin users
- **Tests**: CRUD, search/filter, branch isolation, approval workflow, status toggle, role assignment, uniqueness validation

### Step 4.2: Members API client methods *(depends on 4.1)*
- `getMembers(filters)`, `getMember(id)`, `createMember()`, `updateMember()`, `updateMemberStatus()`, `approveMember()`, `getMemberRoles()`, `assignRole()`, `removeRole()`
- **Test**: Type safety

### Step 4.3: Members frontend pages *(depends on 4.2)*
**Pages**:
- `/members` — Members directory (matching Figma: search bar, Total/Active/Inactive stat pills, alphabetical grouping, member cards with Call/Email actions, filter tabs: All Members/Branch/Department)
- `/members/new` — Add member form (matching Figma: Personal Info, Contact Info, Church Info with membership status/join date/ministry/baptized, Emergency Contact, Additional Notes)
- `/members/:id` — Member profile (matching Figma: contact info, attendance donut chart, follow-up notes, financial summary, ministry involvement)
- `/members/:id/edit` — Edit member
- `/admin/pending-members` — Pending approval list (admin/pastor)

**Components**: MemberCard, MemberDirectory, MemberForm, MemberProfile, MemberStatusModal, AttendanceChart, FollowUpNotes, RoleAssignment

**Tests**: Directory rendering, search/filter, form validation, profile sections, status modal interaction

---

## Phase 5: Fellowships Module

**Goal**: Fellowship management across all 5 subtypes with meetings and attendance tracking.

### Fellowship Subtypes
| Type | UI Label | Description |
|------|----------|-------------|
| K-Group | K-Groups | House Fellowship Groups |
| Kharis Express | Expresses | Outreach-oriented fellowship |
| New Breeds | New Breeds | Outreach-oriented fellowship |
| Kharis on Campus | KOC | University campus fellowship |
| Kharis on Campus Colleges | KOC Colleges | College campus fellowship |

### Figma Screens
- Fellowships List (stats pills, filter by type + pastor, group cards with leader/schedule/member count)
- Fellowship Detail (tabs: Meetings/Attendance/Members, next meeting card, meeting schedule)
- Fellowship Attendance (trend chart, present/absent rates, recent meetings, member summary with individual percentages)

### Database Tables
- `fellowships` (with `fellowship_type` varchar), `fellowship_members`, `fellowship_meetings`, `fellowship_meeting_attendance`

### Step 5.1: Fellowships Hono router *(depends on Phase 1, Phase 2)*
Hono router at `apps/api/src/fellowships/router.ts`:
- `GET /v1/fellowships` — List fellowships with leader name, member count, fellowship type. Branch-scoped. Supports `?type=K-Group` filter
- `GET /v1/fellowships/:id` — Fellowship detail with members, recent meetings, type
- `POST /v1/fellowships` — Create fellowship *(admin or pastor)*. Requires `fellowshipType` (one of the 5 subtypes)
- `PUT /v1/fellowships/:id` — Update fellowship (including type change)
- `DELETE /v1/fellowships/:id` — Soft-delete
- `GET /v1/fellowships/:id/members` — List fellowship members
- `POST /v1/fellowships/:id/members` — Add member to fellowship (validates same branch, no duplicate active membership)
- `DELETE /v1/fellowships/:id/members/:memberId` — Remove member (set leave_date + is_active=false)
- `GET /v1/fellowships/:id/meetings` — List meetings with attendance stats
- `POST /v1/fellowships/:id/meetings` — Create meeting
- `PUT /v1/fellowships/:id/meetings/:meetingId` — Update meeting
- `POST /v1/fellowships/:id/meetings/:meetingId/attendance` — Record attendance (bulk — array of {memberId, status})
- `GET /v1/fellowships/:id/meetings/:meetingId/attendance` — Get meeting attendance
- `GET /v1/fellowships/:id/attendance-summary` — Attendance trends (present rate, absent rate, weekly trend)
- **Leader auto-join**: When setting leader_id, auto-add to fellowship_members
- **Branch isolation**: All queries scoped to user's branch
- **Tests**: CRUD, member management, meeting CRUD, attendance recording, leadership auto-join, branch isolation, attendance summary calculations, fellowship type filtering, type validation

### Step 5.2: Fellowships API client methods *(depends on 5.1)*
- `getFellowships(filters?)` (type filter), `getFellowship(id)`, `createFellowship()`, `updateFellowship()`, `deleteFellowship()`, `getFellowshipMembers()`, `addFellowshipMember()`, `removeFellowshipMember()`, `getFellowshipMeetings()`, `createMeeting()`, `updateMeeting()`, `recordAttendance()`, `getMeetingAttendance()`, `getAttendanceSummary()`
- **Test**: Type safety

### Step 5.3: Fellowships frontend pages *(depends on 5.2)*
**Pages**:
- `/fellowships` — Fellowships hub with type tabs (All / K-Groups / Expresses / New Breeds / KOC / KOCS Colleges). Stats pills, filter by pastor + type, group cards with location/leader/schedule/member count/type badge
- `/fellowships/new` — Create fellowship form (includes type selector dropdown)
- `/fellowships/:id` — Fellowship detail with tabs: Meetings (next meeting card, meeting schedule list), Attendance (trend chart, present/absent rates, recent meetings with attendance bars, member summary), Members (member list with individual attendance %)
- `/fellowships/:id/edit` — Edit fellowship
- `/fellowships/:id/meetings/new` — Create meeting
- `/fellowships/:id/meetings/:meetingId/attendance` — Record meeting attendance

**Components**: FellowshipCard, FellowshipDetail, FellowshipTypeSelector, FellowshipTypeBadge, MeetingCard, AttendanceTrendChart, MemberAttendanceSummary, AttendanceRecorder

**Tests**: List rendering, type tab filtering, tab navigation, meeting management, attendance recording UI, type selector validation

---

## Phase 6: Dashboard & Navigation

**Goal**: Role-specific dashboards and app navigation (ties all modules together).

### Step 6.1: Dashboards *(depends on Phases 2-5)*
- `/dashboard` — Route redirects based on role:
  - **Admin**: Church-wide overview (total branches, members, fellowships — aggregate stats)
  - **Pastor**: Branch dashboard (matching Figma: branch stats, attendance trend, quick actions, recent activities, attention needed/missing members)
  - **Member**: Personal dashboard (matching Figma: attendance %, events attended, departments, upcoming events, attendance summary donut, quick actions)

### Step 6.2: Navigation *(parallel with 6.1)*
- **Desktop**: Sidebar navigation with role-based menu items
- **Mobile**: Bottom navigation bar (Home, Fellowships/Members, Events placeholder, Profile)
- **Components**: AppLayout, Sidebar, BottomNav, TopBar with user avatar + branch name

### Step 6.3: Profile & Settings *(parallel with 6.1)*
- `/profile` — Profile settings (matching Figma: personal info edit, change password, 2FA toggle, notification preferences, language)
- `/settings` — App settings (matching Figma: theme toggle, font size, notification toggles, data management)

---

## Relevant Files

### Preserved references
- `requirements/*` — All 8 spec documents (architecture, data model, design, implementation plan, MVP scope, software spec, stack, project plan)
- `database/schema.sql` — Source of truth for all table definitions (23 tables)

### New/Modified files by phase

**Phase 0 (Setup)**:
- `AGENTS.md` — Fresh rebuild conventions
- `.github/instructions/*.instructions.md` — Updated instruction files

**Phase 1 (Foundation)**:
- `packages/types/src/entities.ts` — Entity interfaces (Region, Branch, Member, Fellowship, etc.)
- `packages/types/src/api.ts` — API request/response types
- `packages/types/src/enums.ts` — Shared enums
- `packages/database/src/schema/*.ts` — Drizzle schema files per table group
- `packages/database/src/index.ts` — Schema exports + relations
- `packages/utils/src/auth-context.ts` — JWT → AuthContext extraction
- `packages/utils/src/branch-access.ts` — Branch isolation enforcement
- `packages/utils/src/error-handler.ts` — Standardized error responses
- `packages/utils/src/validator.ts` — Zod validation wrapper
- `packages/utils/src/logger.ts` — Structured logger
- `packages/utils/src/db-client.ts` — Drizzle client factory
- `packages/utils/src/response.ts` — Standard API response builder
- `packages/api-client/src/client.ts` — HTTP client with auth
- `packages/api-client/src/api.ts` — Module method stubs
- `packages/ui/src/components/*` — Shadcn/ui components + custom components
- `apps/api/src/app.ts` — Root Hono app (mounts all routers)
- `apps/api/src/server.ts` — Local dev server (`@hono/node-server`)
- `apps/api/src/*/lambda.ts` — Lambda entry points (created but unused until deployment)
- `docker-compose.yml` — PostgreSQL 15 container
- `.env.example` — Local environment variables

**Phase 2 (Auth)**:
- `apps/api/src/auth/router.ts` — Auth Hono router
- `apps/api/src/middleware/auth.ts` — JWT auth middleware
- `apps/web/src/app/(auth)/*` — Auth pages (login, signup, verify, forgot-password, reset-password)
- `apps/web/src/hooks/useAuth.ts` — Auth state management (Zustand)
- `apps/web/src/lib/auth-store.ts` — Auth Zustand store

**Phase 3 (Branches)**:
- `apps/api/src/branches/router.ts` — Branches Hono router
- `apps/web/src/app/(dashboard)/admin/branches/*` — Branch pages,
- `apps/web/src/components/branches/*` — Branch components

**Phase 4 (Members)**:
- `apps/api/src/members/router.ts` — Members Hono router
- `apps/web/src/app/(dashboard)/members/*` — Member pages
- `apps/web/src/components/members/*` — Member components

**Phase 5 (Fellowships)**:
- `apps/api/src/fellowships/router.ts` — Fellowships Hono router
- `apps/web/src/app/(dashboard)/fellowships/*` — Fellowship pages (all types)
- `apps/web/src/components/fellowships/*` — Fellowship components (shared across types)

**Phase 6 (Dashboards)**:
- `apps/web/src/app/(dashboard)/dashboard/*` — Dashboard pages (admin, pastor, member variants)
- `apps/web/src/components/layout/*` — Layout components (Sidebar, BottomNav, AppLayout)
- `apps/web/src/app/(dashboard)/profile/*` — Profile/Settings pages

---

## Verification

### Per-phase checks
1. **Phase 0**: `git log --oneline -1` confirms clean branch. `docker compose up -d` starts PostgreSQL. `npx turbo build` succeeds with empty packages
2. **Phase 1**: `npx turbo build` — all packages compile. `npx turbo test` — utility unit tests pass. `npx turbo dev` — API server responds to `GET /health` on :3001, Next.js on :3002
3. **Phase 2**: Auth router tests pass (bcrypt + JWT). Auth pages render. Login → dashboard redirect works. Signup → pending approval flow works
4. **Phase 3**: Branch CRUD tests pass. Branch isolation tests pass (pastor can't access other branch)
5. **Phase 4**: Member CRUD tests pass. Directory search/filter works. Approval workflow test (signup → approve → active). Branch isolation on member queries
6. **Phase 5**: Fellowship CRUD tests pass (all 5 types). Type filtering works. Meeting/attendance tests pass. Leader auto-join verified. Attendance summary calculations correct
7. **Phase 6**: Role-based dashboard redirect works. Navigation shows correct items per role. Profile edit saves correctly

### End-to-end verification
- `docker compose up -d` — PostgreSQL running, schema migrated
- `npx turbo build` — full monorepo builds clean
- `npx turbo test` — all unit/integration tests pass
- `npx turbo lint` — no lint errors
- `npx turbo dev` — API on :3001, web on :3002, both healthy
- Manual walkthrough: Signup → Verify Email → Pending Approval → Admin Approve → Login → Dashboard → Browse Members → Create Fellowship (K-Group type) → Create Fellowship (Express type) → Record Attendance

### TDD compliance
- Every handler, component, and utility has corresponding test file
- Tests written BEFORE implementation in each step
- Minimum test categories per module: happy path, validation errors, auth/authorization, branch isolation

---

## Decisions

1. **Local-first development**: Docker PostgreSQL + Hono API + Next.js. No AWS dependencies during development. Infrastructure/deployment is a separate future phase
2. **Hono framework**: Lightweight TypeScript-first web framework with native Lambda adapter (`hono/aws-lambda`). Each module is a Hono router — same code runs locally via `@hono/node-server` and on Lambda via `handle()`. No Express, no serverless-express wrapper
3. **Module-grouped routers** (future Lambdas): One Hono router per module (auth, branches, members, fellowships) with `lambda.ts` entry points pre-created. When deploying to AWS, each becomes its own Lambda function — no code changes needed
4. **Color scheme**: Purple + Gold primary palette — Purple #6D28D9 (primary), Gold #D97706 (accent/warning), Emerald #059669 (success), Rose #E11D48 (errors). Cool-toned harmony; no blue competing with purple
5. **Fellowship subtypes**: 5 types — K-Groups, Kharis Express, New Breeds, Kharis on Campus, Kharis on Campus Colleges. Stored in `fellowship_type` varchar column. UI shows type tabs + badges. Internal code uses `fellowships` as the entity name
6. **Database baseline**: Rebase from `db_release` branch before starting work to get latest schema (includes `fellowship_type` column and recent migrations)
7. **Local auth**: bcrypt for password hashing, jsonwebtoken for JWT signing/verification. No Cognito during development — same endpoints/shapes, Cognito becomes a deployment-time swap
8. **No role selector on login**: Role auto-detected from `member_roles` table after authentication. Multi-role users default to highest-privilege role with ability to switch
9. **Web-first responsive**: Despite Figma being mobile (375px), building for web with responsive breakpoints. Desktop gets sidebar nav, mobile gets bottom nav
10. **Regions**: Kept as lightweight lookup table for branch grouping. Simple CRUD, no complex region management in MVP
11. **Auth approval flow**: On signup, member record created with `is_active=false`. Admin/pastor approves → `is_active=true`. Until approved, user can log in but sees "pending approval" page
12. **Signup 3-step design**: Step 1 = personal info + branch. Step 2 = emergency contact, ministry interest, additional details. Step 3 = password (with strength indicator) + terms acceptance
13. **Seed data**: `scripts/seed-dev.ts` using Drizzle ORM — creates 2-3 regions, 3-5 branches, ~20 members across roles, fellowships of each type (K-Groups, Expresses, New Breeds, KOC, KOCS Colleges) with sample meetings and attendance
14. **Scope boundary**: Donations/Giving, Attendance (church-level), Departments, Outreach, Forms, Notifications, Analytics, Reports — all **excluded** from MVP. Only the 4 modules + dashboards

## Further Considerations

1. **Fellowship meeting types**: Figma shows "Prayer & Worship Night", "Bible Study: Romans", "Fellowship & Testimonies". The schema has `meeting_title` and `meeting_topic` fields but no `meeting_type` enum. **Recommendation**: Use free-text `meeting_title` for MVP — no need for a type enum
2. **Fellowship type validation**: The `fellowship_type` column is a plain `varchar(50)` with no DB-level CHECK constraint. **Recommendation**: Enforce valid types at the application layer (Zod validation in the Lambda handler) rather than adding a DB constraint — keeps the type list flexible for future additions
