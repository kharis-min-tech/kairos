# Kairos Staging Bugs — Root Cause Analysis & Action Plan

## Bug Summary

| # | Severity | Bug | Root Cause | Affected Pages |
|---|----------|-----|-----------|----------------|
| 1 | **CRITICAL** | API client URL mismatches — all API calls return 404/CORS errors | `packages/api-client/src/api.ts` URLs don't match `infrastructure/src/stacks/api-stack.ts` routes | ALL pages |
| 2 | **HIGH** | CORS errors mask real API errors on authorizer denial | API Gateway HTTP API doesn't return CORS headers on 401/403 from authorizer | ALL pages |
| 3 | **MEDIUM** | Branches API client uses wrong endpoint paths | `assignPastor`/`assignElder` paths don't match API routes | Branches |
| 4 | **MEDIUM** | Departments API client uses wrong endpoint paths | `assign-member`, `approve-request`, `followup` paths don't match API routes | Departments |
| 5 | **MEDIUM** | Fellowships API client uses wrong endpoint paths | `add-member`, `send-message` paths don't match API routes | Fellowships |
| 6 | **MEDIUM** | Attendance API client uses singular paths | `/v1/attendance/service` vs API route `/v1/attendance/services` | Attendance |
| 7 | **MEDIUM** | Souls API client uses wrong followup path | `/v1/souls/{id}/followup` vs API route `/v1/souls/{id}/followups` | Evangelism |
| 8 | **MEDIUM** | Notifications API client uses wrong mark-read path | `/v1/notifications/{id}/read` vs API route `/v1/notifications/mark-read` | Notifications |
| 9 | **MEDIUM** | Forms API client uses wrong submission paths | Missing `{formId}` in submissions/export paths | Forms |
| 10 | **LOW** | No Cognito user provisioning in seed script | Seed creates DB records but not Cognito users — manual CLI step required | Login |

---

## Detailed RCA

### Bug 1: Dashboard API URL Mismatch (CRITICAL)

**Symptom:** Dashboard shows "Failed to load dashboard", console shows CORS error on `/v1/dashboard/admin`

**Root Cause:** The API client in `packages/api-client/src/api.ts` line 337 calls `/v1/dashboard/admin`, but the API Gateway route in `infrastructure/src/stacks/api-stack.ts` line 314 is `/v1/reports/dashboard/admin`.

**API Client vs API Routes — Full Mismatch Table:**

| API Client Path | API Route Path | Status |
|----------------|---------------|--------|
| `/v1/dashboard/admin` | `/v1/reports/dashboard/admin` | **MISMATCH** |
| `/v1/dashboard/pastor` | `/v1/reports/dashboard/pastor` | **MISMATCH** |
| `/v1/dashboard/leader` | `/v1/reports/dashboard/leader` | **MISMATCH** |
| `/v1/branches/{id}/assign-pastor` | `/v1/branches/{id}/pastor` | **MISMATCH** |
| `/v1/branches/{id}/assign-elder` | `/v1/branches/{id}/elder` | **MISMATCH** |
| `/v1/departments/{id}/assign-member` | `/v1/departments/{id}/members` | **MISMATCH** |
| `/v1/departments/{id}/approve-request` | `/v1/departments/{id}/approve` | **MISMATCH** |
| `/v1/departments/{id}/followup` | `/v1/departments/{id}/followups` | **MISMATCH** |
| `/v1/fellowships/{id}/add-member` | `/v1/fellowships/{id}/members` | **MISMATCH** |
| `/v1/fellowships/{id}/send-message` | `/v1/fellowships/{id}/messages` | **MISMATCH** |
| `/v1/attendance/service` (POST) | `/v1/attendance/services` | **MISMATCH** |
| `/v1/attendance/service` (GET) | `/v1/attendance/services` | **MISMATCH** |
| `/v1/attendance/fellowship` (POST) | `/v1/attendance/fellowships` | **MISMATCH** |
| `/v1/attendance/fellowship` (GET) | `/v1/attendance/fellowships` | **MISMATCH** |
| `/v1/souls/{id}/followup` | `/v1/souls/{id}/followups` | **MISMATCH** |
| `/v1/notifications/{id}/read` | `/v1/notifications/mark-read` (PUT) | **MISMATCH** |
| `/v1/notifications/read-all` | No route exists | **MISSING** |
| `/v1/forms/submissions` | `/v1/forms/{formId}/submissions` | **MISMATCH** |
| `/v1/forms/submissions/export` | `/v1/forms/{formId}/submissions/export` | **MISMATCH** |
| `/v1/forms/save-template` | `/v1/forms/templates` | **MISMATCH** |
| `/v1/reports/members` | No route exists | **MISSING** |
| `/v1/reports/attendance` | `/v1/reports/attendance-trends` | **MISMATCH** |
| `/v1/reports/donations` | `/v1/reports/donation-summary` | **MISMATCH** |
| `/v1/reports/souls` | `/v1/reports/soul-funnel` | **MISMATCH** |
| `/v1/reports/followups` | No route exists | **MISSING** |

**Fix:** Update all paths in `packages/api-client/src/api.ts` to match the actual API Gateway routes.

---

### Bug 2: CORS Headers Missing on Auth Failures (HIGH)

**Symptom:** Browser shows `No 'Access-Control-Allow-Origin' header` when authorizer denies request

**Root Cause:** API Gateway HTTP API only returns CORS headers on successful preflight (OPTIONS) and successful route responses. When the Lambda authorizer returns `isAuthorized: false`, API Gateway returns 401 without CORS headers. This is a known AWS limitation.

**Fix Options:**
1. **Option A (Recommended):** Always return `isAuthorized: true` from the authorizer but set a context flag like `authorized: false`. Route Lambdas check this flag and return proper 401 with CORS headers.
2. **Option B:** Add a Gateway Response for 401/403 that includes CORS headers (requires REST API, not HTTP API).
3. **Option C:** Use a CloudFront function to add CORS headers to all responses.

---

### Bug 10: Cognito User Provisioning Gap (LOW)

**Symptom:** Login fails for seeded users because they don't exist in Cognito

**Root Cause:** The `db-seed.ts` Lambda creates member records in the database but doesn't create corresponding Cognito users. Users must be manually created via AWS CLI.

**Fix:** Add Cognito user creation to the seed script using `@aws-sdk/client-cognito-identity-provider`.

---

## Action Plan

### Phase 1: Fix Critical API Client Mismatches (Unblocks ALL pages)
- [ ] Update `packages/api-client/src/api.ts` — fix all 25+ URL mismatches to match API Gateway routes
- [ ] Verify each route path against `infrastructure/src/stacks/api-stack.ts`
- [ ] Redeploy web app to staging

### Phase 2: Fix CORS on Auth Failures
- [ ] Investigate API Gateway HTTP API CORS behavior on authorizer denial
- [ ] Implement chosen fix (Option A, B, or C)
- [ ] Test with invalid/expired tokens to confirm CORS headers present

### Phase 3: Improve Developer Experience
- [ ] Add Cognito user creation to `db-seed.ts` for demo users
- [ ] Create a setup script that provisions both DB records and Cognito users
- [ ] Document the staging setup process

### Phase 4: Full Page-by-Page Testing
- [ ] Test Dashboard (admin, pastor, leader views)
- [ ] Test Members (list, create, view, edit, import, export, approve)
- [ ] Test Branches (list, create, assign pastor/elder)
- [ ] Test Departments (list, create, assign, approve, followups, alerts)
- [ ] Test Fellowships (list, create, add member, send message)
- [ ] Test Attendance (record service, record fellowship, trends, missing)
- [ ] Test Outreach (programs, workers, souls, followups)
- [ ] Test Donations (manual, online, reports, export)
- [ ] Test Forms (create, submit, submissions, export)
- [ ] Test Notifications (list, mark read, broadcast)
- [ ] Test Reports (all dashboard types, CSV export)
