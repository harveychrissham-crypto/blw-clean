$nodePath = 'C:\Program Files\nodejs\node.exe'
$npmPath = 'C:\Program Files\nodejs\npm.cmd'

if (-not (Test-Path $nodePath)) {
    Write-Error "Node executable not found at $nodePath"
    exit 1
}

if (-not (Test-Path $npmPath)) {
    Write-Error "npm executable not found at $npmPath"
    exit 1
}

Write-Host "Installing backend dependencies..."
Push-Location "$(Resolve-Path .\server)"
& $npmPath install
Pop-Location

Write-Host "Installing frontend dependencies..."
Push-Location "$(Resolve-Path .\client)"
& $npmPath install
Pop-Location

$backendDir = (Resolve-Path .\server).Path
$frontendDir = (Resolve-Path .\client).Path

Write-Host "Starting backend server in a new PowerShell window..."
Start-Process powershell -ArgumentList '-NoExit', "-Command Set-Location '$backendDir'; & '$nodePath' server.js"

Write-Host "Starting frontend dev server in a new PowerShell window..."
Start-Process powershell -ArgumentList '-NoExit', "-Command Set-Location '$frontendDir'; & '$npmPath' run dev"

Write-Host "Done. Backend should run on http://localhost:5000 and frontend on the Vite port shown in the new window(s)."