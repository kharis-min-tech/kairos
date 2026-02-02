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
    Write-Host "ℹ Checking PostgreSQL client tools..." -ForegroundColor Cyan
    
    $requiredTools = @("psql", "createdb", "dropdb")
    $missingTools = @()
    
    foreach ($tool in $requiredTools) {
        $command = Get-Command $tool -ErrorAction SilentlyContinue
        if (-not $command) {
            $missingTools += $tool
            Write-Host "✗ $tool command not found" -ForegroundColor Red
        } else {
            Write-Host "✓ $tool found at: $($command.Source)" -ForegroundColor Green
        }
    }
    
    if ($missingTools.Count -gt 0) {
        Write-Host "✗ Missing PostgreSQL client tools: $($missingTools -join ', ')" -ForegroundColor Red
        Write-Host "ℹ " -ForegroundColor Cyan
        Write-Host "ℹ To install PostgreSQL client tools on Windows:" -ForegroundColor Cyan
        Write-Host "ℹ 1. Download PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
        Write-Host "ℹ 2. Run the installer and ensure 'Command Line Tools' is selected" -ForegroundColor Cyan
        Write-Host "ℹ 3. Add PostgreSQL bin directory to your PATH:" -ForegroundColor Cyan
        Write-Host "ℹ    Typical location: C:\Program Files\PostgreSQL\<version>\bin" -ForegroundColor Cyan
        Write-Host "ℹ " -ForegroundColor Cyan
        Write-Host "ℹ Alternative: Install via Chocolatey:" -ForegroundColor Cyan
        Write-Host "ℹ    choco install postgresql" -ForegroundColor Cyan
        Write-Host "ℹ " -ForegroundColor Cyan
        Write-Host "ℹ Alternative: Install via Scoop:" -ForegroundColor Cyan
        Write-Host "ℹ    scoop install postgresql" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host "✓ All required PostgreSQL tools are installed" -ForegroundColor Green
}

# Check if PostgreSQL is accessible
function Test-PostgresConnection {
    Write-Host "ℹ Testing PostgreSQL connection..." -ForegroundColor Cyan
    
    # Test connection
    try {
        $result = psql -c "SELECT 1" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Connection failed"
        }
        Write-Host "✓ PostgreSQL connection verified" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Cannot connect to PostgreSQL. Please check your connection settings." -ForegroundColor Red
        Write-Host "ℹ You may need to set PGHOST, PGPORT, PGUSER, PGPASSWORD environment variables." -ForegroundColor Cyan
        Write-Host "ℹ Or configure pg_service.conf or pgpass.conf files." -ForegroundColor Cyan
        exit 1
    }
}

# Check if all required scripts exist
function Test-MigrationScripts {
    $allFound = $true
    foreach ($script in $RequiredScripts) {
        $scriptPath = Join-Path $ScriptsDir $script
        if (-not (Test-Path $scriptPath)) {
            Write-Host "✗ Required script not found: $script" -ForegroundColor Red
            $allFound = $false
        }
    }
    
    if (-not $allFound) {
        exit 1
    }
    
    Write-Host "✓ All required migration scripts found" -ForegroundColor Green
}

# Create database if it doesn't exist
function New-DatabaseIfNeeded {
    # Check if database exists
    $checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"
    $dbExists = psql -t -c $checkDbQuery 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $dbExists -match "1") {
        Write-Host "⚠ Database '$DatabaseName' already exists" -ForegroundColor Yellow
        $response = Read-Host "Do you want to drop and recreate it? (yes/no)"
        
        if ($response -match "^[Yy]([Ee][Ss])?$") {
            Write-Host "ℹ Dropping database '$DatabaseName'..." -ForegroundColor Cyan
            dropdb $DatabaseName
            if ($LASTEXITCODE -ne 0) {
                Write-Host "✗ Failed to drop database" -ForegroundColor Red
                exit 1
            }
            Write-Host "✓ Database dropped" -ForegroundColor Green
        }
        else {
            Write-Host "ℹ Using existing database" -ForegroundColor Cyan
            return
        }
    }
    
    Write-Host "ℹ Creating database '$DatabaseName'..." -ForegroundColor Cyan
    createdb $DatabaseName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to create database" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Database '$DatabaseName' created" -ForegroundColor Green
}

# Execute a single migration script
function Invoke-MigrationScript {
    param([string]$ScriptName)
    
    $scriptPath = Join-Path $ScriptsDir $ScriptName
    
    Write-Host "ℹ Executing $ScriptName..." -ForegroundColor Cyan
    
    try {
        $output = psql -d $DatabaseName -f $scriptPath -v ON_ERROR_STOP=1 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $ScriptName completed successfully" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "✗ Error executing $ScriptName" -ForegroundColor Red
            Write-Host "✗ Check the SQL script for syntax errors" -ForegroundColor Red
            Write-Host $output -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "✗ Error executing $ScriptName" -ForegroundColor Red
        Write-Host "✗ $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Verify installation
function Test-Installation {
    Write-Host ""; Write-Host "============================================================================" -ForegroundColor Blue; Write-Host "Verifying Installation" -ForegroundColor Blue; Write-Host "============================================================================" -ForegroundColor Blue
    
    # Check table count
    $tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $tableCount = (psql -d $DatabaseName -t -c $tableCountQuery).Trim()
    if ($tableCount -eq "28") {
        Write-Host "✓ Table count verified: $tableCount tables created" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Expected 28 tables, found $tableCount" -ForegroundColor Yellow
    }
    
    # Check function count
    $functionCountQuery = "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';"
    $functionCount = (psql -d $DatabaseName -t -c $functionCountQuery).Trim()
    if ([int]$functionCount -ge 1) {
        Write-Host "✓ Function count verified: $functionCount functions created" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Expected at least 1 function, found $functionCount" -ForegroundColor Yellow
    }
    
    # Check trigger count
    $triggerCountQuery = "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';"
    $triggerCount = (psql -d $DatabaseName -t -c $triggerCountQuery).Trim()
    if ([int]$triggerCount -ge 23) {
        Write-Host "✓ Trigger count verified: $triggerCount triggers created" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Expected at least 23 triggers, found $triggerCount" -ForegroundColor Yellow
    }
    
    # Check foreign key count
    $fkCountQuery = "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';"
    $fkCount = (psql -d $DatabaseName -t -c $fkCountQuery).Trim()
    if ([int]$fkCount -ge 70) {
        Write-Host "✓ Foreign key count verified: $fkCount constraints created" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Expected at least 70 foreign keys, found $fkCount" -ForegroundColor Yellow
    }
    
    # Check index count
    $indexCountQuery = "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"
    $indexCount = (psql -d $DatabaseName -t -c $indexCountQuery).Trim()
    if ([int]$indexCount -ge 90) {
        Write-Host "✓ Index count verified: $indexCount indexes created" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Expected at least 90 indexes, found $indexCount" -ForegroundColor Yellow
    }
}

# Main execution flow
function Main {
    Write-Host ""; Write-Host "============================================================================" -ForegroundColor Blue; Write-Host "Kairos Database Schema Initialization" -ForegroundColor Blue; Write-Host "============================================================================" -ForegroundColor Blue
    Write-Host "Database: $DatabaseName"
    Write-Host "Scripts Directory: $ScriptsDir"
    Write-Host ""
    
    # Pre-flight checks
    Write-Host "ℹ Running pre-flight checks..." -ForegroundColor Cyan
    Test-PostgresTools
    Test-PostgresConnection
    Test-MigrationScripts
    
    # Database creation
    Write-Host ""; Write-Host "============================================================================" -ForegroundColor Blue; Write-Host "Database Setup" -ForegroundColor Blue; Write-Host "============================================================================" -ForegroundColor Blue
    New-DatabaseIfNeeded
    
    # Execute migration scripts
    Write-Host ""; Write-Host "============================================================================" -ForegroundColor Blue; Write-Host "Executing Migration Scripts" -ForegroundColor Blue; Write-Host "============================================================================" -ForegroundColor Blue
    $success = $true
    
    foreach ($script in $RequiredScripts) {
        if (-not (Invoke-MigrationScript $script)) {
            $success = $false
            break
        }
    }
    
    if (-not $success) {
        Write-Host ""; Write-Host "============================================================================" -ForegroundColor Blue; Write-Host "Migration Failed" -ForegroundColor Blue; Write-Host "============================================================================" -ForegroundColor Blue
        Write-Host "✗ Schema initialization failed. Database may be in incomplete state." -ForegroundColor Red
        Write-Host "ℹ Consider dropping and recreating the database." -ForegroundColor Cyan
        exit 1
    }
    
    # Verification
    Test-Installation
    
    # Success message
    Write-Host ""; Write-Host "============================================================================" -ForegroundColor Blue; Write-Host "Schema Initialization Complete" -ForegroundColor Blue; Write-Host "============================================================================" -ForegroundColor Blue
    Write-Host "✓ All migration scripts executed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "ℹ You can now connect to the database:" -ForegroundColor Cyan
    Write-Host "  psql -d $DatabaseName" -ForegroundColor White
    Write-Host ""
    Write-Host "ℹ To verify the schema:" -ForegroundColor Cyan
    Write-Host "  psql -d $DatabaseName -c '\dt'" -ForegroundColor White
    Write-Host ""
}

# Run main function
try {
    Main
}
catch {
    Write-Host "✗ An unexpected error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
