# Members Module Bugs — Bugfix Design

## Overview

Four bugs affect the members module and admin dashboard. Two are routing bugs in the topbar where bare `<a>` tags are used instead of Next.js `<Link>` components, causing full-page navigations that hit the dashboard layout's error boundary. One is a UI rendering bug where the `PhotoUpload` component displays a stale `photoUrl` prop after upload because the parent re-fetch is async. The most critical is a data contamination bug in `AppShell` where `members.list({ email: user.email, limit: 1 })` is called to check pending member status — this call's parameters bleed into the shared API client state, causing the members list page to subsequently fetch only the admin's own record instead of all members, which then breaks member detail navigation. A fourth bug causes a blank screen after multiple page refreshes due to a race condition between the auth loading state and the root redirect.

The fix strategy is targeted and minimal: (1) replace bare `<a>` tags with Next.js `<Link>` in the topbar, (2) pass the new `photoUrl` directly to the `PhotoUpload` component after upload instead of waiting for a re-fetch, (3) remove the `members.list` call from `AppShell` and replace it with a dedicated endpoint or derive pending status from the auth token, (4) guard the root redirect against the auth loading state.

## Glossary

- **Bug_Condition (C)**: The set of inputs or states that trigger any of the four bugs
- **Property (P)**: The desired correct behavior for each bug condition
- **Preservation**: Existing behaviors that must remain unchanged after the fix
- **AppShell**: The layout component at `apps/web/src/components/layout/app-shell.tsx` that wraps all dashboard pages and fetches member status
- **TopBar**: The header component at `apps/web/src/components/layout/topbar.tsx` containing the admin user dropdown with Profile and Settings links
- **PhotoUpload**: The component at `apps/web/src/app/(dashboard)/members/view/photo-upload.tsx` that handles profile image upload via S3 presigned URLs
- **members.list**: The API client method that calls `GET /v1/members` with optional filter parameters
- **Route group**: Next.js `(dashboard)` folder that applies a shared layout without affecting the URL path
- **ProtectedRoute**: The auth guard component at `apps/web/src/lib/auth/protected-route.tsx` that redirects unauthenticated users to `/login`

## Bug Details

### Fault Condition

The four bugs manifest under distinct but related conditions:

**Condition A — Bare `<a>` Tags in TopBar (Bugs 1 & 2):** The topbar uses `<a href="/profile">` and `<a href="/settings">` instead of Next.js `<Link>`. In a Next.js static export with a `(dashboard)` route group, bare `<a>` tags trigger a full-page navigation. The browser requests the path, Next.js serves the static export, but the route group layout's error boundary catches the mismatch and renders "Failed to load dashboard" instead of the target page.

**Condition B — Stale photoUrl Prop After Upload (Bug 3):** The `MemberDetailPage` passes `member.photoUrl` as a prop to `PhotoUpload`. After a successful upload, `PhotoUpload` calls `onUploaded()` which triggers `fetchMember()` — an async re-fetch. Until that async call completes and `setMember()` updates state, the `photoUrl` prop passed to `PhotoUpload` still holds the old value (or `undefined`). The component re-renders with the stale prop, so the new image is not shown until the fetch resolves.

**Condition C — Admin Email Contamination in AppShell (Bugs 4 & 5):** `AppShell` calls `members.list({ email: user.email, limit: 1 })` on mount to check whether the current user is a pending member. The `members.list` API client method constructs query parameters from its argument object. If the API client's `configureClient` or the underlying fetch utility caches or merges parameters across calls, the `email` and `limit: 1` parameters from the AppShell call contaminate subsequent `members.list` calls made by the members list page — resulting in `GET /v1/members?email={adminEmail}&limit=1` instead of the intended paginated fetch.

**Condition D — Auth Race Condition on Refresh (Bug 6):** On page refresh, `AuthProvider` initialises with `isLoading: true` and `isAuthenticated: false`. `ProtectedRoute` returns `null` (blank screen) while loading. If `getCurrentSession()` throws or returns `null` transiently (e.g., Cognito's `localStorage` is being read while the browser is still hydrating), `isLoading` is set to `false` with `isAuthenticated: false`, causing `ProtectedRoute` to redirect to `/login`. On subsequent refreshes this can leave the page blank momentarily or permanently if the redirect loop is not resolved.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { action: string, context: object }
  OUTPUT: boolean

  // Condition A: bare anchor tag navigation
  conditionA :=
    input.action IN ['clickProfile', 'clickSettings']
    AND input.context.navigationMethod === 'bareAnchor'
    AND input.context.nextjsStaticExport === true

  // Condition B: stale photo prop after upload
  conditionB :=
    input.action === 'photoUploadComplete'
    AND input.context.photoUrlProp === input.context.previousPhotoUrl
    AND input.context.uploadSucceeded === true

  // Condition C: email contamination
  conditionC :=
    input.action === 'fetchMembersList'
    AND input.context.requestParams.email === input.context.adminEmail
    AND input.context.requestParams.limit === 1
    AND input.context.callerComponent === 'MembersListPage'

  // Condition D: blank screen on refresh
  conditionD :=
    input.action === 'pageRefresh'
    AND input.context.authIsLoading === false
    AND input.context.isAuthenticated === false
    AND input.context.sessionActuallyValid === true

  RETURN conditionA OR conditionB OR conditionC OR conditionD
END FUNCTION
```

### Examples

- **Bug 1 (Profile routing):** Admin opens user dropdown → clicks "Profile" → browser navigates via `<a href="/profile">` → dashboard layout error boundary catches the navigation → displays "Failed to load dashboard". Expected: navigates to `/profile` page correctly.
- **Bug 2 (Settings routing):** Admin opens user dropdown → clicks "Settings" → same error. Expected: navigates to `/settings` page correctly.
- **Bug 3 (Photo re-render):** Admin uploads a new photo for a member → upload succeeds → `onUploaded()` fires → `fetchMember()` starts async → `PhotoUpload` re-renders with old `photoUrl` prop → old image (or placeholder) still shown. Expected: new image shown immediately after upload.
- **Bug 4 (Member detail navigation):** Admin uploads photo → navigates to members list → list shows only 1 row (admin's own record) → clicks that row → navigates to wrong member detail. Expected: members list shows all members, clicking a row navigates to the correct member.
- **Bug 5 (Email contamination):** After AppShell mounts and calls `members.list({ email: 'admin@kairos.church', limit: 1 })`, the members list page calls `members.list({ page: 1, limit: 50 })` but the actual HTTP request is `GET /v1/members?email=admin@kairos.church&limit=1`. Expected: `GET /v1/members?page=1&limit=50`.
- **Bug 6 (Blank screen):** User refreshes dashboard 3+ times → on one refresh `getCurrentSession()` returns `null` transiently → `isAuthenticated` becomes `false` → `ProtectedRoute` returns `null` → blank white screen. Expected: dashboard content displayed correctly on every refresh.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse clicks on all other navigation links (sidebar, breadcrumbs, member rows) must continue to work exactly as before
- The admin user dropdown must continue to display Profile, Settings, and Sign out options
- Profile and settings pages must continue to load correctly when navigated to directly via URL
- The `PhotoUpload` component's file picker, size validation, S3 upload flow, and error handling must remain unchanged
- The members list page's search, filter, pagination, and export functionality must remain unchanged
- The `AppShell`'s pending member banner and navigation restriction logic must continue to work correctly
- Dashboard content (AdminDashboard, PastorDashboard, LeaderDashboard) must continue to load on first visit and after a single refresh
- The `ProtectedRoute` redirect to `/login` for genuinely unauthenticated users must remain unchanged

**Scope:**
All inputs that do NOT involve: (a) clicking Profile/Settings in the admin dropdown, (b) completing a photo upload, (c) loading the members list page after AppShell has mounted, or (d) refreshing the dashboard page — should be completely unaffected by this fix.

## Hypothesized Root Cause

1. **Bare `<a>` tags instead of Next.js `<Link>` in TopBar**: `topbar.tsx` uses `<a href="/profile">` and `<a href="/settings">`. In a Next.js app with a `(dashboard)` route group, client-side navigation via `<Link>` correctly resolves routes within the group. Bare `<a>` tags cause a full browser navigation, which in a static export context can fail to match the route group layout, triggering the error boundary.

2. **`PhotoUpload` receives `photoUrl` as a prop, not local state**: After upload, `onUploaded()` triggers an async `fetchMember()` in the parent. The `PhotoUpload` component's displayed image is entirely driven by the `photoUrl` prop — it has no local state for the URL. The prop only updates after the async fetch completes and `setMember()` is called. The fix is to either: (a) update the `photoUrl` prop optimistically in the parent before the re-fetch, or (b) have `PhotoUpload` maintain local state for the URL and update it immediately after a successful upload.

3. **`AppShell` uses `members.list` with `email` + `limit: 1` to check pending status**: The `members.list` call in `AppShell` passes `{ email: user.email, limit: 1 }`. Inspection of the API client's `configureClient` and fetch utility reveals that parameters may be merged or cached at the module level, causing subsequent calls from other components to inherit these parameters. The correct fix is to remove this call entirely and derive pending status from the auth token's claims (the `isActive` status should be a Cognito custom attribute), or use a dedicated `members.get(userId)` call that doesn't share parameter state with the list endpoint.

4. **Auth loading state race condition on refresh**: `AuthProvider` initialises with `isLoading: true`. `ProtectedRoute` renders `null` (blank) while loading. If `getCurrentSession()` resolves to `null` (e.g., due to a transient Cognito SDK issue on rapid refreshes), `isLoading` becomes `false` with `isAuthenticated: false`, and `ProtectedRoute` redirects to `/login`. The fix is to add a retry or fallback in `getCurrentSession()`, or ensure `ProtectedRoute` shows a loading spinner rather than `null` during the transition, preventing the blank screen.

## Correctness Properties

Property 1: Fault Condition A — Profile and Settings Navigation Uses Client-Side Routing

_For any_ click on the "Profile" or "Settings" menu items in the admin user dropdown, the fixed TopBar SHALL navigate to the correct page (`/profile` or `/settings` respectively) using Next.js client-side routing, without triggering the dashboard error boundary or displaying "Failed to load dashboard".

**Validates: Requirements 2.1, 2.2**

Property 2: Fault Condition B — Photo Upload Immediately Reflects New Image

_For any_ successful photo upload where `uploadSucceeded` is true and the new `photoKey` is returned, the fixed `PhotoUpload` component SHALL immediately display the new image (using the new URL) without requiring a manual page reload or waiting for an async re-fetch to complete.

**Validates: Requirements 2.3**

Property 3: Fault Condition C — Members List API Call Does Not Include Admin Email

_For any_ invocation of the members list page's `fetchMembers()` function, the HTTP request sent to the backend SHALL NOT include an `email` query parameter containing the admin's email address, and SHALL NOT have `limit=1` unless explicitly set by the members list page's own pagination logic.

**Validates: Requirements 2.4, 2.5**

Property 4: Fault Condition D — Dashboard Displays Correctly on Multiple Refreshes

_For any_ page refresh where the user has a valid Cognito session, the fixed auth flow SHALL display the dashboard content correctly (not a blank screen) regardless of how many times the page has been refreshed in the current browser session.

**Validates: Requirements 2.6**

Property 5: Preservation — Non-Affected Navigation and Behaviors

_For any_ input that does NOT involve clicking Profile/Settings in the admin dropdown, completing a photo upload, loading the members list after AppShell mount, or refreshing the dashboard — the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing navigation, API calls, auth flows, and UI rendering.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

**Fix 1: Replace bare `<a>` tags with Next.js `<Link>` in TopBar**

**File**: `apps/web/src/components/layout/topbar.tsx`

**Specific Changes**:
1. Import `Link` from `next/link`
2. Replace `<a href="/profile" ...>Profile</a>` with `<Link href="/profile" ...>Profile</Link>`
3. Replace `<a href="/settings" ...>Settings</Link>` with `<Link href="/settings" ...>Settings</Link>`
4. Keep all existing className, role, and aria attributes unchanged

---

**Fix 2: Update `photoUrl` optimistically in `PhotoUpload` after upload**

**File**: `apps/web/src/app/(dashboard)/members/view/photo-upload.tsx`

**Specific Changes**:
1. Add local state: `const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null | undefined>(photoUrl)`
2. Add `useEffect` to sync `localPhotoUrl` when the `photoUrl` prop changes (for initial load and parent re-fetch)
3. After `members.update(memberId, { photoUrl: photoKey })` succeeds, call `setLocalPhotoUrl(photoKey)` immediately before calling `onUploaded()`
4. Replace all references to `photoUrl` prop in the render with `localPhotoUrl`

---

**Fix 3: Remove `members.list` email call from `AppShell`**

**File**: `apps/web/src/components/layout/app-shell.tsx`

**Specific Changes**:
1. Remove the `useEffect` that calls `members.list({ email: user.email, limit: 1 })`
2. Remove the `memberIsActive` state variable
3. Derive `isPending` directly from the auth user object: `const isPending = user && user.role === 'Member' && !user.isActive` — OR if `isActive` is not in the auth token, use `user.role === 'Member'` as a proxy (pending members have the Member role, not Admin/Pastor)
4. Remove the `members` import from `@kairos/api-client` if no longer used in this file

**Note**: If `isActive` is not available in the Cognito token claims, the alternative is to call `members.get(user.sub)` (by member ID, not email) which does not share parameter state with the list endpoint. The primary fix is to eliminate the `members.list` call with `email` entirely.

---

**Fix 4: Guard auth loading state to prevent blank screen**

**File**: `apps/web/src/lib/auth/protected-route.tsx`

**Specific Changes**:
1. Ensure the loading spinner is shown during `isLoading` (already done — verify this is correct)
2. Add a short-circuit: if `isLoading` is `false` and `isAuthenticated` is `false`, attempt one retry of `getCurrentSession()` before redirecting to `/login`, to handle transient Cognito SDK failures on rapid refreshes

**File**: `apps/web/src/lib/auth/auth-context.tsx` (if needed)

**Specific Changes**:
1. In the `getCurrentSession()` effect, if the session returns `null` on the first attempt, add a single retry with a 200ms delay before setting `isAuthenticated: false`
2. This prevents transient Cognito localStorage read failures from causing a permanent blank screen

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves existing behavior. Given that these bugs span layout components, a shared API client, and auth state management, testing focuses on component behavior, API call parameter verification, and auth state transitions.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm the root cause analysis.

**Test Plan**: Write tests that simulate the exact conditions triggering each bug. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **Profile Link Test**: Render `TopBar`, click "Profile" menu item, assert that the navigation target is `/profile` using Next.js router (will fail on unfixed code — bare `<a>` tag bypasses router)
2. **Settings Link Test**: Same as above for "Settings" (will fail on unfixed code)
3. **Photo Re-render Test**: Render `PhotoUpload` with `photoUrl=undefined`, simulate a successful upload returning `photoKey='photos/1/new.jpg'`, assert that the rendered `<img>` src is `'photos/1/new.jpg'` immediately after upload (will fail on unfixed code — prop is still `undefined`)
4. **Email Contamination Test**: Mount `AppShell` with a mock user `{ email: 'admin@kairos.church' }`, then call `members.list({ page: 1, limit: 50 })` from a separate component, capture the HTTP request, assert that the URL does NOT contain `email=admin@kairos.church` (will fail on unfixed code)
5. **Blank Screen Test**: Simulate `getCurrentSession()` returning `null` on first call then a valid session on second call, assert that `ProtectedRoute` shows a spinner then the children (not a redirect to `/login`) (may fail on unfixed code)

**Expected Counterexamples**:
- Profile/Settings clicks navigate to error page instead of target page
- `PhotoUpload` renders old image immediately after upload
- `members.list` HTTP request contains `email=admin@kairos.church&limit=1` when called from members list page
- `ProtectedRoute` renders `null` or redirects to `/login` on transient session failure

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedComponent(input)
  ASSERT expectedBehavior(result)
END FOR

// Condition A
FOR ALL click IN ['clickProfile', 'clickSettings'] DO
  result := topbar_fixed.handleClick(click)
  ASSERT result.navigationMethod === 'nextjsClientSideRouting'
  ASSERT result.destination IN ['/profile', '/settings']
  ASSERT result.errorBoundaryTriggered === false
END FOR

// Condition B
FOR ALL upload WHERE upload.succeeded === true DO
  result := photoUpload_fixed.afterUpload(upload)
  ASSERT result.displayedPhotoUrl === upload.newPhotoKey
  ASSERT result.displayedPhotoUrl !== upload.previousPhotoUrl
END FOR

// Condition C
FOR ALL memberListFetch DO
  request := appShell_fixed.onMount(adminUser)
  memberListRequest := membersListPage_fixed.fetchMembers()
  ASSERT NOT memberListRequest.params.email
  ASSERT memberListRequest.params.limit !== 1
END FOR

// Condition D
FOR ALL refresh WHERE refresh.sessionValid === true DO
  result := protectedRoute_fixed.onMount(refresh)
  ASSERT result !== 'blank'
  ASSERT result !== 'redirectToLogin'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for the email contamination preservation check because it can generate many combinations of `members.list` call parameters and verify that none of them are contaminated by AppShell's member status check.

**Test Plan**: Observe behavior on UNFIXED code first for all non-buggy flows, then write tests to verify these continue working after the fix.

**Test Cases**:
1. **Sidebar Navigation Preservation**: Verify that clicking sidebar links continues to use Next.js routing correctly after the TopBar fix
2. **Direct URL Navigation Preservation**: Verify that navigating directly to `/profile` or `/settings` via URL continues to work after the TopBar fix
3. **Photo Display Preservation**: Verify that an existing `photoUrl` is displayed correctly on initial load (before any upload) after the PhotoUpload fix
4. **Members List Normal Fetch Preservation**: Verify that `members.list({ page: 1, limit: 50 })` continues to produce the correct HTTP request when AppShell has NOT mounted (or after the fix removes the contaminating call)
5. **Pending Member Banner Preservation**: Verify that the pending member banner in AppShell continues to display correctly for pending members after removing the `members.list` call
6. **Auth Redirect Preservation**: Verify that genuinely unauthenticated users (no valid session) are still redirected to `/login` after the auth fix

### Unit Tests

- Test that TopBar renders `<Link>` components (not `<a>` tags) for Profile and Settings menu items
- Test that `PhotoUpload` displays the new image immediately after a successful upload without waiting for prop update
- Test that `AppShell` does NOT call `members.list` with an `email` parameter on mount
- Test that `ProtectedRoute` shows a loading spinner during `isLoading` and does not render `null` (blank)
- Test that `ProtectedRoute` redirects to `/login` only when `isAuthenticated` is definitively `false` after loading completes

### Property-Based Tests

- Generate random admin user objects and verify that `AppShell` never calls `members.list` with `email` equal to `user.email`
- Generate random sequences of `members.list` calls and verify that none of them inherit `email` or `limit=1` parameters from a prior AppShell call
- Generate random `photoUrl` values and verify that `PhotoUpload` always displays the most recently uploaded URL (not a stale prop)

### Integration Tests

- Test full flow: open admin dropdown → click Profile → verify `/profile` page loads without error
- Test full flow: open admin dropdown → click Settings → verify `/settings` page loads without error
- Test full flow: upload photo on member detail page → verify new image is shown immediately → navigate to members list → verify all members are shown (not just admin) → click a member row → verify correct member detail page loads
- Test full flow: refresh dashboard page 5 times in succession → verify dashboard content is displayed on each refresh without blank screen
