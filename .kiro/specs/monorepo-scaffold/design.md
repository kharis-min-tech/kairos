# Design Document

## Overview

The Kairos Church Management System will be built as an NX monorepo containing multiple applications and shared libraries. The architecture follows a modular approach where each functional domain (Members, Events, Finance, etc.) is isolated into independent modules that can be developed, tested, and deployed separately. This design ensures scalability, maintainability, and enables parallel development by multiple team members.

The system consists of:
- **Frontend Applications**: Web Admin (Next.js) and Member App (Next.js)
- **Backend API**: NestJS application with domain-driven module structure
- **Shared Libraries**: TypeScript types, utilities, and UI components
- **Infrastructure**: PostgreSQL database, Prisma ORM, GitHub Actions CI/CD

## Architecture

### High-Level Structure

```
kairos/
├── apps/
│   ├── web-admin/          # Next.js admin application
│   ├── member-app/         # Next.js member application
│   └── api/                # NestJS backend API
├── libs/
│   ├── shared/
│   │   ├── types/          # Shared TypeScript interfaces
│   │   ├── utils/          # Shared utility functions
│   │   └── ui/             # Design system & UI components
│   └── api/
│       ├── members/        # Members domain library
│       ├── departments/    # Departments domain library
│       ├── fellowships/    # Fellowships domain library
│       ├── events/         # Events domain library
│       ├── finance/        # Finance domain library
│       ├── forms/          # Forms domain library
│       ├── communications/ # Communications domain library
│       ├── security/       # Security & RBAC domain library
│       ├── settings/       # Settings domain library
│       └── outreach/       # Outreach domain library
├── prisma/
│   └── schema.prisma       # Database schema
├── .github/
│   └── workflows/          # GitHub Actions CI/CD
└── package.json            # Root package.json
```

### Technology Stack

- **Monorepo Framework**: NX (latest)
- **Frontend**: Next.js 14+ with App Router, React 18+, TypeScript
- **Backend**: NestJS 10+, TypeScript
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5+
- **Styling**: Tailwind CSS 3+
- **Testing**: Jest, React Testing Library, Playwright
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint, Prettier, Husky

## Components and Interfaces

### 1. NX Workspace Configuration

The NX workspace will be configured with:
- TypeScript path aliases for clean imports (`@kairos/shared-types`, `@kairos/ui`, etc.)
- Module boundary rules to enforce architectural constraints
- Caching configuration for optimal build performance
- Affected command support for CI optimization

### 2. Frontend Applications

#### Web Admin Application (`apps/web-admin`)

**Purpose**: Administrative interface for church staff, pastors, and administrators

**Key Features**:
- Dashboard with KPIs and analytics
- Member management
- Department and fellowship management
- Event management and check-in
- Financial tracking and reporting
- Forms management
- Security and RBAC administration

**Structure**:
```
apps/web-admin/
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── (auth)/         # Authentication routes
│   │   ├── (dashboard)/    # Protected dashboard routes
│   │   │   ├── members/
│   │   │   ├── departments/
│   │   │   ├── fellowships/
│   │   │   ├── events/
│   │   │   ├── finance/
│   │   │   ├── forms/
│   │   │   ├── reports/
│   │   │   ├── security/
│   │   │   └── settings/
│   │   └── layout.tsx
│   ├── components/         # App-specific components
│   ├── lib/                # App-specific utilities
│   └── styles/             # Global styles
├── public/                 # Static assets
└── next.config.js
```

#### Member App Application (`apps/member-app`)

**Purpose**: Member-facing interface for church members

**Key Features**:
- Personal dashboard
- Event registration
- Giving summary
- Department and fellowship participation
- Forms submission
- Notifications and messages

**Structure**: Similar to web-admin but with member-focused routes

### 3. Backend API Application (`apps/api`)

**Purpose**: Unified REST API serving all client applications

**Structure**:
```
apps/api/
├── src/
│   ├── app/
│   │   ├── app.module.ts           # Root module
│   │   └── app.controller.ts
│   ├── modules/
│   │   ├── members/
│   │   │   ├── members.module.ts
│   │   │   ├── members.controller.ts
│   │   │   ├── members.service.ts
│   │   │   └── dto/
│   │   ├── departments/
│   │   ├── fellowships/
│   │   ├── events/
│   │   ├── finance/
│   │   ├── forms/
│   │   ├── communications/
│   │   ├── security/
│   │   ├── settings/
│   │   └── outreach/
│   ├── common/
│   │   ├── guards/         # Auth guards
│   │   ├── interceptors/   # HTTP interceptors
│   │   ├── filters/        # Exception filters
│   │   └── decorators/     # Custom decorators
│   └── main.ts
├── prisma/
│   └── schema.prisma
└── nest-cli.json
```

**Module Independence**: Each module will:
- Have its own controller, service, and DTOs
- Use dependency injection for database access
- Implement error handling independently
- Be testable in isolation

### 4. Shared Libraries

#### Shared Types Library (`libs/shared/types`)

**Purpose**: TypeScript interfaces and types shared across all applications

**Exports**:
- Entity interfaces (User, Member, Department, Fellowship, Event, Payment, etc.)
- DTO types
- Enum definitions (UserType, SoulStatus, PaymentType, etc.)
- API response types

**Example**:
```typescript
export interface User {
  id: string;
  email: string;
  userType: UserType;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserType {
  Admin = 'Admin',
  Pastor = 'Pastor',
  Member = 'Member'
}
```

#### Shared Utils Library (`libs/shared/utils`)

**Purpose**: Reusable utility functions

**Exports**:
- Date formatting utilities
- Validation helpers
- Currency formatting
- String manipulation
- API client helpers

#### UI Components Library (`libs/shared/ui`)

**Purpose**: Design system with reusable React components

**Components**:
- Button, Input, Select, Checkbox, Radio
- Card, Modal, Dialog, Drawer
- Table, DataGrid
- Form components
- Navigation components
- Layout components

**Design Tokens** (inspired by Kharis Church):
```typescript
export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    // ... inspired by Kharis blue/teal tones
    600: '#0284c7',
    700: '#0369a1',
  },
  accent: {
    // Gold/warm accent colors from Kharis branding
  },
  neutral: {
    // Grayscale
  }
};

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    heading: ['Poppins', 'sans-serif'],
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  }
};
```

### 5. Database Schema (Prisma)

The Prisma schema will mirror the ERD provided in `architecture/kairos-erd.mmd`:

**Key Models**:
- User, Role, UserRole
- Branch, Member
- Department, DepartmentMember, DepartmentAttendance
- Fellowship, FellowshipMember, FellowshipMeeting, FellowshipAttendance
- OutreachProgram, Soul, FollowUp
- Event, EventRegistration, EventAttendance
- Payment, Pledge, PledgePayment
- Form, FormField, FormSubmission, FormAnswer
- Announcement, Notification
- MessageThread, Message
- AuditLog, AccessLog

**Relationships**: All relationships from the ERD will be implemented using Prisma's relation syntax.

### 6. Environment Configuration

Each application will use environment variables:

**API** (`.env`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/kairos
JWT_SECRET=...
PORT=3333
```

**Web Admin** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3333
```

**Member App** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3333
```

### 7. GitHub Actions CI/CD

**Workflows**:

1. **CI Workflow** (`.github/workflows/ci.yml`):
   - Trigger: On push and pull request
   - Steps:
     - Checkout code
     - Setup Node.js
     - Install dependencies
     - Run NX affected:lint
     - Run NX affected:test
     - Run NX affected:build
     - Upload coverage reports

2. **CD Workflow** (`.github/workflows/cd.yml`):
   - Trigger: On push to main branch
   - Steps:
     - Build Docker images
     - Push to container registry
     - Deploy to staging/production

## Data Models

The data models follow the domain model defined in `architecture/kairos-domain.puml`. Key entities include:

### Core Entities

1. **User**: Authentication and authorization
2. **Member**: Church member profile
3. **Branch**: Church location/branch
4. **Department**: Ministry departments
5. **Fellowship**: Small groups (K-Groups)
6. **Event**: Church events
7. **Payment**: Financial transactions
8. **Form**: Dynamic forms system

### Relationships

- User → Member (one-to-one optional)
- Branch → Members, Departments, Fellowships, Events (one-to-many)
- Department → DepartmentMembers, DepartmentAttendance (one-to-many)
- Fellowship → FellowshipMembers, FellowshipMeetings (one-to-many)
- Event → EventRegistrations, EventAttendance (one-to-many)
- Member → Payments, Pledges (one-to-many)

All relationships maintain referential integrity through foreign keys.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, most requirements for this scaffolding project are structural validations (checking that files, directories, and configurations exist). These are best tested as examples rather than universal properties since we're verifying a one-time setup rather than behavior across multiple inputs. The scaffolding creates a fixed structure, so we'll validate that the structure matches expectations through example-based tests.

### Testable Properties

Since this is a scaffolding/bootstrap project, the "correctness" is primarily about the presence and proper configuration of files and directories. All acceptance criteria are testable as examples that verify the scaffold output matches the expected structure.

**Example Test Approach**: After running the scaffold generation, we can verify:
- Required directories exist
- Configuration files are present and contain expected content
- Dependencies are properly declared
- TypeScript paths are configured correctly
- Git ignore rules are in place

These validations ensure the scaffold provides a correct starting point for development.

## Error Handling

### Workspace Initialization Errors

**Scenario**: NX workspace creation fails
- **Handling**: Display clear error message with troubleshooting steps
- **Recovery**: Provide command to clean up partial installation

**Scenario**: Node.js version incompatibility
- **Handling**: Check Node version before initialization, display required version
- **Recovery**: Guide user to install correct Node version

### Dependency Installation Errors

**Scenario**: npm/yarn install fails
- **Handling**: Log detailed error, check network connectivity
- **Recovery**: Suggest clearing cache, retrying installation

**Scenario**: Conflicting dependencies
- **Handling**: Use exact versions in package.json to prevent conflicts
- **Recovery**: Document known compatibility issues

### Database Setup Errors

**Scenario**: PostgreSQL connection fails
- **Handling**: Validate DATABASE_URL format, test connection
- **Recovery**: Provide example connection strings, troubleshooting guide

**Scenario**: Prisma migration fails
- **Handling**: Log migration error, preserve database state
- **Recovery**: Provide rollback instructions

### Build Errors

**Scenario**: TypeScript compilation fails
- **Handling**: Display type errors with file locations
- **Recovery**: Ensure all type definitions are properly installed

**Scenario**: Next.js build fails
- **Handling**: Check for common issues (missing env vars, import errors)
- **Recovery**: Provide build troubleshooting checklist

## Testing Strategy

### Unit Testing

**Framework**: Jest with TypeScript support

**Scope**:
- Utility functions in `libs/shared/utils`
- React components in `libs/shared/ui`
- NestJS services and controllers
- Data transformation logic

**Approach**:
- Test individual functions and components in isolation
- Mock external dependencies (database, APIs)
- Aim for >80% code coverage on business logic
- Use React Testing Library for component tests

**Example**:
```typescript
// libs/shared/utils/src/lib/date-utils.spec.ts
describe('formatDate', () => {
  it('should format date in DD/MM/YYYY format', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date)).toBe('15/01/2024');
  });
});
```

### Integration Testing

**Scope**:
- API endpoints with database interactions
- Authentication flows
- Module interactions within the API

**Approach**:
- Use test database for integration tests
- Test complete request/response cycles
- Verify database state changes
- Test error scenarios

**Example**:
```typescript
// apps/api/src/modules/members/members.controller.spec.ts
describe('MembersController (integration)', () => {
  it('should create a new member', async () => {
    const response = await request(app.getHttpServer())
      .post('/members')
      .send(createMemberDto)
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
  });
});
```

### End-to-End Testing

**Framework**: Playwright

**Scope**:
- Critical user journeys (login, member registration, event registration)
- Cross-browser compatibility
- Mobile responsiveness

**Approach**:
- Test from user perspective
- Use test data seeding
- Run against staging environment
- Include visual regression testing

**Example**:
```typescript
// apps/web-admin-e2e/src/login.spec.ts
test('admin can login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### Scaffold Validation Testing

**Purpose**: Verify the generated scaffold structure is correct

**Approach**:
- After scaffold generation, run validation script
- Check directory structure
- Verify configuration files
- Validate dependencies
- Ensure builds succeed

**Example**:
```typescript
// tools/validate-scaffold.spec.ts
describe('Scaffold Structure', () => {
  it('should have all required directories', () => {
    expect(fs.existsSync('apps/web-admin')).toBe(true);
    expect(fs.existsSync('apps/member-app')).toBe(true);
    expect(fs.existsSync('apps/api')).toBe(true);
    expect(fs.existsSync('libs/shared/types')).toBe(true);
  });

  it('should have valid package.json', () => {
    const pkg = require('../package.json');
    expect(pkg.dependencies).toHaveProperty('@nestjs/core');
    expect(pkg.dependencies).toHaveProperty('next');
    expect(pkg.dependencies).toHaveProperty('@prisma/client');
  });

  it('should have TypeScript path aliases configured', () => {
    const tsConfig = require('../tsconfig.base.json');
    expect(tsConfig.compilerOptions.paths).toHaveProperty('@kairos/shared-types');
    expect(tsConfig.compilerOptions.paths).toHaveProperty('@kairos/shared-utils');
    expect(tsConfig.compilerOptions.paths).toHaveProperty('@kairos/ui');
  });
});
```

### CI/CD Testing

**GitHub Actions Workflows**:

1. **Continuous Integration**:
   - Trigger: Push, Pull Request
   - Steps:
     - Checkout code
     - Setup Node.js
     - Install dependencies (with caching)
     - Run `nx affected:lint`
     - Run `nx affected:test --coverage`
     - Run `nx affected:build`
     - Upload coverage to Codecov
     - Comment PR with test results

2. **Continuous Deployment**:
   - Trigger: Push to main
   - Steps:
     - Run full test suite
     - Build Docker images
     - Push to container registry
     - Deploy to staging
     - Run smoke tests
     - (Manual approval for production)

### Testing Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Test Independence**: Each test should be independent and not rely on others
3. **Test Data**: Use factories or fixtures for consistent test data
4. **Mocking**: Mock external services but test real database interactions in integration tests
5. **Coverage**: Aim for high coverage but focus on meaningful tests, not just coverage numbers
6. **Performance**: Keep unit tests fast (<100ms each), integration tests reasonable (<5s each)

## Implementation Notes

### NX Workspace Setup

1. Install NX globally: `npm install -g nx`
2. Create workspace: `npx create-nx-workspace@latest kairos --preset=empty`
3. Add Next.js plugin: `nx add @nx/next`
4. Add NestJS plugin: `nx add @nx/nest`
5. Add React plugin: `nx add @nx/react`

### Application Generation

```bash
# Generate Next.js applications
nx g @nx/next:app web-admin
nx g @nx/next:app member-app

# Generate NestJS application
nx g @nx/nest:app api

# Generate shared libraries
nx g @nx/js:lib shared-types --directory=libs/shared/types
nx g @nx/js:lib shared-utils --directory=libs/shared/utils
nx g @nx/react:lib ui --directory=libs/shared/ui
```

### Prisma Setup

```bash
# Install Prisma
npm install prisma @prisma/client

# Initialize Prisma
npx prisma init

# Generate Prisma Client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init
```

### Tailwind CSS Setup

```bash
# Install Tailwind
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p
```

### Development Workflow

1. **Start Development Servers**:
   ```bash
   nx serve web-admin    # Runs on port 4200
   nx serve member-app   # Runs on port 4201
   nx serve api          # Runs on port 3333
   ```

2. **Run Tests**:
   ```bash
   nx test <project-name>
   nx affected:test      # Test only affected projects
   ```

3. **Build for Production**:
   ```bash
   nx build web-admin --configuration=production
   nx build member-app --configuration=production
   nx build api --configuration=production
   ```

4. **Lint and Format**:
   ```bash
   nx affected:lint
   npm run format
   ```

### Module Boundary Rules

Configure in `nx.json` or `.eslintrc.json`:

```json
{
  "@nx/enforce-module-boundaries": [
    "error",
    {
      "allow": [],
      "depConstraints": [
        {
          "sourceTag": "type:app",
          "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"]
        },
        {
          "sourceTag": "type:feature",
          "onlyDependOnLibsWithTags": ["type:ui", "type:util", "type:data-access"]
        },
        {
          "sourceTag": "type:ui",
          "onlyDependOnLibsWithTags": ["type:util"]
        }
      ]
    }
  ]
}
```

### Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Use secrets management for production
3. **Authentication**: Implement JWT with refresh tokens
4. **Authorization**: Use NestJS guards for RBAC
5. **Input Validation**: Use class-validator for DTOs
6. **SQL Injection**: Prisma provides protection by default
7. **XSS Protection**: Next.js escapes output by default
8. **CORS**: Configure appropriately for production

### Performance Optimization

1. **NX Caching**: Leverage NX computation caching
2. **Build Optimization**: Use production builds with minification
3. **Code Splitting**: Next.js automatic code splitting
4. **Database Indexing**: Add indexes to frequently queried columns
5. **API Response Caching**: Implement caching strategy for read-heavy endpoints
6. **Image Optimization**: Use Next.js Image component
7. **Bundle Analysis**: Regularly analyze bundle sizes

### Deployment Strategy

1. **Containerization**: Each app gets its own Dockerfile
2. **Orchestration**: Use Docker Compose for local development
3. **Cloud Deployment**: Deploy to AWS
4. **Database**: Use PostgreSQL on Aurora
5. **CDN**: Serve static assets through CDN
6. **Monitoring**: Implement logging and monitoring (e.g., Sentry, DataDog)
7. **Backup**: Automated database backups

## Future Enhancements

1. **Microservices**: Split API into separate microservices if needed
2. **GraphQL**: Consider GraphQL API alongside REST
3. **Real-time**: Add WebSocket support for real-time features
4. **Mobile Apps**: Native mobile apps using React Native
5. **Offline Support**: PWA capabilities for offline access
6. **Multi-tenancy**: Support for multiple church organizations
7. **Internationalization**: Multi-language support
8. **Advanced Analytics**: Enhanced reporting and analytics
9. **Third-party Integrations**: Payment gateways, email services, SMS providers
10. **AI Features**: Automated follow-up suggestions, attendance predictions
