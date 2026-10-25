@echo off
setlocal enabledelayedexpansion
title Architecture Helping Hand - Desktop Setup
echo ======================================================================
echo   ARCHITECTURE HELPING HAND - 1-CLICK DESKTOP SHORTCUT INSTALLER
echo ======================================================================
echo.

set "TARGET_DIR=%~dp0"
set "LAUNCHER=%TARGET_DIR%Launch Architecture App.bat"
set "ICON_PATH=%TARGET_DIR%assets\app-icon.ico"

echo [1/2] Creating Desktop Shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$Desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$Shortcut = $WshShell.CreateShortcut(\"$Desktop\Architecture Helping Hand.lnk\"); " ^
  "$Shortcut.TargetPath = '%LAUNCHER%'; " ^
  "$Shortcut.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$Shortcut.Description = 'Architecture Helping Hand - Architectural Calculators & CAD Automation'; " ^
  "if (Test-Path '%ICON_PATH%') { $Shortcut.IconLocation = '%ICON_PATH%,0' }; " ^
  "$Shortcut.Save(); " ^
  "Write-Host '[SUCCESS] Desktop shortcut created successfully!'"

if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo   INSTALLATION COMPLETE!
    echo   You can now launch Architecture Helping Hand directly from:
    echo   - Your Windows Desktop ("Architecture Helping Hand" shortcut)
    echo   - Or by double-clicking "Launch Architecture App.bat" in this folder.
    echo ======================================================================
    echo.
) else (
    echo.
    echo [NOTE] Could not create Desktop shortcut automatically.
    echo You can still launch the app directly by double-clicking:
    echo "Launch Architecture App.bat"
    echo.
)

choice /M "Would you like to launch Architecture Helping Hand now?"
if %errorlevel% equ 1 (
    start "" "%LAUNCHER%"
)
