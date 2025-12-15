# Contributing to Kairos Church Management System

Thank you for your interest in contributing to the Kairos Church Management System! This document provides guidelines and information for contributors to ensure a smooth and productive development process.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Issue Reporting](#issue-reporting)
- [Security Considerations](#security-considerations)

## 🤝 Code of Conduct

### Our Commitment

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background, experience level, or personal characteristics. We expect all participants to adhere to our code of conduct.

### Expected Behavior

- **Be Respectful**: Treat all community members with respect and kindness
- **Be Collaborative**: Work together constructively and help others learn
- **Be Professional**: Maintain professional communication in all interactions
- **Be Inclusive**: Welcome newcomers and help them get started
- **Be Patient**: Understand that people have different skill levels and time constraints

### Unacceptable Behavior

- Harassment, discrimination, or offensive language
- Personal attacks or inflammatory comments
- Sharing private information without permission
- Spam or off-topic discussions
- Any behavior that would be inappropriate in a professional setting

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher
- **PostgreSQL**: Version 15.x or higher
- **Git**: Latest version
- **Code Editor**: VS Code recommended with suggested extensions

### Development Environment Setup

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/your-username/kairos.git
   cd kairos
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   ```bash
   # Copy environment templates
   cp apps/api/.env.example apps/api/.env
   cp apps/web-admin/.env.example apps/web-admin/.env.local
   cp apps/member-app/.env.example apps/member-app/.env.local
   ```

4. **Initialize Database**
   ```bash
   cd apps/api
   npx prisma migrate dev --name init
   npx prisma generate
   cd ../..
   ```

5. **Verify Setup**
   ```bash
   # Run tests to ensure everything is working
   npm test
   
   # Start development servers
   nx serve web-admin    # http://localhost:4200
   nx serve member-app   # http://localhost:4201
   nx serve api          # http://localhost:3333
   ```

### Recommended VS Code Extensions

Install these extensions for the best development experience:

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "prisma.prisma",
    "ms-playwright.playwright",
    "orta.vscode-jest"
  ]
}
```

## 🔄 Development Workflow

### Branch Strategy

We use a **Git Flow** inspired workflow:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: New features and enhancements
- **`bugfix/*`**: Bug fixes
- **`hotfix/*`**: Critical production fixes
- **`release/*`**: Release preparation

### Workflow Steps

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following our style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   # Run affected tests
   npm run affected:test
   
   # Run linting
   npm run affected:lint
   
   # Run builds
   npm run affected:build
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new member registration feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request via GitHub interface
   ```

## 🎨 Code Style Guidelines

### TypeScript Standards

#### General Principles
- **Type Safety**: Use strict TypeScript settings, avoid `any` type
- **Explicit Types**: Prefer explicit type annotations for public APIs
- **Immutability**: Prefer `const` over `let`, use readonly when appropriate
- **Functional Style**: Prefer pure functions and immutable data structures

#### Naming Conventions

```typescript
// Variables and functions: camelCase
const memberCount = 10;
const calculateTotalGiving = (payments: Payment[]) => { };

// Classes and interfaces: PascalCase
class MemberService { }
interface CreateMemberDto { }

// Constants: SCREAMING_SNAKE_CASE
const MAX_UPLOAD_SIZE = 1024 * 1024;

// Files and directories: kebab-case
// member-service.ts, create-member.dto.ts

// Database fields: snake_case (Prisma convention)
// first_name, created_at, member_id
```

#### Code Organization

```typescript
// 1. Imports (external libraries first, then internal)
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 2. Types and interfaces
interface MemberFilters {
  status?: MemberStatus;
  departmentId?: string;
}

// 3. Class implementation
@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(private prisma: PrismaService) {}

  // Public methods first
  async findAll(filters: MemberFilters = {}): Promise<Member[]> {
    return this.prisma.member.findMany({
      where: this.buildWhereClause(filters),
    });
  }

  // Private methods last
  private buildWhereClause(filters: MemberFilters) {
    // Implementation
  }
}
```

### React/Next.js Standards

#### Component Structure

```tsx
// 1. Imports
import { useState, useEffect } from 'react';
import { Button, Card, Input } from '@kairos/ui';
import { Member } from '@kairos/shared-types';

// 2. Types
interface MemberFormProps {
  member?: Member;
  onSave: (member: Member) => void;
  onCancel: () => void;
}

// 3. Component
export function MemberForm({ member, onSave, onCancel }: MemberFormProps) {
  // Hooks first
  const [formData, setFormData] = useState<Partial<Member>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Effects
  useEffect(() => {
    if (member) {
      setFormData(member);
    }
  }, [member]);

  // Event handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData as Member);
    } finally {
      setIsLoading(false);
    }
  };

  // Render
  return (
    <Card>
      <form onSubmit={handleSubmit}>
        {/* Form content */}
      </form>
    </Card>
  );
}
```

#### Hooks Guidelines

```typescript
// Custom hooks should start with 'use'
export function useMemberData(memberId: string) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch member data
  }, [memberId]);

  return { member, loading, error, refetch };
}
```

### CSS/Tailwind Standards

#### Tailwind Usage

```tsx
// Prefer utility classes over custom CSS
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
  <h2 className="text-lg font-semibold text-gray-900">Member Profile</h2>
  <Button variant="primary" size="sm">Edit</Button>
</div>

// Use design system tokens
<div className="text-primary-600 bg-primary-50 border border-primary-200">
  Primary colored content
</div>

// Group related classes
<div className={cn(
  // Layout
  "flex items-center justify-between",
  // Spacing
  "p-4 mb-6",
  // Appearance
  "bg-white rounded-lg shadow-sm",
  // Responsive
  "md:p-6 lg:mb-8"
)}>
```

#### Responsive Design

```tsx
// Mobile-first approach
<div className={cn(
  // Mobile (default)
  "flex flex-col space-y-4 p-4",
  // Tablet
  "md:flex-row md:space-y-0 md:space-x-6 md:p-6",
  // Desktop
  "lg:p-8 xl:max-w-6xl xl:mx-auto"
)}>
```

### Database/Prisma Standards

#### Schema Design

```prisma
// Use descriptive model names (PascalCase)
model Member {
  // Primary key first
  id              String   @id @default(cuid())
  
  // Required fields
  firstName       String
  lastName        String
  email           String   @unique
  
  // Optional fields
  phone           String?
  dateOfBirth     DateTime?
  
  // Timestamps last
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  user            User?    @relation(fields: [userId], references: [id])
  userId          String?  @unique
  
  @@map("members") // Use snake_case for table names
}
```

#### Query Patterns

```typescript
// Use descriptive method names
async findMembersByDepartment(departmentId: string): Promise<Member[]> {
  return this.prisma.member.findMany({
    where: {
      departmentMembers: {
        some: {
          departmentId,
          status: 'ACTIVE',
        },
      },
    },
    include: {
      user: true,
      departmentMembers: {
        include: {
          department: true,
        },
      },
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' },
    ],
  });
}
```

## 🌿 Git Workflow

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **perf**: Performance improvements
- **ci**: CI/CD changes

#### Examples

```bash
# Feature
git commit -m "feat(members): add member profile photo upload"

# Bug fix
git commit -m "fix(api): resolve member search pagination issue"

# Documentation
git commit -m "docs: update API documentation for events module"

# Breaking change
git commit -m "feat(auth)!: implement new JWT token structure

BREAKING CHANGE: JWT tokens now include additional claims"
```

### Branch Naming

```bash
# Features
feature/member-photo-upload
feature/event-registration-system

# Bug fixes
bugfix/member-search-pagination
bugfix/login-redirect-issue

# Hotfixes
hotfix/security-vulnerability-fix

# Releases
release/v1.2.0
```

### Git Best Practices

1. **Keep commits atomic**: One logical change per commit
2. **Write descriptive commit messages**: Explain what and why, not how
3. **Use present tense**: "Add feature" not "Added feature"
4. **Reference issues**: Include issue numbers when applicable
5. **Rebase before merging**: Keep history clean

```bash
# Rebase feature branch before creating PR
git checkout feature/your-feature
git rebase develop

# Interactive rebase to clean up commits
git rebase -i HEAD~3
```

## 🔄 Pull Request Process

### Before Creating a PR

1. **Ensure your branch is up to date**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature
   git rebase develop
   ```

2. **Run all checks locally**
   ```bash
   npm run affected:test
   npm run affected:lint
   npm run affected:build
   npm run format:check
   ```

3. **Update documentation** if needed

### PR Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123
Related to #456

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots or GIFs to demonstrate the changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one approval from a maintainer
3. **Testing**: Verify functionality works as expected
4. **Documentation**: Ensure documentation is updated
5. **Merge**: Squash and merge to maintain clean history

### Review Guidelines

#### For Authors
- Respond to feedback promptly and professionally
- Make requested changes in separate commits for easy review
- Explain complex decisions in PR comments
- Test your changes thoroughly before requesting review

#### For Reviewers
- Be constructive and specific in feedback
- Focus on code quality, security, and maintainability
- Suggest improvements rather than just pointing out problems
- Approve when the code meets our standards

## 🧪 Testing Requirements

### Testing Philosophy

- **Test-Driven Development**: Write tests before or alongside code
- **Comprehensive Coverage**: Aim for >80% code coverage
- **Fast Feedback**: Unit tests should run quickly
- **Realistic Testing**: Integration tests should use real dependencies when possible

### Testing Levels

#### Unit Tests
Test individual functions, classes, and components in isolation.

```typescript
// Example unit test
describe('MemberService', () => {
  let service: MemberService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MemberService,
        {
          provide: PrismaService,
          useValue: {
            member: {
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
    prisma = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should return all members', async () => {
      const mockMembers = [{ id: '1', firstName: 'John', lastName: 'Doe' }];
      prisma.member.findMany.mockResolvedValue(mockMembers);

      const result = await service.findAll();

      expect(result).toEqual(mockMembers);
      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    });
  });
});
```

#### Integration Tests
Test interactions between components and external systems.

```typescript
// Example integration test
describe('Members API (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.member.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /members', () => {
    it('should create a new member', async () => {
      const createMemberDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/members')
        .send(createMemberDto)
        .expect(201);

      expect(response.body).toMatchObject(createMemberDto);
      expect(response.body.id).toBeDefined();
    });
  });
});
```

#### End-to-End Tests
Test complete user workflows across the entire application.

```typescript
// Example E2E test
import { test, expect } from '@playwright/test';

test.describe('Member Registration', () => {
  test('should allow new member to register', async ({ page }) => {
    await page.goto('/register');

    // Fill out registration form
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'john.doe@example.com');
    await page.fill('[name="password"]', 'SecurePassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome, John!');
  });
});
```

### Test Organization

```
apps/api/src/
├── modules/
│   └── members/
│       ├── __tests__/
│       │   ├── members.controller.spec.ts    # Unit tests
│       │   ├── members.service.spec.ts       # Unit tests
│       │   └── members.integration.spec.ts   # Integration tests
│       ├── members.controller.ts
│       └── members.service.ts
└── test/
    ├── app.e2e-spec.ts                      # E2E tests
    └── helpers/                             # Test utilities
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
nx test api
nx test web-admin
nx test shared-utils

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run e2e
nx e2e web-admin-e2e

# Run affected tests only
npm run affected:test
```

### Test Data Management

#### Test Database
Use a separate test database to avoid conflicts:

```env
# .env.test
DATABASE_URL="postgresql://username:password@localhost:5432/kairos_test"
```

#### Test Fixtures
Create reusable test data:

```typescript
// test/fixtures/member.fixture.ts
export const createMemberFixture = (overrides: Partial<Member> = {}): CreateMemberDto => ({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+234-801-234-5678',
  ...overrides,
});
```

## 📚 Documentation Standards

### Code Documentation

#### JSDoc Comments
Use JSDoc for public APIs:

```typescript
/**
 * Creates a new member in the system.
 * 
 * @param createMemberDto - The member data to create
 * @returns Promise resolving to the created member
 * @throws {ConflictException} When email already exists
 * @throws {ValidationException} When required fields are missing
 * 
 * @example
 * ```typescript
 * const member = await memberService.create({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john.doe@example.com'
 * });
 * ```
 */
async create(createMemberDto: CreateMemberDto): Promise<Member> {
  // Implementation
}
```

#### Inline Comments
Use inline comments for complex logic:

```typescript
// Calculate the member's age based on date of birth
// Handle edge cases where birth date is in the future
const age = member.dateOfBirth 
  ? Math.max(0, new Date().getFullYear() - member.dateOfBirth.getFullYear())
  : null;
```

### API Documentation

#### Swagger/OpenAPI
Document all API endpoints:

```typescript
@ApiOperation({ 
  summary: 'Create a new member',
  description: 'Creates a new member record in the system with the provided information.'
})
@ApiResponse({ 
  status: 201, 
  description: 'Member created successfully',
  type: Member
})
@ApiResponse({ 
  status: 409, 
  description: 'Email already exists' 
})
@Post()
async create(@Body() createMemberDto: CreateMemberDto): Promise<Member> {
  return this.membersService.create(createMemberDto);
}
```

### README Updates

When adding new features or making significant changes:

1. Update the relevant README.md files
2. Add new sections for new functionality
3. Update installation or setup instructions if needed
4. Include examples of how to use new features
5. Update the table of contents if applicable

### Architecture Documentation

For significant architectural changes:

1. Update architecture diagrams in the `architecture/` directory
2. Document design decisions and rationale
3. Update sequence diagrams for new workflows
4. Create ADRs (Architecture Decision Records) for major decisions

## 🐛 Issue Reporting

### Before Reporting an Issue

1. **Search existing issues** to avoid duplicates
2. **Check documentation** to ensure it's not a usage issue
3. **Test with latest version** to see if it's already fixed
4. **Gather relevant information** (logs, screenshots, steps to reproduce)

### Issue Template

```markdown
## Bug Report

### Description
A clear and concise description of what the bug is.

### Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

### Expected Behavior
A clear and concise description of what you expected to happen.

### Actual Behavior
A clear and concise description of what actually happened.

### Screenshots
If applicable, add screenshots to help explain your problem.

### Environment
- OS: [e.g. Windows 10, macOS 12.0, Ubuntu 20.04]
- Browser: [e.g. Chrome 95, Firefox 94, Safari 15]
- Node.js version: [e.g. 18.12.0]
- Application version: [e.g. 1.2.0]

### Additional Context
Add any other context about the problem here.

### Logs
```
Paste relevant logs here
```
```

### Feature Requests

```markdown
## Feature Request

### Is your feature request related to a problem?
A clear and concise description of what the problem is.

### Describe the solution you'd like
A clear and concise description of what you want to happen.

### Describe alternatives you've considered
A clear and concise description of any alternative solutions or features you've considered.

### Additional context
Add any other context or screenshots about the feature request here.

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

## 🔒 Security Considerations

### Security Guidelines

1. **Never commit sensitive data**
   - API keys, passwords, or tokens
   - Personal or confidential information
   - Database credentials

2. **Input validation**
   - Validate all user inputs
   - Use DTOs with validation decorators
   - Sanitize data before database operations

3. **Authentication & Authorization**
   - Implement proper JWT handling
   - Use role-based access control
   - Validate permissions on all endpoints

4. **Database Security**
   - Use parameterized queries (Prisma handles this)
   - Implement proper data access controls
   - Regular security audits

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities. Instead:

1. Email security concerns to: [security@kairos.church]
2. Include detailed information about the vulnerability
3. Allow time for the issue to be addressed before public disclosure
4. We will acknowledge receipt within 48 hours

### Security Checklist

Before submitting code that handles sensitive data:

- [ ] Input validation implemented
- [ ] Authentication required where appropriate
- [ ] Authorization checks in place
- [ ] No sensitive data in logs
- [ ] Secure communication (HTTPS)
- [ ] Error messages don't leak sensitive information

## 🎯 Performance Guidelines

### Frontend Performance

1. **Bundle Size**
   - Use dynamic imports for large components
   - Implement code splitting
   - Monitor bundle size in CI

2. **Rendering Performance**
   - Use React.memo for expensive components
   - Implement proper key props for lists
   - Avoid unnecessary re-renders

3. **Network Performance**
   - Implement proper caching strategies
   - Use optimistic updates where appropriate
   - Minimize API calls

### Backend Performance

1. **Database Queries**
   - Use proper indexes
   - Implement query optimization
   - Use pagination for large datasets

2. **Caching**
   - Implement Redis caching for frequently accessed data
   - Use proper cache invalidation strategies
   - Monitor cache hit rates

3. **API Performance**
   - Implement rate limiting
   - Use compression middleware
   - Monitor response times

## 🏆 Recognition

We appreciate all contributions to the Kairos project! Contributors will be recognized in:

- **CONTRIBUTORS.md**: List of all contributors
- **Release Notes**: Major contributions highlighted
- **GitHub**: Contributor badges and statistics
- **Community**: Shout-outs in community channels

## 📞 Getting Help

If you need help or have questions:

1. **Documentation**: Check the README files and documentation
2. **Issues**: Search existing issues for similar problems
3. **Discussions**: Use GitHub Discussions for general questions
4. **Community**: Join our community channels
5. **Maintainers**: Reach out to project maintainers for complex issues

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

Thank you for contributing to the Kairos Church Management System! Your efforts help build better tools for church communities worldwide. 🙏