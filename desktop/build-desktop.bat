@echo off
echo ==============================================
echo   Restman Desktop Standalone App Builder
echo   Author: Akib
echo ==============================================
echo.
node "%~dp0build.cjs"
echo.
echo Press any key to close...
pause > nul
