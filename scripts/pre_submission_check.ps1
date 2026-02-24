param(
    [string]$LocalHealthUrl = "http://localhost:8080/health",
    [string]$CloudHealthUrl = "https://dawayir-live-agent-880073923613.europe-west1.run.app/health",
    [string]$LocalWsUrl = "ws://localhost:8080",
    [string]$CloudWsUrl = "wss://dawayir-live-agent-880073923613.europe-west1.run.app"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$failures = New-Object System.Collections.Generic.List[string]

function Invoke-Check {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    try {
        & $Action
        Write-Host "[PASS] $Name" -ForegroundColor Green
    } catch {
        $message = $_.Exception.Message
        Write-Host "[FAIL] $Name - $message" -ForegroundColor Red
        $failures.Add($Name) | Out-Null
    }
}

function Test-Health {
    param([string]$Url)

    $bodyFile = [System.IO.Path]::GetTempFileName()
    try {
        $statusText = & curl.exe -sS -L -o $bodyFile -w "%{http_code}" $Url
        if ($LASTEXITCODE -ne 0) {
            throw "curl failed for $Url"
        }

        $statusCode = [int]$statusText
        if ($statusCode -ne 200) {
            throw "Expected HTTP 200, got $statusCode"
        }

        $content = (Get-Content -Raw $bodyFile).Trim()
        if ($content -ne "OK") {
            throw "Expected body 'OK', got '$content'"
        }
    } finally {
        if (Test-Path $bodyFile) {
            Remove-Item $bodyFile -Force
        }
    }
}

function Test-WsSetupComplete {
    param([string]$Url)

    $nodeScript = @'
const WebSocket = require("ws");
const url = process.argv[2];

const ws = new WebSocket(url);
const timeout = setTimeout(() => {
  console.error("timeout waiting for setupComplete");
  ws.close();
  process.exit(2);
}, 30000);

ws.on("message", (msg) => {
  const text = msg.toString();
  if (text.includes("setupComplete") || text.includes("setup_complete")) {
    clearTimeout(timeout);
    ws.close();
    process.exit(0);
  }
});

ws.on("error", (err) => {
  clearTimeout(timeout);
  console.error(err.message);
  process.exit(1);
});

ws.on("close", (code) => {
  if (code !== 1000) {
    clearTimeout(timeout);
    console.error("closed without setupComplete");
    process.exit(3);
  }
});
'@

    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        Set-Content -Path $tempFile -Value $nodeScript -Encoding UTF8
        node $tempFile $Url | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "WebSocket check failed for $Url (exit=$LASTEXITCODE)"
        }
    } finally {
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force
        }
    }
}

function Test-Placeholders {
    $content = Get-Content -Raw "DEVPOST_SUBMISSION.md"
    $patterns = @(
        "ADD_YOUTUBE_URL_HERE",
        "ADD_POST_URL_AFTER_PUBLISHING"
    )

    $found = @()
    foreach ($pattern in $patterns) {
        if ($content -match [regex]::Escape($pattern)) {
            $found += $pattern
        }
    }

    if ($found.Count -gt 0) {
        throw "Found unresolved placeholders: $($found -join ', ')"
    }
}

function Test-AssetFolder {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Folder missing: $Path"
    }

    $files = Get-ChildItem -Path $Path -File -ErrorAction SilentlyContinue
    if (-not $files) {
        throw "Folder is empty: $Path"
    }
}

function Run-NpmCommand {
    param(
        [string]$WorkingDir,
        [string]$Command
    )

    Push-Location $WorkingDir
    try {
        & npm.cmd run $Command
        if ($LASTEXITCODE -ne 0) {
            throw "npm run $Command failed"
        }
    } finally {
        Pop-Location
    }
}

Write-Host "Running pre-submission checks from $repoRoot" -ForegroundColor Cyan

Invoke-Check -Name "server/.env.example exists" -Action {
    if (-not (Test-Path "server/.env.example")) {
        throw "Missing server/.env.example"
    }
}

Invoke-Check -Name "client/.env.example exists" -Action {
    if (-not (Test-Path "client/.env.example")) {
        throw "Missing client/.env.example"
    }
}

Invoke-Check -Name "Local health endpoint" -Action { Test-Health -Url $LocalHealthUrl }
Invoke-Check -Name "Cloud health endpoint" -Action { Test-Health -Url $CloudHealthUrl }
Invoke-Check -Name "Local WS setupComplete" -Action { Test-WsSetupComplete -Url $LocalWsUrl }
Invoke-Check -Name "Cloud WS setupComplete" -Action { Test-WsSetupComplete -Url $CloudWsUrl }
Invoke-Check -Name "Devpost placeholders" -Action { Test-Placeholders }
Invoke-Check -Name "Architecture assets exist" -Action { Test-AssetFolder -Path "submission-assets/architecture" }
Invoke-Check -Name "Cloud proof assets exist" -Action { Test-AssetFolder -Path "submission-assets/cloud-proof" }
Invoke-Check -Name "Client lint" -Action { Run-NpmCommand -WorkingDir "client" -Command "lint" }
Invoke-Check -Name "Client build" -Action { Run-NpmCommand -WorkingDir "client" -Command "build" }

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "Pre-submission check FAILED ($($failures.Count) issues):" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "Pre-submission check PASSED" -ForegroundColor Green
exit 0
