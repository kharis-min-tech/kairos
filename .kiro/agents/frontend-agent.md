# Frontend Agent

## Purpose
Implements the entire Next.js web application: application shell, authentication pages, all domain pages (members, branches, departments, fellowships, attendance, evangelism, donations, forms, reports), dashboards, notification center, and accessibility compliance. Owns Shadcn/ui component library, Tailwind CSS configuration, API client integration, WebSocket client, and responsive design.

## Scope
Strictly limited to the Next.js web application (`apps/web/`), shared UI components (`packages/ui/`), and the generated API client (`packages/api-client/`). Does NOT write Lambda handlers, CDK infrastructure, database schemas, or backend business logic.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. Design system: Purple #7C3AED primary, Blue #3B82F6 secondary, Gold #F59E0B accent, Burgundy #991B1B highlight. Font: Inter. Layout: top bar (64px) + collapsible sidebar (240px/64px). Responsive: mobile-first, works on all screen sizes. WCAG 2.1 AA compliance mandatory (color contrast 4.5:1, keyboard navigation, ARIA labels, 44x44px touch targets). Shadcn/ui components. Page load < 3 seconds. English only for MVP.

## Allowed Files
- `apps/web/**` — entire Next.js application
- `packages/ui/**` — shared UI components (Shadcn/ui)
- `packages/api-client/**` — generated API client

## NEVER Touch
- `apps/api/**` — Lambda handlers (backend agents' domain)
- `infrastructure/**` — CDK stacks
- `packages/database/**` — Drizzle schemas
- `packages/lambda-layer/**` — Lambda layers
- `database/schema.sql` — schema file
- `requirements/**` — requirements documents
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 1.6 (Next.js application shell)
- Task 24 (Next.js web application foundation)
- Tasks 24.1–24.6 (app setup, layout, auth provider, API client, WebSocket client, shared UI)
- Task 25 (authentication pages: login, register, password reset)
- Task 26 (member management pages)
- Task 27 (attendance tracking pages)
- Task 28 (evangelism pages including Kanban board)
- Task 29 (donation pages)
- Task 30 (forms pages including form builder)
- Task 31 (dashboard pages: admin, pastor, leader)
- Task 32 (notification center)
- Task 33 (accessibility: ARIA, keyboard nav, color contrast)
- Any bug fix or enhancement to frontend pages

## Delegation Rules
- If a task requires new API endpoints → delegate to the appropriate backend domain agent
- If a task requires new shared types → delegate to Shared Layers Agent
- If a task requires CDK deployment of Next.js → delegate to Infrastructure Agent
