# Kairos Church Management System

A comprehensive church management system built with modern web technologies, designed to streamline church operations, member management, and ministry coordination.

## 🏗️ Architecture Overview

Kairos is built as an NX monorepo containing multiple applications and shared libraries:

- **Frontend Applications**: Web Admin (Next.js) and Member App (Next.js)
- **Backend API**: NestJS application with domain-driven module structure
- **Shared Libraries**: TypeScript types, utilities, and UI components
- **Infrastructure**: PostgreSQL database, Prisma ORM, GitHub Actions CI/CD

```
kairos/
├── apps/
│   ├── web-admin/          # Next.js admin application
│   ├── member-app/         # Next.js member application
│   ├── api/                # NestJS backend API
│   ├── web-admin-e2e/      # E2E tests for web-admin
│   └── member-app-e2e/     # E2E tests for member-app
├── libs/
│   └── shared/
│       ├── types/          # Shared TypeScript interfaces
│       ├── utils/          # Shared utility functions
│       └── ui/             # Design system & UI components
├── architecture/           # Architecture diagrams and documentation
├── .github/               # GitHub Actions workflows
└── docs/                  # Additional documentation
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher (comes with Node.js)
- **PostgreSQL**: Version 15.x or higher
- **Git**: Latest version

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kairos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment templates
   cp apps/api/.env.example apps/api/.env
   cp apps/web-admin/.env.example apps/web-admin/.env.local
   cp apps/member-app/.env.example apps/member-app/.env.local
   ```

4. **Configure database**
   ```bash
   # Update DATABASE_URL in apps/api/.env
   # Example: DATABASE_URL="postgresql://username:password@localhost:5432/kairos"
   ```

5. **Initialize database**
   ```bash
   cd apps/api
   npx prisma migrate dev --name init
   npx prisma generate
   cd ../..
   ```

6. **Start development servers**
   ```bash
   # Start all applications
   npm run start:all
   
   # Or start individually
   nx serve web-admin    # http://localhost:4200
   nx serve member-app   # http://localhost:4201
   nx serve api          # http://localhost:3333
   ```

## 🛠️ Development Commands

### Serving Applications

```bash
# Start all applications
npm run start:all

# Start individual applications
nx serve web-admin          # Admin interface (port 4200)
nx serve member-app         # Member interface (port 4201)
nx serve api               # Backend API (port 3333)

# Start with specific configuration
nx serve web-admin --configuration=development
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific project
nx test web-admin
nx test member-app
nx test api
nx test shared-utils

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run affected tests only
npm run affected:test

# Run end-to-end tests
npm run e2e
nx e2e web-admin-e2e
nx e2e member-app-e2e
```

### Building

```bash
# Build all applications
npm run build

# Build all applications and libraries
npm run build:all

# Build for production (optimized)
npm run build:all:prod

# Build specific application
nx build web-admin
nx build member-app
nx build api

# Build with optimization
npm run build:optimize
npm run build:optimize:prod

# Build affected projects only
npm run affected:build
npm run affected:build:prod

# Build specific groups
npm run build:apps      # Applications only
npm run build:libs      # Libraries only
```

For detailed build optimization information, see [Build Optimization Guide](docs/BUILD_OPTIMIZATION.md).

### Linting and Formatting

```bash
# Lint all projects
npm run lint

# Lint specific project
nx lint web-admin

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Lint affected projects only
npm run affected:lint
```

### Database Operations

```bash
# Generate Prisma client
cd apps/api && npx prisma generate

# Create and apply migration
cd apps/api && npx prisma migrate dev --name migration_name

# Reset database
cd apps/api && npx prisma migrate reset

# View database in Prisma Studio
cd apps/api && npx prisma studio

# Seed database
cd apps/api && npx prisma db seed
```

### Docker Operations

```bash
# Set up Docker environment
npm run docker:setup

# Build Docker images
npm run docker:build

# Start services
npm run docker:start

# Stop services
npm run docker:stop

# View logs
npm run docker:logs

# Check status
npm run docker:status

# Run database migrations in Docker
npm run docker:migrate

# Clean up Docker resources
npm run docker:clean
```

## 📁 Project Structure

### Applications (`apps/`)

- **`web-admin/`**: Administrative web interface for church staff
  - Built with Next.js 14 (App Router)
  - Tailwind CSS for styling
  - Authentication and role-based access
  - Comprehensive admin features

- **`member-app/`**: Member-facing web application
  - Built with Next.js 14 (App Router)
  - Member dashboard and self-service features
  - Event registration and giving

- **`api/`**: Backend REST API
  - Built with NestJS
  - Modular architecture by domain
  - Prisma ORM for database access
  - JWT authentication

### Libraries (`libs/shared/`)

- **`types/`**: Shared TypeScript interfaces and types
- **`utils/`**: Common utility functions (date, validation, currency)
- **`ui/`**: Design system and reusable React components

### Key Configuration Files

- **`nx.json`**: NX workspace configuration
- **`package.json`**: Dependencies and scripts
- **`tsconfig.base.json`**: TypeScript configuration with path aliases
- **`jest.config.ts`**: Jest testing configuration
- **`.eslintrc.json`**: ESLint configuration
- **`.prettierrc`**: Prettier formatting rules

## 🏛️ Architecture Documentation

Detailed architecture documentation is available in the `architecture/` directory:

- **[Entity Relationship Diagram](architecture/kairos-erd.mmd)**: Database schema and relationships
- **[Domain Model](architecture/kairos-domain.puml)**: Business domain structure
- **[Component Diagram](architecture/kairos-components.puml)**: System components and interactions
- **[Use Cases](architecture/kairos-usecases.puml)**: System use cases and actors
- **[Sequence Diagrams](architecture/sequences/)**: Detailed interaction flows

### Key Architectural Principles

1. **Modular Design**: Each domain (Members, Events, Finance, etc.) is isolated
2. **Shared Libraries**: Common code is extracted into reusable libraries
3. **Type Safety**: Full TypeScript coverage with strict type checking
4. **Testing**: Comprehensive unit, integration, and E2E testing
5. **CI/CD**: Automated testing and deployment pipelines

## 🔧 Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks and context
- **Testing**: Jest, React Testing Library, Playwright

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Testing**: Jest, Supertest

### Development Tools
- **Monorepo**: NX
- **Linting**: ESLint
- **Formatting**: Prettier
- **Git Hooks**: Husky
- **CI/CD**: GitHub Actions
- **Containerization**: Docker

## 🚀 Deployment

### Development Environment
```bash
# Start all services locally
npm run start:all
```

### Docker Environment
```bash
# Start with Docker Compose
npm run docker:setup
npm run docker:build
npm run docker:start
```

### Production Deployment
- Applications are containerized using Docker
- CI/CD pipelines handle automated deployment
- See `.github/workflows/` for deployment configurations

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes following our coding standards
3. Write tests for new functionality
4. Ensure all tests pass and code is properly formatted
5. Submit a pull request with a clear description

## 📚 Additional Resources

- **[API Documentation](apps/api/README.md)**: Backend API details
- **[Web Admin Documentation](apps/web-admin/README.md)**: Admin interface guide
- **[Member App Documentation](apps/member-app/README.md)**: Member application guide
- **[Docker Setup](docs/DOCKER.md)**: Docker development environment
- **[Testing Guide](TESTING.md)**: Testing strategies and best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `docs/` directory

---

**Built with ❤️ for Kairos Church**