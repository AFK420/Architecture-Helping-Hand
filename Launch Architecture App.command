#!/bin/bash
# ======================================================================
# Architecture Helping Hand (macOS Desktop Launcher)
# ======================================================================

cd "$(dirname "$0")"
APP_DIR="$(pwd)"
HTML_PATH="$APP_DIR/index.html"
CACHE_BUST=$(date +%s)

echo "🏛️ Launching Architecture Helping Hand on macOS..."

# 1. Try Google Chrome in app mode (windowed desktop experience)
if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="file://$HTML_PATH?v=$CACHE_BUST" --disable-cache
    exit 0
fi

# 2. Try Microsoft Edge in app mode
if [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="file://$HTML_PATH?v=$CACHE_BUST" --disable-cache
    exit 0
fi

# 3. Try Brave Browser in app mode
if [ -d "/Applications/Brave Browser.app" ]; then
    open -na "Brave Browser" --args --app="file://$HTML_PATH?v=$CACHE_BUST" --disable-cache
    exit 0
fi

# 4. Universal Fallback: Open in default browser (Safari, Firefox, Arc, etc.)
open "file://$HTML_PATH?v=$CACHE_BUST"
exit 0
