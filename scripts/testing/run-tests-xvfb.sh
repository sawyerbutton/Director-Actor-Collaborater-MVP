#!/bin/bash

# Run E2E tests with Xvfb (Virtual Framebuffer)
echo "🖥️ Starting E2E Tests with Xvfb"
echo "================================"
echo ""

# Check if Xvfb is installed
if ! command -v xvfb-run &> /dev/null; then
    echo "⚠️ Xvfb not installed. Installing..."
    sudo apt-get update && sudo apt-get install -y xvfb
fi

# Kill any existing Xvfb processes
pkill Xvfb 2>/dev/null

# Set up display
export DISPLAY=:99

echo "🚀 Starting virtual display..."

# Run tests with xvfb-run
xvfb-run -a -s "-screen 0 1280x720x24" npx playwright test "$@"

echo ""
echo "✅ Test execution complete"