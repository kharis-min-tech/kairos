---
description: "Write comprehensive unit tests for an existing handler or component. Input: file path to test."
mode: agent
agent: testing
---

# Write Unit Tests

## Inputs
- **Target File**: ${{FILE_PATH}}
- **Type**: ${{FILE_TYPE}} (handler | component | hook | utility)

## Steps

### 1. Read the Target File
Understand the function/component signature, dependencies, branches, and error paths.

### 2. Identify Test Scenarios

**For API Handlers:**
- [ ] Success response (correct status code + body shape)
- [ ] Validation error (missing/invalid fields → 400)
- [ ] Unauthorized (no auth context → 401)
- [ ] Forbidden (wrong branch → 403)
- [ ] Not found (missing resource → 404)
- [ ] Conflict (duplicate → 409)
- [ ] Branch isolation (non-admin filtered to own branch)
- [ ] Pagination (correct page/limit/total calculation)

**For React Components:**
- [ ] Renders with required props
- [ ] Renders with all optional props
- [ ] Loading state
- [ ] Error state
- [ ] Empty state
- [ ] User interactions (click, input, submit)
- [ ] Conditional rendering

**For Hooks:**
- [ ] Returns correct data shape
- [ ] Handles loading/error/success states
- [ ] Mutations call correct API method
- [ ] Mutations invalidate correct query keys

**For Utilities:**
- [ ] Correct output for valid input
- [ ] Error handling for invalid input
- [ ] Edge cases (null, undefined, empty, boundary values)

### 3. Write Tests
Create test file following the naming convention:
- Handlers: `<name>.test.ts` alongside the handler
- Components: `src/__tests__/<name>.test.tsx`
- Hooks: `src/__tests__/<name>.test.tsx`
- Utilities: `<name>.test.ts` alongside the utility

### 4. Run Tests
```bash
npx vitest run ${{TEST_FILE_PATH}}
```

### 5. Verify Coverage
Ensure all identified scenarios have corresponding tests. Every `if`/`else` branch in the target should be tested.
