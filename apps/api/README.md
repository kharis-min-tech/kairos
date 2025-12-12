# Kairos API

The NestJS backend API for the Kairos Church Management System.

## Features

- **NestJS Framework**: Built with NestJS for scalable server-side applications
- **TypeScript**: Strict TypeScript configuration for type safety
- **CORS Enabled**: Configured for web-admin (port 4200) and member-app (port 4201)
- **Global Validation**: Input validation using class-validator
- **Common Utilities**: Guards, interceptors, filters, and decorators for cross-cutting concerns

## Project Structure

```
apps/api/
├── src/
│   ├── app/                    # Main application module
│   │   ├── app.controller.ts   # Root controller
│   │   ├── app.service.ts      # Root service
│   │   └── app.module.ts       # Root module
│   ├── common/                 # Shared utilities
│   │   ├── guards/             # Authentication & authorization guards
│   │   ├── interceptors/       # HTTP interceptors (logging, transform)
│   │   ├── filters/            # Exception filters
│   │   └── decorators/         # Custom decorators
│   ├── assets/                 # Static assets
│   └── main.ts                 # Application entry point
├── .env.example                # Environment variables template
└── project.json                # NX project configuration
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `PORT`: Server port (default: 3333)
- `CORS_ORIGIN`: Allowed CORS origins

## Development

```bash
# Start development server
npx nx serve api

# Run tests
npx nx test api

# Build for production
npx nx build api

# Lint code
npx nx lint api
```

## API Endpoints

- `GET /api` - Hello API message
- `GET /api/health` - Health check endpoint

## Common Utilities

### Guards
- `AuthGuard`: JWT authentication guard
- `RolesGuard`: Role-based authorization guard

### Interceptors
- `LoggingInterceptor`: Request/response logging
- `TransformInterceptor`: Response transformation

### Filters
- `HttpExceptionFilter`: HTTP exception handling
- `AllExceptionsFilter`: Global exception handling

### Decorators
- `@Roles()`: Role-based access control
- `@CurrentUser()`: Extract current user from request

## Configuration

The API is configured with:
- CORS enabled for frontend applications
- Global validation pipes
- TypeScript strict mode
- Port 3333 (configurable via PORT env var)