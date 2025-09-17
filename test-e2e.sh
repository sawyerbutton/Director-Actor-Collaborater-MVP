#!/bin/bash

# E2E Test Runner that WORKS in WSL
echo "🚀 Running E2E Tests (WSL Fixed)"
echo "================================"
echo ""

# Load test environment
source .env.test

# Export all variables
export NO_PROXY="localhost,127.0.0.1,::1"
export no_proxy="localhost,127.0.0.1,::1"
export DISPLAY=:0
export BASE_URL=http://localhost:3001

echo "✅ Environment configured:"
echo "   NO_PROXY: $NO_PROXY"
echo "   DISPLAY: $DISPLAY"
echo "   BASE_URL: $BASE_URL"
echo ""

# Check server
if curl -s -I http://localhost:3001 | grep -q "200 OK"; then
    echo "✅ Dev server is running on port 3001"
else
    echo "⚠️  Dev server not responding. Make sure it's running:"
    echo "   PORT=3001 npm run dev"
    exit 1
fi
echo ""

# Run tests
echo "🧪 Running tests..."
echo "================================"
NO_PROXY="localhost,127.0.0.1,::1" npx playwright test "$@"

echo ""
echo "================================"
echo "✅ Test run complete!"