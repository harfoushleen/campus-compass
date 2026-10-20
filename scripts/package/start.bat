@echo off
rem Starts Campus Compass on this computer. No installation needed.
rem It runs server.ps1 with PowerShell, which ships with Windows.
rem -ExecutionPolicy Bypass means no Windows setting has to be changed. The script is read as text and
rem run as a command, so it also works where policy settings block running .ps1 files.
title Campus Compass
set "CAMPUS_HOME=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((Get-Content -Raw -LiteralPath (Join-Path $env:CAMPUS_HOME 'server.ps1')))) -Root (Join-Path $env:CAMPUS_HOME 'app')"
echo.
echo Campus Compass has stopped. Press any key to close this window.
pause >nul
