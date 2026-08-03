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
npx turbo db:fresh     # Drop schema, migrate, and seed (full reset)
npx turbo db:migrate   # Run pending migrations only
npx turbo db:seed      # Seed without migrating
npx turbo db:generate  # Generate a new migration after schema changes
npx turbo db:studio    # Open Drizzle Studio (database GUI)
```

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
