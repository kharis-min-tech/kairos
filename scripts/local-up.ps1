# Starts the local stack: Postgres, the API, and the web app.
#
# Postgres runs from portable binaries in $PgRoot. There is no Windows service
# and nothing was installed with admin rights: the whole database is that
# folder plus its data dir, and deleting both undoes it completely.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\local-up.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\local-up.ps1 -Fresh
#
# -Fresh drops the database and re-runs every migration and the seed. It is
# destructive and refuses to touch anything that is not localhost.

param([switch]$Fresh)

$ErrorActionPreference = 'Stop'

$PgRoot   = "C:\Users\bscom\kairos-pg"
$PgBin    = "$PgRoot\pgsql\bin"
$PgData   = "$PgRoot\data"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Logs     = "$RepoRoot\.local-logs"

if (-not (Test-Path $PgBin)) {
  throw "Postgres binaries not found at $PgBin. See the local setup notes in requirements/gift-aid.md, or re-download the EDB binaries zip and extract it to $PgRoot."
}
if (-not (Test-Path $Logs)) { New-Item -ItemType Directory -Path $Logs | Out-Null }

function Test-Port([int]$Port) {
  Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
}

# Spawned through Win32_Process.Create rather than Start-Process so the child
# lands outside this shell's job object. A server started inside the job dies
# when the shell (or an agent's background task) is torn down, and its
# children fail to initialise with 0xC0000142 while it goes.
function Start-Detached([string]$CommandLine, [string]$WorkingDir) {
  $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine      = $CommandLine
    CurrentDirectory = $WorkingDir
  }
  if ($r.ReturnValue -ne 0) { throw "Failed to spawn ($($r.ReturnValue)): $CommandLine" }
  return $r.ProcessId
}

# ── Postgres ──────────────────────────────────────────────

if (Test-Port 5432) {
  Write-Host "postgres: already listening on 5432"
} else {
  Write-Host "postgres: starting"
  Start-Detached "`"$PgBin\pg_ctl.exe`" -D `"$PgData`" -l `"$PgRoot\server.log`" -o `"-p 5432`" -w start" $PgRoot | Out-Null
  $deadline = (Get-Date).AddSeconds(45)
  while (-not (Test-Port 5432) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
  if (-not (Test-Port 5432)) { throw "postgres did not come up. See $PgRoot\server.log" }
  Write-Host "postgres: up"
}

# ── Schema ────────────────────────────────────────────────

if ($Fresh) {
  Write-Host "database: dropping, migrating and seeding"
  Push-Location $RepoRoot
  try {
    $env:DATABASE_URL = "postgresql://kairos:kairos@localhost:5432/kairos"
    & npx turbo db:fresh --filter=@kairos/database
    if ($LASTEXITCODE -ne 0) { throw "db:fresh failed" }
  } finally { Pop-Location }
}

# ── App servers ───────────────────────────────────────────

if (Test-Port 3001) {
  Write-Host "api: already listening on 3001"
} else {
  Write-Host "api: starting"
  Start-Detached ('cmd.exe /c "npm run dev > "' + "$Logs\api.log" + '" 2>&1"') "$RepoRoot\apps\api" | Out-Null
}

if (Test-Port 3002) {
  Write-Host "web: already listening on 3002"
} else {
  Write-Host "web: starting"
  Start-Detached ('cmd.exe /c "npm run dev > "' + "$Logs\web.log" + '" 2>&1"') "$RepoRoot\apps\web" | Out-Null
}

$deadline = (Get-Date).AddSeconds(90)
while (-not ((Test-Port 3001) -and (Test-Port 3002)) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 1 }

Write-Host ""
Write-Host "  postgres  localhost:5432   (db kairos, user kairos, password kairos)"
Write-Host "  api       http://localhost:3001/health"
Write-Host "  web       http://localhost:3002"
Write-Host ""
Write-Host "  logs      $Logs\api.log, $Logs\web.log, $PgRoot\server.log"
Write-Host "  stop      scripts\local-down.ps1"
Write-Host ""
Write-Host "  Seeded accounts all use the password Password1!"
Write-Host "  First sign-in on a fresh database lands on the policy screen; accept and continue."
