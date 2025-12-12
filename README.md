# Kairos Church Management System

Kharis Project Kairos - A comprehensive church management system built with NX monorepo architecture.

## Project Structure

This is an NX monorepo containing:

- **apps/**: Frontend and backend applications
  - `web-admin`: Next.js admin application
  - `member-app`: Next.js member application
  - `api`: NestJS backend API

- **libs/**: Shared libraries
  - `shared/types`: TypeScript interfaces and types
  - `shared/utils`: Utility functions
  - `shared/ui`: Design system and UI components

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- PostgreSQL 15.x or higher

## Getting Started

### Installation

```bash
npm install
```

### Development

Run applications in development mode:

```bash
# Web Admin (port 4200)
nx serve web-admin

# Member App (port 4201)
nx serve member-app

# API (port 3333)
nx serve api
```

### Building

Build applications for production:

```bash
# Build all applications
nx run-many --target=build --all

# Build specific application
nx build web-admin
nx build member-app
nx build api
```

### Testing

```bash
# Run all tests
nx run-many --target=test --all

# Run tests for affected projects
nx affected:test

# Run specific project tests
nx test <project-name>
```

### Linting

```bash
# Lint all projects
nx run-many --target=lint --all

# Lint affected projects
nx affected:lint

# Lint specific project
nx lint <project-name>
```

### Code Formatting

```bash
# Format all files
nx format:write

# Check formatting
nx format:check

# Format with Prettier
npm run format
```

## Code Quality

This project uses several tools to maintain code quality and consistency:

### ESLint

ESLint is configured with TypeScript, React, and NX plugins to enforce code quality standards.

**Configuration**: `.eslintrc.json`

**Key Rules**:
- TypeScript strict type checking
- React hooks rules enforcement
- Accessibility (a11y) checks for React components
- NX module boundary enforcement
- Unused variable detection

**Commands**:
```bash
# Lint all projects
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Lint affected projects only
nx affected:lint
```

### Prettier

Prettier ensures consistent code formatting across the entire codebase.

**Configuration**: `.prettierrc`

**Settings**:
- Single quotes for strings
- 2-space indentation
- 80 character line width
- Semicolons required
- Trailing commas (ES5)
- LF line endings

**Commands**:
```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check
```

### Husky & Git Hooks

Husky is configured to run pre-commit hooks that automatically lint and format staged files.

**Configuration**: `.husky/pre-commit`, `.lintstagedrc.json`

**Pre-commit Hook**:
- Runs ESLint with auto-fix on staged TypeScript/JavaScript files
- Runs Prettier on staged files
- Prevents commits if linting fails

**Setup**:
```bash
# Install Husky hooks (runs automatically after npm install)
npm run prepare
```

### EditorConfig

EditorConfig ensures consistent coding styles across different editors and IDEs.

**Configuration**: `.editorconfig`

**Settings**:
- UTF-8 charset
- 2-space indentation
- LF line endings
- Trim trailing whitespace
- Insert final newline

### Lint-Staged

Lint-staged runs linters on staged files only, making pre-commit hooks fast and efficient.

**Configuration**: `.lintstagedrc.json`

**Staged File Processing**:
- TypeScript/JavaScript files: ESLint + Prettier
- JSON/Markdown/YAML files: Prettier only

## NX Commands

- `nx graph` - View project dependency graph
- `nx affected:apps` - Show affected applications
- `nx affected:libs` - Show affected libraries
- `nx affected:build` - Build affected projects
- `nx affected:test` - Test affected projects

## Architecture

For detailed architecture documentation, see:
- [ERD Diagram](./architecture/kairos-erd.mmd)
- [Domain Model](./architecture/kairos-domain.puml)
- [Use Cases](./architecture/kairos-usecases.puml)
- [Sequence Diagrams](./architecture/sequences/)

## Module Boundaries

The workspace enforces strict module boundaries:
- Applications can depend on feature, ui, util, and data-access libraries
- Feature libraries can depend on ui, util, and data-access libraries
- UI libraries can only depend on util libraries
- Util libraries have no dependencies

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT
