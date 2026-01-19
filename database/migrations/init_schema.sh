#!/bin/bash
# ============================================================================
# Kairos Church Administration System - Database Schema Initialization Script
# ============================================================================
# Purpose: Automated execution of schema migration scripts in correct order
# Usage: ./init_schema.sh [database_name]
# Default database name: kairos
# ============================================================================

set -e  # Exit immediately if any command fails

# Configuration
DB_NAME="${1:-kairos}"
SCRIPTS_DIR="$(dirname "$0")"
REQUIRED_SCRIPTS=(
    "01_functions.sql"
    "02_tables.sql"
    "03_constraints.sql"
    "04_indexes.sql"
    "05_triggers.sql"
    "06_comments.sql"
)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_section() {
    echo ""
    echo "============================================================================"
    echo "$1"
    echo "============================================================================"
}

# Check if PostgreSQL is accessible
check_postgres() {
    if ! command -v psql &> /dev/null; then
        print_error "psql command not found. Please install PostgreSQL client."
        exit 1
    fi
    
    if ! psql -c "SELECT 1" &> /dev/null; then
        print_error "Cannot connect to PostgreSQL. Please check your connection settings."
        print_info "You may need to set PGHOST, PGPORT, PGUSER environment variables."
        exit 1
    fi
    
    print_success "PostgreSQL connection verified"
}

# Check if all required scripts exist
check_scripts() {
    local all_found=true
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if [ ! -f "$SCRIPTS_DIR/$script" ]; then
            print_error "Required script not found: $script"
            all_found=false
        fi
    done
    
    if [ "$all_found" = false ]; then
        exit 1
    fi
    
    print_success "All required migration scripts found"
}

# Create database if it doesn't exist
create_database() {
    if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_warning "Database '$DB_NAME' already exists"
        read -p "Do you want to drop and recreate it? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_info "Dropping database '$DB_NAME'..."
            dropdb "$DB_NAME"
            print_success "Database dropped"
        else
            print_info "Using existing database"
            return 0
        fi
    fi
    
    print_info "Creating database '$DB_NAME'..."
    createdb "$DB_NAME"
    print_success "Database '$DB_NAME' created"
}

# Execute a single migration script
execute_script() {
    local script=$1
    local script_name=$(basename "$script")
    
    print_info "Executing $script_name..."
    
    if psql -d "$DB_NAME" -f "$SCRIPTS_DIR/$script" -v ON_ERROR_STOP=1 > /dev/null 2>&1; then
        print_success "$script_name completed successfully"
        return 0
    else
        print_error "Error executing $script_name"
        print_error "Check the SQL script for syntax errors"
        return 1
    fi
}

# Verify installation
verify_installation() {
    print_section "Verifying Installation"
    
    # Check table count
    local table_count=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    if [ "$table_count" -eq 28 ]; then
        print_success "Table count verified: $table_count tables created"
    else
        print_warning "Expected 28 tables, found $table_count"
    fi
    
    # Check function count
    local function_count=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';" | xargs)
    if [ "$function_count" -ge 1 ]; then
        print_success "Function count verified: $function_count functions created"
    else
        print_warning "Expected at least 1 function, found $function_count"
    fi
    
    # Check trigger count
    local trigger_count=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';" | xargs)
    if [ "$trigger_count" -ge 23 ]; then
        print_success "Trigger count verified: $trigger_count triggers created"
    else
        print_warning "Expected at least 23 triggers, found $trigger_count"
    fi
    
    # Check foreign key count
    local fk_count=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';" | xargs)
    if [ "$fk_count" -ge 70 ]; then
        print_success "Foreign key count verified: $fk_count constraints created"
    else
        print_warning "Expected at least 70 foreign keys, found $fk_count"
    fi
    
    # Check index count
    local index_count=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | xargs)
    if [ "$index_count" -ge 90 ]; then
        print_success "Index count verified: $index_count indexes created"
    else
        print_warning "Expected at least 90 indexes, found $index_count"
    fi
}

# Main execution flow
main() {
    print_section "Kairos Database Schema Initialization"
    echo "Database: $DB_NAME"
    echo "Scripts Directory: $SCRIPTS_DIR"
    echo ""
    
    # Pre-flight checks
    print_info "Running pre-flight checks..."
    check_postgres
    check_scripts
    
    # Database creation
    print_section "Database Setup"
    create_database
    
    # Execute migration scripts
    print_section "Executing Migration Scripts"
    local success=true
    
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if ! execute_script "$script"; then
            success=false
            break
        fi
    done
    
    if [ "$success" = false ]; then
        print_section "Migration Failed"
        print_error "Schema initialization failed. Database may be in incomplete state."
        print_info "Consider dropping and recreating the database."
        exit 1
    fi
    
    # Verification
    verify_installation
    
    # Success message
    print_section "Schema Initialization Complete"
    print_success "All migration scripts executed successfully!"
    echo ""
    print_info "You can now connect to the database:"
    echo "  psql -d $DB_NAME"
    echo ""
    print_info "To verify the schema:"
    echo "  psql -d $DB_NAME -c '\\dt'"
    echo ""
}

# Run main function
main
