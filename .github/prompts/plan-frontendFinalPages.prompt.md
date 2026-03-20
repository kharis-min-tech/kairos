# Plan: Frontend Final Pages + Polish

## TL;DR
Implement 3 remaining frontend pages (Reports, Add New Member, App Settings) and polish 2 existing features (Email Verification OTP UI, Fellowship Attendance Tab) to reach 100% UI completion (22/22 steps). All 5 items are independent and can be implemented in parallel.

## Decisions
- **OTP boxes**: Cosmetic only — auto-fill from URL `memberId` token, keep existing `POST /api/auth/verify-email` API
- **Reports Giving tab**: Local mock/dummy data (not API-driven), since donations module isn't in MVP
- **Reports Attendance + Growth tabs**: Use real API endpoints (`api.reports.attendanceTrend`, `api.reports.memberGrowth`)
- **App Settings**: All preferences backed by `localStorage`, no backend needed
- **Add New Member**: Uses `api.members.create()` → returns `{ member, generatedPassword }`

---

## Phase A — New Hooks (parallel)

### Step A1: Create `use-reports.ts`
- **File**: `apps/web/src/hooks/use-reports.ts`
- 2 hooks: `useMemberGrowth()`, `useAttendanceTrend()` — both `useQuery` wrapping `api.reports.*`
- Follow pattern from `use-dashboard.ts`

### Step A2: Add `useCreateMember()` to `use-members.ts`
- **File**: `apps/web/src/hooks/use-members.ts`
- Add `useCreateMember()` — `useMutation` wrapping `api.members.create()`, invalidates `['members']`
- Type: `CreateMemberRequest` → `CreateMemberResponse`

---

## Phase B — New Pages (parallel with each other, depend on Phase A)

### Step B1: Reports Page (`/reports`)
- **File**: `apps/web/src/app/(dashboard)/reports/page.tsx`
- Route guard: admin/pastor only (redirect member role to `/dashboard`)
- Purple gradient header with title "Reports & Analytics"
- 4 StatCards (reuse pattern from dashboard): Total Members, Active Rate, Avg Attendance, Total Fellowships — computed from report data
- 3 pill tabs: Attendance | Giving | Growth
- **Attendance tab**: Recharts `LineChart` (weekly attendance rate from `useAttendanceTrend()`)
- **Giving tab**: Recharts `PieChart` + `BarChart` with local mock data (Tithes, Offering, Building Fund, Other)
- **Growth tab**: Recharts `BarChart` (monthly new signups from `useMemberGrowth()`)
- Chart colors: `CHART_COLORS = ['#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD']`

### Step B2: Add New Member Page (`/members/new`)
- **File**: `apps/web/src/app/(dashboard)/members/new/page.tsx`
- Route guard: admin/pastor only
- Purple gradient header with back link to `/members`
- 5-section form (Card per section):
  1. **Personal Info**: firstName*, lastName*, middleName, email*, phone, gender (select), dateOfBirth (DateSelect)
  2. **Address**: address, city, postalCode
  3. **Emergency Contact**: emergencyContactName, emergencyContactPhone
  4. **Church Info**: homeBranchId* (select from `useBranches()`), systemRole (select: member/pastor/admin)
  5. **Photo**: placeholder div (upload not functional yet)
- Submit calls `useCreateMember()` → on success shows card with generated password
- React Hook Form with required field validation
- Back link in header to `/members`

### Step B3: App Settings Page (`/profile/settings`)
- **File**: `apps/web/src/app/(dashboard)/profile/settings/page.tsx`
- Purple gradient header "App Settings"
- **Notification Preferences** section: 3 toggles (Push Notifications, Email Notifications, SMS Notifications) — localStorage-backed
- **Data Management** section: "Clear Cache" button (clears localStorage except auth keys), "Export Data" button (placeholder/disabled)
- **Storage** section: visual progress bar showing localStorage usage
- **Preferences** section: Language (disabled select), Theme (disabled select)
- **Log Out** button at bottom (calls `useAuthStore().logout()`, redirects to `/login`)

---

## Phase C — Polish (parallel with Phase B)

### Step C1: Email Verification OTP UI
- **File**: `apps/web/src/app/(auth)/verify-email/page.tsx`
- Replace single Verify button with 6-box OTP input
- Each box: controlled `<input maxLength={1}>` with auto-focus chain on input
- Auto-fill: split the `memberId` token from URL into first 6 chars and pre-fill boxes
- 60-second countdown timer with "Resend" button (calls `useVerifyEmail()` again after timer)
- Submit auto-triggers when all 6 boxes filled
- Keep existing API call: `api.auth.verifyEmail({ token: joinedChars })`
- Preserve existing success state UI (green header with checkmark)

### Step C2: Fellowship Attendance Tab
- **File**: `apps/web/src/app/(dashboard)/fellowships/[id]/page.tsx`
- Add `'attendance'` to tab union type: `'details' | 'members' | 'meetings' | 'attendance'`
- Add tab button to tabs array
- **Attendance tab content**:
  - 3 stat cards (total meetings, avg attendance rate, total members present) — computed from meetings + attendance data
  - Recharts `LineChart` showing attendance trend across meetings
  - Meeting list with progress bars (present/total as percentage)
  - Uses existing `useFellowshipMeetings()` hook data

---

## Files to Create
- `apps/web/src/hooks/use-reports.ts`
- `apps/web/src/app/(dashboard)/reports/page.tsx`
- `apps/web/src/app/(dashboard)/members/new/page.tsx`
- `apps/web/src/app/(dashboard)/profile/settings/page.tsx`

## Files to Modify
- `apps/web/src/hooks/use-members.ts` — add `useCreateMember()`
- `apps/web/src/app/(auth)/verify-email/page.tsx` — OTP UI overhaul
- `apps/web/src/app/(dashboard)/fellowships/[id]/page.tsx` — add attendance tab

## Reference Files (patterns)
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` — StatCard component, CHART_COLORS, Recharts, purple header
- `apps/web/src/hooks/use-dashboard.ts` — useQuery hook pattern
- `apps/web/src/app/(dashboard)/profile/page.tsx` — form Card sections, purple header with avatar
- `apps/web/src/components/date-select.tsx` — DateSelect component for DOB field
- `packages/api-client/src/api.ts` — all available API methods
- `packages/types/src/api.ts` — CreateMemberRequest, CreateMemberResponse, report types

---

## Verification
1. Reports page renders at `/reports` for admin/pastor; member role gets redirected
2. All 3 report tabs render charts without errors (Attendance uses API data, Giving uses mock, Growth uses API data)
3. Add Member form at `/members/new` submits successfully, shows generated password on success
4. Form validation: required fields (firstName, lastName, email, homeBranchId) reject empty submission
5. App Settings toggles persist across page refresh (localStorage)
6. Verify-email page shows 6 OTP boxes, auto-fills from URL token
7. Fellowship detail page shows 4th "Attendance" tab with chart and rate cards
8. All new pages use purple gradient headers, not navy
9. TypeScript builds with 0 errors (`npx turbo build --filter=@kairos/web`)
