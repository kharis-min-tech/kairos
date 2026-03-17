---
name: tdd-workflow
description: "**WORKFLOW SKILL** — Enforces strict TDD red-green-refactor cycle for Kairos features. USE FOR: implementing any new handler, component, hook, or utility where tests must be written first. Covers test creation, verification of failure, implementation, verification of pass, and refactoring."
---

# TDD Workflow Skill

## When to Use
Use this skill whenever implementing a new feature, handler, component, hook, or utility in the Kairos project. This skill enforces the red-green-refactor cycle.

## Workflow

### Step 1: Understand the Requirement
Read the feature spec or requirements. Identify:
- What is the input/output contract?
- What are the error cases?
- What are the edge cases?
- What dependencies need mocking?

### Step 2: RED — Write Failing Tests

Write the test file FIRST. Follow the test patterns in [references/test-patterns.md](.github/skills/tdd-workflow/references/test-patterns.md).

**For API handlers** (`apps/api/src/<domain>/<domain>-<action>.test.ts`):
- Mock `@kairos/utils` and `@kairos/database`
- Test: success, validation error, auth error, branch isolation, not found, conflict

**For React components** (`apps/web/src/__tests__/<name>.test.tsx`):
- Mock data hooks
- Test: renders, loading, error, empty, interactions

**For hooks** (`apps/web/src/__tests__/use-<domain>.test.tsx`):
- Wrap in QueryClientProvider
- Test: data return, loading, error, mutation calls, cache invalidation

Run the tests to confirm they FAIL:
```bash
npx vitest run <test-file-path>
```

All tests should fail (red). If any pass, the test is not testing new behaviour.

### Step 3: GREEN — Write Minimum Code to Pass

Implement the minimum code needed to make ALL tests pass. Do not add:
- Extra features not covered by tests
- Premature optimizations
- Code for hypothetical requirements

Run tests again:
```bash
npx vitest run <test-file-path>
```

All tests should pass (green).

### Step 4: REFACTOR — Clean Up While Green

With all tests passing, refactor:
- Extract shared logic into utilities
- Simplify complex conditionals
- Improve naming
- Remove duplication

Run tests after EVERY refactor change to ensure they stay green.

### Step 5: Integration Check

Run the full test suite for the affected package:
```bash
npx turbo test --filter=<package-name>
```

## Key Principles

1. **Never write production code without a failing test first**
2. **Write the simplest test that fails for the right reason**
3. **Write the simplest code that passes the test**
4. **Refactor only with all tests green**
5. **Each test should test ONE behaviour**
6. **Tests are documentation — name them as specifications**
