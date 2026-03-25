@echo off
setlocal

echo.
echo   ProjectBook-Planner
echo   ====================
echo.
echo     1  Private  (local Output/)
echo     2  Public   (GitHub Pages)
echo     3  Both
echo.

set /p "choice=  Select: "

if "%choice%"=="1" goto PRIVATE
if "%choice%"=="2" goto PUBLIC
if "%choice%"=="3" goto BOTH
goto :eof

:PRIVATE
start "" "%~dp0Output\InteractiveMap.html"
start "" "%~dp0Output\PreApp_Checklist.html"
goto :eof

:PUBLIC
start "" "https://blueberry0120x.github.io/ParcelDashboard/InteractiveMap.html"
start "" "https://blueberry0120x.github.io/ParcelDashboard/PreApp_Checklist.html"
goto :eof

:BOTH
start "" "%~dp0Output\InteractiveMap.html"
start "" "%~dp0Output\PreApp_Checklist.html"
start "" "https://blueberry0120x.github.io/ParcelDashboard/InteractiveMap.html"
start "" "https://blueberry0120x.github.io/ParcelDashboard/PreApp_Checklist.html"
goto :eof
