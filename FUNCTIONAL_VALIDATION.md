# Functional Validation Checklist

> Step-by-step manual testing guide for locally validating all implemented features.

## Prerequisites

```bash
# 1. Start database
docker compose up -d

# 2. Run migrations
cd packages/database && npx drizzle-kit push

# 3. Start all services
npx turbo dev
# API on http://localhost:3001
# Web on http://localhost:3002
```

You'll need a REST client (Postman, curl, or the Postman collection in `postman/`) for API-level checks.

---

## Phase 1: Auth Flow

### 1.1 Signup
- [ ] Navigate to `http://localhost:3002/signup`
- [ ] Fill in name, email, phone, password, select a branch → Submit
- [ ] Verify redirected to `/verify-email`

### 1.2 Email Verification
- [ ] Check terminal logs for verification token (Ethereal link or token value)
- [ ] Enter verification code on `/verify-email`
- [ ] Verify redirected to `/pending-approval` (member awaits admin approval)

### 1.3 Admin Approval (API)
- [ ] Login as admin via API: `POST /api/auth/login` with admin credentials
- [ ] Approve the new member: `POST /api/members/:id/approve` with `{ "status": "approved" }`
- [ ] Login again as the new member — verify access to dashboard

### 1.4 Login
- [ ] Navigate to `http://localhost:3002/login`
- [ ] Login with approved member credentials
- [ ] Verify redirected to `/dashboard`
- [ ] Verify the "Welcome" banner or stats display

### 1.5 Forgot / Reset Password
- [ ] Go to `/forgot-password`, enter email, submit
- [ ] Check terminal logs for reset token
- [ ] Go to `/reset-password`, enter token + new password, submit
- [ ] Login with new password — should succeed

### 1.6 Change Password (Authenticated)
- [ ] Navigate to `/profile/settings`
- [ ] Use "Change Password" section — enter old + new password
- [ ] Logout, login with new password — should succeed

---

## Phase 2: Branches & Regions (Admin)

### 2.1 Region Management
- [ ] Navigate to `/admin/regions`
- [ ] Create a new region (e.g., "West Region") → verify it appears in the list
- [ ] Verify new region appears in branch creation form dropdown

### 2.2 Branch Management
- [ ] Navigate to `/admin/branches`
- [ ] Verify existing branches are listed
- [ ] Click "New Branch" → fill form (name, type, region, email, phone) → submit
- [ ] Verify new branch appears in list
- [ ] Click into a branch → verify detail page shows info

### 2.3 Branch Leadership
- [ ] On branch detail page (`/admin/branches/:id`), locate leadership section
- [ ] Assign a Main Pastor: select a member, role = "Main Pastor" → submit
- [ ] Verify pastor appears in leadership list
- [ ] Assign an Elder → verify listed
- [ ] Toggle "Include History" → verify historical records appear (if any)
- [ ] Remove an elder → verify removed from current list
- [ ] Verify only one Main Pastor is current at a time

---

## Phase 3: Members

### 3.1 Member Directory
- [ ] Navigate to `/members`
- [ ] Verify paginated list of members loads
- [ ] Use search box to search by name → verify results filter
- [ ] Filter by branch → verify results filter
- [ ] Filter by approval status → verify results filter

### 3.2 Create Member (Admin/Pastor)
- [ ] Navigate to `/members/new`
- [ ] Fill in first name, last name, email, phone, branch → submit
- [ ] Verify success message shows a generated password
- [ ] Verify new member appears in directory

### 3.3 Member Detail/Profile
- [ ] Click a member in directory → verify `/members/:id` loads
- [ ] Verify profile info, roles, fellowships displayed
- [ ] Edit a field (e.g., phone number) → save → verify updated

### 3.4 Member Approval
- [ ] Navigate to `/members/approval`
- [ ] Verify pending members are listed
- [ ] Approve one → verify status changes
- [ ] Reject one → verify status changes

### 3.5 Deactivate / Reactivate
- [ ] On member detail, click "Deactivate" → confirm
- [ ] Verify member shows as inactive
- [ ] Click "Reactivate" → verify active again

### 3.6 CSV Export
- [ ] On `/members` page, click "Export CSV" button
- [ ] Verify a .csv file downloads
- [ ] Open CSV — verify columns (name, email, phone, branch, etc.) and data

### 3.7 CSV Import
- [ ] Navigate to `/members/import`
- [ ] Upload a valid CSV file (use the exported CSV as template)
- [ ] Verify success count and any error feedback
- [ ] Verify imported members appear in directory

### 3.8 Role Management
- [ ] On member detail page, locate "Roles" section
- [ ] Assign a role (e.g., "Usher") → verify it appears
- [ ] Remove the role → verify removed

---

## Phase 4: Fellowships

### 4.1 Fellowship List
- [ ] Navigate to `/fellowships`
- [ ] Verify fellowships listed (type badges, branch info visible)
- [ ] Filter by fellowship type (K-Groups, Kharis Express, etc.) → verify filter works
- [ ] Filter by branch → verify filter works

### 4.2 Create Fellowship
- [ ] Click "New Fellowship" → fill form (name, type, branch, description, leader) → submit
- [ ] Verify new fellowship appears in list

### 4.3 Fellowship Detail
- [ ] Click a fellowship → verify `/fellowships/:id` loads
- [ ] Verify tabs: Members, Meetings, Attendance (and Join Requests if leader/admin)

### 4.4 Fellowship Members
- [ ] On "Members" tab, verify member list loads
- [ ] Add a member → verify appears in list
- [ ] Remove a member → verify removed

### 4.5 Join Request Flow
- [ ] Login as a regular member who is NOT in the fellowship
- [ ] Navigate to the fellowship detail page
- [ ] Click "Request to Join" button → verify request submitted
- [ ] Login as leader/admin → go to fellowship detail → "Join Requests" tab
- [ ] Verify pending request appears
- [ ] Approve the request → verify member added to fellowship
- [ ] (Optional) Test reject flow as well

### 4.6 Meetings
- [ ] On "Meetings" tab, click "Create Meeting" → fill date, title, topic → submit
- [ ] Verify meeting appears in list

### 4.7 Attendance Recording
- [ ] On a meeting, click to record attendance
- [ ] Mark members as Present/Absent/Excused/Late → submit
- [ ] Verify attendance records saved
- [ ] Check "Attendance Summary" for trends/aggregates

### 4.8 Edit/Update Fellowship
- [ ] Navigate to `/fellowships/:id/edit`
- [ ] Change name or description → save
- [ ] Verify changes reflected on detail page

---

## Phase 5: Dashboard & Analytics

### 5.1 Admin Dashboard
- [ ] Login as admin → go to `/dashboard`
- [ ] Verify stats cards show (total members, branches, fellowships, etc.)
- [ ] Verify any charts/graphs render (attendance trends, growth)
- [ ] Verify recent activity section loads

### 5.2 Pastor/Leader Dashboard
- [ ] Login as pastor → go to `/dashboard`
- [ ] Verify branch-scoped stats display (branch members, fellowships in branch)
- [ ] Verify data is scoped to their branch only

### 5.3 Member Dashboard
- [ ] Login as regular member → go to `/dashboard`
- [ ] Verify personal stats (attendance rate, fellowships joined, etc.)

---

## Phase 6: Reports

### 6.1 Member Growth Report
- [ ] Navigate to `/reports`
- [ ] Select "Member Growth" tab/section
- [ ] Verify chart shows monthly new member signups
- [ ] Change date range or branch filter → verify chart updates

### 6.2 Attendance Trend Report
- [ ] Select "Attendance Trend" tab/section
- [ ] Verify chart shows weekly attendance percentages
- [ ] Filter by branch → verify scoped data

### 6.3 Fellowship Activity Report
- [ ] Select "Fellowship Activity" tab/section
- [ ] Verify table/chart shows meeting counts and average attendance per fellowship

---

## Phase 7: Cross-Cutting Concerns

### 7.1 Branch Isolation
- [ ] Login as a non-admin member
- [ ] Verify they can only see members, fellowships, and data from their own branch
- [ ] Attempt to access another branch's fellowship via direct URL → verify forbidden/empty

### 7.2 Role-Based Access Control
- [ ] As member: verify cannot create branches, members, or fellowships → UI hides buttons or API returns 403
- [ ] As pastor: verify can manage their branch but not other branches
- [ ] As admin: verify full access across all branches

### 7.3 Error States
- [ ] Navigate to a non-existent member/fellowship ID → verify 404 page or error message
- [ ] Submit a form with missing required fields → verify validation errors display
- [ ] Test with expired/invalid token → verify redirected to login

### 7.4 Responsive UI
- [ ] Check key pages (dashboard, members, fellowships) on mobile viewport
- [ ] Verify sidebar collapses, tables scroll, forms remain usable

---

## Quick API Smoke Test (curl)

If you prefer API-level validation, here's a quick sequence:

```bash
BASE=http://localhost:3001/api

# Login as admin
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' | jq -r '.data.accessToken')

# List branches
curl -s -H "Authorization: Bearer $TOKEN" $BASE/branches | jq '.data | length'

# List members
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/members?page=1&limit=5" | jq '.data.items | length'

# List fellowships
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/fellowships?page=1&limit=5" | jq '.data.items | length'

# Get leadership for a branch
BRANCH_ID=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE/branches | jq -r '.data[0].id')
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/branches/$BRANCH_ID/leadership" | jq

# Reports
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/reports/member-growth?months=6" | jq
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/reports/attendance-trend?weeks=8" | jq
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/reports/fellowship-activity" | jq

# Analytics
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/analytics/admin" | jq
```

---

## Test Summary

| Area | Checks |
|------|--------|
| Auth | 6 flows (signup, verify, approve, login, forgot/reset, change pwd) |
| Branches & Regions | 3 features (regions CRUD, branches CRUD, leadership) |
| Members | 8 features (directory, create, detail, approve, deactivate, CSV, roles) |
| Fellowships | 8 features (list, create, detail, members, join requests, meetings, attendance, edit) |
| Dashboard | 3 views (admin, pastor, member) |
| Reports | 3 report types (growth, attendance, fellowship activity) |
| Cross-Cutting | 4 areas (branch isolation, RBAC, errors, responsive) |
