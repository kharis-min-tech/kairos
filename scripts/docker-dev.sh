#!/bin/bash

# Docker Development Helper Script for Kairos Church Management System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1; then
        print_error "docker-compose is not installed. Please install docker-compose and try again."
        exit 1
    fi
}

# Function to setup environment file
setup_env() {
    if [ ! -f ".env.docker.local" ]; then
        print_status "Creating .env.docker.local from template..."
        cp .env.docker .env.docker.local
        print_success "Created .env.docker.local. Please review and update the configuration as needed."
    else
        print_status ".env.docker.local already exists."
    fi
}

# Function to build all services
build_services() {
    print_status "Building Docker services..."
    docker-compose --env-file .env.docker.local build --no-cache
    print_success "All services built successfully."
}

# Function to start services
start_services() {
    print_status "Starting Docker services..."
    docker-compose --env-file .env.docker.local up -d
    print_success "All services started successfully."
    
    print_status "Services are running on:"
    echo "  - Web Admin: http://localhost:4200"
    echo "  - Member App: http://localhost:4201"
    echo "  - API: http://localhost:3333"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
}

# Function to stop services
stop_services() {
    print_status "Stopping Docker services..."
    docker-compose --env-file .env.docker.local down
    print_success "All services stopped successfully."
}

# Function to view logs
view_logs() {
    local service=$1
    if [ -z "$service" ]; then
        print_status "Showing logs for all services..."
        docker-compose --env-file .env.docker.local logs -f
    else
        print_status "Showing logs for $service..."
        docker-compose --env-file .env.docker.local logs -f "$service"
    fi
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    docker-compose --env-file .env.docker.local exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
    print_success "Database migrations completed."
}

# Function to seed database
seed_database() {
    print_status "Seeding database..."
    docker-compose --env-file .env.docker.local exec api npx prisma db seed --schema=apps/api/prisma/schema.prisma
    print_success "Database seeded successfully."
}

# Function to reset database
reset_database() {
    print_warning "This will delete all data in the database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Resetting database..."
        docker-compose --env-file .env.docker.local exec api npx prisma migrate reset --force --schema=apps/api/prisma/schema.prisma
        print_success "Database reset completed."
    else
        print_status "Database reset cancelled."
    fi
}

# Function to show service status
show_status() {
    print_status "Docker services status:"
    docker-compose --env-file .env.docker.local ps
}

# Function to clean up Docker resources
cleanup() {
    print_warning "This will remove all stopped containers, unused networks, and dangling images. Continue? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up Docker resources..."
        docker system prune -f
        print_success "Docker cleanup completed."
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to show help
show_help() {
    echo "Kairos Docker Development Helper"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup       Setup environment file"
    echo "  build       Build all Docker services"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        View logs for all services"
    echo "  logs <svc>  View logs for specific service (api, web-admin, member-app, postgres, redis)"
    echo "  status      Show service status"
    echo "  migrate     Run database migrations"
    echo "  seed        Seed database with initial data"
    echo "  reset-db    Reset database (WARNING: deletes all data)"
    echo "  cleanup     Clean up Docker resources"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup && $0 build && $0 start"
    echo "  $0 logs api"
    echo "  $0 restart"
}

# Main script logic
main() {
    check_docker
    check_docker_compose
    
    case "${1:-help}" in
        setup)
            setup_env
            ;;
        build)
            build_services
            ;;
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            start_services
            ;;
        logs)
            view_logs "$2"
            ;;
        status)
            show_status
            ;;
        migrate)
            run_migrations
            ;;
        seed)
            seed_database
            ;;
        reset-db)
            reset_database
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"