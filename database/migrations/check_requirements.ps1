# ============================================================================
# Kairos Database - Requirements Check Script
# ============================================================================
# Purpose: Verify all prerequisites for database initialization
# Usage: .\check_requirements.ps1
# Note: Windows-compatible with ASCII-safe output characters
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Kairos Database Requirements Check" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check PowerShell Version
Write-Host "Checking PowerShell Version..." -ForegroundColor Yellow
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -ge 5) {
    Write-Host "[OK] PowerShell $($psVersion.ToString())" -ForegroundColor Green
} else {
    Write-Host "[ERROR] PowerShell $($psVersion.ToString()) - Upgrade recommended" -ForegroundColor Red
    Write-Host "  Minimum recommended: PowerShell 5.1 or PowerShell Core 7+" -ForegroundColor Gray
    $allGood = $false
}
Write-Host ""

# Check PostgreSQL Tools
Write-Host "Checking PostgreSQL Client Tools..." -ForegroundColor Yellow
$tools = @{
    "psql" = "PostgreSQL interactive terminal"
    "createdb" = "Database creation utility"
    "dropdb" = "Database deletion utility"
}

foreach ($tool in $tools.Keys) {
    $command = Get-Command $tool -ErrorAction SilentlyContinue
    if ($command) {
        Write-Host "[OK] $tool - Found at: $($command.Source)" -ForegroundColor Green
        
        # Try to get version
        try {
            $version = & $tool --version 2>&1 | Select-Object -First 1
            Write-Host "     Version: $version" -ForegroundColor Gray
        } catch {
            # Version check failed, but command exists
        }
    } else {
        Write-Host "[ERROR] $tool - Not found ($($tools[$tool]))" -ForegroundColor Red
        $allGood = $false
    }
}
Write-Host ""

# Check PATH for PostgreSQL
Write-Host "Checking PATH for PostgreSQL..." -ForegroundColor Yellow
$paths = $env:PATH -split ';'
$pgPaths = $paths | Where-Object { $_ -match 'postgres' -or $_ -match 'pgsql' }
if ($pgPaths) {
    Write-Host "[OK] PostgreSQL found in PATH:" -ForegroundColor Green
    $pgPaths | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
} else {
    Write-Host "[WARN] No PostgreSQL directories found in PATH" -ForegroundColor Yellow
    Write-Host "     This might cause issues if PostgreSQL is not in PATH" -ForegroundColor Gray
    Write-Host "     Common locations on Windows:" -ForegroundColor Gray
    Write-Host "       C:\Program Files\PostgreSQL\<version>\bin" -ForegroundColor Gray
}
Write-Host ""

# Check Environment Variables
Write-Host "Checking PostgreSQL Environment Variables..." -ForegroundColor Yellow
$pgVars = @("PGHOST", "PGPORT", "PGUSER", "PGDATABASE", "PGPASSWORD")
$foundVars = @()

foreach ($var in $pgVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        if ($var -eq "PGPASSWORD") {
            Write-Host "     $var = ******* (hidden)" -ForegroundColor Gray
        } else {
            Write-Host "     $var = $value" -ForegroundColor Gray
        }
        $foundVars += $var
    }
}

if ($foundVars.Count -gt 0) {
    Write-Host "[OK] Found $($foundVars.Count) PostgreSQL environment variable(s)" -ForegroundColor Green
} else {
    Write-Host "[WARN] No PostgreSQL environment variables set" -ForegroundColor Yellow
    Write-Host "     You may need to provide connection details during script execution" -ForegroundColor Gray
}
Write-Host ""

# Test PostgreSQL Connection
Write-Host "Testing PostgreSQL Connection..." -ForegroundColor Yellow
$psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlCommand) {
    try {
        $testResult = psql -c "SELECT version();" -t 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] PostgreSQL connection successful" -ForegroundColor Green
            $versionInfo = ($testResult | Select-Object -First 1).ToString().Trim()
            Write-Host "     Server: $versionInfo" -ForegroundColor Gray
        } else {
            Write-Host "[ERROR] Cannot connect to PostgreSQL server" -ForegroundColor Red
            Write-Host "     Error: $testResult" -ForegroundColor Gray
            Write-Host "     Tip: Set PGHOST, PGPORT, PGUSER, PGPASSWORD environment variables" -ForegroundColor Yellow
            $allGood = $false
        }
    } catch {
        Write-Host "[ERROR] Connection test failed: $($_.Exception.Message)" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "[ERROR] Cannot test connection - psql not found" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check Migration Scripts
Write-Host "Checking Migration Scripts..." -ForegroundColor Yellow
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$requiredScripts = @(
    "01_functions.sql",
    "02_tables.sql",
    "03_constraints.sql",
    "04_indexes.sql",
    "05_triggers.sql",
    "06_comments.sql"
)

$missingScripts = @()
foreach ($script in $requiredScripts) {
    $scriptPath = Join-Path $scriptsDir $script
    if (Test-Path $scriptPath) {
        $fileSize = (Get-Item $scriptPath).Length
        Write-Host "     [OK] $script ($([math]::Round($fileSize/1KB, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "     [ERROR] $script - Missing" -ForegroundColor Red
        $missingScripts += $script
        $allGood = $false
    }
}

if ($missingScripts.Count -eq 0) {
    Write-Host "[OK] All migration scripts found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Missing $($missingScripts.Count) migration script(s)" -ForegroundColor Red
}
Write-Host ""

# Check Seed Data Script (optional)
Write-Host "Checking Optional Scripts..." -ForegroundColor Yellow
$seedScript = Join-Path $scriptsDir "07_seed_data.sql"
if (Test-Path $seedScript) {
    $fileSize = (Get-Item $seedScript).Length
    Write-Host "     [OK] 07_seed_data.sql ($([math]::Round($fileSize/1KB, 2)) KB) - Test data available" -ForegroundColor Green
} else {
    Write-Host "     [INFO] 07_seed_data.sql - Not found (optional)" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "============================================================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "[OK] All Requirements Met - Ready to Initialize Database" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: .\init_schema.ps1" -ForegroundColor White
    Write-Host "     Or: PowerShell -ExecutionPolicy Bypass -File .\init_schema.ps1" -ForegroundColor Gray
    Write-Host "  2. Follow the prompts to create your database" -ForegroundColor White
    Write-Host ""
    Write-Host "  Optional - Generate test data:" -ForegroundColor Cyan
    Write-Host "  psql -d kairos -f 07_seed_data.sql" -ForegroundColor White
} else {
    Write-Host "[ERROR] Some Requirements Not Met" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation Guide:" -ForegroundColor Cyan
    Write-Host "  PostgreSQL for Windows: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "  Or via Chocolatey: choco install postgresql" -ForegroundColor White
    Write-Host "  Or via Scoop: scoop install postgresql" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation:" -ForegroundColor Yellow
    Write-Host "  1. Add PostgreSQL bin directory to your PATH:" -ForegroundColor White
    Write-Host "     C:\Program Files\PostgreSQL\<version>\bin" -ForegroundColor Gray
    Write-Host "  2. Restart your terminal/PowerShell" -ForegroundColor White
    Write-Host "  3. Run this script again to verify" -ForegroundColor White
}
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

exit $(if ($allGood) { 0 } else { 1 })
