#!/bin/bash

# Maverick Dual-Session Setup for Mac Terminal
# This script opens two panes/tabs: Live Ecosystem and Command Shell

# Check if iTerm is running
if pgrep -x "iTerm2" > /dev/null; then
    OSASCRIPT_CMD="
    tell application \"iTerm2\"
        tell current session of current window
            write text \"cd $(pwd) && npm run dev\"
            set newSession to (split horizontally with default profile)
            tell newSession
                write text \"cd $(pwd) && npm run maverick\"
            end tell
        end tell
    end tell"
else
    OSASCRIPT_CMD="
    tell application \"Terminal\"
        activate
        do script \"cd $(pwd) && npm run dev\"
        tell application \"System Events\" to keystroke \"t\" using command down
        delay 0.5
        do script \"cd $(pwd) && npm run maverick\" in front window
    end tell"
fi

osascript -e "$OSASCRIPT_CMD"

echo "✅ Sessions launched! One window for logs, one for your shell."
