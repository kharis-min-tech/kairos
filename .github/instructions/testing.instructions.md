---
applyTo: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts"
---

## Testing Rules

- TDD: Write failing test FIRST, then implement, then refactor
- Framework: Vitest + React Testing Library
- Co-locate test files beside source: `module.test.ts` next to `module.ts`
- Use `describe` blocks grouped by function/component name
- Use `it` (not `test`) for individual test cases
- Test categories per module: happy path, validation errors, auth/authorization, branch isolation
- Mock external dependencies (database, HTTP) — never hit real services in unit tests
- Use `vi.mock()` for module mocks, `vi.fn()` for function mocks
- Assert specific error messages and status codes, not just "throws"
- For React components: test user interactions, not implementation details
- Use `screen.getByRole`, `screen.getByText` — avoid `getByTestId` unless necessary
- Integration tests can use a test database (Docker PostgreSQL)
