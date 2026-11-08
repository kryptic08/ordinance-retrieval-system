$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path "backend\.venv\Scripts\python.exe")) {
    python -m venv backend\.venv
}

& backend\.venv\Scripts\python.exe -m pip install --upgrade pip
& backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt

Push-Location frontend
try {
    npm install
}
finally {
    Pop-Location
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example. Set SECRET_KEY and ADMIN_PASSWORD before starting."
}

Write-Host "Setup complete. Start the API with scripts\run-backend.ps1 and the UI with scripts\run-frontend.ps1."
