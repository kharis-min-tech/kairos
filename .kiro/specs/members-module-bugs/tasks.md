# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE implementing any fix)
  - **Property 1: Fault Condition** - All Four Bug Conditions
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: Scope each property to the concrete failing case(s) for reproducibility

  - **Condition A — Routing bugs (Profile & Settings links):**
    - Render `TopBar`, click "Profile" menu item, assert navigation target is `/profile` via Next.js router (not a bare `<a>` tag full-page nav)
    - Render `TopBar`, click "Settings" menu item, assert navigation target is `/settings` via Next.js router
    - Inspect rendered output: assert NO `<a href="/profile">` or `<a href="/settings">` bare anchor tags exist
    - Run on UNFIXED code — **EXPECTED OUTCOME**: FAILS (bare `<a>` tags bypass Next.js router)
    - Document counterexample: "Profile/Settings clicks navigate to error page instead of target page"

  - **Condition B — Stale photo prop after upload:**
    - Render `PhotoUpload` with `photoUrl=undefined`, simulate successful upload returning `photoKey='photos/1/new.jpg'`
    - Assert that the rendered `<img>` src is `'photos/1/new.jpg'` immediately after upload (before any async re-fetch)
    - Run on UNFIXED code — **EXPECTED OUTCOME**: FAILS (prop is still `undefined` until async fetch resolves)
    - Document counterexample: "`PhotoUpload` renders old image immediately after upload"

  - **Condition C — Email contamination:**
    - Mount `AppShell` with mock user `{ email: 'admin@kairos.church' }`, then call `members.list({ page: 1, limit: 50 })` from a separate component
    - Capture the HTTP request, assert URL does NOT contain `email=admin@kairos.church` and does NOT have `limit=1`
    - Run on UNFIXED code — **EXPECTED OUTCOME**: FAILS (AppShell contaminates subsequent list calls)
    - Document counterexample: "`members.list` HTTP request contains `email=admin@kairos.church&limit=1` when called from members list page"

  - **Condition D — Blank screen on refresh:**
    - Simulate `getCurrentSession()` returning `null` on first call then a valid session on second call
    - Assert `ProtectedRoute` shows a spinner then children — NOT a redirect to `/login` and NOT a blank screen
    - Run on UNFIXED code — **EXPECTED OUTCOME**: FAILS (renders `null` or redirects on transient failure)
    - Document counterexample: "`ProtectedRoute` renders `null` or redirects to `/login` on transient session failure"

  - Mark task complete when all four exploration tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Non-Affected Navigation and Behaviors
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code behavior for non-buggy inputs first
  - **GOAL**: Capture baseline behavior that must remain unchanged after the fix

  - **Observe on UNFIXED code (non-buggy inputs):**
    - Sidebar navigation links continue to use Next.js routing correctly (not affected by TopBar fix)
    - Direct URL navigation to `/profile` or `/settings` loads those pages correctly
    - `PhotoUpload` with an existing `photoUrl` prop displays the image correctly on initial load (no upload action)
    - `members.list({ page: 1, limit: 50 })` produces correct HTTP request when AppShell has NOT mounted
    - Pending member banner in AppShell displays correctly for users with `role === 'Member'`
    - Genuinely unauthenticated users (no valid session) are redirected to `/login`
    - Dashboard loads correctly on first visit and after a single refresh

  - **Write property-based tests capturing observed behavior:**
    - Generate random admin user objects: assert `AppShell` never calls `members.list` with `email` equal to `user.email` (for any user)
    - Generate random sequences of `members.list` call parameters: assert none inherit `email` or `limit=1` from a prior AppShell call
    - Generate random `photoUrl` values: assert `PhotoUpload` always displays the most recently set URL (not a stale prop)
    - Assert `ProtectedRoute` redirects to `/login` when `isAuthenticated` is definitively `false` after loading completes (genuine unauthenticated case)

  - Verify all preservation tests PASS on UNFIXED code (confirms baseline behavior)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix routing bugs — replace bare `<a>` tags with Next.js `<Link>` in TopBar

  - [x] 3.1 Implement Fix 1 in `apps/web/src/components/layout/topbar.tsx`
    - Import `Link` from `next/link`
    - Replace `<a href="/profile" ...>Profile</a>` with `<Link href="/profile" ...>Profile</Link>`
    - Replace `<a href="/settings" ...>Settings</a>` with `<Link href="/settings" ...>Settings</Link>`
    - Keep all existing `className`, `role`, and `aria-*` attributes unchanged on the wrapping elements
    - _Bug_Condition: `isBugCondition(input)` where `input.action IN ['clickProfile', 'clickSettings'] AND input.context.navigationMethod === 'bareAnchor'`_
    - _Expected_Behavior: `result.navigationMethod === 'nextjsClientSideRouting' AND result.errorBoundaryTriggered === false`_
    - _Preservation: All other navigation links (sidebar, breadcrumbs, member rows) unchanged; dropdown still shows Profile, Settings, Sign out_
    - _Requirements: 2.1, 2.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify routing exploration tests now pass
    - **Property 1: Expected Behavior** - Profile and Settings Navigation Uses Client-Side Routing
    - **IMPORTANT**: Re-run the SAME tests from task 1 (Condition A) — do NOT write new tests
    - Run the Profile link test and Settings link test from step 1
    - **EXPECTED OUTCOME**: Both tests PASS (confirms routing bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Affected Navigation
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 — do NOT write new tests
    - Confirm sidebar navigation, direct URL navigation, and dropdown display are unaffected
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 4. Fix photo re-render — add local state to `PhotoUpload` for optimistic update

  - [x] 4.1 Implement Fix 2 in `apps/web/src/app/(dashboard)/members/view/photo-upload.tsx`
    - Add local state: `const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null | undefined>(photoUrl)`
    - Add `useEffect` to sync `localPhotoUrl` when the `photoUrl` prop changes (handles initial load and parent re-fetch completing)
    - After `members.update(memberId, { photoUrl: photoKey })` succeeds, call `setLocalPhotoUrl(photoKey)` immediately before calling `onUploaded()`
    - Replace all references to the `photoUrl` prop in the render with `localPhotoUrl`
    - File picker, size validation, S3 upload flow, and error handling must remain unchanged
    - _Bug_Condition: `isBugCondition(input)` where `input.action === 'photoUploadComplete' AND input.context.photoUrlProp === input.context.previousPhotoUrl AND input.context.uploadSucceeded === true`_
    - _Expected_Behavior: `result.displayedPhotoUrl === upload.newPhotoKey AND result.displayedPhotoUrl !== upload.previousPhotoUrl`_
    - _Preservation: Existing `photoUrl` displayed correctly on initial load; upload flow and error handling unchanged_
    - _Requirements: 2.3, 3.1_

  - [x] 4.2 Verify photo re-render exploration test now passes
    - **Property 1: Expected Behavior** - Photo Upload Immediately Reflects New Image
    - **IMPORTANT**: Re-run the SAME test from task 1 (Condition B) — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms new image shown immediately after upload)
    - _Requirements: 2.3_

  - [x] 4.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Photo Display and Upload Flow
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 — do NOT write new tests
    - Confirm existing `photoUrl` still displays correctly on initial load
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 5. Fix email contamination — remove `members.list` email call from `AppShell`

  - [x] 5.1 Implement Fix 3 in `apps/web/src/components/layout/app-shell.tsx`
    - Remove the `useEffect` that calls `members.list({ email: user.email, limit: 1 })`
    - Remove the `memberIsActive` state variable (and any related state)
    - Derive `isPending` directly from the auth user object: `const isPending = user?.role === 'Member' && !user?.isActive` — if `isActive` is not in the token, use `user?.role === 'Member'` as a proxy
    - If `isActive` is not available in the Cognito token claims, use `members.get(user.sub)` (by member ID) as an alternative — this does NOT share parameter state with the list endpoint
    - Remove the `members` import from `@kairos/api-client` if no longer used in this file
    - Pending member banner and navigation restriction logic must continue to work correctly
    - _Bug_Condition: `isBugCondition(input)` where `input.action === 'fetchMembersList' AND input.context.requestParams.email === input.context.adminEmail AND input.context.requestParams.limit === 1`_
    - _Expected_Behavior: `NOT memberListRequest.params.email AND memberListRequest.params.limit !== 1`_
    - _Preservation: Pending member banner still displays for `role === 'Member'` users; members list search/filter/pagination unchanged_
    - _Requirements: 2.4, 2.5, 3.2, 3.3_

  - [x] 5.2 Verify email contamination exploration test now passes
    - **Property 1: Expected Behavior** - Members List API Call Does Not Include Admin Email
    - **IMPORTANT**: Re-run the SAME test from task 1 (Condition C) — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms no email contamination in members list requests)
    - _Requirements: 2.4, 2.5_

  - [x] 5.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Members List Normal Fetch and Pending Banner
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 — do NOT write new tests
    - Confirm `members.list({ page: 1, limit: 50 })` produces correct HTTP request
    - Confirm pending member banner still works for pending users
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 6. Fix blank screen — add retry logic for transient Cognito session failures

  - [x] 6.1 Implement Fix 4 in `apps/web/src/lib/auth/auth-context.tsx`
    - In the `getCurrentSession()` effect, if the session returns `null` on the first attempt, add a single retry with a 200ms delay before setting `isAuthenticated: false`
    - This prevents transient Cognito `localStorage` read failures on rapid refreshes from causing a permanent blank screen
    - Ensure `isLoading` remains `true` during the retry window so `ProtectedRoute` continues showing a spinner

  - [x] 6.2 Verify loading state in `apps/web/src/lib/auth/protected-route.tsx`
    - Confirm `ProtectedRoute` shows a loading spinner (not `null`) during `isLoading === true`
    - If it currently returns `null` during loading, update it to render a spinner or skeleton instead
    - Ensure redirect to `/login` only fires when `isAuthenticated` is definitively `false` after loading completes (not during the retry window)
    - _Bug_Condition: `isBugCondition(input)` where `input.action === 'pageRefresh' AND input.context.authIsLoading === false AND input.context.isAuthenticated === false AND input.context.sessionActuallyValid === true`_
    - _Expected_Behavior: `result !== 'blank' AND result !== 'redirectToLogin'` when session is actually valid_
    - _Preservation: Genuinely unauthenticated users still redirected to `/login`; dashboard loads correctly on first visit_
    - _Requirements: 2.6, 3.5, 3.6_

  - [x] 6.3 Verify blank screen exploration test now passes
    - **Property 1: Expected Behavior** - Dashboard Displays Correctly on Multiple Refreshes
    - **IMPORTANT**: Re-run the SAME test from task 1 (Condition D) — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms no blank screen on transient session failure)
    - _Requirements: 2.6_

  - [x] 6.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Auth Redirect and Dashboard Load
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 — do NOT write new tests
    - Confirm genuinely unauthenticated users are still redirected to `/login`
    - Confirm dashboard loads correctly on first visit and after a single refresh
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 7. Checkpoint — Ensure all tests pass
  - Re-run the full test suite covering all four bug conditions and all preservation tests
  - Confirm Property 1 (Fault Condition) tests all PASS for Conditions A, B, C, and D
  - Confirm Property 2 (Preservation) tests all PASS
  - Confirm no regressions in sidebar navigation, member detail navigation, photo display, members list pagination, pending member banner, and auth redirect
  - Ask the user if any questions arise before closing out
