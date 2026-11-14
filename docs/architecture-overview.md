# Architecture Overview

Kairos is a Turborepo monorepo with a clear separation between the API, frontend, and shared packages.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend | Hono on Node.js |
| Database | PostgreSQL: Docker locally, PlanetScale in staging and production. Drizzle ORM. |
| Auth | bcrypt + jsonwebtoken, refresh tokens, plus Google / Microsoft / Apple OAuth |
| State | TanStack Query (server), Zustand (client) |
| Build | Turborepo + npm workspaces |
| Testing | Vitest, React Testing Library |

## Workspace map

```
apps/
  api/          Hono REST API: module routers, services, schemas, tests
  web/          Next.js frontend: App Router, components, hooks, pages
  mobile/       Expo / React Native client
  docs/         This VitePress documentation site

packages/
  types/        Shared entity, enum, and API contract types
  database/     Drizzle schemas, migrations, seeds, reset scripts
  utils/        Shared auth, responses, errors, mailer, logger
  api-client/   Typed HTTP client used by the frontend
  ui/           Shared UI components and Tailwind globals
```

## Request flow

```
Browser → Next.js (apps/web)
             ↓ fetch via @kairos/api-client
         Hono API (apps/api)
             ↓ Drizzle queries
         PostgreSQL
```

- The API runs on `http://localhost:3001` in development.
- The frontend runs on `http://localhost:3002`.
- All API routes are mounted under `/api/*` (not `/v1/*`).

## Module structure

Each API module follows a consistent pattern:

```
apps/api/src/{module}/
  schemas.ts    Zod validation schemas
  service.ts    Business logic, database queries
  router.ts     Hono route definitions (thin layer)
  *.test.ts     Co-located unit tests
```

## Route alignment

Every feature spans five layers that must stay in sync:

1. Hono route + service in `apps/api/src/{module}`
2. Shared types in `packages/types/src`
3. API client method in `packages/api-client/src/api.ts`
4. TanStack Query hook in `apps/web/src/hooks`
5. Page or component in `apps/web/src/app` or `apps/web/src/components`

## Deployment

| Piece | Where it runs |
|-------|---------------|
| API | Cloudflare Workers (`apps/api/wrangler.jsonc`) |
| Web | Cloudflare Pages |
| Docs | Cloudflare Pages, a separate project rooted at `apps/docs` |
| Database | PlanetScale (PostgreSQL) |
| Transactional email | Amazon SES |

Routing is path-based on one origin: Pages serves `/`, the Worker serves `/api/*`. Same origin means no CORS preflight.

::: warning Older notes are stale
Earlier planning documents describe mapping each module router to an AWS Lambda and swapping auth to Cognito. Neither happened. The deployment target is Cloudflare, and OAuth sign-in is already live. The architecture decision record is `docs/database-architecture.md` in the repository.
:::

## Migrations

Migrations live in `packages/database/drizzle` and run through the bootstrap script, not through `drizzle-kit migrate` directly:

```bash
DATABASE_URL='…' npm run db:bootstrap --workspace=@kairos/database
# add -- --dry-run to preview, -- --force to proceed past guards
```

See [Commands](/guide/commands).
