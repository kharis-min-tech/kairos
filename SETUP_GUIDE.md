# Kairos Setup Guide

## Login Credentials

### Admin Account
- **Email:** `admin@kairos.local`
- **Password:** `Password1!`

### Other Test Accounts
All test accounts use the same password: `Password1!`

- **Pastor:** `pastor@kairos.local`
- **Member:** `member@kairos.local`

---

## Database Commands

### Prerequisites
1. Ensure Docker Desktop is running
2. Start Docker containers: `docker compose up -d`

### Database CLI Commands

```bash
# Generate migrations from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Drop all tables and data
npm run db:drop

# Fresh database (drop + migrate + seed)
npm run db:fresh

# Open Drizzle Studio (database GUI)
npm run db:studio

# Seed database with test data
npm run db:seed

# Seed souls data
npm run db:seed-souls
```

### Direct Drizzle Kit Commands

From the `packages/database` directory:

```bash
# Generate migrations
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Open Drizzle Studio
npx drizzle-kit studio

# Push schema changes without migrations
npx drizzle-kit push
```

---

## Development Servers

### Start Frontend (Next.js)
```bash
cd apps/web
npm run dev -- --port 3002
```
Access at: http://localhost:3002

### Start Backend API
```bash
cd apps/api
npm run dev
```
Access at: http://localhost:3001

### Start All Services (Turbo)
```bash
npm run dev
```

---

## Docker Commands

### Start Database
```bash
docker compose up -d
```

### Stop Database
```bash
docker compose down
```

### Reset Database (remove volumes)
```bash
docker compose down -v
docker compose up -d
```

### Access Database Shell
```bash
docker exec -it kairos-db psql -U kairos -d kairos
```

### Check Database Logs
```bash
docker logs kairos-db
```

---

## Database Connection

**Connection String:**
```
postgresql://kairos:kairos@localhost:5432/kairos
```

**Environment Variables (.env):**
```env
DATABASE_URL=postgresql://kairos:kairos@localhost:5432/kairos
JWT_SECRET=local-dev-secret-change-in-production
JWT_REFRESH_SECRET=local-dev-refresh-secret-change-in-production
PORT=3001
```

---

## Troubleshooting

### Database Connection Issues

If you get "role kairos does not exist":

1. **Reset Docker volumes:**
   ```bash
   docker compose down -v
   docker compose up -d
   sleep 5
   ```

2. **Verify database is running:**
   ```bash
   docker ps
   docker logs kairos-db
   ```

3. **Test connection from inside container:**
   ```bash
   docker exec kairos-db psql -U kairos -d kairos -c "SELECT version();"
   ```

4. **Check users:**
   ```bash
   docker exec kairos-db psql -U kairos -d kairos -c "\du"
   ```

### Frontend Build Errors

If you get module not found errors:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Restart dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev -- --port 3002
   ```

### Backend API Errors

If backend fails to start:

1. **Check database is running:**
   ```bash
   docker ps | grep kairos-db
   ```

2. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Seed database:**
   ```bash
   npm run db:seed
   ```

---

## Donations Module

The donations module has been added with the following pages:

1. **History** - `/donations` - View all donations with filters
2. **Record** - `/donations/record` - Record manual donations
3. **Reports** - `/donations/reports` - Analytics and reports
4. **Import** - `/donations/import` - CSV bulk import

### Features:
- Branch isolation (Pastors see only their branch)
- Anonymous donations support
- GBP currency only
- CSV import/export
- UK tax year templates
- Real-time validation

---

## API Endpoints

### Deployed Backend
- **URL:** https://api-staging.khar.is
- **Status:** Active and deployed

### Local Backend
- **URL:** http://localhost:3001
- **Status:** Requires database setup

---

## Quick Start

1. **Start Docker:**
   ```bash
   docker compose up -d
   ```

2. **Setup Database:**
   ```bash
   npm run db:fresh
   ```

3. **Start Frontend:**
   ```bash
   cd apps/web
   npm run dev -- --port 3002
   ```

4. **Login:**
   - Go to http://localhost:3002
   - Email: `admin@kairos.local`
   - Password: `Password1!`

5. **Access Donations:**
   - Click "Donations" in the sidebar
   - Module connects to deployed API at https://api-staging.khar.is
