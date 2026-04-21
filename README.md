# Kairos
Kharis Project Kairos — a church administration system for managing branches, members, fellowships, donations, and more.

## Quick Demo (no setup required)

The fastest way to see Kairos running. You only need **Docker**.

```bash
# 1. Get the demo compose file
curl -O https://raw.githubusercontent.com/kharis-github/kairos/main/docker-compose.demo.yml

# 2. Start everything
docker compose -f docker-compose.demo.yml up --build
```

Then open **http://localhost:3002** in your browser.

| Credential | Value |
|---|---|
| Email | `admin@kairos.church` |
| Password | `Password1!` |

The first run takes a few minutes to build the images. Subsequent runs are instant. The database is seeded automatically with realistic branches, members, fellowships, and outreach data — no manual steps needed.

To stop: `docker compose -f docker-compose.demo.yml down`  
To wipe data and start fresh: `docker compose -f docker-compose.demo.yml down -v && docker compose -f docker-compose.demo.yml up`

---

## Prerequisites

Make sure the following are installed before getting started:

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | ≥ 20 | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| [npm](https://www.npmjs.com/) | ≥ 10.9 | Comes bundled with Node.js |
| [Docker](https://www.docker.com/) | any recent | Required to run PostgreSQL locally |
| [Docker Compose](https://docs.docker.com/compose/) | v2+ | Bundled with Docker Desktop |
| [Turborepo](https://turbo.build/) | latest | Monorepo build system — `npm install -g turbo` |

## Local Development Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd kairos
npm install
```

### 2. Configure environment variables

Copy the example env file and place it in the API app directory:

```bash
cp .env.example apps/api/.env
```

The defaults work out of the box with the local Docker database. Edit the file if you need to change anything:

```
DATABASE_URL=postgresql://kairos:kairos@localhost:5432/kairos
JWT_SECRET=local-dev-secret-change-in-production
JWT_REFRESH_SECRET=local-dev-refresh-secret-change-in-production
PORT=3001
```

### 3. Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL 15 container (`kairos-db`) on port `5432` with:
- **User:** `kairos`
- **Password:** `kairos`
- **Database:** `kairos`

Data is persisted in a named Docker volume (`kairos-pgdata`) so it survives container restarts.

### 4. Run database migrations and seed data

```bash
npx turbo db:fresh
```

This drops any existing schema, runs all Drizzle migrations, then seeds the database with sample branches, members, and fellowships for development.

> To run migrations only (without resetting): `npx turbo db:migrate`  
> To seed without migrating: `npx turbo db:seed`

### 5. Start the development servers

```bash
npx turbo dev
```

Turborepo starts all packages in parallel:

| App | URL | Description |
|-----|-----|-------------|
| API (Hono) | http://localhost:3001 | REST API server |
| Web (Next.js) | http://localhost:3002 | Frontend dashboard |

## Common Commands

```bash
# Run all tests
npx turbo test

# Type-check all packages
npx turbo typecheck

# Lint all packages
npx turbo lint

# Build all packages for production
npx turbo build

# Open Drizzle Studio (database GUI)
npx turbo db:studio

# Generate a new migration after schema changes
npx turbo db:generate
```

## Project Structure

```
apps/
  api/        — Hono REST API (TypeScript, runs on Node.js)
  web/        — Next.js 15 frontend (App Router, Tailwind, Shadcn/ui)
packages/
  database/   — Drizzle ORM schemas and migrations
  types/      — Shared TypeScript types and enums
  utils/      — Shared utilities (auth, errors, validation, logger)
  api-client/ — Typed HTTP client used by the frontend
  ui/         — Shadcn/ui component library
```

## Stopping the Database

```bash
docker compose down
```

Add `-v` to also delete all stored data:

```bash
docker compose down -v
```
