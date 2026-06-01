$ErrorActionPreference = "SilentlyContinue"

$Project = $PSScriptRoot
$Port = 3106
$Url = "http://127.0.0.1:$Port/login"

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $listener) {
  $env:PORT = "$Port"
  Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList "dist/index.js" -WorkingDirectory $Project | Out-Null

  for ($i = 0; $i -lt 30; $i++) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 1 | Out-Null
      break
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
}

Start-Process $Url
