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

# Helper function to write section headers
function Write-SectionHeader {
    param([string]$Title)
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Blue
    Write-Host $Title -ForegroundColor Blue
    Write-Host "============================================================================" -ForegroundColor Blue
}

# Check if all required PostgreSQL tools are installed
function Test-PostgresTools {
    Write-Host "[INFO] Checking PostgreSQL client tools..." -ForegroundColor Cyan
    
    $requiredTools = @("psql", "createdb", "dropdb")
    $missingTools = @()
    
    foreach ($tool in $requiredTools) {
        $command = Get-Command $tool -ErrorAction SilentlyContinue
        if (-not $command) {
            $missingTools += $tool
            Write-Host "[ERROR] $tool command not found" -ForegroundColor Red
        }
        else {
            Write-Host "[OK] $tool found at: $($command.Source)" -ForegroundColor Green
        }
    }
    
    if ($missingTools.Count -gt 0) {
        Write-Host "[ERROR] Missing PostgreSQL client tools: $($missingTools -join ', ')" -ForegroundColor Red
        Write-Host ""
        Write-Host "[INFO] To install PostgreSQL client tools on Windows:" -ForegroundColor Cyan
        Write-Host "[INFO] 1. Download PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
        Write-Host "[INFO] 2. Run the installer and ensure 'Command Line Tools' is selected" -ForegroundColor Cyan
        Write-Host "[INFO] 3. Add PostgreSQL bin directory to your PATH:" -ForegroundColor Cyan
        Write-Host "[INFO]    Typical location: C:\Program Files\PostgreSQL\<version>\bin" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "[INFO] Alternative: Install via Chocolatey:" -ForegroundColor Cyan
        Write-Host "[INFO]    choco install postgresql" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "[INFO] Alternative: Install via Scoop:" -ForegroundColor Cyan
        Write-Host "[INFO]    scoop install postgresql" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host "[OK] All required PostgreSQL tools are installed" -ForegroundColor Green
}

# Check if PostgreSQL is accessible
function Test-PostgresConnection {
    Write-Host "[INFO] Testing PostgreSQL connection..." -ForegroundColor Cyan
    
    # Test connection
    try {
        $result = psql -c "SELECT 1" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Connection failed"
        }
        Write-Host "[OK] PostgreSQL connection verified" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Cannot connect to PostgreSQL. Please check your connection settings." -ForegroundColor Red
        Write-Host "[INFO] You may need to set PGHOST, PGPORT, PGUSER, PGPASSWORD environment variables." -ForegroundColor Cyan
        Write-Host "[INFO] Or configure pg_service.conf or pgpass.conf files." -ForegroundColor Cyan
        exit 1
    }
}

# Check if all required scripts exist
function Test-MigrationScripts {
    $allFound = $true
    foreach ($scriptFile in $RequiredScripts) {
        $scriptPath = Join-Path $ScriptsDir $scriptFile
        if (-not (Test-Path $scriptPath)) {
            Write-Host "[ERROR] Required script not found: $scriptFile" -ForegroundColor Red
            $allFound = $false
        }
    }
    
    if (-not $allFound) {
        exit 1
    }
    
    Write-Host "[OK] All required migration scripts found" -ForegroundColor Green
}

# Create database if it doesn't exist
function New-DatabaseIfNeeded {
    # Check if database exists
    $checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"
    $dbExists = psql -t -c $checkDbQuery 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $dbExists -match "1") {
        Write-Host "[WARN] Database '$DatabaseName' already exists" -ForegroundColor Yellow
        $response = Read-Host "Do you want to drop and recreate it? (yes/no)"
        
        if ($response -match "^[Yy]([Ee][Ss])?$") {
            Write-Host "[INFO] Dropping database '$DatabaseName'..." -ForegroundColor Cyan
            dropdb $DatabaseName
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERROR] Failed to drop database" -ForegroundColor Red
                exit 1
            }
            Write-Host "[OK] Database dropped" -ForegroundColor Green
        }
        else {
            Write-Host "[INFO] Using existing database" -ForegroundColor Cyan
            return
        }
    }
    
    Write-Host "[INFO] Creating database '$DatabaseName'..." -ForegroundColor Cyan
    createdb $DatabaseName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create database" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Database '$DatabaseName' created" -ForegroundColor Green
}

# Execute a single migration script
function Invoke-MigrationScript {
    param([string]$ScriptName)
    
    $scriptPath = Join-Path $ScriptsDir $ScriptName
    
    Write-Host "[INFO] Executing $ScriptName..." -ForegroundColor Cyan
    
    # Temporarily set error preference to Continue so NOTICE messages don't throw
    $prevErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    
    try {
        # Run psql and capture output
        $output = psql -d $DatabaseName -f $scriptPath -v ON_ERROR_STOP=1 2>&1
        $exitCode = $LASTEXITCODE
        
        # Restore error preference
        $ErrorActionPreference = $prevErrorActionPreference
        
        if ($exitCode -eq 0) {
            # Check if there are any NOTICE messages and display them as info
            $noticeMessages = $output | Where-Object { $_ -match "NOTICE:" }
            if ($noticeMessages) {
                foreach ($notice in $noticeMessages) {
                    $cleanNotice = $notice -replace ".*NOTICE:\s*", ""
                    Write-Host "[INFO] $cleanNotice" -ForegroundColor Gray
                }
            }
            Write-Host "[OK] $ScriptName completed successfully" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "[ERROR] Error executing $ScriptName" -ForegroundColor Red
            # Filter out NOTICE messages, show only actual errors
            $errorMessages = $output | Where-Object { $_ -notmatch "NOTICE:" -and $_ -match "ERROR|FATAL" }
            if ($errorMessages) {
                foreach ($err in $errorMessages) {
                    Write-Host "[ERROR] $err" -ForegroundColor Red
                }
            }
            else {
                Write-Host $output -ForegroundColor Red
            }
            return $false
        }
    }
    catch {
        $ErrorActionPreference = $prevErrorActionPreference
        Write-Host "[ERROR] Error executing $ScriptName" -ForegroundColor Red
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Verify installation
function Test-Installation {
    Write-SectionHeader "Verifying Installation"
    
    # Helper to safely get count from psql output
    function Get-PsqlCount {
        param([string]$Query)
        $result = psql -d $DatabaseName -t -c $Query 2>&1
        if ($result -is [array]) {
            $result = $result[0]
        }
        return [int]($result.ToString().Trim())
    }
    
    # Check table count
    $tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $tableCount = Get-PsqlCount $tableCountQuery
    if ($tableCount -ge 28) {
        Write-Host "[OK] Table count verified: $tableCount tables created" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] Expected at least 28 tables, found $tableCount" -ForegroundColor Yellow
    }
    
    # Check function count
    $functionCountQuery = "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';"
    $functionCount = Get-PsqlCount $functionCountQuery
    if ($functionCount -ge 1) {
        Write-Host "[OK] Function count verified: $functionCount functions created" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] Expected at least 1 function, found $functionCount" -ForegroundColor Yellow
    }
    
    # Check trigger count
    $triggerCountQuery = "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';"
    $triggerCount = Get-PsqlCount $triggerCountQuery
    if ($triggerCount -ge 23) {
        Write-Host "[OK] Trigger count verified: $triggerCount triggers created" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] Expected at least 23 triggers, found $triggerCount" -ForegroundColor Yellow
    }
    
    # Check foreign key count
    $fkCountQuery = "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';"
    $fkCount = Get-PsqlCount $fkCountQuery
    if ($fkCount -ge 70) {
        Write-Host "[OK] Foreign key count verified: $fkCount constraints created" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] Expected at least 70 foreign keys, found $fkCount" -ForegroundColor Yellow
    }
    
    # Check index count
    $indexCountQuery = "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"
    $indexCount = Get-PsqlCount $indexCountQuery
    if ($indexCount -ge 90) {
        Write-Host "[OK] Index count verified: $indexCount indexes created" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] Expected at least 90 indexes, found $indexCount" -ForegroundColor Yellow
    }
}

# Main execution flow
function Main {
    Write-SectionHeader "Kairos Database Schema Initialization"
    Write-Host "Database: $DatabaseName"
    Write-Host "Scripts Directory: $ScriptsDir"
    Write-Host ""
    
    # Pre-flight checks
    Write-Host "[INFO] Running pre-flight checks..." -ForegroundColor Cyan
    Test-PostgresTools
    Test-PostgresConnection
    Test-MigrationScripts
    
    # Database creation
    Write-SectionHeader "Database Setup"
    New-DatabaseIfNeeded
    
    # Execute migration scripts
    Write-SectionHeader "Executing Migration Scripts"
    $success = $true
    
    foreach ($scriptFile in $RequiredScripts) {
        if (-not (Invoke-MigrationScript $scriptFile)) {
            $success = $false
            break
        }
    }
    
    if (-not $success) {
        Write-SectionHeader "Migration Failed"
        Write-Host "[ERROR] Schema initialization failed. Database may be in incomplete state." -ForegroundColor Red
        Write-Host "[INFO] Consider dropping and recreating the database." -ForegroundColor Cyan
        exit 1
    }
    
    # Verification
    Test-Installation
    
    # Success message
    Write-SectionHeader "Schema Initialization Complete"
    Write-Host "[OK] All migration scripts executed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] You can now connect to the database:" -ForegroundColor Cyan
    Write-Host "  psql -d $DatabaseName" -ForegroundColor White
    Write-Host ""
    Write-Host "[INFO] To verify the schema:" -ForegroundColor Cyan
    Write-Host "  psql -d $DatabaseName -c '\dt'" -ForegroundColor White
    Write-Host ""
}

# Run main function
try {
    Main
}
catch {
    Write-Host "[ERROR] An unexpected error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
