# Kairos Church Management System

Modern church management platform built with Next.js 15, Hono, and PostgreSQL.

## 🚀 Quick Start

```bash
# 1. Start database
docker compose up -d

# 2. Setup database
npm run db:fresh

# 3. Start development servers
npm run dev
```

Open http://localhost:3000 and login with:
- **Email**: `admin@kairos.local`
- **Password**: `Password1!`

## 📋 Features

### Core Modules
- ✅ **Authentication** - Signup, login, email verification, password reset, JWT tokens
- ✅ **Branches** - Multi-branch management with regional organization
- ✅ **Members** - Member directory, profiles, roles, approval workflow
- ✅ **Fellowships** - 5 fellowship types (K-Groups, Kharis Express, New Breeds, KOC, KOC Colleges)
- ✅ **Outreach** - Evangelism programs, soul capture, follow-up tracking, conversion pipeline

### Outreach Module Features
- 📋 Outreach program management
- 👥 Soul capture (program-based and ad-hoc)
- 📞 Follow-up logging and tracking
- 📊 Kanban board with drag-and-drop status updates
- 🔔 Automated follow-up alerts
- 📈 Conversion funnel analytics
- 🔄 Soul-to-member conversion workflow
- 📤 CSV export functionality

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15 App Router, Shadcn/ui, Tailwind CSS, Zustand
- **Backend**: Hono framework (TypeScript-first)
- **Database**: PostgreSQL 15 (Docker local, Aurora Serverless v2 future)
- **ORM**: Drizzle ORM
- **Auth**: bcrypt + JWT (local), Cognito (production)
- **Testing**: Vitest, React Testing Library

### Monorepo Structure
```
kairos/
├── apps/
│   ├── api/          # Hono API server (port 3001)
│   └── web/          # Next.js frontend (port 3000)
├── packages/
│   ├── database/     # Drizzle ORM schemas & migrations
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared utilities
│   ├── api-client/   # Typed HTTP client
│   └── ui/           # Shadcn/ui components
└── docker-compose.yml
```

## 📦 Installation

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- npm 10.9.2+

### Setup Steps

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd kairos
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed (defaults work for local dev)
   ```

3. **Start Database**
   ```bash
   docker compose up -d
   ```

4. **Setup Database**
   ```bash
   npm run db:generate  # Generate migrations
   npm run db:migrate   # Apply migrations
   npm run db:seed      # Seed test data
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Backend Tests
```bash
cd apps/api
npm test
```

**Test Coverage:**
- ✅ 24 backend tests passing
- ✅ Outreach programs service (9 tests)
- ✅ Souls service (15 tests)
- ✅ Follow-ups service
- ✅ Conversion service

## 🗄️ Database Management

### Common Commands
```bash
npm run db:studio    # Open Drizzle Studio (port 4983)
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed test data
npm run db:fresh     # Drop, migrate, and seed (⚠️ destructive)
```

### Test Accounts
All accounts use password: `Password1!`

| Role | Email | Branch |
|------|-------|--------|
| Admin | admin@kairos.local | London |
| Pastor | james.okonkwo@kairos.local | London |
| Pastor | grace.mensah@kairos.local | Manchester |
| Pastor | kwame.asante@kairos.local | Accra |
| Leader | sarah.williams@kairos.local | London |
| Leader | david.appiah@kairos.local | Accra |
| Member | emma.thompson@kairos.local | London |

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT.md)** - Complete deployment instructions
- **[Scripts Reference](SCRIPTS_REFERENCE.md)** - All npm scripts explained
- **[Deployment Summary](DEPLOYMENT_SUMMARY.md)** - Quick deployment checklist
- **[Architecture](AGENTS.md)** - System architecture and conventions
- **[Outreach Status](OUTREACH_IMPLEMENTATION_STATUS.md)** - Outreach module details
- **[Administration](ADMINISTRATION.md)** - Admin guide

## 🔧 Development

### Key Conventions
- **TDD**: Write failing tests first, then implement
- **Branch Isolation**: Non-admin queries filtered by user's branchId
- **Route Alignment**: Hono router → API client → Frontend hook
- **Naming**: camelCase in TypeScript, snake_case in SQL
- **Primary Keys**: UUID in Drizzle (SERIAL in SQL)
- **Soft Deletes**: Use `isActive` boolean, never hard delete

### Development Workflow
```bash
# Make schema changes
vim packages/database/src/schema/your-table.ts

# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Update seed data (optional)
vim packages/database/src/seed.ts

# Test changes
npm test

# Start dev servers
npm run dev
```

## 🌐 Ports

| Service | Port | URL |
|---------|------|-----|
| Web Frontend | 3000 | http://localhost:3000 |
| API Backend | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Drizzle Studio | 4983 | http://localhost:4983 |

## 🎨 Design System

### Color Palette
- **Primary**: Purple `#6D28D9`
- **Accent**: Gold `#D97706`
- **Success**: Emerald `#059669`
- **Error**: Rose `#E11D48`

### UI Components
- Shadcn/ui component library
- Tailwind CSS for styling
- Responsive design (mobile-first)
- Dark mode support

## 🚢 Deployment

### Local Development
```bash
docker compose up -d
npm run dev
```

### Production (Future)
- API: AWS Lambda
- Frontend: Vercel/AWS Amplify
- Database: Aurora Serverless v2
- Auth: AWS Cognito

## 🔒 Security

### Local Development
- Default passwords: `Password1!`
- JWT secrets: Development values
- Database: `kairos/kairos`

### Production Checklist
- [ ] Change all passwords
- [ ] Update JWT secrets
- [ ] Secure database credentials
- [ ] Enable HTTPS
- [ ] Configure CORS
- [ ] Set up proper authentication
- [ ] Enable rate limiting
- [ ] Configure monitoring

## 🤝 Contributing

1. Follow TDD approach
2. Write tests before implementation
3. Ensure all tests pass
4. Follow naming conventions
5. Update documentation
6. Run linting and type checking

```bash
npm run typecheck  # Type checking
npm run lint       # Linting
npm test           # Tests
npm run build      # Build check
```

## 📝 License

[Add your license here]

## 🆘 Support

For issues or questions:
1. Check documentation in `/docs`
2. Review troubleshooting in `DEPLOYMENT.md`
3. Check existing issues
4. Create new issue with details

## 🎯 Roadmap

### Completed
- ✅ Authentication system
- ✅ Branch management
- ✅ Member management
- ✅ Fellowship management
- ✅ Outreach module

### Planned
- [ ] Events management
- [ ] Donations tracking
- [ ] Volunteer scheduling
- [ ] SMS notifications
- [ ] Mobile app
- [ ] Advanced analytics

---

**Built with ❤️ for Kharis Church**
