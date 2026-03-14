@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS1=%SCRIPT_DIR%build.ps1"
set "MODE=%~1"

if "%MODE%"=="" set "MODE=reload"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Mode "%MODE%"

if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo [ERROR] Build failed with code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

endlocal
