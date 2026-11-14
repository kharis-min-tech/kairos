# Commands

All commands run from the monorepo root unless noted.

## Development

```bash
npx turbo dev          # Start all apps in parallel
docker compose up -d   # Start PostgreSQL
docker compose down    # Stop PostgreSQL
docker compose down -v # Stop and delete all data
```

## Database

```bash
npx turbo db:fresh     # Drop schema, migrate, and seed (full local reset)
npx turbo db:seed      # Seed without migrating
npx turbo db:generate  # Generate a new migration after schema changes
npx turbo db:studio    # Open Drizzle Studio (database GUI)
```

`db:bootstrap` and `db:diagnose` are not Turbo tasks; run them on the workspace directly:

```bash
DATABASE_URL='…' npm run db:diagnose --workspace=@kairos/database
```

### Applying migrations

Migrations go through the bootstrap script, which reconciles the Drizzle journal against the live schema before applying anything. This is the path for every environment, local included:

```bash
DATABASE_URL='…' npm run db:bootstrap --workspace=@kairos/database

# Preview without writing
DATABASE_URL='…' npm run db:bootstrap --workspace=@kairos/database -- --dry-run

# Proceed past the safety guards
DATABASE_URL='…' npm run db:bootstrap --workspace=@kairos/database -- --force
```

::: warning Do not reach for raw psql or drizzle-kit migrate
The journal and the live schema have drifted apart more than once, and `db:bootstrap` is what detects it. `db:diagnose` reports the drift without changing anything; run it before any fresh-database deploy.
:::

## Testing

```bash
npx turbo test                          # Run all tests
npm run test --workspace=@kairos/api    # API tests only
npm run test --workspace=@kairos/web    # Web tests only
```

Always use `--run` (or the equivalent single-execution flag) when running tests non-interactively:

```bash
npx vitest --run
```

## Type checking & linting

```bash
npx turbo typecheck                          # Check all packages
npm run typecheck --workspace=@kairos/api    # API only
npm run typecheck --workspace=@kairos/web    # Web only
npx turbo lint                               # Lint all packages
```

## Build

```bash
npx turbo build    # Build all packages for production
```
