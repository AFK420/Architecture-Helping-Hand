@echo off
title Architecture Helping Hand - Remove Shortcut
echo Removing Architecture Helping Hand Desktop shortcut...
del /f /q "%USERPROFILE%\Desktop\Architecture Helping Hand.lnk" 2>nul
del /f /q "%PUBLIC%\Desktop\Architecture Helping Hand.lnk" 2>nul
echo [OK] Desktop shortcut removed.
timeout /t 2 >nul
