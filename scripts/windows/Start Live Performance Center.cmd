@echo off
setlocal
cd /d "%~dp0\..\.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-performance-center.ps1"
if errorlevel 1 (
  echo.
  echo Live Performance Center failed to start.
  pause
)
