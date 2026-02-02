# ============================================================================
# Kairos Church Administration System - Seed Data Script
# ============================================================================
# Purpose: Populate database with realistic test/development data
# Usage: .\seed_data.ps1 [-DatabaseName <name>]
# Default database name: kairos
# Note: This script is IDEMPOTENT - safe to run multiple times
# ============================================================================
# WARNING: This generates test data and should NOT be run in production!
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$DatabaseName = "kairos"
)

# Configuration
$ScriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SeedScript = "07_seed_data.sql"

# Helper function to write section headers
function Write-SectionHeader {
    param([string]$Title)
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Blue
    Write-Host $Title -ForegroundColor Blue
    Write-Host "============================================================================" -ForegroundColor Blue
}

# Check if database exists
function Test-DatabaseExists {
    $checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"
    $dbExists = psql -t -c $checkDbQuery 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $dbExists -match "1") {
        return $true
    }
    return $false
}

# Check if schema is initialized
function Test-SchemaExists {
    $tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $result = psql -d $DatabaseName -t -c $tableCountQuery 2>&1
    
    if ($result -is [array]) {
        $result = $result[0]
    }
    
    $tableCount = [int]($result.ToString().Trim())
    return $tableCount -ge 28
}

# Check existing data
function Get-MemberCount {
    $result = psql -d $DatabaseName -t -c "SELECT COUNT(*) FROM members;" 2>&1
    if ($result -is [array]) {
        $result = $result[0]
    }
    return [int]($result.ToString().Trim())
}

# Execute seed data script
function Invoke-SeedScript {
    $scriptPath = Join-Path $ScriptsDir $SeedScript
    
    Write-Host "[INFO] Generating seed data... This may take a few minutes." -ForegroundColor Cyan
    Write-Host "[INFO] Creating: 550+ members, 5 branches, services, donations, events, and more..." -ForegroundColor Cyan
    Write-Host "[INFO] Note: Script is idempotent - existing records will be skipped." -ForegroundColor Cyan
    Write-Host ""
    
    # Temporarily set error preference to Continue so NOTICE messages don't throw
    $prevErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    
    try {
        $output = psql -d $DatabaseName -f $scriptPath 2>&1
        $exitCode = $LASTEXITCODE
        
        $ErrorActionPreference = $prevErrorActionPreference
        
        if ($exitCode -eq 0) {
            # Filter and display NOTICE messages as info
            $noticeMessages = $output | Where-Object { $_ -match "NOTICE:" }
            if ($noticeMessages) {
                foreach ($notice in $noticeMessages) {
                    $cleanNotice = $notice -replace ".*NOTICE:\s*", ""
                    Write-Host "[INFO] $cleanNotice" -ForegroundColor Gray
                }
            }
            
            # Display the verification output (last part of script)
            $dataOutput = $output | Where-Object { $_ -notmatch "NOTICE:" -and $_ -notmatch "^$" }
            foreach ($line in $dataOutput) {
                Write-Host $line -ForegroundColor White
            }
            
            return $true
        }
        else {
            Write-Host "[ERROR] Error executing seed data script" -ForegroundColor Red
            $errorMessages = $output | Where-Object { $_ -match "ERROR|FATAL" }
            if ($errorMessages) {
                foreach ($err in $errorMessages) {
                    Write-Host "[ERROR] $err" -ForegroundColor Red
                }
            }
            return $false
        }
    }
    catch {
        $ErrorActionPreference = $prevErrorActionPreference
        Write-Host "[ERROR] Error executing seed script: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Display summary
function Show-Summary {
    Write-SectionHeader "Data Generation Summary"
    
    $summaryQuery = @"
        SELECT 'Regions' as entity, COUNT(*) as count FROM regions
        UNION ALL SELECT 'Branches', COUNT(*) FROM branches
        UNION ALL SELECT 'Members', COUNT(*) FROM members
        UNION ALL SELECT 'Active Members', COUNT(*) FROM members WHERE is_active = TRUE
        UNION ALL SELECT 'Main Pastors', COUNT(*) FROM branch_leadership WHERE role = 'Main Pastor' AND is_current = TRUE
        UNION ALL SELECT 'Services', COUNT(*) FROM services
        UNION ALL SELECT 'Service Attendance', COUNT(*) FROM service_attendance
        UNION ALL SELECT 'Donations', COUNT(*) FROM donations
        UNION ALL SELECT 'Events', COUNT(*) FROM events
        UNION ALL SELECT 'Outreach Programs', COUNT(*) FROM outreach_programs
        ORDER BY entity;
"@
    
    psql -d $DatabaseName -c $summaryQuery
}

# Main execution
function Main {
    Write-SectionHeader "Kairos Database Seed Data Generation"
    Write-Host "Database: $DatabaseName" -ForegroundColor White
    Write-Host "Script: $SeedScript" -ForegroundColor White
    Write-Host ""
    
    Write-Host "[WARN] WARNING: This script generates test data" -ForegroundColor Yellow
    Write-Host "[WARN] Do NOT run this in a production environment" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Read-Host "Are you sure you want to continue? (yes/no)"
    if ($response -notmatch "^[Yy]([Ee][Ss])?$") {
        Write-Host "[INFO] Operation cancelled" -ForegroundColor Cyan
        exit 0
    }
    
    # Pre-flight checks
    Write-SectionHeader "Pre-flight Checks"
    
    # Check database exists
    if (-not (Test-DatabaseExists)) {
        Write-Host "[ERROR] Database '$DatabaseName' does not exist" -ForegroundColor Red
        Write-Host "[INFO] Please run init_schema.ps1 first to create the database schema" -ForegroundColor Cyan
        exit 1
    }
    Write-Host "[OK] Database '$DatabaseName' found" -ForegroundColor Green
    
    # Check schema exists
    if (-not (Test-SchemaExists)) {
        Write-Host "[ERROR] Database schema is incomplete" -ForegroundColor Red
        Write-Host "[INFO] Please run init_schema.ps1 first to initialize the database schema" -ForegroundColor Cyan
        exit 1
    }
    Write-Host "[OK] Database schema verified" -ForegroundColor Green
    
    # Check seed script exists
    $seedPath = Join-Path $ScriptsDir $SeedScript
    if (-not (Test-Path $seedPath)) {
        Write-Host "[ERROR] Seed script not found: $SeedScript" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Seed script found" -ForegroundColor Green
    
    # Check existing data
    $memberCount = Get-MemberCount
    if ($memberCount -gt 0) {
        Write-Host "[INFO] Database already contains data ($memberCount members found)" -ForegroundColor Cyan
        Write-Host "[INFO] This script is idempotent - it will skip existing records" -ForegroundColor Cyan
    }
    
    # Generate data
    Write-SectionHeader "Generating Seed Data"
    
    if (-not (Invoke-SeedScript)) {
        Write-SectionHeader "Seed Data Generation Failed"
        Write-Host "[ERROR] Failed to generate seed data" -ForegroundColor Red
        exit 1
    }
    
    # Display summary
    Show-Summary
    
    # Success message
    Write-SectionHeader "Seed Data Generation Complete"
    Write-Host "[OK] Test data has been successfully generated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now connect to the database:" -ForegroundColor Cyan
    Write-Host "  psql -d $DatabaseName" -ForegroundColor White
    Write-Host ""
    Write-Host "Sample queries:" -ForegroundColor Cyan
    Write-Host "  SELECT * FROM members LIMIT 10;" -ForegroundColor White
    Write-Host "  SELECT branch_name, COUNT(*) as member_count FROM branches b" -ForegroundColor White
    Write-Host "    JOIN members m ON b.branch_id = m.home_branch_id" -ForegroundColor White
    Write-Host "    GROUP BY branch_name;" -ForegroundColor White
    Write-Host ""
}

# Run main function
Main
