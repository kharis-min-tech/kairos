# Kairos Deployment Summary

## ✅ Current Status

The Kairos application is **ready for local deployment** with all components in place:

### Backend (Complete)
- ✅ Hono API server configured
- ✅ All outreach module endpoints implemented
- ✅ 24 backend tests passing
- ✅ Database migrations ready (including outreach module)
- ✅ Seed data script with test accounts

### Frontend (Complete)
- ✅ Next.js 15 App Router configured
- ✅ Outreach module pages implemented
- ✅ Zustand stores for state management
- ✅ Shadcn/ui components integrated
- ✅ Navigation with icons

### Database (Ready)
- ✅ Docker Compose configuration
- ✅ PostgreSQL 15 Alpine image
- ✅ Drizzle ORM schemas
- ✅ 5 migration files (including outreach)
- ✅ Seed script with realistic data

## 🚀 Quick Start (3 Commands)

```bash
# 1. Start database
docker compose up -d

# 2. Setup database
npm run db:fresh

# 3. Start servers
npm run dev
```

Then open http://localhost:3000 and login with:
- Email: `admin@kairos.local`
- Password: `Password1!`

## 📋 Detailed Deployment Steps

### Prerequisites Check
- [ ] Node.js 20+ installed
- [ ] Docker installed and running
- [ ] npm 10.9.2+ installed

### Step-by-Step Deployment

#### 1. Start PostgreSQL Database
```bash
docker compose up -d
```

**What this does:**
- Starts PostgreSQL 15 container
- Creates `kairos` database
- Exposes port 5432
- Creates persistent volume `kairos-pgdata`

**Verify:**
```bash
docker ps
# Should show kairos-db container running
```

#### 2. Install Dependencies
```bash
npm install
```

**What this does:**
- Installs all workspace dependencies
- Sets up Turborepo
- Installs packages for all apps and packages

**Expected output:**
- No errors
- `node_modules` folder created

#### 3. Generate Database Schema
```bash
npm run db:generate
```

**What this does:**
- Reads schema from `packages/database/src/schema/`
- Generates SQL migration files
- Places them in `packages/database/drizzle/`

**Note:** This step may show "No schema changes" if migrations already exist.

#### 4. Apply Migrations
```bash
npm run db:migrate
```

**What this does:**
- Connects to PostgreSQL
- Runs all migration files in order:
  - 0000: Initial schema (regions, branches, members)
  - 0001: Roles and leadership
  - 0002: Fellowships
  - 0003: **Outreach module** (programs, souls, follow-ups)
  - 0009: Photo URL field update

**Expected output:**
```
Applying migrations...
✓ 0000_nifty_riptide.sql
✓ 0001_goofy_talos.sql
✓ 0002_silly_tyger_tiger.sql
✓ 0003_open_spot.sql
✓ 0009_photo_url_to_text.sql
Migrations complete!
```

#### 5. Seed Test Data
```bash
npm run db:seed
```

**What this does:**
- Clears existing data
- Creates 3 regions (UK, Ghana, Sierra Leone)
- Creates 5 branches
- Creates 13 members with various roles
- Creates 4 roles
- Creates 4 fellowships
- Assigns members to fellowships

**Expected output:**
```
Seeding database...
✓ Cleared existing data
✓ 3 regions
✓ 5 branches
✓ 13 members (1 admin, 3 pastors, 2 leaders, 5 regular, 1 pending, 1 unverified)
✓ 4 roles
✓ 4 member-role assignments
✓ 5 leadership assignments
✓ 4 fellowships
✓ 9 fellowship memberships
✅ Seed complete!
```

#### 6. Start Development Servers
```bash
npm run dev
```

**What this does:**
- Starts API server on port 3001
- Starts Web frontend on port 3000
- Enables hot reload for both

**Expected output:**
```
@kairos/api:dev: Server running on http://localhost:3001
@kairos/web:dev: Ready on http://localhost:3000
```

## 🧪 Testing the Deployment

### 1. Test Database Connection
```bash
npm run db:studio
```
Opens Drizzle Studio at http://localhost:4983

### 2. Test Backend API
```bash
cd apps/api
npm test
```

**Expected results:**
- ✅ 9 outreach programs service tests pass
- ✅ 15 souls service tests pass
- ✅ All other module tests pass

### 3. Test Frontend

1. Open http://localhost:3000
2. Login with `admin@kairos.local` / `Password1!`
3. Navigate to:
   - Dashboard: `/dashboard`
   - Outreach Programs: `/outreach/programs`
   - Souls Pipeline: `/souls`
   - Soul Capture: `/souls/capture`
   - Reports: `/outreach/reports`

### 4. Test Outreach Module Features

#### Create Outreach Program
1. Go to `/outreach/programs`
2. Click "Create Program"
3. Fill in:
   - Program Name: "Test Evangelism"
   - Date: Today's date
   - Location: "Test Location"
   - Coordinator: Select a member
4. Submit
5. Verify program appears in list

#### Capture Soul
1. Go to `/souls/capture`
2. Fill in:
   - First Name: "John"
   - Last Name: "Doe"
   - Phone: "+1234567890"
   - Select outreach program (optional)
3. Submit
4. Verify success message
5. Click link to view soul detail

#### Log Follow-up
1. On soul detail page
2. Click "Log Follow-up"
3. Fill in:
   - Contact Method: "Phone Call"
   - Contact Status: "Successful"
   - Duration: 15 minutes
   - Notes: "Discussed faith"
4. Submit
5. Verify follow-up appears in history

#### View Kanban Board
1. Go to `/souls`
2. Verify columns: New, Following Up, Interested, Converted
3. Drag a soul card to different column
4. Verify status updates

#### View Reports
1. Go to `/outreach/reports`
2. Apply filters (date range, program, branch)
3. Verify funnel visualization
4. Check conversion metrics

## 📊 Test Accounts

All accounts use password: `Password1!`

### Admin Account
- **Email**: `admin@kairos.local`
- **Role**: Administrator
- **Branch**: London
- **Permissions**: Full access to all features

### Pastor Accounts
- **London**: `james.okonkwo@kairos.local`
- **Manchester**: `grace.mensah@kairos.local`
- **Accra**: `kwame.asante@kairos.local`
- **Permissions**: Branch-scoped access, can manage programs

### Leader Accounts
- **London**: `sarah.williams@kairos.local`
- **Accra**: `david.appiah@kairos.local`
- **Permissions**: Branch-scoped access, fellowship leadership

### Member Accounts
- **London**: `emma.thompson@kairos.local`
- **Accra**: `michael.adjei@kairos.local`
- **Permissions**: View assigned souls, log follow-ups

### Special Accounts
- **Pending Approval**: `new.applicant@kairos.local`
- **Unverified Email**: `unverified@kairos.local`

## 🔧 Troubleshooting

### Docker Permission Denied
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo
sudo docker compose up -d
```

### Port Already in Use
```bash
# Check what's using the port
lsof -i :5432  # Database
lsof -i :3001  # API
lsof -i :3000  # Web

# Kill process
lsof -ti:5432 | xargs kill -9
```

### Database Connection Failed
```bash
# Check Docker is running
docker ps

# Check .env file
cat .env | grep DATABASE_URL

# Restart database
docker compose restart
```

### Migration Errors
```bash
# Fresh reset
npm run db:fresh
```

### Tests Failing
```bash
# Ensure database is running
docker ps

# Ensure migrations are applied
npm run db:migrate

# Run tests with verbose output
cd apps/api
npm test -- --reporter=verbose
```

## 📁 Project Structure

```
kairos/
├── apps/
│   ├── api/                    # Hono API (port 3001)
│   │   ├── src/
│   │   │   ├── outreach/      # Outreach module
│   │   │   │   ├── router.ts
│   │   │   │   ├── souls-router.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── souls-service.ts
│   │   │   │   ├── follow-ups-service.ts
│   │   │   │   └── conversion-service.ts
│   │   │   └── app.ts
│   │   └── package.json
│   └── web/                    # Next.js (port 3000)
│       ├── src/
│       │   ├── app/(dashboard)/
│       │   │   ├── outreach/
│       │   │   │   ├── programs/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── new/page.tsx
│       │   │   │   │   └── [id]/page.tsx
│       │   │   │   └── reports/page.tsx
│       │   │   └── souls/
│       │   │       ├── page.tsx
│       │   │       ├── capture/page.tsx
│       │   │       └── [id]/page.tsx
│       │   └── stores/
│       │       ├── outreach-store.ts
│       │       └── souls-store.ts
│       └── package.json
├── packages/
│   ├── database/              # Drizzle ORM
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── outreach-programs.ts
│   │   │   │   ├── souls.ts
│   │   │   │   ├── follow-ups.ts
│   │   │   │   └── outreach-participants.ts
│   │   │   ├── seed.ts
│   │   │   └── reset.ts
│   │   └── drizzle/           # Migrations
│   │       ├── 0003_open_spot.sql  # Outreach module
│   │       └── ...
│   ├── types/                 # Shared types
│   ├── utils/                 # Utilities
│   ├── api-client/            # HTTP client
│   └── ui/                    # Components
├── docker-compose.yml         # PostgreSQL config
├── .env                       # Environment variables
├── package.json               # Root scripts
├── DEPLOYMENT.md              # Full guide
├── SCRIPTS_REFERENCE.md       # Script docs
└── deploy-test.sh             # Test script
```

## 🎯 Next Steps After Deployment

### 1. Explore the Application
- Login with different role accounts
- Test all outreach features
- Create programs and capture souls
- Log follow-ups and track progress

### 2. Run Tests
```bash
npm test
```

### 3. View Database
```bash
npm run db:studio
```

### 4. Check API Endpoints
- API docs: http://localhost:3001
- Health check: http://localhost:3001/health

### 5. Development
- Make changes to code
- Hot reload automatically updates
- Run tests after changes

## 📚 Documentation

- **Full Deployment Guide**: `DEPLOYMENT.md`
- **Scripts Reference**: `SCRIPTS_REFERENCE.md`
- **Architecture**: `AGENTS.md`
- **Outreach Status**: `OUTREACH_IMPLEMENTATION_STATUS.md`
- **Admin Guide**: `ADMINISTRATION.md`

## ✅ Deployment Checklist

- [ ] Docker installed and running
- [ ] Node.js 20+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Database started (`docker compose up -d`)
- [ ] Migrations applied (`npm run db:migrate`)
- [ ] Data seeded (`npm run db:seed`)
- [ ] Servers running (`npm run dev`)
- [ ] Can login at http://localhost:3000
- [ ] Can access outreach features
- [ ] Tests passing (`npm test`)

## 🎉 Success Indicators

You'll know deployment is successful when:

1. ✅ Docker shows `kairos-db` container running
2. ✅ API server shows "Server running on http://localhost:3001"
3. ✅ Web shows "Ready on http://localhost:3000"
4. ✅ Can login with test accounts
5. ✅ Can navigate to all pages
6. ✅ Can create outreach programs
7. ✅ Can capture souls
8. ✅ Can log follow-ups
9. ✅ Tests pass without errors
10. ✅ Drizzle Studio shows all tables

## 🆘 Getting Help

If you encounter issues:

1. Check `DEPLOYMENT.md` for detailed troubleshooting
2. Check `SCRIPTS_REFERENCE.md` for command reference
3. Review error messages carefully
4. Check Docker logs: `docker compose logs -f`
5. Check API logs in terminal
6. Verify `.env` file settings

## 🔒 Security Notes

**For Local Development Only:**
- Default passwords are `Password1!`
- JWT secrets are development values
- Database credentials are `kairos/kairos`

**Before Production:**
- Change all passwords
- Update JWT secrets
- Use secure database credentials
- Enable HTTPS
- Configure proper CORS
- Set up proper authentication

---

**Ready to deploy? Run:**
```bash
./deploy-test.sh
```

This automated script will test the entire deployment process!
