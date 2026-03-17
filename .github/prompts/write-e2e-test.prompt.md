---
description: "Write Playwright E2E test for a user flow. Input: feature name, user role, flow steps."
mode: agent
agent: testing
---

# Write E2E Test

## Inputs
- **Feature**: ${{FEATURE_NAME}}
- **User Role**: ${{USER_ROLE}} (admin | pastor | leader | member)
- **Flow**: ${{FLOW_DESCRIPTION}}

## Steps

### 1. Review Existing E2E Patterns
Read `e2e/helpers.ts` for the `ErrorCollector` pattern and login helpers.
Read an existing test like `e2e/walkthrough-admin.spec.ts` for structure.

### 2. Write Test

Create `e2e/${{TEST_NAME}}.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('${{FEATURE_NAME}}', () => {
  test.beforeEach(async ({ page }) => {
    // Login as the appropriate role
  });

  test('should ${{FLOW_DESCRIPTION}}', async ({ page }) => {
    // Use resilient selectors:
    // - page.getByRole('button', { name: 'Submit' })
    // - page.getByText('Expected text')
    // - page.getByTestId('unique-id')
    // - page.getByLabel('Field label')

    // Navigate
    await page.goto('/${{ROUTE}}');

    // Interact
    await page.getByRole('button', { name: 'Action' }).click();

    // Assert
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### 3. Selector Guidelines
- Prefer `getByRole` → `getByText` → `getByLabel` → `getByTestId`
- Never use CSS selectors (`.class`, `#id`, `div > span`)
- Use `waitFor` for async operations
- Use `expect(...).toBeVisible()` over `toBeInTheDocument()`

### 4. Run Test
```bash
npx playwright test e2e/${{TEST_NAME}}.spec.ts
```

### 5. Debug Failures
If test fails:
- Check `playwright-report/index.html` for screenshots and traces
- Verify the application is running and accessible
- Check for timing issues — add `waitFor` if needed
