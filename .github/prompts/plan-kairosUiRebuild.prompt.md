# Plan A Kairos UI Slice

Use this prompt for a page, workflow, or component cluster.

## Context To Read

- `DESIGN.md`
- `AGENTS.md`
- The nearest existing route in `apps/web/src/app`
- Related hooks in `apps/web/src/hooks`
- Related API client methods in `packages/api-client/src/api.ts`
- Shared UI components in `packages/ui/src/components`

## Required Plan Shape

1. User role and route guard behavior.
2. Data dependencies and hook/API-client coverage.
3. Page layout and responsive behavior.
4. Form validation and mutations.
5. Empty/loading/error states.
6. Accessibility notes for icon-only controls and interactive elements.
7. Tests.
8. Verification commands.
9. Parallel work split if useful.

## UI Standards

- Fit the authenticated app shell; do not create a separate nav system.
- Use dark purple headers, not navy.
- Use `DateSelect` for dates.
- Use shared select components for dropdowns.
- Use `@kairos/ui` primitives first.
- Avoid nested cards and decorative section dividers.
- Keep text and controls stable on mobile.

## Parallel Work

Good UI splits:

- Data hooks and API client method.
- Page shell and route guard.
- Form/detail component cluster.
- Tests.

Avoid parallel writes to the same route file.
