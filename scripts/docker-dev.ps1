# Docker Development Helper Script for Kairos Church Management System (PowerShell)

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Service = ""
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker and try again."
        exit 1
    }
}

# Function to check if docker-compose is available
function Test-DockerCompose {
    try {
        docker-compose --version | Out-Null
        return $true
    }
    catch {
        Write-Error "docker-compose is not installed. Please install docker-compose and try again."
        exit 1
    }
}

# Function to setup environment file
function Set-Environment {
    if (-not (Test-Path ".env.docker.local")) {
        Write-Status "Creating .env.docker.local from template..."
        Copy-Item ".env.docker" ".env.docker.local"
        Write-Success "Created .env.docker.local. Please review and update the configuration as needed."
    }
    else {
        Write-Status ".env.docker.local already exists."
    }
}

# Function to build all services
function Build-Services {
    Write-Status "Building Docker services..."
    docker-compose --env-file .env.docker.local build --no-cache
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All services built successfully."
    }
    else {
        Write-Error "Failed to build services."
        exit 1
    }
}

# Function to start services
function Start-Services {
    Write-Status "Starting Docker services..."
    docker-compose --env-file .env.docker.local up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All services started successfully."
        Write-Status "Services are running on:"
        Write-Host "  - Web Admin: http://localhost:4200"
        Write-Host "  - Member App: http://localhost:4201"
        Write-Host "  - API: http://localhost:3333"
        Write-Host "  - PostgreSQL: localhost:5432"
        Write-Host "  - Redis: localhost:6379"
    }
    else {
        Write-Error "Failed to start services."
        exit 1
    }
}

# Function to stop services
function Stop-Services {
    Write-Status "Stopping Docker services..."
    docker-compose --env-file .env.docker.local down
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All services stopped successfully."
    }
}

# Function to view logs
function Show-Logs {
    param([string]$ServiceName)
    
    if ([string]::IsNullOrEmpty($ServiceName)) {
        Write-Status "Showing logs for all services..."
        docker-compose --env-file .env.docker.local logs -f
    }
    else {
        Write-Status "Showing logs for $ServiceName..."
        docker-compose --env-file .env.docker.local logs -f $ServiceName
    }
}

# Function to run database migrations
function Invoke-Migrations {
    Write-Status "Running database migrations..."
    docker-compose --env-file .env.docker.local exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database migrations completed."
    }
}

# Function to seed database
function Invoke-DatabaseSeed {
    Write-Status "Seeding database..."
    docker-compose --env-file .env.docker.local exec api npx prisma db seed --schema=apps/api/prisma/schema.prisma
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database seeded successfully."
    }
}

# Function to reset database
function Reset-Database {
    Write-Warning "This will delete all data in the database. Are you sure? (y/N)"
    $response = Read-Host
    if ($response -match "^[yY]([eE][sS])?$") {
        Write-Status "Resetting database..."
        docker-compose --env-file .env.docker.local exec api npx prisma migrate reset --force --schema=apps/api/prisma/schema.prisma
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database reset completed."
        }
    }
    else {
        Write-Status "Database reset cancelled."
    }
}

# Function to show service status
function Show-Status {
    Write-Status "Docker services status:"
    docker-compose --env-file .env.docker.local ps
}

# Function to clean up Docker resources
function Invoke-Cleanup {
    Write-Warning "This will remove all stopped containers, unused networks, and dangling images. Continue? (y/N)"
    $response = Read-Host
    if ($response -match "^[yY]([eE][sS])?$") {
        Write-Status "Cleaning up Docker resources..."
        docker system prune -f
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker cleanup completed."
        }
    }
    else {
        Write-Status "Cleanup cancelled."
    }
}

# Function to show help
function Show-Help {
    Write-Host "Kairos Docker Development Helper (PowerShell)"
    Write-Host ""
    Write-Host "Usage: .\scripts\docker-dev.ps1 [COMMAND] [SERVICE]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  setup       Setup environment file"
    Write-Host "  build       Build all Docker services"
    Write-Host "  start       Start all services"
    Write-Host "  stop        Stop all services"
    Write-Host "  restart     Restart all services"
    Write-Host "  logs        View logs for all services"
    Write-Host "  logs <svc>  View logs for specific service (api, web-admin, member-app, postgres, redis)"
    Write-Host "  status      Show service status"
    Write-Host "  migrate     Run database migrations"
    Write-Host "  seed        Seed database with initial data"
    Write-Host "  reset-db    Reset database (WARNING: deletes all data)"
    Write-Host "  cleanup     Clean up Docker resources"
    Write-Host "  help        Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\docker-dev.ps1 setup"
    Write-Host "  .\scripts\docker-dev.ps1 build"
    Write-Host "  .\scripts\docker-dev.ps1 start"
    Write-Host "  .\scripts\docker-dev.ps1 logs api"
}

# Main script logic
Test-Docker
Test-DockerCompose

switch ($Command.ToLower()) {
    "setup" { Set-Environment }
    "build" { Build-Services }
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { 
        Stop-Services
        Start-Services
    }
    "logs" { Show-Logs $Service }
    "status" { Show-Status }
    "migrate" { Invoke-Migrations }
    "seed" { Invoke-DatabaseSeed }
    "reset-db" { Reset-Database }
    "cleanup" { Invoke-Cleanup }
    "help" { Show-Help }
    default {
        Write-Error "Unknown command: $Command"
        Show-Help
        exit 1
    }
}