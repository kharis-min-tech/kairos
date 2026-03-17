---
applyTo: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts"
---

## Testing Rules

- Structure: `describe('unit name', () => { it('should ...', () => { ... }) })`
- Setup: `beforeEach(() => { vi.clearAllMocks(); })` — always reset mocks between tests
- Arrange-Act-Assert pattern in every test
- Mock external dependencies (`@kairos/utils`, `@kairos/database`, API hooks) — never real DB or network calls in unit tests
- Use `vi.fn()` for mock functions, `vi.mock()` for module mocks
- Assert specific values — not just "truthy" or "defined"
- Test error paths, not just happy paths
- API handler tests must cover: success, validation error, auth error, branch isolation, not found, conflict/duplicate
- React component tests must cover: renders correctly, loading state, error state, empty state, user interactions
- E2E tests use resilient selectors: `getByRole`, `getByText`, `getByTestId` — never CSS selectors
- Never use `test.only` or `describe.only` in committed code
- Test file naming: `<name>.test.ts` for unit/integration, `<name>.spec.ts` for E2E
