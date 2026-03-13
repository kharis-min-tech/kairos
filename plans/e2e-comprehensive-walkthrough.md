# Comprehensive E2E Staging Walkthrough Plan

## Overview
Enhance `e2e/staging-walkthrough.spec.ts` to deeply interact with every form, button, modal, kanban board, filter, and data table. Capture all console errors, API errors, and UI crashes into a structured JSON report.

## Error Collection Infrastructure
- **Console errors**: `console.error` and `pageerror` events
- **API errors**: `page.on('response')` for status >= 400 on API routes
- **UI crashes**: Text checks for "Application error", "Internal Server Error", "Unhandled Runtime Error"
- **Output**: `e2e-report.json` + console summary

## Test Structure
- Single serial test per role (Admin has most access, test Admin first)
- Login once, walk through all pages sequentially
- Each interaction wrapped in try/catch — failures logged, not fatal
- `test.setTimeout(300_000)` for long serial runs

## Scenarios by Page

### 1. Dashboard (`/dashboard`)
- Verify stat cards render (no NaN, no "undefined")

### 2. Members (`/members`)
- Search for a member name
- Use branch/department/fellowship/status filter dropdowns
- Click "Export CSV" button — capture API response
- Click first member name link → `/members/view?id=X`
  - **Member detail page**: verify profile tab renders
  - Click "Donations" tab, "Attendance" tab
  - Click "Edit" button → verify edit modal opens, modify a field, save
  - Verify photo upload button exists (click it — no file selected, just verify no crash)
  - Close and go back
- Click "Add Member" → `/members/new`
  - Submit empty form → expect validation errors on firstName, lastName, homeBranchId
  - Fill with test data and submit → capture API response
- Navigate to `/members/approvals` — verify page loads
- Navigate to `/members/import` — verify upload area renders
  - Click "Choose File" button (no file — just verify no crash)

### 3. Branches (`/branches`)
- Verify branch cards render
- Click "Add Branch" button — verify modal/page opens (capture what happens)
- Click into first branch card if clickable

### 4. Departments (`/departments`)
- Verify department list renders
- Look for "Add Department" or create button — click it if present

### 5. Fellowships (`/fellowships`)
- Verify fellowship list renders
- Look for create button — click it if present

### 6. Attendance (`/attendance`)
- Select a branch (Admin), service date, service type
- Toggle "Mark All Present"
- Click "Record Attendance" — capture API response
- Navigate to `/attendance/fellowship` — verify loads
- Navigate to `/attendance/reports` — verify loads

### 7. Evangelism — Outreach Programs (`/evangelism/outreach`)
- Verify program list/cards render
- Click "Create Program" → fill modal form (name, date, location) → submit
- After creation, click into the newly created program card → `/evangelism/outreach/detail?id=X`
- On program detail: click "Register as Worker" if available
- Click "Complete" if available

### 8. Evangelism — Soul Capture (`/evangelism/souls/capture`)
- Submit empty form → expect validation errors (firstName, lastName required)
- Fill form with test data (source: outreach if programs exist, else ad-hoc) → submit
- Verify success alert appears

### 9. Evangelism — Souls Kanban (`/evangelism/souls`)
- Verify 4 columns render (New, Following Up, Interested, Converted)
- Click a soul card → verify detail modal opens → close
- Simulate drag-and-drop: drag a "New" soul to "Following Up" column
  - Use `page.dispatchEvent` for dragstart/drop
  - Verify the soul moves (or capture API error)
- Verify status update reflected in UI

### 10. Evangelism — Follow-Up Tracker (`/evangelism/followups`)
- Switch tabs (All, Pending, Overdue)
- Use search input and filter dropdowns
- Click "Log Follow-Up" on first card → modal opens
  - Submit empty → expect validation errors (contactMethod, contactStatus required)
  - Fill form and submit → verify success
  - Verify follow-up status updates

### 11. Donations (`/donations`)
- Verify donation list/table renders
- Navigate to `/donations/record`:
  - **Online tab**: submit empty → expect validation, fill amount + purpose → submit
  - **Manual tab**: switch tab, submit empty → expect validation, fill all fields → submit
- Navigate to `/donations/reports` — verify loads

### 12. Forms (`/forms`)
- Verify form list renders
- Navigate to `/forms/builder`:
  - Add Text field, Number field, Dropdown field from palette
  - Fill form name
  - Click "Save Form" → capture API response
  - Click "Save as Template"
  - Click "From Template" → verify modal opens
- Navigate to `/forms/submissions` — verify loads

### 13. Reports (`/reports`)
- Verify page loads with report content

### 14. Profile (`/profile`)
- Verify page loads

### 15. Settings (`/settings`)
- Verify page loads

## Report Format

```json
{
  "timestamp": "ISO string",
  "role": "Admin",
  "summary": {
    "totalErrors": 12,
    "consoleErrors": 5,
    "apiErrors": 4,
    "uiCrashes": 1,
    "validationIssues": 2
  },
  "errors": [
    {
      "page": "/members",
      "action": "click Export CSV",
      "type": "api_error",
      "status": 500,
      "message": "Internal Server Error",
      "url": "/api/members/export"
    }
  ]
}
```

## Implementation Notes
- `test.setTimeout(300_000)` for long serial tests
- `page.on('response')` globally to capture all API failures
- Each interaction in try/catch — log error, continue
- Screenshots at key failure points
- Run as Admin role (most permissions)
- `test.afterAll` writes JSON report
