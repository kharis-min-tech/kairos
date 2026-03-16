# Plan: Kairos Frontend Complete Rebuild

Full frontend rebuild using purple design spec colors, Figma layouts as visual reference, and modern React stack (TanStack Query + Zustand + Shadcn/ui). Preserves auth, WebSocket, API client, and infrastructure code.

---

## Recommendations

### State Management: TanStack Query + Zustand
- **TanStack Query** for all server state — replaces the current `useEffect` + `useState` pattern scattered across pages with proper caching, refetching, pagination, and optimistic updates
- **Zustand** for client-only UI state — sidebar collapse, active branch filter, theme preference, form drafts. No Redux boilerplate
- **Keep React Context** only for auth and WebSocket notifications (already solid)

### Shadcn/ui: Yes, with customization
- Install as foundation for ~25 components (Button, Input, Select, Dialog, Sheet, Tabs, Table, Card, Badge, etc.)
- Customize theme to the purple palette — NOT the Figma red/coral
- Build Kairos-specific composite components on top (stat cards, dark gradient headers, bottom navigation, chart wrappers) that match Figma's visual patterns

---

## Phase 0: Foundation & Design System

1. **Install dependencies** — `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `zustand`, `recharts`, `sonner`, `date-fns`, `class-variance-authority`, `clsx`, `tailwind-merge`, `qrcode.react`
2. **Initialize Shadcn/ui** — `npx shadcn@latest init` in apps/web + install ~25 base components (button, input, card, dialog, sheet, tabs, table, select, badge, etc.)
3. **Rewrite design tokens** in `apps/web/src/app/globals.css` — full purple palette from the spec (Purple 100-900, Blue, Gold, Burgundy, neutrals, shadows, radii)
4. **Create utility files** — `lib/utils.ts` (cn helper), `lib/query-client.ts` (TanStack Query defaults), `lib/stores/ui-store.ts` (Zustand)
5. **Update providers** — Add `QueryClientProvider` wrapping existing auth/notification providers in `apps/web/src/app/providers.tsx`
6. **Create API hooks layer** — 12 files in `hooks/` wrapping every API client method with `useQuery`/`useMutation` (members, branches, departments, fellowships, attendance, outreach, souls, donations, forms, notifications, dashboard, reports)

### Step 0.1 — Install new dependencies

Add to `apps/web/package.json`:
- `@tanstack/react-query` — server state management
- `react-hook-form` + `zod` + `@hookform/resolvers` — form handling with validation
- `zustand` — client UI state
- `recharts` — charts (bar, line, donut/pie for analytics)
- `sonner` — toast notifications (Shadcn-compatible)
- `date-fns` — date formatting/manipulation
- `@radix-ui/react-*` — peer deps for Shadcn components
- `class-variance-authority` + `clsx` + `tailwind-merge` — Shadcn utility deps
- `qrcode.react` — QR code generation for check-in placeholder

### Step 0.2 — Initialize Shadcn/ui

Run `npx shadcn@latest init` in `apps/web/` with:
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind config: postcss (already configured)

Then install base components: `button`, `input`, `label`, `card`, `badge`, `dialog`, `sheet`, `tabs`, `table`, `select`, `checkbox`, `radio-group`, `switch`, `separator`, `avatar`, `progress`, `dropdown-menu`, `toast` (sonner), `calendar`, `popover`, `command`, `tooltip`, `textarea`, `form`, `scroll-area`, `skeleton`

### Step 0.3 — Design system tokens

Rewrite `apps/web/src/app/globals.css` with the full purple-based color system from the design spec. Define all CSS custom properties:
- Primary purple scale (100-900)
- Secondary blue scale
- Accent gold scale
- Alert burgundy scale
- Neutral gray scale
- Semantic colors (success, warning, error, info)
- Sidebar dark-theme tokens
- Shadow, radius, spacing tokens

**Primary Colors:**
```
Purple (Primary):
- Purple 900: #4C1D95 (Dark - headers, emphasis)
- Purple 700: #6D28D9 (Main - primary actions)
- Purple 500: #8B5CF6 (Light - hover states)
- Purple 100: #EDE9FE (Very light - backgrounds)

Blue (Secondary):
- Blue 900: #1E3A8A (Dark - links, info)
- Blue 700: #1D4ED8 (Main - secondary actions)
- Blue 500: #3B82F6 (Light - hover states)
- Blue 100: #DBEAFE (Very light - backgrounds)

Gold (Accent):
- Gold 900: #78350F (Dark - highlights)
- Gold 600: #D97706 (Main - success, achievements)
- Gold 400: #FBBF24 (Light - warnings)
- Gold 100: #FEF3C7 (Very light - backgrounds)

Burgundy (Alert):
- Burgundy 900: #7F1D1D (Dark - critical errors)
- Burgundy 700: #B91C1C (Main - errors, alerts)
- Burgundy 500: #EF4444 (Light - warnings)
- Burgundy 100: #FEE2E2 (Very light - backgrounds)
```

**Neutral Colors:**
```
Gray Scale:
- Gray 900: #111827 (Text - primary)
- Gray 700: #374151 (Text - secondary)
- Gray 500: #6B7280 (Text - tertiary)
- Gray 300: #D1D5DB (Borders)
- Gray 100: #F3F4F6 (Backgrounds)
- Gray 50: #F9FAFB (Page backgrounds)
- White: #FFFFFF (Cards, modals)
```

### Step 0.4 — Utility setup files

- Create `apps/web/src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge), standard for Shadcn
- Create `apps/web/src/lib/query-client.ts` — TanStack Query client configuration with defaults (staleTime, gcTime, retry)
- Create `apps/web/src/lib/stores/` — Zustand stores directory
  - `ui-store.ts` — sidebar state, theme, active branch filter
- Update `apps/web/src/app/providers.tsx` — Add `QueryClientProvider` wrapping existing providers

### Step 0.5 — API hooks layer

Create `apps/web/src/hooks/` with TanStack Query wrappers:
- `use-members.ts` — `useMembers()`, `useMember(id)`, `useCreateMember()`, `useUpdateMember()`, `useApproveMember()`, `useImportMembers()`, `useExportMembers()`
- `use-branches.ts` — `useBranches()`, `useBranch(id)`, `useCreateBranch()`, `useUpdateBranch()`
- `use-departments.ts` — `useDepartments()`, `useAssignMember()`, `useApproveRequest()`
- `use-fellowships.ts` — `useFellowships()`, `useFellowship(id)`, `useAddMember()`, `useSendMessage()`
- `use-attendance.ts` — `useServiceAttendance()`, `useFellowshipAttendance()`, `useRecordService()`, `useRecordFellowship()`, `useAttendanceTrends()`, `useMissingMembers()`
- `use-outreach.ts` — `usePrograms()`, `useProgram(id)`, `useCreateProgram()`, `useRegisterWorker()`, `useCompleteProgram()`
- `use-souls.ts` — `useSouls()`, `useSoul(id)`, `useCreateSoul()`, `useAddFollowup()`, `useUpdateStatus()`, `useConversionFunnel()`, `useFollowUpTracker()`
- `use-donations.ts` — `useDonations()`, `useCreateOnline()`, `useCreateManual()`, `useDonationReports()`, `useMemberSummary()`, `useExportDonations()`
- `use-forms.ts` — `useForms()`, `useForm(id)`, `useCreateForm()`, `useSubmitForm()`, `useFormSubmissions()`, `useFormTemplates()`
- `use-notifications.ts` — `useNotificationsList()`, `useMarkRead()`, `useBroadcast()`
- `use-dashboard.ts` — `useAdminDashboard()`, `usePastorDashboard()`, `useLeaderDashboard()`
- `use-reports.ts` — `useAttendanceReport()`, `useDonationReport()`, `useSoulReport()`

---

## Phase 1: Layout Shell & Navigation (*depends on Phase 0*)

### Step 1.1 — Responsive app shell

Rebuild `apps/web/src/components/layout/app-shell.tsx`:
- **Desktop (≥768px):** Collapsible sidebar (240px/64px) + top bar (64px) — similar to current but using Shadcn components
- **Mobile (<768px):** Bottom tab navigation bar (fixed, 5 tabs) + simplified top bar (no sidebar) — matches Figma's mobile-first design
- Bottom nav tabs (mobile, context-dependent): Dashboard, Members, Attendance, More (expandable)
- Sidebar collapse state persisted via Zustand → localStorage

### Step 1.2 — Sidebar rebuild

Rebuild `apps/web/src/components/layout/sidebar.tsx`:
- Preserve existing nav structure (Dashboard, Members, Branches, Departments, Fellowships, Attendance, Outreach, Donations, Forms, Reports)
- Add Settings nav item (Admin/Pastor only)
- Add Notifications nav item
- Use Shadcn Tooltip for collapsed labels
- Role-based visibility (pending members see only Dashboard + Members)
- Active state: Purple 700 background, white text
- Pending member badge count (preserve existing API call)

### Step 1.3 — Top bar rebuild

Rebuild `apps/web/src/components/layout/topbar.tsx`:
- Logo + wordmark (left)
- Branch selector dropdown — Shadcn Select (Admins/Pastors only)
- Global search — Shadcn Command palette
- Notification bell with unread count badge
- User avatar dropdown menu — Shadcn DropdownMenu (Profile, Settings, Sign Out)

### Step 1.4 — Bottom navigation (NEW)

Create `apps/web/src/components/layout/bottom-nav.tsx`:
- Fixed bottom bar, visible only on mobile
- 4-5 icon tabs with labels
- Active tab highlighted with primary color
- Context-dependent tabs based on current module
- Default tabs: Home, Members, Give, More

### Step 1.5 — Mobile nav sheet

Replace `apps/web/src/components/layout/mobile-nav.tsx`:
- Use Shadcn Sheet (slide from left) instead of custom drawer
- Inherits all sidebar navigation items
- Close on navigation

Relevant files to modify/create:
- `apps/web/src/components/layout/app-shell.tsx` — rebuild
- `apps/web/src/components/layout/sidebar.tsx` — rebuild
- `apps/web/src/components/layout/topbar.tsx` — rebuild
- `apps/web/src/components/layout/bottom-nav.tsx` — NEW
- `apps/web/src/components/layout/mobile-nav.tsx` — rebuild
- `apps/web/src/components/layout/index.ts` — update exports

---

## Phase 2: Auth Pages (*parallel with Phase 1 after Phase 0 done*)

### Step 2.1 — Login page

Rebuild `apps/web/src/app/(auth)/login/page.tsx`:
- Figma ref: 3:19869 (Login/Sign In)
- "Welcome Back" heading, email/password inputs with icons
- Password visibility toggle
- "Remember me" checkbox + "Forgot Password?" link
- "Login As" role selector (Member/Pastor/Admin cards with colored borders) — UI only, role extracted from JWT
- "Sign In" purple CTA
- Google + Apple social login buttons — **disabled with "Coming Soon" tooltip**
- "Don't have an account? Sign Up" link
- Terms & Privacy links
- Use react-hook-form + zod for validation
- Preserve existing `signIn()` from auth-context

### Step 2.2 — Registration page

Rebuild `apps/web/src/app/(auth)/register/page.tsx`:
- Figma ref: 3:5934 (Sign Up)
- Multi-step form (Step 1 of 3): Personal info → Branch selection → Verification
- Form fields: First Name, Last Name, Email, Phone, Password, Date of Birth, Gender, Branch
- Password strength indicator
- Use react-hook-form with step validation
- Preserve existing Cognito signUp flow

### Step 2.3 — Verification/OTP page

Rebuild or create `apps/web/src/app/(auth)/verify/page.tsx`:
- Figma ref: 3:6817 (Verification)
- 6-digit OTP input (individual boxes)
- Countdown timer for resend
- Resend code action
- Auto-submit on complete

### Step 2.4 — Forgot/Reset password pages

Rebuild `apps/web/src/app/(auth)/forgot-password/page.tsx`:
- Figma refs: 3:10415 (Forgot) + 3:7626 (Reset)
- Split into two states: Email entry → New password entry
- Password requirements checklist with real-time validation
- Preserve existing Cognito forgotPassword + confirmPassword flows

### Step 2.5 — Welcome/Onboarding page

Create `apps/web/src/app/(auth)/welcome/page.tsx`:
- Figma ref: 3:5921 (Welcome)
- Gradient background, church illustration/icon
- "Get Started" CTA → navigates to Register

Relevant files:
- `apps/web/src/app/(auth)/login/page.tsx` — rebuild
- `apps/web/src/app/(auth)/register/page.tsx` — rebuild
- `apps/web/src/app/(auth)/verify/page.tsx` — new or rebuild
- `apps/web/src/app/(auth)/forgot-password/page.tsx` — rebuild
- `apps/web/src/app/(auth)/welcome/page.tsx` — new
- `apps/web/src/app/(auth)/layout.tsx` — rebuild (centered card layout for auth pages)

---

## Phase 3: Dashboard (*depends on Phase 1*)

### Step 3.1 — Admin/Pastor dashboard

Rebuild `apps/web/src/app/(dashboard)/dashboard/page.tsx`:
- Figma refs: 3:6156 (Admin Dashboard), 3:9224 (Member Dashboard)
- Role-based rendering using `useAuth().user.role`
- **Admin view:** Branch header, stat cards (Members, Branches, Donations, Souls), weekly attendance chart (recharts BarChart), Quick Actions grid, Recent Activities feed
- **Pastor view:** Branch-specific stats, attendance trends, overdue followups
- **Leader view:** Group member count, recent attendance, members needing followup
- **Member view:** Welcome greeting, attendance %, department cards, Quick Actions
- Use `useAdminDashboard()`, `usePastorDashboard()`, `useLeaderDashboard()` hooks
- Stat cards as reusable component: `apps/web/src/components/shared/stat-card.tsx`
- Dark gradient header for mobile view

### Step 3.2 — Dashboard common components

Create reusable components in `apps/web/src/components/shared/`:
- `stat-card.tsx` — Stat display with icon, value, label, trend (up/down %)
- `dark-header.tsx` — Dark gradient section header (reused across many pages in Figma)
- `quick-actions.tsx` — Grid of action buttons with icons
- `activity-feed.tsx` — Chronological activity list
- `chart-wrapper.tsx` — Recharts wrapper components (BarChart, LineChart, DonutChart)
- `empty-state.tsx` — Empty state with icon and message
- `loading-skeleton.tsx` — Skeleton loading states using Shadcn Skeleton
- `page-header.tsx` — Page title + action buttons pattern
- `filter-tabs.tsx` — Horizontal scrollable filter tabs (reused everywhere in Figma)
- `search-bar.tsx` — Search input with icon

---

## Phase 4: Members Module (*depends on Phase 1*)

### Step 4.1 — Members directory

Rebuild `apps/web/src/app/(dashboard)/members/page.tsx`:
- Figma ref: 3:9280 (Members Directory)
- Stats bar at top (Total, Active, Pending counts)
- Search with filter tabs (All/Active/Inactive/Pending)
- Alphabetical sections (A, B, C...)
- Member cards with avatar, name, role badge, contact info
- FAB for "Add Member"
- "Load More" pagination
- Use `useMembers()` hook with filter/search params
- Actions: View, Edit, Export, Import

### Step 4.2 — Add new member form

Rebuild `apps/web/src/app/(dashboard)/members/new/page.tsx`:
- Figma ref: 3:8039 (Add New Member)
- Photo upload area
- 5 form sections: Personal, Contact, Church, Emergency, Additional
- react-hook-form + zod validation
- Use `useCreateMember()` mutation

### Step 4.3 — Member detail/profile

Rebuild `apps/web/src/app/(dashboard)/members/view/page.tsx`:
- Figma ref: 3:12143 (Member Detail)
- Profile header with photo, name, role, status
- Contact action buttons (Call, Email, Message)
- Tabs: Overview, Attendance, Giving, Ministry
- Attendance summary chart
- Financial summary
- Department/Fellowship memberships
- Uses `useMember(id)` hook

### Step 4.4 — Member status modal

Create `apps/web/src/components/members/status-modal.tsx`:
- Figma ref: 3:12074 (Member Status)
- Bottom sheet / Dialog for status changes
- Activate/Deactivate with reason
- Use Shadcn Dialog/Sheet

### Step 4.5 — Member approvals page

Rebuild `apps/web/src/app/(dashboard)/members/approvals/page.tsx`:
- List of pending members with Approve/Reject actions
- Use `useMembers({ status: 'pending' })` + `useApproveMember()` mutation

### Step 4.6 — Member import page

Rebuild `apps/web/src/app/(dashboard)/members/import/page.tsx`:
- CSV upload with drag-and-drop
- Field mapping preview
- Import progress and error summary
- Use `useImportMembers()` mutation

---

## Phase 5: Attendance Module (*depends on Phase 1*)

### Step 5.1 — Attendance tracker

Rebuild `apps/web/src/app/(dashboard)/attendance/page.tsx`:
- Figma ref: 3:10064 (Attendance Tracker)
- Department/date selector at top
- Member list with check/X buttons per row
- Bulk actions (Mark All Present)
- Use `useRecordService()` mutation

### Step 5.2 — Fellowship attendance

Rebuild `apps/web/src/app/(dashboard)/attendance/fellowship/page.tsx`:
- Record fellowship meeting attendance
- Present/Absent/Excused/Late status options
- Use `useRecordFellowship()` mutation

### Step 5.3 — Attendance reports

Rebuild `apps/web/src/app/(dashboard)/attendance/reports/page.tsx`:
- Figma ref: 3:15148 (Event Attendance Report)
- Stats cards, branch/department/age breakdown
- Charts (bar, donut)
- Key Insights section
- Missing members alerts
- Use `useAttendanceTrends()`, `useMissingMembers()` hooks

---

## Phase 6: Organization Modules (*depends on Phase 1*)

### Step 6.1 — Branches

Rebuild `apps/web/src/app/(dashboard)/branches/page.tsx`:
- Branch list with status badges
- Branch detail cards
- Admin-only: Create/Edit branch forms
- Use `useBranches()` hook

### Step 6.2 — Branch settings (NEW)

Create `apps/web/src/app/(dashboard)/branches/[id]/settings/page.tsx`:
- Figma ref: 3:15617 (Branch Settings)
- Branch form: name, location, leadership, service schedule, capacity

### Step 6.3 — Departments list

Rebuild `apps/web/src/app/(dashboard)/departments/page.tsx`:
- Figma ref: 3:8464 (Departments List)
- Branch tabs, category filters
- Department cards with member count, lead info

### Step 6.4 — Department detail (NEW)

Create `apps/web/src/app/(dashboard)/departments/[id]/page.tsx`:
- Figma ref: 3:5322 (Department Detail)
- Department header with icon, member count, stats
- Leader card
- Tabs: Members, Attendance, Messages
- Member list with attendance %
- Use `useDepartments()` + related hooks

### Step 6.5 — Join department form (NEW)

Create `apps/web/src/app/(dashboard)/departments/join/page.tsx`:
- Figma ref: 3:11554 (Join Department)
- "Get Involved" form with availability, motivation

### Step 6.6 — Fellowships/K-Groups list

Rebuild `apps/web/src/app/(dashboard)/fellowships/page.tsx`:
- Figma ref: 3:11697 (K-Groups List)
- Stats, filter + pastor dropdowns
- Fellowship cards with meeting schedules

### Step 6.7 — Fellowship detail (NEW)

Create `apps/web/src/app/(dashboard)/fellowships/[id]/page.tsx`:
- Figma ref: 3:10875 (K-Group Detail)
- Meeting schedule, member list
- Tabs view

### Step 6.8 — Fellowship attendance (NEW)

Create `apps/web/src/app/(dashboard)/fellowships/[id]/attendance/page.tsx`:
- Figma ref: 3:11061 (K-Group Attendance)
- Trend chart, meeting progress bars

---

## Phase 7: Evangelism & Outreach (*depends on Phase 1*)

### Step 7.1 — Outreach programs list

Rebuild `apps/web/src/app/(dashboard)/evangelism/outreach/page.tsx`:
- Figma ref: 3:5386 (Outreach Programs)
- Dark header with stats
- Program cards with status
- Use `usePrograms()` hook

### Step 7.2 — Create outreach form

Create/rebuild `apps/web/src/app/(dashboard)/evangelism/outreach/new/page.tsx`:
- Figma ref: 3:8040 (Create Outreach)
- Program type icons, date/time pickers, budget field
- Use `useCreateProgram()` mutation

### Step 7.3 — Outreach detail

Rebuild `apps/web/src/app/(dashboard)/evangelism/outreach/detail/page.tsx`:
- Program detail with participants and soul records
- Use `useProgram(id)` hook

### Step 7.4 — Soul capture form

Rebuild `apps/web/src/app/(dashboard)/evangelism/souls/capture/page.tsx`:
- Figma ref: 3:6971 (Soul Capture)
- Contact method, interest level, prayer request
- Use `useCreateSoul()` mutation

### Step 7.5 — Souls list/tracker

Rebuild `apps/web/src/app/(dashboard)/evangelism/souls/page.tsx`:
- Soul records list/Kanban view
- Status filter tabs (New, Following Up, Interested, Converted)
- Use `useSouls()` hook

### Step 7.6 — Follow-up log

Rebuild `apps/web/src/app/(dashboard)/evangelism/followups/page.tsx`:
- Figma refs: 3:6157 (Follow-Up Log) + 3:7734 (Follow-Up Tracker)
- Stats, filter tabs
- Follow-up cards with priority badges, status labels
- "Update Status" action
- Use `useFollowUpTracker()` hook

---

## Phase 8: Donations & Giving (*depends on Phase 1*)

### Step 8.1 — Donations list

Rebuild `apps/web/src/app/(dashboard)/donations/page.tsx`:
- Donation records with purpose/status filters
- Use `useDonations()` hook

### Step 8.2 — Giving dashboard (NEW)

Create `apps/web/src/app/(dashboard)/donations/dashboard/page.tsx`:
- Figma ref: 3:15864 (Giving Dashboard)
- Total Giving with breakdown, Branch Breakdown
- Categories donut chart, Recent Large Gifts
- Use `useDonationReports()` hook

### Step 8.3 — Record payment

Rebuild `apps/web/src/app/(dashboard)/donations/record/page.tsx`:
- Figma ref: 3:14388 (Record Payment)
- Cash/Card/Transfer tabs
- Quick-select amounts
- Payer info, Generate Receipt toggle
- Use `useCreateManual()` mutation

### Step 8.4 — Checkout/Payment (NEW)

Create `apps/web/src/app/(dashboard)/donations/checkout/page.tsx`:
- Figma ref: 3:12789 (Checkout)
- Step 1 of 3, attendee form
- Payment method tabs (Credit/Debit/PayPal/Apple Pay)
- Card fields, Order Summary
- Use `useCreateOnline()` mutation

### Step 8.5 — Pledge tracker (NEW)

Create `apps/web/src/app/(dashboard)/donations/pledges/page.tsx`:
- Figma ref: 3:13333 (Pledge Tracker)
- Overall Progress bar, Monthly bar chart
- Active Pledges with progress bars
- Giving Insights section
- Note: May need backend API for pledges (placeholder if no endpoint)

### Step 8.6 — My giving (member view)

Create `apps/web/src/app/(dashboard)/donations/my-giving/page.tsx`:
- Figma ref: 3:17838 (My Giving)
- Total contributions YTD, Giving Trend line chart
- Breakdown (Tithe/Building Fund/Missions)
- Recent history with receipt links
- "Give Now" + "Tax Report" CTAs
- Use `useMemberSummary()` hook

### Step 8.7 — Donation reports

Rebuild `apps/web/src/app/(dashboard)/donations/reports/page.tsx`:
- Giving summaries by purpose/branch, top donors
- Use `useDonationReports()` hook

### Step 8.8 — Export giving reports (NEW)

Create `apps/web/src/app/(dashboard)/donations/export/page.tsx`:
- Figma ref: 3:18775 (Export Report - Giving)
- Report type selection, date range, format
- Privacy notice

---

## Phase 9: Events Module (NEW — from Figma, partially backed by attendance API)

### Step 9.1 — Events calendar (NEW)

Create `apps/web/src/app/(dashboard)/events/page.tsx`:
- Figma ref: 3:10517 (Events Calendar)
- Monthly/Weekly/List toggle views
- Calendar grid with event dots
- FAB for create event
- Note: Events map to services in the API

### Step 9.2 — Event detail (NEW)

Create `apps/web/src/app/(dashboard)/events/[id]/page.tsx`:
- Figma ref: 3:9948 (Event Detail)
- Hero image, venue map area, reports
- "I'm Going" CTA

### Step 9.3 — Event registration (NEW)

Create `apps/web/src/app/(dashboard)/events/[id]/register/page.tsx`:
- Figma ref: 3:19870 (Event Registration)
- Venue card, seats counter, registration form
- In Person/Online selector, guest stepper
- "Complete Registration" + "Save as Draft"

### Step 9.4 — Event check-in (NEW — placeholder)

Create `apps/web/src/app/(dashboard)/events/[id]/checkin/page.tsx`:
- Figma ref: 3:18413 (Event Check-In)
- QR Scan/Manual tabs
- Scanner viewfinder placeholder
- Check-In Successful modal
- Stats display
- **UI only — no backend endpoint**

---

## Phase 10: Forms Module (*depends on Phase 1*)

### Step 10.1 — Forms library

Rebuild `apps/web/src/app/(dashboard)/forms/page.tsx`:
- Figma ref: 3:12790 (Forms Library)
- Form cards with icons, time estimates, field counts
- Completion status indicators
- Use `useForms()` hook

### Step 10.2 — Form builder

Rebuild `apps/web/src/app/(dashboard)/forms/builder/page.tsx`:
- Form builder with drag-and-drop field types
- Preview mode
- Use `useCreateForm()` mutation

### Step 10.3 — Form view/submit

Rebuild `apps/web/src/app/(dashboard)/forms/view/page.tsx`:
- Figma ref: 3:16518 (Prayer Request Form)
- Multi-step form rendering (Step 1 of 3)
- Dynamic field rendering based on form definition
- Use `useSubmitForm()` mutation

### Step 10.4 — Form submissions

Rebuild `apps/web/src/app/(dashboard)/forms/submissions/page.tsx`:
- Figma ref: 3:18950 (Form Submissions)
- Category tabs with counts
- Stats bar
- Submission cards with status badges
- Use `useFormSubmissions()` hook

---

## Phase 11: Reports & Analytics (*depends on Phase 1*)

### Step 11.1 — Reports hub

Rebuild `apps/web/src/app/(dashboard)/reports/page.tsx`:
- Figma ref: 3:13807 (Reports/Analytics Dashboard)
- 4 stat cards
- Attendance/Giving/Growth tabs with charts
- Demographics section
- Use `useAttendanceReport()`, `useDonationReport()`, `useSoulReport()` hooks

### Step 11.2 — Department reports

Create `apps/web/src/app/(dashboard)/reports/departments/page.tsx`:
- Figma ref: 3:7161 (Department Reports)
- Attendance %, engagement donut chart

### Step 11.3 — Export reports (NEW)

Create `apps/web/src/app/(dashboard)/reports/export/page.tsx`:
- Figma ref: 3:18504 (Export Reports)
- Report type radio cards
- Date range with quick selects
- Format selection (PDF/Excel/CSV)
- Additional options checkboxes

---

## Phase 12: Settings & Admin (*depends on Phase 1*)

### Step 12.1 — Settings page

Rebuild `apps/web/src/app/(dashboard)/settings/page.tsx`:
- Figma ref: 3:14581 (Settings)
- Theme toggle (light/dark — Zustand + CSS)
- Notification preferences
- Data management
- Account section with Log Out

### Step 12.2 — Profile settings

Rebuild `apps/web/src/app/(dashboard)/profile/page.tsx`:
- Figma ref: 3:19338 (Profile Settings)
- Personal info with Edit
- Security (Change Password, 2FA toggle)
- Preferences (notification toggles)
- Danger Zone (Log Out, Delete Account)

### Step 12.3 — Branch settings

Covered in Phase 6, Step 6.2.

### Step 12.4 — Security dashboard (NEW)

Create `apps/web/src/app/(dashboard)/admin/security/page.tsx`:
- Figma ref: 3:16624 (Security Dashboard)
- Active Sessions, Failed Logins
- Login Activity chart
- Role Assignments overview
- **Admin-only access**

### Step 12.5 — User roles & permissions (NEW)

Create `apps/web/src/app/(dashboard)/admin/roles/page.tsx`:
- Figma ref: 3:17261 (User Roles & Permissions)
- All Users/Admins/Pastors/Members tabs
- Stats by role
- User list with role badges
- "Edit Roles" action

### Step 12.6 — Role assignment (NEW)

Create `apps/web/src/app/(dashboard)/admin/roles/assign/page.tsx`:
- Figma ref: 3:19416 (Role Assignment)
- Member search, role badge assignment
- Edit Role action

### Step 12.7 — Access logs (NEW)

Create `apps/web/src/app/(dashboard)/admin/access-logs/page.tsx`:
- Figma ref: 3:14884 (Access Logs)
- Activity log with user/action/resource/IP
- Color-coded action types

### Step 12.8 — Audit log (NEW)

Create `apps/web/src/app/(dashboard)/admin/audit-log/page.tsx`:
- Figma ref: 3:17721 (Audit Log)
- Total Logs/Today/Users stats
- Chronological entries with Record IDs
- Export + View Details actions

---

## Phase 13: Notifications & Messaging (*depends on Phase 1*)

### Step 13.1 — Notifications page

Create `apps/web/src/app/(dashboard)/notifications/page.tsx`:
- Figma ref: 3:17541 (Notifications)
- All/Events/Messages/Reminders tabs
- Grouped by Today/Yesterday/This Week
- Action buttons (Reply/Accept/Decline)
- Mark as read
- Use existing `useNotifications()` WebSocket hook + `useNotificationsList()` API hook

### Step 13.2 — Broadcast message modal

Create `apps/web/src/components/notifications/broadcast-modal.tsx`:
- Figma ref: 3:12491 (Broadcast Message)
- Send To selector, Message Type, Priority Level
- Shadcn Dialog
- Use `useBroadcast()` mutation

### Step 13.3 — Chat/Messaging page (UI only)

Create `apps/web/src/app/(dashboard)/chat/page.tsx`:
- Figma ref: 3:17115 (Chat/Messaging)
- Direct message conversation view
- Chat bubbles (white incoming, purple outgoing — adjusted from Figma red)
- Read receipts, embedded content cards
- Message input with emoji + attachment
- **Mock data only — no backend API**

---

## Phase 14: Cross-Cutting Concerns & Polish

### Step 14.1 — Error boundaries & 404

- Create `apps/web/src/app/not-found.tsx` — custom 404 page
- Create `apps/web/src/app/error.tsx` — global error boundary
- Create `apps/web/src/components/shared/error-boundary.tsx` — reusable error fallback

### Step 14.2 — Loading states

- Skeleton loading screens for each major page using Shadcn Skeleton
- Suspense boundaries in layout files

### Step 14.3 — Responsive audit

- Test every page at 375px (mobile), 768px (tablet), 1280px (desktop)
- Bottom nav visible only on mobile
- Sidebar visible only on desktop
- Sheet/bottom-sheet patterns for mobile modals

### Step 14.4 — Accessibility audit

- WCAG 2.1 AA compliance
- Keyboard navigation (tab order, focus rings)
- ARIA labels on interactive elements
- Screen reader-friendly content structure
- Color contrast ratio ≥ 4.5:1

### Step 14.5 — Tests

- Component tests with Vitest + @testing-library/react
- Focus on: auth flows, form validation, API hook behavior, role-based rendering
- Rebuild existing test files that reference changed components

---

## Key Files Inventory

### Preserve (DO NOT modify)
- `packages/api-client/` — entire package
- `packages/types/` — entire package
- `packages/utils/` — entire package
- `apps/web/src/lib/auth/auth-context.tsx` — solid auth implementation
- `apps/web/src/lib/auth/cognito.ts` — Cognito SDK wrapper
- `apps/web/src/lib/ws/ws-manager.ts` — WebSocket manager
- `apps/web/src/lib/ws/notification-context.tsx` — notification provider
- `apps/web/next.config.ts` — static export config
- `apps/web/tsconfig.json` — TypeScript config
- `apps/web/postcss.config.mjs` — PostCSS config

### Rebuild (modify existing files)
- `apps/web/src/app/globals.css` — new design tokens
- `apps/web/src/app/layout.tsx` — add QueryClientProvider
- `apps/web/src/app/providers.tsx` — add QueryClientProvider
- `apps/web/src/app/(auth)/login/page.tsx` — full rebuild
- `apps/web/src/app/(auth)/register/page.tsx` — full rebuild
- `apps/web/src/app/(auth)/forgot-password/page.tsx` — full rebuild
- `apps/web/src/app/(dashboard)/layout.tsx` — may need responsive changes
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` — full rebuild
- All route `page.tsx` files — full rebuilds
- All `components/layout/*.tsx` — full rebuilds

### Create New
- `apps/web/src/lib/utils.ts` — cn() helper
- `apps/web/src/lib/query-client.ts` — TanStack Query config
- `apps/web/src/lib/stores/ui-store.ts` — Zustand UI store
- `apps/web/src/hooks/*.ts` — 12 TanStack Query hook files
- `apps/web/src/components/layout/bottom-nav.tsx` — mobile bottom nav
- `apps/web/src/components/shared/*.tsx` — ~10 shared components
- `apps/web/src/components/members/status-modal.tsx`
- `apps/web/src/components/notifications/broadcast-modal.tsx`
- ~15 new route pages (events, admin, donations sub-pages, etc.)
- `apps/web/src/components/ui/*.tsx` — Shadcn components (auto-generated)

---

## Figma Screen Reference (all 54 frames, ~48 unique)

### Auth & Onboarding (6 screens)
1. Welcome/Onboarding (3:5921) - Gradient, church illustration, Get Started
2. Registration/Sign Up (3:5934) - Step 1 of 3, personal info form, branch selector
3. Verification/OTP (3:6817) - 6-digit code, countdown timer, resend
4. Forgot Password (3:10415) - Email input, Send Reset Link
5. Reset Password (3:7626) - Password requirements checklist, strength indicator
6. Login/Sign In (3:19869) - "Welcome Back", email/password, role selector (Member/Pastor/Admin), Google/Apple social login, Remember me, Forgot Password link

### Dashboard (2 screens)
7. Admin Dashboard (3:6156) - Branch header, weekly stats, attendance chart, Quick Actions, Recent Activities
8. Member Dashboard (3:9224) - Welcome greeting, attendance 87%, department cards, Quick Actions

### Members Module (4 screens)
9. Members Directory (3:9280) - Search, stats, filter tabs, alphabetical sections
10. Add New Member Form (3:8039) - Photo upload, 5 form sections
11. Member Detail Profile (3:12143) - Contact actions, attendance, financial summary, ministry
12. Member Status Modal (3:12074) - Bottom sheet, deactivation/reactivation

### Attendance Module (2 screens)
13. Attendance Tracker (3:10064) - Department, date selector, check/X buttons
14. Event Attendance Report (3:15148) - Stats, branch/department/age breakdown, charts, Key Insights

### Departments Module (3 screens)
15. Departments List (3:8464) - Branch tabs, category filters, department cards
16. Join Department Form (3:11554) - Get Involved, availability, motivation
17. Department Detail (3:5322) - Worship Ministry, 24 members, leader card, Members/Attendance/Messages tabs

### K-Groups/Fellowships Module (3 screens)
18. K-Groups List (3:11697) - Stats, filter+pastor dropdowns, fellowship cards
19. K-Group Detail (3:10875) - Meeting schedule, tabs
20. K-Group Attendance (3:11061) - Trend chart, meeting progress bars

### Outreach/Evangelism Module (3 screens)
21. Outreach Programs List (3:5386) - Dark header stats, program cards
22. Create Outreach Form (3:8040) - Program type icons, date/time, budget
23. Soul Capture Form (3:6971) - Contact method, interest level, prayer request

### Follow-Up Module (2 screens)
24. Follow-Up Log (3:6157) - Stats, filter tabs, follow-up cards
25. Follow Up Tracker (3:7734) - Priority badges, status labels, Update Status

### Events Module (3 screens)
26. Events Calendar (3:10517) - Monthly/Weekly/List toggle, calendar grid, FAB
27. Event Detail (3:9948) - Hero image, venue map, reports, "I'm Going" CTA
28. Event Registration (3:19870) - Venue card, seats counter, type selector, guest stepper

### Reports Module (3 screens)
29. Department Reports (3:7161) - Attendance 87.5%, charts, engagement donut
30. Reports/Analytics Dashboard (3:13807) - 4 stat cards, Attendance/Giving/Growth tabs, charts, Demographics
31. Export Reports (3:18504) - Report type radio cards, date range, format, options checkboxes

### Donations/Giving Module (6 screens)
32. Checkout/Payment (3:12789) - Step 1 of 3, attendee form, payment methods, card fields, Order Summary
33. Pledge Tracker (3:13333) - Overall Progress, Monthly bar chart, Active Pledges with progress bars
34. Record Payment (3:14388) - Cash/Card/Transfer tabs, quick amounts, Payer Info, Generate Receipt
35. Giving Dashboard (3:15864) - Total Giving $487,350, Branch Breakdown, Categories donut, Recent Large Gifts
36. My Giving (3:17838) - Total $12,450 YTD, Giving Trend, Breakdown, Recent History, "Give Now" + "Tax Report"
37. Export Report - Giving (3:18775) - Report types, CSV/PDF/Excel, Privacy Notice

### Forms Module (3 screens)
38. Forms Library (3:12790) - 8 form cards with icons, time estimates, field counts
39. Prayer Request Form (3:16518) - Step 1 of 3, Personal Info, Church Membership selector
40. Form Submissions (3:18950) - Tabs with counts, stats, submission cards with status badges

### Settings & Admin (7 screens)
41. Settings (3:14581) - Theme toggle, notifications, data management, preferences, Log Out
42. Access Logs (3:14884) - Activity log with user/action/resource/IP, color-coded actions
43. Branch Settings (3:15617) - Branch form, location, leadership, service schedule, capacity
44. Security Dashboard (3:16624) - Active Sessions, Failed Logins, Login Activity chart, Role Assignments
45. User Roles & Permissions (3:17261) - All Users/Admins/Pastors/Members tabs, stats, Edit Roles
46. Audit Log (3:17721) - 248 Total Logs, chronological entries, Export, View Details
47. Role Assignment (3:19416) - User list with role badges, Edit Role buttons
48. Profile Settings (3:19338) - Personal Info, Security, Preferences, Danger Zone

### Notifications & Messaging (2 screens)
49. Broadcast Message Modal (3:12491) - Send To, Message Type, Priority Level
50. Notifications (3:17541) - All/Events/Messages/Reminders tabs, grouped by time, action buttons

### Chat (1 screen)
51. Chat/Messaging (3:17115) - Direct message, chat bubbles, read receipts, embedded cards, input

### Event Check-In (1 screen)
52. Event Check-In (3:18413) - QR Scan/Manual tabs, scanner viewfinder, success modal, stats

### Duplicates (~6 screens)
53-54. Duplicates identified: 3:6894 (=Verification), 3:8581 (=Departments), 3:12640 (=Broadcast)

---

## Key Design Patterns (from Figma)

- **Dark gradient headers** — navy/charcoal for section headers on mobile
- **Purple primary CTAs** — adjusted from Figma's red/coral to match spec
- **Bottom navigation bar** — 4-5 tabs, context-dependent (mobile only)
- **Card-based layouts** — white backgrounds, rounded corners, subtle shadows
- **Stat cards/pills** — at top of list views with icon, value, label
- **Filter tabs** — horizontal scrollable for categorization
- **FAB** — floating action button for primary add actions
- **Multi-step forms** — progress indicators (Step 1 of 3)
- **Bottom sheet modals** — quick actions on mobile
- **Color-coded status badges** — green=active, red=overdue, yellow=pending, blue=in-progress
- **Charts** — bar, line, donut/pie for analytics (recharts)
- **"Load More" pagination** — instead of traditional page numbers
- **Role selector pattern** — card-based with colored borders

---

## Verification Checklist

1. `cd apps/web && npm run build` — zero errors (static export)
2. `npx tsc --noEmit` — zero TypeScript errors
3. `npm run lint` — clean
4. `npm run test` — all tests pass
5. Visual comparison: each page at 375px and 1280px vs Figma
6. Auth flow: Login → Dashboard → Sign Out works
7. API integration: pages load data with `NEXT_PUBLIC_AUTH_MOCK=true`
8. Navigation: all sidebar/bottom-nav links route correctly, active states work
9. Role-based access: Admin/Pastor/Member/Pending each see correct UI
10. Responsive breakpoints: bottom nav at <768px, sidebar at ≥768px

---

## Decisions

- **Color scheme:** Purple spec palette, NOT Figma red/coral
- **Chat messaging:** UI only with mock data
- **Event check-in QR:** UI placeholder only
- **Social login:** Buttons shown disabled with "Coming Soon"
- **Pledge tracker:** UI built against donation summary API; full pledge API deferred
- **Auth code preserved:** auth-context.tsx and cognito.ts remain untouched
- **WebSocket code preserved:** ws-manager.ts and notification-context.tsx remain untouched
- **Static export maintained:** `output: 'export'` stays — no server-side features
- **No new API endpoints:** Frontend-only rebuild, all existing endpoints reused
- **Shadcn/ui adopted:** With purple theme customization

## Execution Order & Parallelism

- Phase 0 must complete first (foundation)
- Phase 1 (Layout) and Phase 2 (Auth) can run **in parallel** after Phase 0
- Phases 3-13 all **depend on Phase 1** (need layout shell) but are **independent of each other** — can be built in any order
- Phase 14 (Polish) runs last after all modules complete
- Recommended build sequence after Phase 0+1+2: Dashboard (3) → Members (4) → Attendance (5) → Donations (8) → remaining modules
