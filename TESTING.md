# Testing Infrastructure

This document describes the testing infrastructure set up for the Kairos Church Management System monorepo.

## Overview

The testing infrastructure includes:
- **Unit Tests**: Jest-based testing for individual components and functions
- **Integration Tests**: API endpoint testing with test database
- **End-to-End Tests**: Playwright-based browser testing
- **Scaffold Validation Tests**: Verification of project structure and configuration

## Test Types

### 1. Unit Tests

**Framework**: Jest with TypeScript support
**Location**: `*.spec.ts` and `*.test.ts` files alongside source code
**Coverage**: Utility functions, React components, NestJS services

**Running Unit Tests**:
```bash
# Run all unit tests
npm run test

# Run tests for specific project
npx nx test <project-name>

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### 2. Integration Tests

**Framework**: Jest with Supertest for API testing
**Location**: `*.integration.spec.ts` files in API modules
**Database**: Uses test database configuration

**Setup**:
- Test database URL: `postgresql://test:test@localhost:5432/kairos_test`
- Automatic cleanup between tests
- Mock external services

**Running Integration Tests**:
```bash
# Run API integration tests
npx nx test api

# Run with test database
DATABASE_URL=postgresql://test:test@localhost:5432/kairos_test npx nx test api
```

### 3. End-to-End Tests

**Framework**: Playwright
**Projects**: 
- `apps/web-admin-e2e` - Admin interface testing
- `apps/member-app-e2e` - Member interface testing

**Running E2E Tests**:
```bash
# Run all e2e tests
npm run e2e

# Run specific e2e project
npx nx e2e web-admin-e2e
npx nx e2e member-app-e2e

# Run in CI mode
npm run e2e:ci
```

### 4. Scaffold Validation Tests

**Framework**: Jest
**Location**: `tools/scaffold-validation.spec.ts`
**Purpose**: Verify project structure, configuration, and dependencies

**Running Scaffold Tests**:
```bash
# Run scaffold validation
npx nx test tools

# Run with custom script
node tools/run-tests.js
```

## Test Configuration

### Jest Configuration

**Root Configuration**: `jest.preset.js`
- Global test patterns: `*.spec.ts`, `*.test.ts`
- Coverage thresholds: 80% for branches, functions, lines, statements
- Setup file: `test-setup.ts`

**Project-Specific Configurations**:
- `apps/api/jest.config.ts` - Node.js environment, integration test support
- `apps/web-admin/jest.config.ts` - React/Next.js environment
- `apps/member-app/jest.config.ts` - React/Next.js environment
- `libs/shared/*/jest.config.ts` - Library-specific configurations

### Playwright Configuration

**Configuration Files**:
- `apps/web-admin-e2e/playwright.config.ts`
- `apps/member-app-e2e/playwright.config.ts`

**Features**:
- Multi-browser testing (Chrome, Firefox, Safari)
- Automatic dev server startup
- Trace collection on test failure
- Parallel test execution

## Test Database Setup

### Prerequisites

1. PostgreSQL server running locally
2. Test database created: `kairos_test`
3. Test user with permissions: `test:test`

### Setup Commands

```sql
-- Create test database
CREATE DATABASE kairos_test;

-- Create test user
CREATE USER test WITH PASSWORD 'test';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE kairos_test TO test;
```

### Environment Variables

```bash
# Test environment
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/kairos_test
JWT_SECRET=test-jwt-secret-for-testing-only
```

## Test Utilities

### API Test Helpers

**Location**: `apps/api/src/test-database.config.ts`

```typescript
import { TestDatabaseConfig, testDbHelpers } from './test-database.config';

// Setup test database
const prisma = await TestDatabaseConfig.setupTestDatabase();

// Create test data
const user = await testDbHelpers.createTestUser();
const member = await testDbHelpers.createTestMember();

// Cleanup after tests
await TestDatabaseConfig.cleanupTestDatabase();
```

### UI Test Helpers

**Location**: `libs/shared/ui/src/test-setup.ts`

```typescript
import '@testing-library/jest-dom';

// Custom render function with providers
export function renderWithProviders(ui: ReactElement) {
  // Implementation
}
```

## Coverage Reports

**Output Locations**:
- `coverage/apps/api/` - API coverage
- `coverage/apps/web-admin/` - Web admin coverage
- `coverage/apps/member-app/` - Member app coverage
- `coverage/libs/shared/*/` - Library coverage

**Formats**:
- HTML reports for local development
- LCOV format for CI/CD integration
- JSON format for programmatic access

## CI/CD Integration

### GitHub Actions

**Workflow**: `.github/workflows/ci.yml`

```yaml
- name: Run Tests
  run: |
    npm run test:ci
    npm run e2e:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Test Scripts

```json
{
  "scripts": {
    "test": "nx test",
    "test:watch": "nx test --watch",
    "test:coverage": "nx run-many --target=test --coverage",
    "test:ci": "nx run-many --target=test --coverage --watchAll=false --passWithNoTests",
    "e2e": "nx e2e",
    "e2e:ci": "nx run-many --target=e2e --parallel=1"
  }
}
```

## Best Practices

### Unit Tests

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Test Independence**: Each test should be independent and not rely on others
3. **Test Data**: Use factories or fixtures for consistent test data
4. **Mocking**: Mock external services but test real functionality
5. **Coverage**: Aim for high coverage but focus on meaningful tests

### Integration Tests

1. **Database Isolation**: Use test database and clean up between tests
2. **Real Scenarios**: Test complete request/response cycles
3. **Error Handling**: Test both success and error scenarios
4. **Performance**: Keep integration tests reasonably fast

### E2E Tests

1. **User Journeys**: Test critical user workflows
2. **Page Objects**: Use page object pattern for maintainable tests
3. **Test Data**: Use seeded test data for consistent results
4. **Stability**: Write stable tests that don't flake

## Troubleshooting

### Common Issues

1. **Test Database Connection**:
   ```bash
   # Check database connection
   psql -h localhost -U test -d kairos_test
   ```

2. **Port Conflicts**:
   ```bash
   # Check if ports are in use
   netstat -an | grep :4200
   netstat -an | grep :4201
   ```

3. **Dependencies**:
   ```bash
   # Reinstall dependencies
   npm ci
   ```

### Debug Commands

```bash
# Run tests with debug output
DEBUG=* npx nx test <project>

# Run single test file
npx nx test <project> --testNamePattern="test name"

# Run tests with coverage
npx nx test <project> --coverage --coverageReporters=text
```

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep testing frameworks up to date
2. **Review Coverage**: Monitor test coverage trends
3. **Clean Test Data**: Ensure test database cleanup is working
4. **Performance**: Monitor test execution times

### Monitoring

- Test execution times in CI/CD
- Coverage trends over time
- Flaky test identification
- Test failure patterns