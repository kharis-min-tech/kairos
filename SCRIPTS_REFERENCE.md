# Kairos Scripts Reference

Quick reference for all npm scripts in the project.

## 🚀 Development

### Start All Services
```bash
npm run dev
```
Starts both API (port 3001) and Web (port 3000) in development mode with hot reload.

### Build for Production
```bash
npm run build
```
Builds all packages and applications for production.

### Type Checking
```bash
npm run typecheck
```
Runs TypeScript type checking across all packages.

### Linting
```bash
npm run lint
```
Runs ESLint across all packages.

## 🗄️ Database Management

### Generate Migration
```bash
npm run db:generate
```
Generates Drizzle migration files from schema changes.
- **When to use**: After modifying schema files in `packages/database/src/schema/`
- **Output**: Creates SQL files in `packages/database/drizzle/`

### Apply Migrations
```bash
npm run db:migrate
```
Applies pending migrations to the database.
- **When to use**: After generating migrations or on fresh database
- **What it does**: Executes SQL migrations in order

### Drop Database
```bash
npm run db:drop
```
⚠️ **DESTRUCTIVE** - Drops all tables and data.
- **When to use**: When you need a clean slate
- **Warning**: Cannot be undone!

### Fresh Database
```bash
npm run db:fresh
```
⚠️ **DESTRUCTIVE** - Complete database reset.
- **What it does**: 
  1. Drops all tables
  2. Runs migrations
  3. Seeds test data
- **When to use**: When you want to start completely fresh

### Seed Database
```bash
npm run db:seed
```
Populates database with test data.
- **When to use**: After migrations on empty database
- **What it creates**:
  - 3 regions
  - 5 branches
  - 13 members (various roles)
  - 4 roles
  - 4 fellowships
  - Test accounts with password: `Password1!`

### Database Studio
```bash
npm run db:studio
```
Opens Drizzle Studio for visual database management.
- **URL**: http://localhost:4983
- **Features**: Browse tables, edit data, run queries

## 🧪 Testing

### Run All Tests
```bash
npm test
```
Runs test suites across all packages.

### Run API Tests Only
```bash
cd apps/api
npm test
```
Runs backend API tests including:
- Outreach programs service (9 tests)
- Souls service (15 tests)
- Follow-ups service
- Conversion service

### Run Tests in Watch Mode
```bash
cd apps/api
npm test -- --watch
```
Runs tests and re-runs on file changes.

## 📦 Package-Specific Scripts

### Database Package
```bash
cd packages/database

# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Drop database
npm run db:drop

# Fresh reset
npm run db:fresh

# Seed data
npm run db:seed

# Open studio
npm run db:studio

# Build package
npm run build

# Watch mode
npm run dev
```

### API Package
```bash
cd apps/api

# Start dev server
npm run dev

# Run tests
npm test

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

### Web Package
```bash
cd apps/web

# Start dev server
npm run dev

# Build
npm run build

# Start production server
npm start

# Type check
npm run typecheck

# Lint
npm run lint
```

## 🔄 Common Workflows

### Starting Fresh Development
```bash
# 1. Start database
docker compose up -d

# 2. Install dependencies
npm install

# 3. Setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Start dev servers
npm run dev
```

### After Schema Changes
```bash
# 1. Generate migration
npm run db:generate

# 2. Apply migration
npm run db:migrate

# 3. Restart dev servers
npm run dev
```

### Complete Reset
```bash
# 1. Fresh database
npm run db:fresh

# 2. Restart dev servers
npm run dev
```

### Before Committing Code
```bash
# 1. Type check
npm run typecheck

# 2. Lint
npm run lint

# 3. Run tests
npm test

# 4. Build
npm run build
```

## 🐳 Docker Commands

### Start Database
```bash
docker compose up -d
```

### Stop Database
```bash
docker compose down
```

### View Logs
```bash
docker compose logs -f
```

### Remove Database Volume
```bash
docker compose down -v
```
⚠️ This deletes all database data!

### Restart Database
```bash
docker compose restart
```

## 🔍 Debugging

### Check Database Connection
```bash
# From database package
cd packages/database
npx tsx -e "import {createDb} from './src/index.js'; const db = createDb(); console.log('Connected!');"
```

### View Migration Status
```bash
cd packages/database
npx drizzle-kit status
```

### Check Running Processes
```bash
# Check if API is running
lsof -i :3001

# Check if Web is running
lsof -i :3000

# Check if database is running
lsof -i :5432
```

## 📊 Monitoring

### View API Logs
```bash
cd apps/api
npm run dev
# Logs appear in terminal
```

### View Database Queries
Enable query logging in `packages/database/src/index.ts`:
```typescript
const db = drizzle(sql, { 
  schema, 
  logger: true  // Add this
});
```

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001 (API)
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000 (Web)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5432 (Database)
lsof -ti:5432 | xargs kill -9
```

### Database Connection Failed
```bash
# Check if Docker is running
docker ps

# Restart database
docker compose restart

# Check .env file
cat .env | grep DATABASE_URL
```

### Migration Errors
```bash
# Drop and recreate
npm run db:fresh

# Or manually reset
npm run db:drop
npm run db:migrate
npm run db:seed
```

### Node Modules Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or use turbo clean
npx turbo clean
npm install
```

## 📝 Notes

- All passwords in seed data: `Password1!`
- Database credentials: `kairos` / `kairos`
- API runs on port `3001`
- Web runs on port `3000`
- Database runs on port `5432`
- Drizzle Studio runs on port `4983`

## 🔗 Related Files

- `package.json` - Root package with all scripts
- `docker-compose.yml` - Database configuration
- `.env` - Environment variables
- `DEPLOYMENT.md` - Full deployment guide
- `deploy-test.sh` - Automated deployment test
