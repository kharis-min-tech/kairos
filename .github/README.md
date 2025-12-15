# GitHub Actions Workflows

This directory contains the CI/CD workflows and automation for the Kairos Church Management System.

## Workflows Overview

### Core Workflows

#### 1. CI Workflow (`ci.yml`)
**Triggers**: Push to main/develop, Pull Requests
**Purpose**: Continuous Integration - validates code quality and functionality

**Steps**:
- Checkout code with full history for NX affected commands
- Setup Node.js (18.x, 20.x) with npm caching
- Install dependencies
- Run NX affected commands:
  - `nx affected:lint` - ESLint validation
  - `nx affected:test` - Jest tests with coverage
  - `nx affected:build` - Production builds
- Upload coverage reports to Codecov
- Comment PR with test results

**NX Optimization**: Uses `nrwl/nx-set-shas` to determine affected projects and only run tasks for changed code.

#### 2. CD Workflow (`cd.yml`)
**Triggers**: Push to main branch, Manual dispatch
**Purpose**: Continuous Deployment - builds and deploys applications

**Jobs**:
1. **Test**: Full test suite validation
2. **Build and Push**: 
   - Builds Docker images for each app (web-admin, member-app, api)
   - Pushes to GitHub Container Registry (ghcr.io)
   - Tags with branch name, SHA, and 'latest'
3. **Deploy Staging**: 
   - Deploys to staging environment
   - Runs smoke tests
   - Sends deployment notifications
4. **Deploy Production**: 
   - Requires manual approval
   - Deploys to production with comprehensive verification

### Security and Quality

#### 3. Security Workflow (`security.yml`)
**Triggers**: Daily schedule, Push/PR to main
**Purpose**: Security scanning and vulnerability detection

**Features**:
- npm audit for dependency vulnerabilities
- CodeQL analysis for code security issues
- Trivy filesystem scanning
- Dependency review for PRs
- Results uploaded to GitHub Security tab

#### 4. Performance Workflow (`performance.yml`)
**Triggers**: PRs affecting apps/libs, Weekly schedule
**Purpose**: Performance monitoring and optimization

**Features**:
- Lighthouse CI for web performance metrics
- Bundle size analysis
- Load testing (scheduled)
- Performance regression detection
- PR comments with performance insights

### Automation and Management

#### 5. PR Management (`pr-management.yml`)
**Triggers**: PR events, Issue events
**Purpose**: Automated PR and issue management

**Features**:
- Auto-labeling based on changed files
- PR size labeling
- Semantic PR title validation
- Breaking change detection
- Dependabot PR auto-approval and merge
- Issue assignment and project board integration

#### 6. Release Workflow (`release.yml`)
**Triggers**: Git tags (v*)
**Purpose**: Automated release creation and artifact publishing

**Features**:
- Full test suite validation
- Changelog generation from commits
- GitHub release creation
- Docker image building with release tags
- Stable tag management

### Utility Workflows

#### 7. Workflow Validation (`validate-workflows.yml`)
**Triggers**: Changes to workflow files
**Purpose**: Validates workflow syntax and structure

#### 8. Badge Updates (`badges.yml`)
**Triggers**: Push to main, Workflow completions
**Purpose**: Updates README badges with current status

## Configuration Files

### Dependabot (`dependabot.yml`)
Automated dependency updates for:
- npm packages (weekly, Mondays 9 AM)
- GitHub Actions (weekly)
- Docker base images (weekly)

**Settings**:
- Max 10 open PRs
- Auto-assigns to kairos-team
- Semantic commit messages
- Appropriate labels

### PR Labeler (`labeler.yml`)
Automatic labeling based on file paths:
- `app:web-admin`, `app:member-app`, `app:api`
- `lib:shared`, `lib:types`, `lib:utils`, `lib:ui`
- `infrastructure`, `database`, `documentation`
- `testing`, `dependencies`, `config`, `ci/cd`, `security`

### Lighthouse Configuration
Performance testing configuration for Next.js apps:
- **Web Admin**: Port 4200, performance/accessibility thresholds
- **Member App**: Port 4201, same thresholds
- Minimum scores: Performance 80%, Accessibility 90%, Best Practices 80%, SEO 80%

## Secrets and Environment Variables

### Required Secrets
- `GITHUB_TOKEN`: Automatically provided by GitHub
- Additional secrets for production deployment (to be configured):
  - Container registry credentials
  - Deployment environment access
  - Notification service tokens

### Environment Variables
- `REGISTRY`: ghcr.io (GitHub Container Registry)
- `IMAGE_NAME`: Repository name for Docker images

## Workflow Permissions

Each workflow uses minimal required permissions:
- **CI**: `contents: read`
- **CD**: `contents: read, packages: write`
- **Security**: `contents: read, security-events: write`
- **PR Management**: `contents: read, pull-requests: write, issues: write`

## NX Integration

All workflows leverage NX's affected command system:
- `nx affected:lint` - Only lint changed projects
- `nx affected:test` - Only test changed projects  
- `nx affected:build` - Only build changed projects
- `nx run-many --target=* --all` - Run for all projects (full CI/CD)

This dramatically reduces CI/CD execution time by only processing changed code.

## Monitoring and Notifications

### Coverage Reporting
- Codecov integration for coverage tracking
- Coverage reports uploaded from CI workflow
- PR comments with coverage information

### Performance Monitoring
- Lighthouse CI reports
- Bundle size tracking
- Performance regression alerts

### Security Monitoring
- Daily security scans
- Vulnerability alerts in GitHub Security tab
- Dependency review on PRs

## Usage Examples

### Running Workflows Locally

```bash
# Simulate affected commands locally
npx nx affected:lint
npx nx affected:test --coverage
npx nx affected:build

# Run full suite (like CD workflow)
npx nx run-many --target=lint --all
npx nx run-many --target=test --all --coverage
npx nx run-many --target=build --all
```

### Manual Workflow Triggers

```bash
# Trigger CD workflow manually
gh workflow run cd.yml

# Trigger security scan
gh workflow run security.yml
```

### Viewing Workflow Status

```bash
# List workflow runs
gh run list

# View specific run details
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```

## Troubleshooting

### Common Issues

1. **NX Affected Not Working**
   - Ensure `fetch-depth: 0` in checkout action
   - Verify `nrwl/nx-set-shas` action is used
   - Check base branch configuration

2. **Docker Build Failures**
   - Verify Dockerfile exists in app directories
   - Check build context and file paths
   - Ensure production build succeeds locally

3. **Test Failures**
   - Check test database configuration
   - Verify environment variables
   - Review test isolation and cleanup

4. **Permission Errors**
   - Verify workflow permissions
   - Check secret availability
   - Ensure token scopes are sufficient

### Debugging Workflows

1. Enable debug logging:
   ```yaml
   env:
     ACTIONS_STEP_DEBUG: true
     ACTIONS_RUNNER_DEBUG: true
   ```

2. Add debug steps:
   ```yaml
   - name: Debug environment
     run: |
       echo "Node version: $(node --version)"
       echo "NPM version: $(npm --version)"
       echo "Working directory: $(pwd)"
       ls -la
   ```

3. Use workflow dispatch for testing:
   ```yaml
   on:
     workflow_dispatch:
       inputs:
         debug:
           description: 'Enable debug mode'
           required: false
           default: 'false'
   ```

## Future Enhancements

1. **Advanced Deployment**
   - Blue-green deployments
   - Canary releases
   - Rollback automation

2. **Enhanced Testing**
   - Visual regression testing
   - Cross-browser testing
   - API contract testing

3. **Monitoring Integration**
   - Application performance monitoring
   - Error tracking integration
   - Custom metrics collection

4. **Security Enhancements**
   - SAST/DAST integration
   - Container image scanning
   - Compliance reporting

## Contributing

When modifying workflows:

1. Test changes in a feature branch
2. Validate YAML syntax locally
3. Use workflow dispatch for testing
4. Document any new secrets or permissions required
5. Update this README with changes

For more information, see the main project [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).