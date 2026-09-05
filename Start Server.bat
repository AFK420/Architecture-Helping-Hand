@echo off
title Architecture Helping Hand Server
echo ======================================================================
echo Starting Architecture Helping Hand Local Web Server (Port 3500)...
echo Opening: http://localhost:3500
echo ======================================================================
echo.

start http://localhost:3500

:: Try Python built-in HTTP server first
where python >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server 3500
    exit
)

:: Fallback to Node.js npx serve
where npx >nul 2>&1
if %errorlevel% equ 0 (
    npx serve -l 3500 .
    exit
)

echo Please ensure Python or Node.js is installed to run a local server.
pause
