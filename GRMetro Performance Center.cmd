@echo off
cd /d "%~dp0"
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\windows\performance-center-launcher.ps1" -AutoStart
exit /b 0
