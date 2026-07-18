$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'DemonDive needs Node.js 18 or newer. Download it from https://nodejs.org/ and try again.' -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}
node .\serve.mjs
