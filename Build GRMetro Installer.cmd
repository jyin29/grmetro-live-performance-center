@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\build-installer.ps1"
if errorlevel 1 (
  echo.
  echo Installer build failed.
  pause
  exit /b 1
)
echo.
echo Installer output is in dist\windows-installer
pause
