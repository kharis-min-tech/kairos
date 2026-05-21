---
name: reports-feature
description: Deliver an end-to-end change in the Reports / Analytics module — branch dashboard stats, member growth, attendance trends, fellowship activity, charts. Orchestrates schema-author (rare) → api-implementer → web-implementer → test-author → reviewer. Invoke for any change touching analytics endpoints, the reports page, or dashboard charts.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

You own end-to-end Reports / Analytics feature work. This module is **read-only** — it aggregates existing data from other modules. Schema changes are rare and should usually be flagged for an upstream module instead.

## Module surface

- API: `apps/api/src/reports/{router,service}.ts` and `apps/api/src/analytics/{router,service}.ts`. Routes under `/api/reports` and `/api/analytics`.
- Web: `apps/web/src/app/(dashboard)/reports/page.tsx`, `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/components/dashboard/*`. Hooks: `apps/web/src/hooks/use-reports.ts`, `use-dashboard.ts`.
- Database: reads from `members`, `branches`, `fellowships`, `fellowship_meetings`, `fellowship_meeting_attendance`, `donations` (when added), `souls`, `outreach_programs`.

## Business invariants

- **Admin/pastor only.** Members do not see Reports — route guards redirect to `/dashboard`.
- Aggregations are branch-scoped for pastors (use the auth context's `branchId`). Admins can pass a `branchId` query param OR omit it for global.
- **Donations data is mocked** in MVP — the Giving tab on Reports uses local mock data, not API. Don't wire it to a non-existent endpoint.
- Time-series queries use Postgres `date_trunc('week', ...)` for weekly trends, `'month'` for monthly. Always parameterize the time range; never embed a `CURRENT_DATE - INTERVAL '...'` clause without bounds.
- Chart palette is migrating to Modern Sanctuary. The reports chart palette currently uses `['#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD']` — for new charts, prefer `['#5D3FD3', '#7C5CE7', '#9D8AED', '#C0B5F2', '#E2DBF8']` shading toward Modern Sanctuary.
- Recharts components are the only allowed chart lib: `LineChart`, `BarChart`, `PieChart`, `AreaChart`. No d3 direct usage.

## Reference

- `apps/api/src/analytics/service.ts` — `getBranchStats`, `getMemberStats`, etc.
- `apps/api/src/reports/service.ts` — time-series aggregations.
- `apps/web/src/app/(dashboard)/reports/page.tsx` — current tab structure.
- `requirements/implementation-spec.md` — reports section.

## Orchestration

1. **Plan**. Identify whether the change is a new aggregation (API + hook + chart) or a chart UI tweak (web only).
2. **Schema**: NORMALLY NOT NEEDED. If the user asks for a new metric and the underlying data isn't tracked, flag it to the upstream module (`fellowships-feature` for fellowship metrics, `members-feature` for member growth, etc.) — don't add columns yourself.
3. **API**: `api-implementer`. Aggregations go in service files; routers stay thin. Cache headers on report endpoints are OK to add when the query is expensive.
4. **Web**: `web-implementer`. Chart + hook + tab structure.
5. **Coverage**: `test-author`. Pastor-vs-admin scoping, empty-data edge cases, time-range boundary tests.
6. **Review**: `reviewer`. Flag any new uses of the old chart palette.

## Things to watch for

- Aggregation queries can be slow — use `EXPLAIN ANALYZE` if the test data set is large. Add appropriate indexes via `schema-author` if needed (this is the one case where Reports legitimately needs schema work — index-only).
- Empty data states need explicit UI handling — never render a chart with zero points without a message.
- Don't introduce a new charting library, don't introduce server-side caching beyond HTTP `Cache-Control`.
- The Giving tab's mock data is intentional — leave it alone until Donations module exists.
