# Docker Configuration for Kairos Church Management System

This document provides comprehensive information about the Docker setup for the Kairos Church Management System monorepo.

## Overview

The Docker configuration includes:
- **Multi-stage Dockerfiles** for each application (web-admin, member-app, api)
- **Docker Compose** setup for local development
- **PostgreSQL** database service
- **Redis** caching service
- **Development scripts** for easy management

## Prerequisites

- Docker Desktop 4.0+ or Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for Docker
- At least 10GB free disk space

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp .env.docker .env.docker.local

# Edit the environment file with your settings
# Update passwords, secrets, and other configuration as needed
```

### 2. Start Services

```bash
# Using the helper script (Linux/macOS)
./scripts/docker-dev.sh setup
./scripts/docker-dev.sh build
./scripts/docker-dev.sh start

# Using PowerShell (Windows)
.\scripts\docker-dev.ps1 setup
.\scripts\docker-dev.ps1 build
.\scripts\docker-dev.ps1 start

# Or using docker-compose directly
docker-compose --env-file .env.docker.local up -d
```

### 3. Access Applications

Once all services are running:

- **Web Admin**: http://localhost:4200
- **Member App**: http://localhost:4201
- **API**: http://localhost:3333
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Services

### API Service (NestJS)

**Container**: `kairos-api`
**Port**: 3333
**Health Check**: `GET /health`

The API service includes:
- Automatic database migrations on startup
- Prisma ORM for database access
- JWT authentication
- CORS configuration
- Health check endpoint

### Web Admin Service (Next.js)

**Container**: `kairos-web-admin`
**Port**: 4200

Administrative interface for church staff with:
- Server-side rendering
- Optimized production build
- Environment-based configuration

### Member App Service (Next.js)

**Container**: `kairos-member-app`
**Port**: 4201

Member-facing application with:
- Server-side rendering
- Optimized production build
- Environment-based configuration

### PostgreSQL Database

**Container**: `kairos-postgres`
**Port**: 5432
**Database**: `kairos`
**User**: `kairos` (configurable)

Features:
- Persistent data storage
- Health checks
- Initialization scripts support
- Development seed data

### Redis Cache

**Container**: `kairos-redis`
**Port**: 6379

Used for:
- Session storage
- Application caching
- Rate limiting
- Background job queues

## Environment Configuration

### Required Environment Variables

Create `.env.docker.local` from `.env.docker` template:

```bash
# Database
POSTGRES_DB=kairos
POSTGRES_USER=kairos
POSTGRES_PASSWORD=your-secure-password

# API
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
DATABASE_URL=postgresql://kairos:your-secure-password@postgres:5432/kairos

# Applications
NEXT_PUBLIC_API_URL=http://localhost:3333
```

### Security Considerations

**Important**: Always change default passwords and secrets in production!

- Use strong, unique passwords for database
- Generate secure JWT secrets (minimum 32 characters)
- Update CORS origins for production domains
- Use environment-specific configuration files

## Development Workflow

### Starting Development

```bash
# Setup and start all services
./scripts/docker-dev.sh setup
./scripts/docker-dev.sh build
./scripts/docker-dev.sh start

# View logs
./scripts/docker-dev.sh logs

# View specific service logs
./scripts/docker-dev.sh logs api
```

### Database Operations

```bash
# Run migrations
./scripts/docker-dev.sh migrate

# Seed database with test data
./scripts/docker-dev.sh seed

# Reset database (WARNING: deletes all data)
./scripts/docker-dev.sh reset-db
```

### Stopping Services

```bash
# Stop all services
./scripts/docker-dev.sh stop

# Or using docker-compose
docker-compose --env-file .env.docker.local down
```

## Production Deployment

### Building Production Images

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Push to registry
docker-compose -f docker-compose.yml -f docker-compose.prod.yml push
```

### Production Environment Variables

Create production-specific environment files:

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-db:5432/kairos
JWT_SECRET=production-jwt-secret-very-long-and-secure
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Security Best Practices

1. **Secrets Management**: Use Docker secrets or external secret management
2. **Network Security**: Use custom networks and limit exposed ports
3. **Image Security**: Regularly update base images and scan for vulnerabilities
4. **Resource Limits**: Set memory and CPU limits for containers
5. **Logging**: Configure centralized logging for production

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check service status
docker-compose --env-file .env.docker.local ps

# View logs for errors
docker-compose --env-file .env.docker.local logs

# Check Docker resources
docker system df
```

#### Database Connection Issues

```bash
# Check database health
docker-compose --env-file .env.docker.local exec postgres pg_isready

# Connect to database directly
docker-compose --env-file .env.docker.local exec postgres psql -U kairos -d kairos

# Check database logs
docker-compose --env-file .env.docker.local logs postgres
```

#### Build Failures

```bash
# Clean build cache
docker builder prune

# Rebuild without cache
docker-compose --env-file .env.docker.local build --no-cache

# Check Dockerfile syntax
docker build -f apps/api/Dockerfile .
```

#### Port Conflicts

```bash
# Check what's using ports
netstat -tulpn | grep :3333
netstat -tulpn | grep :4200
netstat -tulpn | grep :5432

# Change ports in .env.docker.local
API_PORT=3334
WEB_ADMIN_PORT=4202
POSTGRES_PORT=5433
```

### Performance Optimization

#### Resource Allocation

```yaml
# Add to docker-compose.yml services
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

#### Volume Optimization

```bash
# Use named volumes for better performance
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

### Monitoring and Logging

#### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose --env-file .env.docker.local ps

# Manual health check
curl http://localhost:3333/health
```

#### Log Management

```bash
# Follow logs in real-time
docker-compose --env-file .env.docker.local logs -f

# Limit log output
docker-compose --env-file .env.docker.local logs --tail=100

# Export logs
docker-compose --env-file .env.docker.local logs > kairos-logs.txt
```

## Helper Scripts

### Linux/macOS: `scripts/docker-dev.sh`

```bash
# Available commands
./scripts/docker-dev.sh help
./scripts/docker-dev.sh setup
./scripts/docker-dev.sh build
./scripts/docker-dev.sh start
./scripts/docker-dev.sh stop
./scripts/docker-dev.sh logs [service]
./scripts/docker-dev.sh status
./scripts/docker-dev.sh migrate
./scripts/docker-dev.sh seed
./scripts/docker-dev.sh reset-db
./scripts/docker-dev.sh cleanup
```

### Windows: `scripts/docker-dev.ps1`

```powershell
# Available commands
.\scripts\docker-dev.ps1 help
.\scripts\docker-dev.ps1 setup
.\scripts\docker-dev.ps1 build
.\scripts\docker-dev.ps1 start
.\scripts\docker-dev.ps1 stop
.\scripts\docker-dev.ps1 logs [service]
.\scripts\docker-dev.ps1 status
.\scripts\docker-dev.ps1 migrate
.\scripts\docker-dev.ps1 seed
.\scripts\docker-dev.ps1 reset-db
.\scripts\docker-dev.ps1 cleanup
```

## File Structure

```
kairos/
├── docker-compose.yml              # Main compose file
├── docker-compose.override.yml     # Development overrides
├── .env.docker                     # Environment template
├── .env.docker.local              # Local environment (gitignored)
├── apps/
│   ├── web-admin/
│   │   ├── Dockerfile
│   │   └── .dockerignore
│   ├── member-app/
│   │   ├── Dockerfile
│   │   └── .dockerignore
│   └── api/
│       ├── Dockerfile
│       └── .dockerignore
├── scripts/
│   ├── docker-dev.sh              # Linux/macOS helper
│   └── docker-dev.ps1             # Windows helper
└── docs/
    └── DOCKER.md                  # This documentation
```

## Next Steps

1. **Review Configuration**: Update `.env.docker.local` with your settings
2. **Start Development**: Use helper scripts to start services
3. **Database Setup**: Run migrations and seed data
4. **Development**: Begin developing with hot-reload enabled
5. **Testing**: Run tests against containerized services
6. **Production**: Configure production deployment

For more information, see the main project README and individual application documentation.