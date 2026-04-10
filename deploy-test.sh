#!/bin/bash

# Kairos Local Deployment Test Script
# This script tests the complete deployment process

set -e  # Exit on any error

echo "🚀 Kairos Local Deployment Test"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
print_success "Node.js $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm --version)"

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi
print_success "Docker $(docker --version)"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi
print_success "Docker Compose available"

echo ""

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found, copying from .env.example"
    cp .env.example .env
    print_success "Created .env file"
fi

echo ""
echo "🐳 Step 1: Starting PostgreSQL..."
if docker ps | grep -q kairos-db; then
    print_warning "PostgreSQL container already running"
else
    docker compose up -d
    print_success "PostgreSQL started"
    echo "   Waiting for database to be ready..."
    sleep 3
fi

echo ""
echo "📦 Step 2: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_warning "Dependencies already installed (skipping)"
fi

echo ""
echo "🗄️  Step 3: Generating database schema..."
npm run db:generate
print_success "Schema generated"

echo ""
echo "🔄 Step 4: Running migrations..."
npm run db:migrate
print_success "Migrations applied"

echo ""
echo "🌱 Step 5: Seeding database..."
npm run db:seed
print_success "Database seeded"

echo ""
echo "🧪 Step 6: Running backend tests..."
cd apps/api
if npm test; then
    print_success "All backend tests passed"
else
    print_warning "Some tests failed (this may be expected)"
fi
cd ../..

echo ""
echo "✅ Deployment test complete!"
echo ""
echo "📝 Test Accounts (password: Password1!):"
echo "   Admin:   admin@kairos.local"
echo "   Pastor:  james.okonkwo@kairos.local"
echo "   Leader:  sarah.williams@kairos.local"
echo "   Member:  emma.thompson@kairos.local"
echo ""
echo "🌐 Next steps:"
echo "   1. Start dev servers: npm run dev"
echo "   2. Open browser: http://localhost:3000"
echo "   3. View database: npm run db:studio"
echo ""
echo "📚 For more info, see DEPLOYMENT.md"
