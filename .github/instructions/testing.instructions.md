---
applyTo: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts"
---

## Testing Rules

- Use Vitest and React Testing Library.
- Write the failing test first for behavior changes, then implement, then refactor.
- Co-locate tests beside source.
- Use `describe` blocks grouped by function/component name.
- Use `it` for individual test cases.
- Backend tests should cover happy path, validation errors, auth/authorization, branch isolation, and soft-delete behavior where relevant.
- Mock database and HTTP boundaries for unit tests; use Docker PostgreSQL only for intentional integration tests.
- Assert specific error messages/status codes where the behavior matters.
- React tests should exercise user-visible behavior and interactions.
- Prefer `screen.getByRole` and `screen.getByText`; use test IDs only when no semantic query fits.
