@echo off
title Architecture Helping Hand Desktop
echo Launching Architecture Helping Hand in Desktop App Window...

:: Try Microsoft Edge App Mode (present on all Windows 10/11 PCs)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0index.html"
    exit
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0index.html"
    exit
)

:: Try Google Chrome App Mode
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///%~dp0index.html"
    exit
)

:: Fallback to opening in default browser
start "" "%~dp0index.html"
