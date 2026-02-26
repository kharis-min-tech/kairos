# Kairos Staging — Full Page-by-Page Audit Bug Report

**Date:** 2026-02-26
**Auditor:** Code review of all frontend pages, API client, API routes, auth system
**Staging URL:** https://staging.khar.is
**Method:** Static code analysis (browser automation timed out on staging CloudFront)

---

## Summary

| # | Severity | Bug | Affected Pages | File |
|---|----------|-----|----------------|------|
| 1 | **CRITICAL** | All Members treated as "pending" — sidebar nav locked | ALL pages for Member role | `app-shell.tsx:32` |
| 2 | **HIGH** | Dashboard root `/` shows static text, not role-based dashboard | Dashboard | `(dashboard)/page.tsx` |
| 3 | **HIGH** | Leader dashboard type mismatch — `membersNeedingFollowup` used as both number and array | Dashboard (Leader/Member) | `leader-dashboard.tsx:37,46` |
| 4 | **HIGH** | Pastor dashboard `overdueFollowups` type mismatch — number cast to array | Dashboard (Pastor) | `pastor-dashboard.tsx:45` |
| 5 | **MEDIUM** | Departments page shows raw IDs instead of names | Departments | `departments/page.tsx:55,59-60` |
| 6 | **MEDIUM** | Reports page links to potentially missing routes | Reports | `reports/page.tsx:8,37` |
| 7 | **MEDIUM** | Notification count hardcoded to 3 | All pages (TopBar) | `app-shell.tsx:36` |
| 8 | **LOW** | Donations page uses `<a>` instead of Next.js `<Link>` for internal navigation | Donations | `donations/page.tsx:101` |
| 9 | **LOW** | Members department filter shows `departmentId` number instead of name | Members | `members/page.tsx:212` |
| 10 | **LOW** | Attendance page requires `branchId` — Admin users may not have one | Attendance | `attendance/page.tsx:42-43` |
| 11 | **LOW** | Forms scope filter missing "All Scopes" reset option | Forms | `forms/page.tsx:111` |
| 12 | **INFO** | CORS on auth failures still unresolved (from prior RCA) | ALL pages | `api-stack.ts` |
| 13 | **INFO** | API client URL mismatches now FIXED | — | `api.ts` |

---

## Detailed Findings

### Bug 1: CRITICAL — All Members treated as "pending" (sidebar locked)

**File:** [`apps/web/src/components/layout/app-shell.tsx`](apps/web/src/components/layout/app-shell.tsx:32)

```tsx
const isPending = user?.role === 'Member'; // Line 32 — WRONG
```

**Problem:** This treats every user with role `Member` as a pending member, which disables all sidebar navigation except Dashboard and Members. The actual pending check should be based on the member's `isActive` status or approval state, not their role.

**Impact:** All Member-role users (e.g., `esther.williams@kairos.church`) cannot navigate to Branches, Departments, Fellowships, Attendance, Outreach, Donations, Forms, or Reports.

**Fix:** Check `user.isActive === false` or add an `isPending` / `status` field to the auth user object from Cognito custom attributes.

---

### Bug 2: HIGH — Dashboard root `/` shows static text

**File:** [`apps/web/src/app/(dashboard)/page.tsx`](apps/web/src/app/(dashboard)/page.tsx:1)

**Problem:** The root dashboard page at `/` renders only:
```
Welcome to Kairos Church Administration.
```
The actual role-based dashboard (with stats, charts, activity) is at `/dashboard` in [`(dashboard)/dashboard/page.tsx`](apps/web/src/app/(dashboard)/dashboard/page.tsx:1).

**Impact:** Users who navigate to `/` after login see a blank-looking page. The login page redirects to `/dashboard` (correct), but if a user manually goes to `/` they get the static page.

**Fix:** Either redirect `/` to `/dashboard`, or move the role-based dashboard content to the root page.

---

### Bug 3: HIGH — Leader dashboard `membersNeedingFollowup` type mismatch

**File:** [`apps/web/src/components/dashboard/leader-dashboard.tsx`](apps/web/src/components/dashboard/leader-dashboard.tsx:37)

```tsx
const followUps: FollowUpMember[] = (data.membersNeedingFollowup as unknown as FollowUpMember[]) ?? [];
```

**Problem:** The API (`reports-get-leader-dashboard.ts`) returns `membersNeedingFollowup` as a **number** (count), but the component casts it to an array of `FollowUpMember` objects. This will produce `NaN` or crash when iterating.

Line 46 tries to handle both cases:
```tsx
value={typeof data.membersNeedingFollowup === 'number' ? data.membersNeedingFollowup : followUps.length}
```
But the "Members Needing Follow-up" card section (lines 98-113) iterates `followUps` as an array, which will be empty or broken.

**Impact:** Leader and Member dashboards show "All members are up to date" even when there are overdue follow-ups, because the number can't be iterated as an array.

---

### Bug 4: HIGH — Pastor dashboard `overdueFollowups` type mismatch

**File:** [`apps/web/src/components/dashboard/pastor-dashboard.tsx`](apps/web/src/components/dashboard/pastor-dashboard.tsx:45)

```tsx
const overdueFollowUps: OverdueFollowUp[] = (data.overdueFollowups as unknown as OverdueFollowUp[]) ?? [];
```

**Problem:** The `PastorDashboard` TypeScript interface defines `overdueFollowups: number`, but the component casts it to `OverdueFollowUp[]`. Same issue as Bug 3.

**Impact:** Pastor dashboard "Overdue Follow-ups" section always shows empty list.

---

### Bug 5: MEDIUM — Departments page shows raw IDs

**File:** [`apps/web/src/app/(dashboard)/departments/page.tsx`](apps/web/src/app/(dashboard)/departments/page.tsx:55)

```tsx
<h2>Department #{dept.departmentId}</h2>
<p>Branch: {dept.branchId}</p>
<p>Lead: Member #{dept.leadMemberId}</p>
```

**Problem:** Shows numeric IDs instead of human-readable names. The `BranchDepartment` type doesn't include department name, branch name, or member name — only foreign key IDs.

**Impact:** Users see "Department #5", "Branch: 20", "Lead: Member #42" which is meaningless.

**Fix:** Either join names in the API response, or fetch departments/branches/members and resolve names client-side.

---

### Bug 6: MEDIUM — Reports page links to potentially missing routes

**File:** [`apps/web/src/app/(dashboard)/reports/page.tsx`](apps/web/src/app/(dashboard)/reports/page.tsx:8)

Links to:
- `/dashboard` ✅ exists
- `/attendance/reports` ✅ exists
- `/donations/reports` ✅ exists
- `/members` ✅ exists
- `/evangelism/souls` ✅ exists

After checking the file tree, all links resolve. **Downgraded to LOW** — but `/evangelism/souls` is not directly accessible from the sidebar (sidebar links to `/outreach`, which then links to `/evangelism/outreach` and `/evangelism/souls`). This is a navigation discoverability issue.

---

### Bug 7: MEDIUM — Notification count hardcoded

**File:** [`apps/web/src/components/layout/app-shell.tsx`](apps/web/src/components/layout/app-shell.tsx:36)

```tsx
<TopBar onMenuToggle={toggleMobileNav} notificationCount={3} />
```

**Problem:** Notification badge always shows "3" regardless of actual unread count. The API has a `/v1/notifications/unread-count` endpoint that should be called.

---

### Bug 8: LOW — Donations uses `<a>` instead of `<Link>`

**File:** [`apps/web/src/app/(dashboard)/donations/page.tsx`](apps/web/src/app/(dashboard)/donations/page.tsx:101)

```tsx
<a href="/donations/record">
```

Should use Next.js `<Link>` for client-side navigation (avoids full page reload).

---

### Bug 9: LOW — Members department filter shows IDs

**File:** [`apps/web/src/app/(dashboard)/members/page.tsx`](apps/web/src/app/(dashboard)/members/page.tsx:212)

```tsx
options={departmentList.map((d) => ({ value: String(d.branchDepartmentId), label: String(d.departmentId) }))}
```

The label shows `departmentId` (a number) instead of a department name. Users see dropdown options like "1", "2", "3".

---

### Bug 10: LOW — Attendance page requires branchId

**File:** [`apps/web/src/app/(dashboard)/attendance/page.tsx`](apps/web/src/app/(dashboard)/attendance/page.tsx:42)

```tsx
const branchId = user?.branchId ? Number(user.branchId) : undefined;
```

Admin users may not have a `branchId` set. If `branchId` is undefined, `loadMembers()` returns early and the page shows "No members found for this branch" with no way to select a branch.

---

### Bug 11: LOW — Forms scope filter missing reset option

**File:** [`apps/web/src/app/(dashboard)/forms/page.tsx`](apps/web/src/app/(dashboard)/forms/page.tsx:111)

The scope filter `SelectInput` has options for "Church-wide" and "Branch-specific" but no "All Scopes" option to reset the filter. Once a scope is selected, the user cannot go back to seeing all forms without refreshing.

---

## Previously Identified (from staging-bugs-rca.md)

### ✅ FIXED: API Client URL Mismatches (Bug 1 from prior RCA)
All API client paths in [`packages/api-client/src/api.ts`](packages/api-client/src/api.ts:1) now match the API Gateway routes in [`infrastructure/src/stacks/api-stack.ts`](infrastructure/src/stacks/api-stack.ts:215). Verified all 50+ endpoints.

### ⚠️ STILL OPEN: CORS on Auth Failures (Bug 2 from prior RCA)
API Gateway HTTP API still doesn't return CORS headers on authorizer denial (401/403).

---

## Role-by-Role Impact Matrix

| Page | Admin | Pastor | Leader | Member |
|------|-------|--------|--------|--------|
| Login | ✅ | ✅ | ✅ | ✅ |
| Dashboard (`/dashboard`) | ✅ AdminDashboard | ✅ PastorDashboard (Bug 4) | ⚠️ LeaderDashboard (Bug 3) | 🔴 Sidebar locked (Bug 1) + Bug 3 |
| Members | ✅ | ✅ (branch-scoped) | ✅ | 🔴 Sidebar locked (Bug 1) |
| Branches | ✅ | ✅ | ✅ | 🔴 Sidebar locked |
| Departments | ⚠️ Bug 5 (IDs) | ⚠️ Bug 5 | ⚠️ Bug 5 | 🔴 Sidebar locked |
| Fellowships | ✅ | ✅ | ✅ | 🔴 Sidebar locked |
| Attendance | ⚠️ Bug 10 (no branch) | ✅ | ✅ | 🔴 Sidebar locked |
| Outreach | ✅ | ✅ | ✅ | 🔴 Sidebar locked |
| Donations | ✅ | ✅ | ✅ | 🔴 Sidebar locked |
| Forms | ✅ (Bug 11) | ✅ (Bug 11) | ✅ (Bug 11) | 🔴 Sidebar locked |
| Reports | ✅ | ✅ | ✅ | 🔴 Sidebar locked |

---

## Recommended Fix Priority

1. **Bug 1** (CRITICAL) — Fix `isPendingMember` logic in `app-shell.tsx` — unblocks Member role entirely
2. **Bug 3 + 4** (HIGH) — Fix dashboard type mismatches — either change API to return arrays or change UI to handle numbers
3. **Bug 2** (HIGH) — Redirect `/` to `/dashboard`
4. **Bug 5 + 9** (MEDIUM) — Resolve department/branch names in API responses or client-side
5. **Bug 7** (MEDIUM) — Wire up real notification unread count
6. **Bugs 8, 10, 11** (LOW) — Minor UX fixes
