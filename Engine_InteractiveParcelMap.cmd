@echo off
setlocal

set "SCRIPT_NAME=%~n0"
set "TARGET_PS1=%~dp0%SCRIPT_NAME%.ps1"

if not exist "%TARGET_PS1%" (
    color 0C
    echo [ERROR] Script not found: "%TARGET_PS1%"
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TARGET_PS1%" %*

if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo [ERROR] Script exited with code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

endlocal
