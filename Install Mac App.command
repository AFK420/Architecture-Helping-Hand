#!/bin/bash
# ======================================================================
# Architecture Helping Hand (macOS 1-Click Installer & Setup)
# ======================================================================

cd "$(dirname "$0")"
SOURCE_DIR="$(pwd)"
APP_NAME="Architecture Helping Hand.app"

echo "======================================================================"
echo "  🏛️ ARCHITECTURE HELPING HAND — macOS SETUP"
echo "======================================================================"
echo ""

echo "[1/3] Setting executable permissions on macOS launchers..."
chmod +x "$SOURCE_DIR/Launch Architecture App.command" 2>/dev/null
chmod +x "$SOURCE_DIR/$APP_NAME/Contents/MacOS/Architecture Helping Hand" 2>/dev/null

echo "[2/3] Configuring ~/Applications..."
DEST_DIR="$HOME/Applications"
mkdir -p "$DEST_DIR"

if [ -d "$SOURCE_DIR/$APP_NAME" ]; then
    cp -R "$SOURCE_DIR/$APP_NAME" "$DEST_DIR/"
    echo "  ✓ Installed app bundle to: $DEST_DIR/$APP_NAME"
fi

echo "[3/3] Creating Desktop shortcut..."
DESKTOP_DIR="$HOME/Desktop"
if [ -d "$DESKTOP_DIR" ] && [ -d "$DEST_DIR/$APP_NAME" ]; then
    ln -sf "$DEST_DIR/$APP_NAME" "$DESKTOP_DIR/$APP_NAME"
    echo "  ✓ Created Desktop alias at: $DESKTOP_DIR/$APP_NAME"
fi

echo ""
echo "======================================================================"
echo "  🎉 INSTALLATION COMPLETE!"
echo "  You can now launch Architecture Helping Hand anytime from:"
echo "   - Your Mac Desktop ($DESKTOP_DIR/$APP_NAME)"
echo "   - Your Applications folder ($DEST_DIR/$APP_NAME)"
echo "   - Or by double-clicking 'Launch Architecture App.command'"
echo "======================================================================"
echo ""

read -p "Would you like to launch Architecture Helping Hand now? (y/n): " answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
    if [ -d "$DEST_DIR/$APP_NAME" ]; then
        open "$DEST_DIR/$APP_NAME"
    else
        open "$SOURCE_DIR/Launch Architecture App.command"
    fi
fi
