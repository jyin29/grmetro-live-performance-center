@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0GRMetro Performance Center.exe" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\windows\build-launcher-exe.ps1" >nul 2>nul
)
if exist "%~dp0GRMetro Performance Center.exe" (
  start "" "%~dp0GRMetro Performance Center.exe"
) else (
  start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\windows\performance-center-launcher.ps1" -AutoStart
)
exit /b 0
