# Kairos — Rebuild v2

## Architecture
- **Monorepo**: Turborepo + npm workspaces
- **Frontend**: Next.js 15 App Router, Shadcn/ui, Tailwind CSS, Zustand
- **Backend**: Hono framework (TypeScript-first, native Lambda adapter)
- **Database**: Docker PostgreSQL 15 (local), Aurora Serverless v2 (future)
- **ORM**: Drizzle ORM
- **Auth**: bcrypt + jsonwebtoken (local dev); Cognito swap at deployment
- **Testing**: Vitest + React Testing Library, strict TDD

## MVP Modules
1. Auth — signup, login, verify email, forgot/reset password, JWT tokens, admin approval
2. Branches — CRUD, pastor assignment, branch isolation
3. Members — directory, CRUD, profile, approval, role assignment
4. Fellowships — 5 subtypes (K-Groups, Kharis Express, New Breeds, KOC, KOC Colleges), meetings, attendance

## Workspace Structure
```
apps/api/        — Hono API server (module routers + lambda entry points)
apps/web/        — Next.js 15 frontend
packages/types/  — Shared TypeScript types + enums
packages/database/ — Drizzle ORM schemas + migrations
packages/utils/  — Shared utilities (auth, errors, validation, logger)
packages/api-client/ — Typed HTTP client
packages/ui/     — Shadcn/ui component library
```

## Key Conventions
- TDD: Write failing tests first, then implement
- Branch isolation: Non-admin queries always filtered by user's branchId
- Route alignment triplet: Hono router → API client method → frontend hook
- camelCase in TypeScript, snake_case in SQL columns
- UUID primary keys in Drizzle (mapped from SERIAL in raw SQL)
- Soft deletes via `isActive` boolean — never hard delete

## Dev Startup
```bash
docker compose up -d   # Start PostgreSQL
npx turbo dev          # API on :3001, Next.js on :3000
```

## Color Palette
- Primary: Purple #6D28D9
- Accent: Gold #D97706
- Success: Emerald #059669
- Error: Rose #E11D48
