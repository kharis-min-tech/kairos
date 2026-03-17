---
description: "Create a new Next.js page with data fetching, following TDD. Input: route path, data requirements, page purpose."
mode: agent
agent: frontend-ui
---

# Implement Page

## Inputs
- **Route**: ${{ROUTE_PATH}} (e.g., /dashboard/members)
- **Purpose**: ${{PAGE_PURPOSE}}

## Steps

### 1. Ensure API Hooks Exist
Check that TanStack Query hooks exist in `apps/web/src/hooks/` for the data this page needs.
If not, create them first (see `implement-api-hook` prompt).

### 2. Write Page Tests
Create test file at `apps/web/src/__tests__/${{PAGE_NAME}}.test.tsx`:
- Renders page title and key elements
- Shows loading skeleton while data loads
- Shows error state when API fails
- Shows empty state when no data
- Handles user interactions (click, form submit, navigation)

### 3. Run Tests — Confirm They Fail
```bash
cd apps/web && npx vitest run src/__tests__/${{PAGE_NAME}}.test.tsx
```

### 4. Implement the Page
Create `apps/web/src/app/${{ROUTE_PATH}}/page.tsx`:
- Use TanStack Query hooks for data
- Use Shadcn/ui components (Table, Card, Button, Dialog, etc.)
- Handle loading, error, and empty states
- Use `<Link>` for navigation
- Use `react-hook-form` + `zodResolver` for forms

### 5. Run Tests — Confirm They Pass
```bash
cd apps/web && npx vitest run src/__tests__/${{PAGE_NAME}}.test.tsx
```

### 6. Create Sub-Components
Extract reusable pieces into `apps/web/src/components/${{DOMAIN}}/`:
- List/table component
- Detail/card component
- Form component (create/edit)
- Filter/search bar
