@echo off
setlocal

echo.
echo   ProjectBook-Planner Launcher
echo   ============================
echo.
echo   PRIVATE (local files)
echo     1  Interactive Map
echo     2  PreApp Checklist
echo.
echo   PUBLIC (GitHub Pages mirror)
echo     3  Interactive Map
echo     4  PreApp Checklist
echo.
echo   DEV SERVER
echo     5  Start localhost:7734 (compile + serve)
echo.
echo   0  Exit
echo.

set /p "choice=  Select: "

if "%choice%"=="1" start "" "%~dp0Output\InteractiveMap.html"
if "%choice%"=="2" start "" "%~dp0Output\PreApp_Checklist.html"
if "%choice%"=="3" start "" "https://blueberry0120x.github.io/ParcelDashboard/InteractiveMap.html"
if "%choice%"=="4" start "" "https://blueberry0120x.github.io/ParcelDashboard/PreApp_Checklist.html"
if "%choice%"=="5" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Engine_InteractiveParcelMap.ps1" serve
if "%choice%"=="0" exit /b 0

endlocal
