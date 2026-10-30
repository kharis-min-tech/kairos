# Stops the local stack started by local-up.ps1.
#
# The data directory is left alone, so the database survives. Use
# local-up.ps1 -Fresh to rebuild the schema and seed.

$PgRoot = "C:\Users\bscom\kairos-pg"
$PgBin  = "$PgRoot\pgsql\bin"
$PgData = "$PgRoot\data"

foreach ($port in 3002, 3001) {
  $pids = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess |
    Sort-Object -Unique
  if (-not $pids) { Write-Host "nothing listening on $port"; continue }
  foreach ($procId in $pids) {
    # /T because `npm run dev` is cmd -> npm -> node and only the leaf holds
    # the port; killing the leaf alone leaves the wrapper behind.
    & taskkill /PID $procId /T /F 2>&1 | Out-Null
  }
  Write-Host "stopped whatever was on $port"
}

if (Test-Path $PgData) {
  # pg_ctl stop, not taskkill: a killed postmaster leaves the data dir needing
  # crash recovery on next start.
  & "$PgBin\pg_ctl.exe" -D $PgData -m fast stop 2>&1 | Out-Null
  Write-Host "postgres: stopped"
}
