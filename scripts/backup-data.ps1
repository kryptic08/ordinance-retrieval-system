param(
    [string]$Destination = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
if (-not $Destination) {
    $Destination = Join-Path $root "backups\$stamp"
}
New-Item -ItemType Directory -Force -Path $Destination | Out-Null

$data = Join-Path $root "data"
if (-not (Test-Path $data)) {
    throw "Data directory not found: $data"
}

Copy-Item (Join-Path $data "ordinance.db") (Join-Path $Destination "ordinance.db")
foreach ($folder in @("originals", "processed")) {
    $source = Join-Path $data $folder
    if (Test-Path $source) {
        Copy-Item $source (Join-Path $Destination $folder) -Recurse
    }
}

Write-Host "Backup written to $Destination"
