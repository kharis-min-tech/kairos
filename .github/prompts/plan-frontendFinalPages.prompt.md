# Implement Frontend Pages

Use this prompt when implementing one or more frontend pages after the backend contract is known.

## Inputs

- Route path(s)
- Required role(s)
- Existing or new hook names
- API methods and response types
- Relevant design reference from `DESIGN.md`

## Implementation Checklist

1. Confirm API client methods exist.
2. Add or update TanStack Query hooks.
3. Build the route using the app shell.
4. Add role guard behavior using `activeRole`.
5. Add loading, empty, error, and success states.
6. Use `@kairos/ui`, `DateSelect`, and shared select components.
7. Add focused component/hook tests where behavior is non-trivial.
8. Run targeted web tests and typecheck.

## Parallelization

If multiple pages are independent, assign one route subtree per worker. Keep shared hooks/API methods in a separate lane or finish them first.

## Verification

Run targeted commands such as:

```bash
npm run test --workspace=@kairos/web
npm run typecheck --workspace=@kairos/web
```
