$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing .env file at: $envFile"
}

$envMap = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $parts = $line -split "=", 2
    if ($parts.Count -eq 2) {
        $envMap[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$dbHost = if ($envMap.ContainsKey("DB_HOST")) { $envMap["DB_HOST"] } else { "cloud.anyrdp.in" }
$dbUser = if ($envMap.ContainsKey("DB_USER")) { $envMap["DB_USER"] } else { "root" }
$dbPass = if ($envMap.ContainsKey("DB_PASSWORD")) { $envMap["DB_PASSWORD"] } else { "" }
$dbName = if ($envMap.ContainsKey("DB_NAME")) { $envMap["DB_NAME"] } else { "" }

if ([string]::IsNullOrWhiteSpace($dbName)) {
    throw "DB_NAME is missing in .env"
}

$possibleDumpPaths = @(
    "mysqldump",
    "C:\xampp\mysql\bin\mysqldump.exe",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe"
)

$mysqldump = $null
foreach ($candidate in $possibleDumpPaths) {
    if ($candidate -eq "mysqldump") {
        $command = Get-Command mysqldump -ErrorAction SilentlyContinue
        if ($command) {
            $mysqldump = $command.Source
            break
        }
    } elseif (Test-Path -LiteralPath $candidate) {
        $mysqldump = $candidate
        break
    }
}

if (-not $mysqldump) {
    throw "mysqldump not found. Install MySQL client or XAMPP, then retry."
}

$backupDir = Join-Path $projectRoot "backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "$dbName-$timestamp.sql"

$args = @(
    "--host=$dbHost",
    "--user=$dbUser",
    "--single-transaction",
    "--routines",
    "--events",
    "--triggers",
    $dbName
)

if (-not [string]::IsNullOrEmpty($dbPass)) {
    $args = @("--password=$dbPass") + $args
}

& $mysqldump @args | Out-File -LiteralPath $backupFile -Encoding UTF8

if ($LASTEXITCODE -ne 0) {
    throw "Backup failed. mysqldump exit code: $LASTEXITCODE"
}

Write-Host "Backup created: $backupFile"
