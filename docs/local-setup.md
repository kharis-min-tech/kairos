# Local Setup

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| npm | ≥ 10.9 | Bundled with Node.js |
| Docker | any recent | Required to run PostgreSQL locally |
| Docker Compose | v2+ | Bundled with Docker Desktop |
| Turborepo | latest | `npm install -g turbo` |

## Steps

### 1. Clone and install

```bash
git clone <repo-url>
cd kairos
npm install
```

### 2. Configure environment

```bash
cp .env.example apps/api/.env
```

The defaults work out of the box with the local Docker database:

```env
DATABASE_URL=postgresql://kairos:kairos@localhost:5432/kairos
JWT_SECRET=local-dev-secret-change-in-production
JWT_REFRESH_SECRET=local-dev-refresh-secret-change-in-production
PORT=3001
```

### 3. Start the database

```bash
docker compose up -d
```

Starts a PostgreSQL 15 container on port `5432`:

| Setting | Value |
|---------|-------|
| User | `kairos` |
| Password | `kairos` |
| Database | `kairos` |

Data persists in a named Docker volume (`kairos-pgdata`) across container restarts.

### 4. Migrate and seed

```bash
npx turbo db:fresh
```

Drops the existing schema, runs all Drizzle migrations, then seeds with sample branches, members, fellowships, and outreach data.

- Migrations only: `npx turbo db:migrate`
- Seed only: `npx turbo db:seed`

### 5. Start dev servers

```bash
npx turbo dev
```

| App | URL | Description |
|-----|-----|-------------|
| API (Hono) | http://localhost:3001 | REST API server |
| Web (Next.js) | http://localhost:3002 | Frontend dashboard |

## Demo login

| Field | Value |
|-------|-------|
| Email | `admin@kairos.church` |
| Password | `Password1!` |

## Stop the database

```bash
docker compose down

# Also delete stored data
docker compose down -v
```
