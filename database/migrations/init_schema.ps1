# ============================================================================
# Kairos Church Administration System - Database Schema Initialization Script
# ============================================================================
# Purpose: Automated execution of schema migration scripts in correct order
# Usage: .\init_schema.ps1 [-DatabaseName <name>]
# Default database name: kairos
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$DatabaseName = "kairos"
)

# Exit on any error
$ErrorActionPreference = "Stop"

# Define output functions as script-level variables to avoid conflicts
$script:WriteSuccess = { param([string]$msg) Write-Host "✓ $msg" -ForegroundColor Green }
$script:WriteError = { param([string]$msg) Write-Host "✗ $msg" -ForegroundColor Red }
$script:WriteWarn = { param([string]$msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }
$script:WriteInfo = { param([string]$msg) Write-Host "ℹ $msg" -ForegroundColor Cyan }
$script:WriteSection = { 
    param([string]$msg) 
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Blue
    Write-Host $msg -ForegroundColor Blue
    Write-Host "============================================================================" -ForegroundColor Blue
}

# Configuration
$ScriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RequiredScripts = @(
    "01_functions.sql",
    "02_tables.sql",
    "03_constraints.sql",
    "04_indexes.sql",
    "05_triggers.sql",
    "06_comments.sql"
)

# Check if all required PostgreSQL tools are installed
function Test-PostgresTools {
    & $script:WriteInfo "Checking PostgreSQL client tools..."
    
    $requiredTools = @("psql", "createdb", "dropdb")
    $missingTools = @()
    
    foreach ($tool in $requiredTools) {
        $command = Get-Command $tool -ErrorAction SilentlyContinue
        if (-not $command) {
            $missingTools += $tool
            & $script:WriteError "$tool command not found"
        } else {
            & $script:WriteSuccess "$tool found at: $($command.Source)"
        }
    }
    
    if ($missingTools.Count -gt 0) {
        & $script:WriteError "Missing PostgreSQL client tools: $($missingTools -join ', ')"
        & $script:WriteInfo ""
        & $script:WriteInfo "To install PostgreSQL client tools on Windows:"
        & $script:WriteInfo "1. Download PostgreSQL from: https://www.postgresql.org/download/windows/"
        & $script:WriteInfo "2. Run the installer and ensure 'Command Line Tools' is selected"
        & $script:WriteInfo "3. Add PostgreSQL bin directory to your PATH:"
        & $script:WriteInfo "   Typical location: C:\Program Files\PostgreSQL\<version>\bin"
        & $script:WriteInfo ""
        & $script:WriteInfo "Alternative: Install via Chocolatey:"
        & $script:WriteInfo "   choco install postgresql"
        & $script:WriteInfo ""
        & $script:WriteInfo "Alternative: Install via Scoop:"
        & $script:WriteInfo "   scoop install postgresql"
        exit 1
    }
    
    & $script:WriteSuccess "All required PostgreSQL tools are installed"
}

# Check if PostgreSQL is accessible
function Test-PostgresConnection {
    & $script:WriteInfo "Testing PostgreSQL connection..."
    
    # Test connection
    try {
        $result = psql -c "SELECT 1" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Connection failed"
        }
        & $script:WriteSuccess "PostgreSQL connection verified"
    }
    catch {
        & $script:WriteError "Cannot connect to PostgreSQL. Please check your connection settings."
        & $script:WriteInfo "You may need to set PGHOST, PGPORT, PGUSER, PGPASSWORD environment variables."
        & $script:WriteInfo "Or configure pg_service.conf or pgpass.conf files."
        exit 1
    }
}

# Check if all required scripts exist
function Test-MigrationScripts {
    $allFound = $true
    foreach ($script in $RequiredScripts) {
        $scriptPath = Join-Path $ScriptsDir $script
        if (-not (Test-Path $scriptPath)) {
            & $script:WriteError "Required script not found: $script"
            $allFound = $false
        }
    }
    
    if (-not $allFound) {
        exit 1
    }
    
    & $script:WriteSuccess "All required migration scripts found"
}

# Create database if it doesn't exist
function New-DatabaseIfNeeded {
    # Check if database exists
    $checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"
    $dbExists = psql -t -c $checkDbQuery 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $dbExists -match "1") {
        & $script:WriteWarn "Database '$DatabaseName' already exists"
        $response = Read-Host "Do you want to drop and recreate it? (yes/no)"
        
        if ($response -match "^[Yy]([Ee][Ss])?$") {
            & $script:WriteInfo "Dropping database '$DatabaseName'..."
            dropdb $DatabaseName
            if ($LASTEXITCODE -ne 0) {
                & $script:WriteError "Failed to drop database"
                exit 1
            }
            & $script:WriteSuccess "Database dropped"
        }
        else {
            & $script:WriteInfo "Using existing database"
            return
        }
    }
    
    & $script:WriteInfo "Creating database '$DatabaseName'..."
    createdb $DatabaseName
    if ($LASTEXITCODE -ne 0) {
        & $script:WriteError "Failed to create database"
        exit 1
    }
    & $script:WriteSuccess "Database '$DatabaseName' created"
}

# Execute a single migration script
function Invoke-MigrationScript {
    param([string]$ScriptName)
    
    $scriptPath = Join-Path $ScriptsDir $ScriptName
    
    & $script:WriteInfo "Executing $ScriptName..."
    
    try {
        $output = psql -d $DatabaseName -f $scriptPath -v ON_ERROR_STOP=1 2>&1
        if ($LASTEXITCODE -eq 0) {
            & $script:WriteSuccess "$ScriptName completed successfully"
            return $true
        }
        else {
            & $script:WriteError "Error executing $ScriptName"
            & $script:WriteError "Check the SQL script for syntax errors"
            Write-Host $output -ForegroundColor Red
            return $false
        }
    }
    catch {
        & $script:WriteError "Error executing $ScriptName"
        & $script:WriteError $_.Exception.Message
        return $false
    }
}

# Verify installation
function Test-Installation {
    & $script:WriteSection "Verifying Installation"
    
    # Check table count
    $tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $tableCount = (psql -d $DatabaseName -t -c $tableCountQuery).Trim()
    if ($tableCount -eq "28") {
        & $script:WriteSuccess "Table count verified: $tableCount tables created"
    }
    else {
        & $script:WriteWarn "Expected 28 tables, found $tableCount"
    }
    
    # Check function count
    $functionCountQuery = "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';"
    $functionCount = (psql -d $DatabaseName -t -c $functionCountQuery).Trim()
    if ([int]$functionCount -ge 1) {
        & $script:WriteSuccess "Function count verified: $functionCount functions created"
    }
    else {
        & $script:WriteWarn "Expected at least 1 function, found $functionCount"
    }
    
    # Check trigger count
    $triggerCountQuery = "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';"
    $triggerCount = (psql -d $DatabaseName -t -c $triggerCountQuery).Trim()
    if ([int]$triggerCount -ge 23) {
        & $script:WriteSuccess "Trigger count verified: $triggerCount triggers created"
    }
    else {
        & $script:WriteWarn "Expected at least 23 triggers, found $triggerCount"
    }
    
    # Check foreign key count
    $fkCountQuery = "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';"
    $fkCount = (psql -d $DatabaseName -t -c $fkCountQuery).Trim()
    if ([int]$fkCount -ge 70) {
        & $script:WriteSuccess "Foreign key count verified: $fkCount constraints created"
    }
    else {
        & $script:WriteWarn "Expected at least 70 foreign keys, found $fkCount"
    }
    
    # Check index count
    $indexCountQuery = "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"
    $indexCount = (psql -d $DatabaseName -t -c $indexCountQuery).Trim()
    if ([int]$indexCount -ge 90) {
        & $script:WriteSuccess "Index count verified: $indexCount indexes created"
    }
    else {
        & $script:WriteWarn "Expected at least 90 indexes, found $indexCount"
    }
}

# Main execution flow
function Main {
    & $script:WriteSection "Kairos Database Schema Initialization"
    Write-Host "Database: $DatabaseName"
    Write-Host "Scripts Directory: $ScriptsDir"
    Write-Host ""
    
    # Pre-flight checks
    & $script:WriteInfo "Running pre-flight checks..."
    Test-PostgresTools
    Test-PostgresConnection
    Test-MigrationScripts
    
    # Database creation
    & $script:WriteSection "Database Setup"
    New-DatabaseIfNeeded
    
    # Execute migration scripts
    & $script:WriteSection "Executing Migration Scripts"
    $success = $true
    
    foreach ($script in $RequiredScripts) {
        if (-not (Invoke-MigrationScript $script)) {
            $success = $false
            break
        }
    }
    
    if (-not $success) {
        & $script:WriteSection "Migration Failed"
        & $script:WriteError "Schema initialization failed. Database may be in incomplete state."
        & $script:WriteInfo "Consider dropping and recreating the database."
        exit 1
    }
    
    # Verification
    Test-Installation
    
    # Success message
    & $script:WriteSection "Schema Initialization Complete"
    & $script:WriteSuccess "All migration scripts executed successfully!"
    Write-Host ""
    & $script:WriteInfo "You can now connect to the database:"
    Write-Host "  psql -d $DatabaseName" -ForegroundColor White
    Write-Host ""
    & $script:WriteInfo "To verify the schema:"
    Write-Host "  psql -d $DatabaseName -c '\dt'" -ForegroundColor White
    Write-Host ""
}

# Run main function
try {
    Main
}
catch {
    & $script:WriteError "An unexpected error occurred: $($_.Exception.Message)"
    exit 1
}
