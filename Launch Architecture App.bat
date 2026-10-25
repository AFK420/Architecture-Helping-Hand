@echo off
setlocal
title Architecture Helping Hand Desktop
echo Launching Architecture Helping Hand in Desktop App Window...

:: Generate cache-busting token to ensure latest updates load
set "CACHE_BUST=%RANDOM%%RANDOM%"

:: Get absolute file URI path with forward slashes
set "APP_DIR=%~dp0"
set "APP_PATH=%APP_DIR:\=/%index.html"

:: 1. Try Microsoft Edge (Installed on 100% of Windows 10 & 11 PCs)
for %%E in (
    "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    "%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
) do (
    if exist %%E (
        start "" %%E --app="file:///%APP_PATH%?v=%CACHE_BUST%" --disable-cache
        exit /b 0
    )
)

:: 2. Try Google Chrome
for %%C in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
    if exist %%C (
        start "" %%C --app="file:///%APP_PATH%?v=%CACHE_BUST%" --disable-cache
        exit /b 0
    )
)

:: 3. Fallback to default browser
start "" "file:///%APP_PATH%?v=%CACHE_BUST%"
exit /b 0
