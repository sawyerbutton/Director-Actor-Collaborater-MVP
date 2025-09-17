#!/bin/bash

# Run E2E tests without proxy interference
echo "🚀 Running E2E Tests (No Proxy)"
echo "================================"
echo ""

# Disable proxy for localhost
export NO_PROXY="localhost,127.0.0.1,::1"
export no_proxy="localhost,127.0.0.1,::1"

# Unset proxy for this session
unset http_proxy
unset https_proxy
unset HTTP_PROXY
unset HTTPS_PROXY

echo "✅ Proxy disabled for localhost"
echo ""

# Set display for headless
export DISPLAY=:0

# Check if server is running
echo "🔍 Checking dev server..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Dev server is running on port 3001"
else
    echo "⚠️  Dev server not found on port 3001"
    echo "Starting server..."
    PORT=3001 npm run dev &
    sleep 5
fi

echo ""
echo "🧪 Running Playwright tests..."
echo ""

# Run tests with no proxy
NO_PROXY="localhost,127.0.0.1" npx playwright test "$@" --reporter=list

echo ""
echo "✅ Test execution complete"