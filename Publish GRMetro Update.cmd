@echo off
setlocal
title GRMetro Publish Update
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0scripts\windows\publish-update.ps1"
set "GRMETRO_PUBLISH_EXIT=%ERRORLEVEL%"
echo.
if not "%GRMETRO_PUBLISH_EXIT%"=="0" (
  echo GRMetro publication did not complete. Review the error above; production was not instructed to install anything.
) else (
  echo GRMetro staging publication completed and was independently verified.
)
pause
exit /b %GRMETRO_PUBLISH_EXIT%
