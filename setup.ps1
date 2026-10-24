param(
  [switch]$Run
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Fail([string]$message) {
  Write-Host $message
  exit 1
}

if ($env:OS -ne "Windows_NT") {
  Fail "This app installs on Windows only."
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Fail "Node.js 20 or later is required. Install it from https://nodejs.org, then open a new PowerShell window and run this script again."
}

$versionText = (& node -v).Trim()
if ($versionText -notmatch "^v(\d+)") {
  Fail "Could not read the Node.js version. Install Node.js 20 or later from https://nodejs.org."
}
if ([int]$Matches[1] -lt 20) {
  Fail "Node.js $($versionText) is installed. This app needs Node.js 20 or later from https://nodejs.org."
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
  Fail "npm was not found. Reinstall Node.js 20 or later from https://nodejs.org, then open a new PowerShell window."
}

function Read-EnvValue([string]$name) {
  if (-not (Test-Path -LiteralPath ".env")) { return "" }
  foreach ($raw in Get-Content -LiteralPath ".env") {
    $line = $raw.Trim()
    if (-not $line -or $line.StartsWith("#")) { continue }
    $eq = $line.IndexOf("=")
    if ($eq -le 0) { continue }
    $key = $line.Substring(0, $eq).Trim()
    if ($key -ne $name) { continue }
    $value = $line.Substring($eq + 1).Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) -or
      ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2)
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    return $value.Trim()
  }
  return ""
}

if (-not (Test-Path -LiteralPath ".env")) {
  if (-not (Test-Path -LiteralPath ".env.example")) {
    Fail ".env is missing, and .env.example was not found in this folder."
  }
  Copy-Item -LiteralPath ".env.example" -Destination ".env"
  Fail "Created .env from .env.example. Copy VITE_BASE44_APP_ID and VITE_BASE44_APP_BASE_URL from the working PC's desktop\.env into this file, then run this script again."
}

$appId = Read-EnvValue "VITE_BASE44_APP_ID"
$appBaseUrl = Read-EnvValue "VITE_BASE44_APP_BASE_URL"
if (-not $appId -or -not $appBaseUrl) {
  Fail "Fill VITE_BASE44_APP_ID and VITE_BASE44_APP_BASE_URL in .env. Copy both lines from the working PC's desktop\.env, then run this script again."
}

Write-Host "Installing dependencies..."
& npm.cmd install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Setup finished. Start the app with:"
Write-Host "  npm run dev"

if ($Run) {
  & npm.cmd run dev
  exit $LASTEXITCODE
}
