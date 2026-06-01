@echo off
setlocal

set "PROJECT=C:\Users\guilh\Documents\Codex\2026-05-23\edu-smart-system"
set "PORT=3106"
set "URL=http://127.0.0.1:%PORT%/login"

title Lumi Educa Local
cd /d "%PROJECT%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js para rodar o Lumi Educa.
  pause
  exit /b 1
)

if not exist "dist\index.js" (
  echo Build nao encontrado. Vou tentar gerar agora...
  call corepack pnpm build
  if errorlevel 1 (
    echo Nao consegui gerar o build.
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$port=%PORT%; $listener=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if(-not $listener){exit 0}; try{$proc=Get-CimInstance Win32_Process -Filter ('ProcessId=' + $listener.OwningProcess); if($proc.CommandLine -like '*edu-smart-system*' -or $proc.CommandLine -like '*dist/index.js*'){Stop-Process -Id $listener.OwningProcess -Force}}catch{}"

echo Iniciando Lumi Educa em %URL% ...
start "Lumi Educa Server" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:PORT='%PORT%'; Set-Location -LiteralPath '%PROJECT%'; node .\dist\index.js"

echo Aguardando servidor local...
for /l %%i in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try{Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0}catch{exit 1}"
  if not errorlevel 1 goto open_browser
  timeout /t 1 /nobreak >nul
)

echo O servidor demorou para responder. Vou abrir mesmo assim.

:open_browser
start "" "%URL%"
echo.
echo Lumi Educa aberto em: %URL%
echo.
echo Esta janela vai fechar em alguns segundos. O servidor fica ligado em segundo plano.
timeout /t 5 /nobreak >nul
