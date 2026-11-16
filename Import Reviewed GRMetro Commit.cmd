@echo off
setlocal
title GRMetro Import Reviewed Commit
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0scripts\windows\import-reviewed-commit.ps1"
set "GRMETRO_IMPORT_EXIT=%ERRORLEVEL%"
echo.
if not "%GRMETRO_IMPORT_EXIT%"=="0" (
  echo The reviewed commit was not imported. The clean release worktree was preserved or the exact recovery issue is shown above.
) else (
  echo The reviewed commit was imported. Review and test it before publishing.
)
pause
exit /b %GRMETRO_IMPORT_EXIT%
