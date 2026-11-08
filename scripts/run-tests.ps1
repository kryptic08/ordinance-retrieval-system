$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Push-Location backend
try {
    & .venv\Scripts\python.exe -m pytest -q
}
finally {
    Pop-Location
}

Push-Location frontend
try {
    npm run lint
    npm run build
}
finally {
    Pop-Location
}
