#!/bin/bash
# ============================================================================
# Kairos Church Administration System - Seed Data Script
# ============================================================================
# Purpose: Populate database with realistic test/development data
# Usage: ./seed_data.sh [database_name]
# Default database name: kairos
# ============================================================================
# WARNING: This generates test data and should NOT be run in production!
# ============================================================================

set -e  # Exit immediately if any command fails

# Configuration
DB_NAME="${1:-kairos}"
SCRIPT_DIR="$(dirname "$0")"
SEED_SCRIPT="07_seed_data.sql"

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

# Check if database exists
check_database() {
    if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_error "Database '$DB_NAME' does not exist"
        print_info "Please run init_schema.sh first to create the database schema"
        exit 1
    fi
    print_success "Database '$DB_NAME' found"
}

# Check if schema is initialized
check_schema() {
    local table_count=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    
    if [ "$table_count" -lt 28 ]; then
        print_error "Database schema is incomplete (found $table_count tables, expected 28)"
        print_info "Please run init_schema.sh first to initialize the database schema"
        exit 1
    fi
    print_success "Database schema verified ($table_count tables)"
}

# Check if data already exists
check_existing_data() {
    local member_count=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM members;" | xargs)
    
    if [ "$member_count" -gt 0 ]; then
        print_warning "Database already contains data ($member_count members found)"
        read -p "Do you want to continue? This will add more data. (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_info "Operation cancelled"
            exit 0
        fi
    fi
}

# Execute seed data script
execute_seed_script() {
    print_info "Generating seed data... This may take a few minutes."
    print_info "Creating: 550+ members, 5 branches, services, donations, events, and more..."
    
    if psql -d "$DB_NAME" -f "$SCRIPT_DIR/$SEED_SCRIPT" > /dev/null 2>&1; then
        print_success "Seed data generated successfully"
        return 0
    else
        print_error "Error executing seed data script"
        print_error "Check the SQL script for errors"
        return 1
    fi
}

# Display summary
display_summary() {
    print_section "Data Generation Summary"
    
    psql -d "$DB_NAME" -c "
        SELECT 'Regions' as entity, COUNT(*) as count FROM regions
        UNION ALL SELECT 'Branches', COUNT(*) FROM branches
        UNION ALL SELECT 'Members', COUNT(*) FROM members
        UNION ALL SELECT 'Active Members', COUNT(*) FROM members WHERE is_active = TRUE
        UNION ALL SELECT 'Main Pastors', COUNT(*) FROM branch_leadership WHERE role = 'Main Pastor' AND is_current = TRUE
        UNION ALL SELECT 'Services', COUNT(*) FROM services
        UNION ALL SELECT 'Service Attendance Records', COUNT(*) FROM service_attendance
        UNION ALL SELECT 'Donations', COUNT(*) FROM donations
        UNION ALL SELECT 'Events', COUNT(*) FROM events
        UNION ALL SELECT 'Outreach Programs', COUNT(*) FROM outreach_programs
        ORDER BY entity;
    "
}

# Main execution flow
main() {
    print_section "Kairos Database Seed Data Generation"
    echo "Database: $DB_NAME"
    echo "Script: $SEED_SCRIPT"
    echo ""
    
    print_warning "WARNING: This script generates test data"
    print_warning "Do NOT run this in a production environment"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Operation cancelled"
        exit 0
    fi
    
    # Pre-flight checks
    print_section "Pre-flight Checks"
    check_database
    check_schema
    check_existing_data
    
    # Generate data
    print_section "Generating Seed Data"
    if ! execute_seed_script; then
        print_section "Seed Data Generation Failed"
        print_error "Failed to generate seed data"
        exit 1
    fi
    
    # Display summary
    display_summary
    
    # Success message
    print_section "Seed Data Generation Complete"
    print_success "Test data has been successfully generated!"
    echo ""
    print_info "You can now connect to the database:"
    echo "  psql -d $DB_NAME"
    echo ""
    print_info "Sample queries:"
    echo "  SELECT * FROM members LIMIT 10;"
    echo "  SELECT branch_name, COUNT(*) as member_count FROM branches b"
    echo "    JOIN members m ON b.branch_id = m.home_branch_id"
    echo "    GROUP BY branch_name;"
    echo ""
}

# Run main function
main
